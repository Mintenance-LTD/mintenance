import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { validateRequest } from '@/lib/validation/validator';
import { releaseEscrowSchema } from '@/lib/validation/schemas';
import { logger, ESCROW_STATUS, JOB_STATUS } from '@mintenance/shared';
import {
  PaymentStateMachine,
  PaymentAction,
  PaymentState,
} from '@/lib/payment-state-machine';
import { EscrowReleaseAgent } from '@/lib/services/agents/EscrowReleaseAgent';
import {
  getIdempotencyKeyFromRequest,
  checkIdempotency,
  storeIdempotencyResult,
} from '@/lib/idempotency';
import {
  FeeCalculationService,
  type PaymentType,
} from '@/lib/services/payment/FeeCalculationService';
import { requireAdminFromDatabase } from '@/lib/admin-verification';
import {
  ForbiddenError,
  NotFoundError,
  BadRequestError,
  InternalServerError,
  ConflictError,
} from '@/lib/errors/api-error';
import { withApiHandler } from '@/lib/api/with-api-handler';
import {
  writeAdminBypassAuditLog,
  checkReleaseConditions,
  performStripeTransfer,
  getChargeId,
  createFeeTransferRecord,
  notifyAndEmailContractor,
  writeEscrowAuditLog,
} from './_helpers';

