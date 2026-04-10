/**
 * Helper functions for the release-escrow route.
 * Extracted to keep route.ts focused on orchestration logic.
 */
import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { stripe } from '@/lib/stripe';
import { logger, ESCROW_STATUS } from '@mintenance/shared';
import { EscrowStatusService } from '@/lib/services/escrow/EscrowStatusService';
import { HomeownerApprovalService } from '@/lib/services/escrow/HomeownerApprovalService';
import { ForbiddenError } from '@/lib/errors/api-error';
import {
  FeeTransferService,
  type FeeTransferOptions,
  type FeeTransferResult,
} from '@/lib/services/payment/FeeTransferService';
import { InternalServerError } from '@/lib/errors/api-error';
import { EmailService } from '@/lib/email-service';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FeeBreakdown {
  platformFee: number;
  contractorAmount: number;
  stripeFee: number;
}

interface JobRef {
  id: string;
  title: string;
  homeowner_id: string;
  contractor_id: string;
  status: string;
}

// ---------------------------------------------------------------------------
// Admin bypass audit log
// ---------------------------------------------------------------------------

export async function writeAdminBypassAuditLog(
  adminUserId: string,
  escrowTransactionId: string,
  job: JobRef,
  amount: number,
  releaseReason: string,
  adminJustification: string | undefined
): Promise<void> {
  logger.warn('ADMIN ESCROW BYPASS: overriding all release safety checks', {
    service: 'payments',
    adminUserId,
    escrowTransactionId,
    jobId: job.id,
    escrowAmount: amount,
    releaseReason,
    justification: adminJustification ?? 'NONE PROVIDED',
    bypassedChecks: [
      'homeowner_approval',
      'photo_verification',
      'cooling_off',
      'disputes',
    ],
  });

  try {
    await serverSupabase.from('audit_logs').insert({
      user_id: adminUserId,
      action: 'ADMIN_ESCROW_BYPASS',
      resource_type: 'escrow_transaction',
      resource_id: escrowTransactionId,
      metadata: {
        job_id: job.id,
        amount,
        release_reason: releaseReason,
        justification: adminJustification ?? null,
      },
    });
  } catch (auditErr: unknown) {
    logger.error('Failed to write admin bypass audit log', auditErr, {
      service: 'payments',
      escrowTransactionId,
    });
  }
}

// ---------------------------------------------------------------------------
// Stripe transfer + revert on failure
// ---------------------------------------------------------------------------

