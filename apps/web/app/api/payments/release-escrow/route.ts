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
  releaseIdempotencyClaim,
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
import { validateEscrowMFA } from './_validation';
import {
  writeAdminBypassAuditLog,
  checkReleaseConditions,
  performStripeTransfer,
  getChargeId,
  createFeeTransferRecord,
  notifyAndEmailContractor,
  writeEscrowAuditLog,
  calculateReleaseFeeBreakdown,
} from './_helpers';

export const POST = withApiHandler(
  {
    roles: ['homeowner', 'admin'],
    rateLimit: { maxRequests: 20, criticality: 'payment' },
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

    // Past the duplicate path. We own the claim — release on failure so
    // the user can retry without waiting for the 60s stale takeover.
    // (checkIdempotency now throws on real contention; null = new request.)
    try {
      const { data: escrowTransaction, error: escrowError } =
        await serverSupabase
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
      const mfaResult = await validateEscrowMFA(
        user.id,
        escrowTransactionId,
        escrowTransaction.amount,
        mfaToken
      );
      if (mfaResult) return mfaResult;

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

      // Get contractor's Stripe Connect account.
      //
      // 2026-05-25 audit-46 P0: previously selected only
      // stripe_connect_account_id. The ID is written the moment Stripe
      // returns an account (long before payouts are enabled), so a
      // contractor who started but never finished onboarding still
      // passed this check. The Stripe transfer would then 400 on the
      // network call ("destination cannot receive funds") and
      // performStripeTransfer's catch block reverts escrow to 'held' —
      // homeowner has approved release but the contractor never gets
      // paid. Pre-flight the same readiness flags webhook handlers
      // maintain (stripe_payouts_enabled + stripe_transfers_active);
      // both boolean columns live, verified 2026-05-25.
      const { data: contractor, error: contractorError } = await serverSupabase
        .from('profiles')
        .select(
          'stripe_connect_account_id, stripe_payouts_enabled, stripe_transfers_active'
        )
        .eq('id', job.contractor_id)
        .single();

      const payoutsReady =
        !!contractor?.stripe_connect_account_id &&
        contractor.stripe_payouts_enabled === true &&
        contractor.stripe_transfers_active === true;
      if (contractorError || !payoutsReady) {
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
        logger.error('Contractor Stripe payouts not ready for release', {
          service: 'payments',
          userId: user.id,
          contractorId: job.contractor_id,
          escrowTransactionId,
          hasAccountId: !!contractor?.stripe_connect_account_id,
          payoutsEnabled: contractor?.stripe_payouts_enabled,
          transfersActive: contractor?.stripe_transfers_active,
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
      // 2026-05-22: tier-aware fees (12/8/5%); honours early-access.
      // Resolve the contractor tier exactly once and thread it through both
      // the escrow fee-column write (below) and the platform_fee_transfers
      // write (createFeeTransferRecord → FeeTransferService). Resolving it
      // independently in each path risked divergent rates → a
      // nondeterministic recorded payout.
      const contractorTier = await FeeCalculationService.resolveContractorTier(
        job.contractor_id
      );
      const feeBreakdown = calculateReleaseFeeBreakdown(
        escrowTransaction.amount,
        paymentType,
        contractorTier
      );
      const contractorAmountCents = Math.round(
        feeBreakdown.contractorAmount * 100
      );

      // FIX CRIT-3: DB update FIRST (mark as release_pending), THEN Stripe transfer.
      const reconciliationId = crypto.randomUUID();

      // Step 1: Mark escrow as release_pending.
      // 2026-07-17: CAS on status='held', not updated_at. The route's own
      // pre-CAS helpers (evaluateAutoRelease auto-approval path, and
      // previously calculateAutoReleaseDate) write metadata to this row and
      // bump updated_at, so an updated_at guard deterministically 409'd its
      // own request. status='held' is the actual invariant release requires,
      // matches the cron's claim predicate (EscrowAutoReleaseService), and
      // still guarantees exactly one claimant wins against any concurrent
      // release/refund/dispute/hold, all of which change status.
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
        .eq('status', ESCROW_STATUS.HELD)
        .select()
        .single();

      if (pendingError || !pendingEscrow) {
        logger.warn(
          'Escrow release blocked - concurrent modification detected',
          {
            service: 'payments',
            userId: user.id,
            escrowTransactionId,
          }
        );
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
        contractorTier,
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
        // 2026-05-23 audit: the recovery record used to land in
        // `escrow_reconciliation` which doesn't exist on live —
        // every transfer-succeeded-but-DB-failed event was silently
        // dropping the recovery trail. Re-targeted at the canonical
        // `escrow_audit_log` (the existing audit table for this
        // surface) with action='reconciliation_needed' so operators
        // can grep for stuck reconciliations and the recovery info
        // (transfer_id + reconciliation_id) is preserved in metadata.
        try {
          await serverSupabase.from('escrow_audit_log').insert({
            escrow_transaction_id: escrowTransactionId,
            action: 'reconciliation_needed',
            actor_id: user.id,
            actor_role: user.role,
            job_id: job.id,
            amount: contractorAmountCents / 100,
            contractor_payout: contractorAmountCents / 100,
            transfer_id: transfer.id,
            release_reason: 'transfer_succeeded_final_update_failed',
            is_admin_action: user.role === 'admin',
            metadata: {
              reconciliation_id: reconciliationId,
              issue_type: 'transfer_succeeded_final_update_failed',
              status: 'pending_review',
              contractor_id: job.contractor_id,
              update_error_message: updateError?.message,
            },
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
    } catch (err) {
      // Release the claim so the user can retry now. Swallow release
      // failures — the 60s backstop still applies.
      try {
        await releaseIdempotencyClaim(idempotencyKey, 'release_escrow');
      } catch {
        // intentional: don't let release failure mask the original error
      }
      throw err;
    }
  }
);