export const POST = withApiHandler(
  {
    roles: ['homeowner', 'admin', 'contractor'],
    rateLimit: { maxRequests: 20 },
  },
  async (request, { user }) => {
    // Validate and sanitize input using Zod schema
    const validation = await validateRequest(request, releaseEscrowSchema);
    if ('headers' in validation) {
      return validation;
    }

    const { escrowTransactionId, releaseReason, adminJustification } =
      validation.data;

    // Get MFA token from header if present
    const mfaToken = request.headers.get('x-mfa-token');

    // Idempotency check - prevent duplicate escrow releases (with distributed locking)
    const idempotencyKey = getIdempotencyKeyFromRequest(
      request,
      'release_escrow',
      user.id,
      escrowTransactionId
    );

    const idempotencyCheck = await checkIdempotency(
      idempotencyKey,
      'release_escrow',
      true
    );
    if (idempotencyCheck?.isDuplicate && idempotencyCheck.cachedResult) {
      logger.info(
        'Duplicate escrow release detected, returning cached result',
        {
          service: 'payments',
          idempotencyKey,
          userId: user.id,
          escrowTransactionId,
        }
      );
      return NextResponse.json(idempotencyCheck.cachedResult);
    }

    if (idempotencyCheck === null) {
      logger.warn('Lock contention detected for escrow release', {
        service: 'payments',
        userId: user.id,
        escrowTransactionId,
      });
      throw new ConflictError(
        'Request is being processed. Please wait and try again.'
      );
    }

    // Get escrow transaction with job details
    const { data: escrowTransaction, error: escrowError } = await serverSupabase
      .from('escrow_transactions')
      .select(
        `
        *,
        jobs!inner (
          id,
          title,
          homeowner_id,
          contractor_id,
          status
        )
      `
      )
      .eq('id', escrowTransactionId)
      .single();

    if (escrowError || !escrowTransaction) {
      logger.warn('Escrow release for non-existent transaction', {
        service: 'payments',
        userId: user.id,
        escrowTransactionId,
      });
      throw new NotFoundError('Escrow transaction not found');
    }

    const job = escrowTransaction.jobs;

    // MFA requirement check for high-risk escrow releases
    const { requiresMFA, HighRiskOperation } =
      await import('@/lib/payments/high-risk-checks');
    const mfaCheck = await requiresMFA(
      HighRiskOperation.ESCROW_RELEASE,
      escrowTransaction.amount,
      user.id
    );

    if (mfaCheck.required) {
      if (!mfaToken) {
        logger.warn('MFA required for escrow release but no token provided', {
          service: 'payments',
          userId: user.id,
          escrowTransactionId,
          amount: escrowTransaction.amount,
          riskScore: mfaCheck.riskScore,
        });
        return NextResponse.json(
          {
            error: 'MFA verification required',
            reason: mfaCheck.reason,
            riskScore: mfaCheck.riskScore,
            mfaRequired: true,
          },
          { status: 403 }
        );
      }

      const { validateMFAForPayment } =
        await import('@/lib/payments/high-risk-checks');
      const mfaValidation = await validateMFAForPayment(
        user.id,
        mfaToken,
        HighRiskOperation.ESCROW_RELEASE
      );

      if (!mfaValidation.valid) {
        logger.warn('Invalid MFA token for escrow release', {
          service: 'payments',
          userId: user.id,
          escrowTransactionId,
          amount: escrowTransaction.amount,
        });
        return NextResponse.json(
          {
            error: 'MFA verification failed',
            reason: mfaValidation.reason,
            mfaRequired: true,
          },
          { status: 403 }
        );
      }

      logger.info('MFA validated successfully for escrow release', {
        service: 'payments',
        userId: user.id,
        escrowTransactionId,
        amount: escrowTransaction.amount,
      });
    }

    // SECURITY: For admin operations, verify role from database (not just JWT)
    let isAdminVerified = false;
    if (user.role === 'admin') {
      try {
        await requireAdminFromDatabase(user.id);
        isAdminVerified = true;
      } catch (error) {
        logger.warn('Admin role verification failed for escrow release', {
          service: 'payments',
          userId: user.id,
          escrowTransactionId,
        });
        throw new ForbiddenError('Unauthorized to release this escrow');
      }
    }

    // SECURITY: Contractors cannot directly trigger escrow release — they request it.
    if (user.role === 'contractor') {
      if (job.contractor_id !== user.id) {
        throw new ForbiddenError('Not authorized for this escrow transaction');
      }
      try {
        const { NotificationService } =
          await import('@/lib/services/notifications/NotificationService');
        await NotificationService.createNotification({
          userId: job.homeowner_id,
          title: 'Contractor Requested Payment Release',
          message: `Your contractor has requested payment release for "${job.title || 'your job'}". Please review and approve if the work is complete.`,
          type: 'payment_release_requested',
          actionUrl: `/jobs/${job.id}`,
        });
      } catch (notifyError) {
        logger.error(
          'Failed to notify homeowner of release request',
          notifyError,
          {
            service: 'payments',
            escrowTransactionId,
          }
        );
      }
      logger.info('Contractor requested escrow release — notified homeowner', {
        service: 'payments',
        contractorId: user.id,
        homeownerId: job.homeowner_id,
        escrowTransactionId,
      });
      return NextResponse.json(
        { message: 'Release request sent to homeowner for approval.' },
        { status: 202 }
      );
    }

    const canRelease =
      isAdminVerified ||
      (user.role === 'homeowner' && job.homeowner_id === user.id);

    if (!canRelease) {
      logger.warn('Unauthorized escrow release attempt', {
        service: 'payments',
        userId: user.id,
        escrowTransactionId,
        homeownerId: job.homeowner_id,
        contractorId: job.contractor_id,
        userRole: user.role,
      });
      throw new ForbiddenError('Unauthorized to release this escrow');
    }

    // Validate current state allows release
    const stateValidation = PaymentStateMachine.validateTransition(
      escrowTransaction.status as PaymentState,
      PaymentState.COMPLETED,
      PaymentAction.COMPLETE
    );

    if (!stateValidation.valid) {
      logger.warn('Invalid state transition for escrow release', {
        service: 'payments',
        userId: user.id,
        escrowTransactionId,
        currentStatus: escrowTransaction.status,
        error: stateValidation.error,
      });
      throw new BadRequestError(
        stateValidation.error || 'Invalid state transition'
      );
    }

    // SECURITY: Admin bypass writes a mandatory audit log for compliance.
    if (isAdminVerified && user.role === 'admin') {
      await writeAdminBypassAuditLog(
        user.id,
        escrowTransactionId,
        job,
        escrowTransaction.amount,
        releaseReason,
        adminJustification
      );
    }

    // Check release conditions (skipped for admin — they bypass all checks)
    if (user.role !== 'admin') {
      const conditionResult = await checkReleaseConditions(
        escrowTransactionId,
        escrowTransaction,
        job.id
      );
      if (conditionResult.blocked) {
        return conditionResult.blocked;
      }
      // Apply any field mutations from auto-approval
      if (conditionResult.updatedFields.homeowner_approval !== undefined) {
        escrowTransaction.homeowner_approval =
          conditionResult.updatedFields.homeowner_approval;
      }
      if ('cooling_off_ends_at' in conditionResult.updatedFields) {
        escrowTransaction.cooling_off_ends_at =
          conditionResult.updatedFields.cooling_off_ends_at;
      }
    }

    // If auto-release is enabled and job is completed, evaluate auto-release conditions
    if (
      releaseReason === 'job_completed' &&
      job.status === JOB_STATUS.COMPLETED
    ) {
      const autoReleaseEval =
        await EscrowReleaseAgent.evaluateAutoRelease(escrowTransactionId);
      if (autoReleaseEval && autoReleaseEval.message?.includes('delayed')) {
        return NextResponse.json(
          {
            success: false,
            message:
              'Auto-release delayed due to risk assessment. Escrow will be held longer.',
            metadata: autoReleaseEval.metadata,
          },
          { status: 200 }
        );
      }
    }

    // Calculate auto-release date if not set (best-effort, non-blocking)
    if (
      releaseReason === 'job_completed' &&
      job.status === JOB_STATUS.COMPLETED
    ) {
      await EscrowReleaseAgent.calculateAutoReleaseDate(
        escrowTransactionId,
        job.id,
        job.contractor_id
      ).catch((error) => {
        logger.error('Failed to calculate auto-release date', error, {
          service: 'payments',
          escrowTransactionId,
        });
      });
    }

    // Get contractor's Stripe Connect account
    const { data: contractor, error: contractorError } = await serverSupabase
      .from('profiles')
      .select('stripe_connect_account_id')
      .eq('id', job.contractor_id)
      .single();

    if (contractorError || !contractor?.stripe_connect_account_id) {
      const { PaymentSetupNotificationService } =
        await import('@/lib/services/contractor/PaymentSetupNotificationService');
      await PaymentSetupNotificationService.notifyPaymentSetupRequired(
        job.contractor_id,
        escrowTransactionId,
        job.title,
        escrowTransaction.amount
      ).catch((error) => {
        logger.error('Failed to send payment setup notification', error);
      });
      logger.error('Contractor missing Stripe Connect account', {
        service: 'payments',
        userId: user.id,
        contractorId: job.contractor_id,
        escrowTransactionId,
      });
      return NextResponse.json(
        {
          error: 'Contractor not set up for payments',
          message:
            'The contractor has been notified to complete payment setup.',
          requiresPaymentSetup: true,
        },
        { status: 400 }
      );
    }

    const paymentType =
      (escrowTransaction.payment_type as PaymentType) || 'final';
    const feeBreakdown = FeeCalculationService.calculateFees(
      escrowTransaction.amount,
      { paymentType }
    );
    const contractorAmountCents = Math.round(
      feeBreakdown.contractorAmount * 100
    );

    // FIX CRIT-3: DB update FIRST (mark as release_pending), THEN Stripe transfer.
    const originalUpdatedAt = escrowTransaction.updated_at;
    const reconciliationId = crypto.randomUUID();

    // Step 1: Mark escrow as release_pending
    const { data: pendingEscrow, error: pendingError } = await serverSupabase
      .from('escrow_transactions')
      .update({
        status: ESCROW_STATUS.RELEASE_PENDING,
        reconciliation_id: reconciliationId,
        transfer_attempted_at: new Date().toISOString(),
        release_reason: releaseReason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', escrowTransactionId)
      .eq('updated_at', originalUpdatedAt)
      .select()
      .single();

    if (pendingError || !pendingEscrow) {
      logger.warn('Escrow release blocked - concurrent modification detected', {
        service: 'payments',
        userId: user.id,
        escrowTransactionId,
      });
      throw new ConflictError(
        'Escrow transaction was modified by another request. Please try again.'
      );
    }

    // Step 2: Create Stripe transfer (DB already locked as release_pending)
    const transfer = await performStripeTransfer(
      contractorAmountCents,
      contractor.stripe_connect_account_id,
      job,
      escrowTransactionId,
      releaseReason,
      reconciliationId,
      feeBreakdown
    );

    // Retrieve charge ID for fee tracking (best-effort)
    const chargeId = escrowTransaction.payment_intent_id
      ? await getChargeId(escrowTransaction.payment_intent_id)
      : undefined;

    // Create platform fee transfer record (best-effort)
    const feeTransferResult = await createFeeTransferRecord({
      escrowTransactionId,
      jobId: job.id,
      contractorId: job.contractor_id,
      amount: escrowTransaction.amount,
      paymentIntentId: escrowTransaction.payment_intent_id || '',
      chargeId,
      paymentType,
    });

    // Step 3: Finalize DB — mark as completed with transfer details
    const { data: updatedEscrow, error: updateError } = await serverSupabase
      .from('escrow_transactions')
      .update({
        status: 'completed',
        transfer_id: transfer.id,
        released_at: new Date().toISOString(),
        platform_fee: feeBreakdown.platformFee,
        contractor_payout: feeBreakdown.contractorAmount,
        stripe_processing_fee: feeBreakdown.stripeFee,
        fee_transfer_status: feeTransferResult?.status || 'pending',
        fee_transfer_id: feeTransferResult?.feeTransferId || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', escrowTransactionId)
      .eq('status', ESCROW_STATUS.RELEASE_PENDING)
      .select();

    if (updateError) {
      // Transfer succeeded but final DB update failed — create reconciliation record
      logger.error(
        'CRITICAL: Transfer succeeded but final DB update failed',
        updateError,
        {
          service: 'payments',
          transferId: transfer.id,
          escrowTransactionId,
          reconciliationId,
        }
      );
      try {
        await serverSupabase.from('escrow_reconciliation').insert({
          escrow_transaction_id: escrowTransactionId,
          transfer_id: transfer.id,
          reconciliation_id: reconciliationId,
          status: 'pending_review',
          issue_type: 'transfer_succeeded_final_update_failed',
          amount: contractorAmountCents,
          contractor_id: job.contractor_id,
          created_at: new Date().toISOString(),
        });
      } catch (reconciliationErr: unknown) {
        logger.error(
          'Failed to create reconciliation record',
          reconciliationErr as Error
        );
      }
      throw new InternalServerError(
        'Payment was sent but status update failed. Our team has been notified.'
      );
    }

    // Notify contractor and send email (best-effort, non-blocking)
    if (updatedEscrow && updatedEscrow.length > 0 && job.contractor_id) {
      await notifyAndEmailContractor(
        job,
        escrowTransactionId,
        escrowTransaction.amount
      );
    }

    if (!updatedEscrow || updatedEscrow.length === 0) {
      logger.warn(
        'Escrow final update returned empty - may already be completed',
        {
          service: 'payments',
          userId: user.id,
          escrowTransactionId,
          transferId: transfer.id,
        }
      );
    }

    // Update job status to completed if release reason is job_completed
    if (releaseReason === 'job_completed') {
      await serverSupabase
        .from('jobs')
        .update({
          status: JOB_STATUS.COMPLETED,
          updated_at: new Date().toISOString(),
        })
        .eq('id', job.id);
    }

    logger.info('Escrow released successfully', {
      service: 'payments',
      userId: user.id,
      escrowTransactionId,
      transferId: transfer.id,
      originalAmount: escrowTransaction.amount,
      platformFee: feeBreakdown.platformFee,
      contractorAmount: feeBreakdown.contractorAmount,
      contractorId: job.contractor_id,
      releaseReason,
      feeTransferId: feeTransferResult?.feeTransferId,
    });

    // Persistent audit trail for escrow releases
    await writeEscrowAuditLog({
      escrowTransactionId,
      actorId: user.id,
      actorRole: user.role,
      job,
      amount: escrowTransaction.amount,
      feeBreakdown,
      transferId: transfer.id,
      releaseReason,
      isAdminAction: isAdminVerified,
      reconciliationId,
      feeTransferId: feeTransferResult?.feeTransferId,
      mfaUsed: !!mfaToken,
    });

    const responseData = {
      success: true,
      transferId: transfer.id,
      originalAmount: escrowTransaction.amount,
      platformFee: feeBreakdown.platformFee,
      contractorAmount: feeBreakdown.contractorAmount,
      contractorId: job.contractor_id,
      releasedAt: new Date().toISOString(),
      feeTransferId: feeTransferResult?.feeTransferId,
    };

    await storeIdempotencyResult(
      idempotencyKey,
      'release_escrow',
      responseData,
      user.id,
      { escrowTransactionId, transferId: transfer.id, releaseReason }
    );

    return NextResponse.json(responseData);
  }
);