export async function performStripeTransfer(
  contractorAmountCents: number,
  stripeConnectAccountId: string,
  job: JobRef,
  escrowTransactionId: string,
  releaseReason: string,
  reconciliationId: string,
  feeBreakdown: FeeBreakdown
): Promise<{ id: string }> {
  try {
    const transfer = await stripe.transfers.create({
      amount: contractorAmountCents,
      currency: 'gbp',
      destination: stripeConnectAccountId,
      description: `Payment for job: ${job.title}`,
      metadata: {
        jobId: job.id,
        escrowTransactionId,
        homeownerId: job.homeowner_id,
        contractorId: job.contractor_id,
        releaseReason,
        reconciliationId,
        platformFee: feeBreakdown.platformFee.toString(),
        contractorAmount: feeBreakdown.contractorAmount.toString(),
      },
    });
    return transfer;
  } catch (stripeError) {
    // Revert DB to 'held' status — no money moved
    logger.error(
      'Stripe transfer failed, reverting escrow to held',
      stripeError,
      {
        service: 'payments',
        escrowTransactionId,
        reconciliationId,
      }
    );
    await serverSupabase
      .from('escrow_transactions')
      .update({
        status: ESCROW_STATUS.HELD,
        reconciliation_id: null,
        transfer_attempted_at: null,
        release_reason: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', escrowTransactionId);

    throw new InternalServerError(
      'Payment transfer failed. No funds were moved. Please try again.'
    );
  }
}

// ---------------------------------------------------------------------------
// Retrieve charge ID from payment intent (best-effort)
// ---------------------------------------------------------------------------

export async function getChargeId(
  paymentIntentId: string
): Promise<string | undefined> {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    return typeof paymentIntent.latest_charge === 'string'
      ? paymentIntent.latest_charge
      : paymentIntent.latest_charge?.id;
  } catch (error) {
    logger.warn('Failed to retrieve payment intent for fee tracking', {
      service: 'payments',
      paymentIntentId,
    });
    return undefined;
  }
}

// ---------------------------------------------------------------------------
// Create fee transfer record (best-effort)
// ---------------------------------------------------------------------------

export async function createFeeTransferRecord(
  params: FeeTransferOptions
): Promise<FeeTransferResult | undefined> {
  try {
    return await FeeTransferService.transferPlatformFee(params);
  } catch (error) {
    logger.error('Failed to create fee transfer record', error, {
      service: 'payments',
      escrowTransactionId: params.escrowTransactionId,
    });
    return undefined;
  }
}

// ---------------------------------------------------------------------------
// Post-release: notify contractor + send email
// ---------------------------------------------------------------------------

export async function notifyAndEmailContractor(
  job: JobRef,
  escrowTransactionId: string,
  amount: number
): Promise<void> {
  // In-app notification
  try {
    const { notifyPaymentEvent } =
      await import('@/lib/services/notifications/NotificationHelper');
    await notifyPaymentEvent({
      userId: job.contractor_id,
      jobId: job.id,
      jobTitle: job.title,
      amount: amount / 100, // Convert from cents
      eventType: 'released',
      transactionId: escrowTransactionId,
    });
  } catch (notificationError) {
    logger.error(
      'Failed to create payment released notification',
      notificationError,
      {
        service: 'payments',
        contractorId: job.contractor_id,
        escrowTransactionId,
      }
    );
  }

  // Email notification (non-blocking)
  try {
    const { data: contractorProfile } = await serverSupabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', job.contractor_id)
      .single();

    if (contractorProfile?.email) {
      await EmailService.sendPaymentReleasedEmail(contractorProfile.email, {
        contractorName: contractorProfile.full_name ?? 'Contractor',
        jobTitle: job.title,
        amount: amount / 100,
        transactionId: escrowTransactionId,
        viewUrl: `${process.env.NEXT_PUBLIC_APP_URL}/contractor/jobs/${job.id}`,
      });
    }
  } catch (emailError) {
    logger.warn('Failed to send payment released email', {
      service: 'payments',
      contractorId: job.contractor_id,
      escrowTransactionId,
      error: emailError,
    });
  }
}

// ---------------------------------------------------------------------------
// Pre-release safety checks (non-admin path)
// ---------------------------------------------------------------------------

/**
 * Runs all release-condition checks for the non-admin path.
 *
 * Returns:
 * - `{ blocked: NextResponse }` if a condition prevents release
 * - `{ blocked: null, updatedFields }` when all checks pass; `updatedFields`
 *   carries any fields mutated during auto-approval so the caller can update
 *   its local escrow object before proceeding.
 */
export async function checkReleaseConditions(
  escrowTransactionId: string,
  escrowTransaction: {
    admin_hold_status: string | null;
    homeowner_approval: boolean | null;
    photo_verification_status: string | null;
    photo_quality_passed: boolean | null;
    geolocation_verified: boolean | null;
    timestamp_verified: boolean | null;
    cooling_off_ends_at: string | null;
  },
  jobId: string
): Promise<
  | { blocked: NextResponse; updatedFields?: never }
  | {
      blocked: null;
      updatedFields: {
        homeowner_approval?: boolean;
        cooling_off_ends_at?: string | null;
      };
    }
> {
  // 1. Admin hold
  if (
    escrowTransaction.admin_hold_status === 'admin_hold' ||
    escrowTransaction.admin_hold_status === 'pending_review'
  ) {
    await EscrowStatusService.getBlockingReasons(escrowTransactionId);
    throw new ForbiddenError('Escrow is on admin hold');
  }

  // 2. Homeowner approval or auto-approval
  const updatedFields: {
    homeowner_approval?: boolean;
    cooling_off_ends_at?: string | null;
  } = {};
  if (!escrowTransaction.homeowner_approval) {
    const autoApprovalEligible =
      await HomeownerApprovalService.checkAutoApprovalEligibility(
        escrowTransactionId
      );
    if (!autoApprovalEligible) {
      const blockingReasons =
        await EscrowStatusService.getBlockingReasons(escrowTransactionId);
      return {
        blocked: NextResponse.json(
          { error: 'Waiting for homeowner approval', blockingReasons },
          { status: 403 }
        ),
      };
    }
    await HomeownerApprovalService.processAutoApproval(escrowTransactionId);
    const { data: freshEscrow } = await serverSupabase
      .from('escrow_transactions')
      .select('homeowner_approval, cooling_off_ends_at')
      .eq('id', escrowTransactionId)
      .single();
    if (!freshEscrow?.homeowner_approval) {
      return {
        blocked: NextResponse.json(
          { error: 'Auto-approval failed' },
          { status: 403 }
        ),
      };
    }
    updatedFields.homeowner_approval = freshEscrow.homeowner_approval;
    updatedFields.cooling_off_ends_at = freshEscrow.cooling_off_ends_at;
  }

  // 3. Photo verification
  if (escrowTransaction.photo_verification_status !== 'verified') {
    const blockingReasons =
      await EscrowStatusService.getBlockingReasons(escrowTransactionId);
    return {
      blocked: NextResponse.json(
        { error: 'Photo verification not completed', blockingReasons },
        { status: 403 }
      ),
    };
  }
  if (!escrowTransaction.photo_quality_passed) {
    return {
      blocked: NextResponse.json(
        { error: 'Photo quality check failed' },
        { status: 403 }
      ),
    };
  }
  if (!escrowTransaction.geolocation_verified) {
    return {
      blocked: NextResponse.json(
        { error: 'Geolocation verification pending' },
        { status: 403 }
      ),
    };
  }
  if (!escrowTransaction.timestamp_verified) {
    return {
      blocked: NextResponse.json(
        { error: 'Timestamp verification pending' },
        { status: 403 }
      ),
    };
  }

  // 4. Cooling-off period
  const coolingOffAt =
    updatedFields.cooling_off_ends_at ?? escrowTransaction.cooling_off_ends_at;
  if (coolingOffAt) {
    const coolingOffEnds = new Date(coolingOffAt);
    if (coolingOffEnds > new Date()) {
      return {
        blocked: NextResponse.json(
          {
            error: `Cooling-off period active until ${coolingOffEnds.toISOString()}`,
            coolingOffEndsAt: coolingOffEnds.toISOString(),
          },
          { status: 403 }
        ),
      };
    }
  }

  // 5. Active disputes
  const { count: disputeCount } = await serverSupabase
    .from('disputes')
    .select('id', { count: 'exact', head: true })
    .eq('job_id', jobId)
    .in('status', ['open', 'pending']);
  if ((disputeCount || 0) > 0) {
    return {
      blocked: NextResponse.json(
        { error: 'Active dispute exists - cannot release escrow' },
        { status: 403 }
      ),
    };
  }

  return { blocked: null, updatedFields };
}

// ---------------------------------------------------------------------------
// Persistent audit trail after release
// ---------------------------------------------------------------------------

export async function writeEscrowAuditLog(params: {
  escrowTransactionId: string;
  actorId: string;
  actorRole: string;
  job: JobRef;
  amount: number;
  feeBreakdown: FeeBreakdown;
  transferId: string;
  releaseReason: string;
  isAdminAction: boolean;
  reconciliationId: string;
  feeTransferId: string | undefined;
  mfaUsed: boolean;
}): Promise<void> {
  try {
    await serverSupabase.from('escrow_audit_log').insert({
      escrow_transaction_id: params.escrowTransactionId,
      action: 'released',
      actor_id: params.actorId,
      actor_role: params.actorRole,
      job_id: params.job.id,
      amount: params.amount,
      platform_fee: params.feeBreakdown.platformFee,
      contractor_payout: params.feeBreakdown.contractorAmount,
      transfer_id: params.transferId,
      release_reason: params.releaseReason,
      is_admin_action: params.isAdminAction,
      metadata: {
        reconciliationId: params.reconciliationId,
        feeTransferId: params.feeTransferId,
        mfaUsed: params.mfaUsed,
        contractorId: params.job.contractor_id,
        homeownerId: params.job.homeowner_id,
      },
      created_at: new Date().toISOString(),
    });
  } catch (auditError) {
    logger.error('Failed to write escrow audit log', auditError, {
      service: 'payments',
      escrowTransactionId: params.escrowTransactionId,
    });
  }
}
