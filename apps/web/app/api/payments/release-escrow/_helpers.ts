/**
 * Helper functions for the release-escrow route.
 * Extracted to keep route.ts focused on orchestration logic.
 */
import { serverSupabase } from '@/lib/api/supabaseServer';
import { stripe } from '@/lib/stripe';
import { logger, ESCROW_STATUS } from '@mintenance/shared';
import {
  FeeTransferService,
  type FeeTransferOptions,
  type FeeTransferResult,
} from '@/lib/services/payment/FeeTransferService';
import {
  FeeCalculationService,
  type PaymentType,
} from '@/lib/services/payment/FeeCalculationService';
import type { ContractorSubscriptionTier } from '@/lib/feature-access-types';
import { InternalServerError } from '@/lib/errors/api-error';
import { EmailService } from '@/lib/email-service';

/**
 * Tier-aware fee breakdown for an escrow release. 2026-05-22 Sprint 2.
 *
 * Takes an already-resolved `contractorTier` rather than re-resolving it.
 * The release path resolves the tier exactly once (see route.ts) and threads
 * the same value into both the escrow fee-column write and the
 * platform_fee_transfers write via FeeTransferService. Resolving twice could
 * yield divergent rates (tier changed mid-flight, or resolveContractorTier
 * returned different fallbacks), producing a nondeterministic recorded payout.
 */
export function calculateReleaseFeeBreakdown(
  amount: number,
  paymentType: PaymentType,
  contractorTier: ContractorSubscriptionTier
) {
  return FeeCalculationService.calculateFees(amount, {
    paymentType,
    contractorTier,
  });
}

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
  // `amount` is escrow_transactions.amount, which is stored in POUNDS (major
  // units) — see create-intent/embedded-checkout, which insert the
  // server-authoritative bid amount unscaled while sending Stripe `* 100`.
  // FeeCalculationService, notifyPaymentEvent, and paymentReleasedTemplate all
  // format it as pounds directly. It must NOT be divided by 100 here: a prior
  // `amount / 100 // Convert from cents` mislabelled it as minor units and
  // rendered a £500 payout as "£5.00" in every release notification + email.
  amountPounds: number
): Promise<void> {
  // In-app notification
  try {
    const { notifyPaymentEvent } =
      await import('@/lib/services/notifications/NotificationHelper');
    await notifyPaymentEvent({
      userId: job.contractor_id,
      jobId: job.id,
      jobTitle: job.title,
      amount: amountPounds,
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
        amount: amountPounds,
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

// Pre-release safety checks (non-admin path) live in ./_release-conditions
// (checkReleaseConditions) — split out 2026-07-20 to keep this file under the
// 500-line limit. route.ts imports it directly from that module.

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
