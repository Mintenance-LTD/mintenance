import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { stripe } from '@/lib/stripe';
import { logger, ESCROW_STATUS } from '@mintenance/shared';
import {
  BadRequestError,
  ConflictError,
  InternalServerError,
} from '@/lib/errors/api-error';
import { NotificationService } from '@/lib/services/notifications/NotificationService';

interface AdminRefundEscrow {
  id: string;
  status: string;
  amount: number;
  payment_intent_id: string | null;
  metadata: unknown;
}
interface AdminRefundJob {
  id: string;
  homeowner_id: string;
  contractor_id: string;
  title?: string;
}

/** Existing guarded refund action; durable reservation integration follows separately. */
export async function performAdminRefundAction(input: {
  escrow: AdminRefundEscrow;
  job: AdminRefundJob;
  user: { id: string };
  reason: string;
  refundAmount?: number;
}): Promise<NextResponse> {
  const { escrow, job, user, reason, refundAmount } = input;
  const escrowId = escrow.id;
  const now = new Date().toISOString();
  // Only allow refund from held or release_pending states
  if (
    escrow.status !== ESCROW_STATUS.HELD &&
    escrow.status !== ESCROW_STATUS.PENDING_REVIEW &&
    escrow.status !== ESCROW_STATUS.AWAITING_HOMEOWNER_APPROVAL
  ) {
    throw new BadRequestError(
      `Cannot refund escrow in "${escrow.status}" status. Must be held, pending_review, or awaiting_homeowner_approval.`
    );
  }

  if (!escrow.payment_intent_id) {
    throw new BadRequestError(
      'No payment intent found for this escrow. Cannot process refund.'
    );
  }

  // Determine refund amount (full or partial)
  const refundAmountValue =
    refundAmount && refundAmount > 0 && refundAmount < escrow.amount
      ? refundAmount
      : escrow.amount;
  const refundCents = Math.round(refundAmountValue * 100);

  // Claim the escrow before calling Stripe. Idempotency keys only
  // deduplicate the same amount; without this CAS two admins could
  // issue different partial refunds concurrently against one payment.
  const { data: refundClaim, error: refundClaimError } = await serverSupabase
    .from('escrow_transactions')
    .update({
      status: ESCROW_STATUS.RELEASE_PENDING,
      release_reason: `admin_refund_pending: ${reason}`,
      updated_at: now,
    })
    .eq('id', escrowId)
    .in('status', [
      ESCROW_STATUS.HELD,
      ESCROW_STATUS.PENDING_REVIEW,
      ESCROW_STATUS.AWAITING_HOMEOWNER_APPROVAL,
    ])
    .select('id')
    .maybeSingle();

  if (refundClaimError || !refundClaim) {
    throw new ConflictError(
      'This escrow was modified by another request. Refresh and try again.'
    );
  }

  let refundId: string | null = null;
  let refundFinalized = false;

  try {
    // 2026-05-13 reconciliation audit: aligned with
    // terminate-contractor — Stripe idempotency key prevents
    // double-refund on retry, and the refund id is persisted to
    // escrow.metadata so reconciliation scripts can identify
    // refunds processed via this admin route (vs the
    // terminate-contractor / homeowner self-refund routes).
    const refund = await stripe.refunds.create(
      {
        payment_intent: escrow.payment_intent_id,
        amount: refundCents,
        reason: 'requested_by_customer',
        metadata: {
          escrow_id: escrowId,
          job_id: job.id,
          admin_id: user.id,
          admin_reason: reason,
          source: 'admin-refund',
        },
      },
      {
        idempotencyKey: `admin_refund_${escrowId}_${refundCents}`,
      }
    );
    refundId = refund.id;
    if (refund.status !== 'succeeded') {
      throw new Error('Provider refund has not succeeded');
    }

    const existingEscrowMetadata =
      typeof escrow.metadata === 'object' && escrow.metadata
        ? (escrow.metadata as Record<string, unknown>)
        : {};

    // Update escrow status only if this request still owns the claim.
    const { data: refundedEscrow, error: refundUpdateError } =
      await serverSupabase
        .from('escrow_transactions')
        .update({
          // A partial refund does not exhaust the escrow. Keep it held
          // so a later refund can safely use the remaining balance;
          // only a full refund is terminal.
          status:
            refundAmountValue >= escrow.amount
              ? ESCROW_STATUS.REFUNDED
              : ESCROW_STATUS.HELD,
          release_reason: `admin_refund: ${reason}`,
          refunded_at: refundAmountValue >= escrow.amount ? now : null,
          metadata: {
            ...existingEscrowMetadata,
            stripe_refund_id: refund.id,
            refunded_via: 'admin-refund',
            refunded_reason_text: reason,
            refunded_by_admin_id: user.id,
            refund_amount_minor: refundCents,
          },
          updated_at: now,
        })
        .eq('id', escrowId)
        .eq('status', ESCROW_STATUS.RELEASE_PENDING)
        .select('id')
        .maybeSingle();

    if (refundUpdateError || !refundedEscrow) {
      throw new Error('Stripe refund succeeded but escrow finalization failed');
    }
    refundFinalized = true;

    // Notify both parties via NotificationService (in-app + push +
    // preference checks). The previous direct inserts used a
    // `data` column that does not exist on the notifications table,
    // which made PostgREST reject the whole INSERT — both refund
    // notifications silently dropped to the floor in prod. Also
    // the refund happens after a successful Stripe call so
    // users absolutely need to know.
    // 2026-05-21 Mint Editorial voice \u2014 refund timing in the body
    // (homeowner needs that fact); contractor side states what
    // happens to the assignment.
    const fmtRefund = `\u00a3${Number(refundAmountValue).toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
    await Promise.allSettled([
      NotificationService.createNotification({
        userId: job.homeowner_id,
        type: 'escrow_refunded',
        title: `${fmtRefund} refunded for ${job.title}`,
        message: `Stripe takes 5\u201310 business days to settle the refund back to your card.`,
        actionUrl: `/jobs/${job.id}`,
        metadata: {
          jobId: job.id,
          escrowId,
          refundAmount: refundAmountValue,
        },
      }),
      NotificationService.createNotification({
        userId: job.contractor_id,
        type: 'escrow_refunded',
        title: `${fmtRefund} refunded to homeowner for ${job.title}`,
        message: `The escrow was returned. The job is closed on your side.`,
        actionUrl: `/contractor/jobs/${job.id}`,
        metadata: {
          jobId: job.id,
          escrowId,
          refundAmount: refundAmountValue,
        },
      }),
    ]);

    // Write audit log
    await writeAuditLog(user.id, 'ADMIN_ESCROW_REFUND', escrowId, {
      job_id: job.id,
      original_amount: escrow.amount,
      refund_amount: refundAmountValue,
      refund_id: refund.id,
      is_partial: refundAmountValue < escrow.amount,
      reason,
    });

    return NextResponse.json({
      success: true,
      message:
        refundAmountValue < escrow.amount
          ? `Partial refund of \u00a3${refundAmountValue.toFixed(2)} processed successfully`
          : 'Full refund processed successfully',
      refundId: refund.id,
      refundAmount: refundAmountValue,
    });
  } catch (stripeError) {
    if (refundId && !refundFinalized) {
      logger.error(
        'Admin refund outcome or finalization unresolved; reconciliation required',
        stripeError as Error,
        { service: 'admin-refunds', escrowId, refundId }
      );
      throw new InternalServerError(
        'Refund outcome requires reconciliation. Funds remain unavailable for another payment operation.'
      );
    }

    if (refundFinalized) {
      // Stripe and escrow are consistent; a later audit failure must
      // not be reported as a failed financial operation.
      logger.error(
        'Admin refund finalized but post-processing failed',
        stripeError as Error,
        { service: 'admin-refunds', escrowId, refundId }
      );
      return NextResponse.json({
        success: true,
        message:
          refundAmountValue < escrow.amount
            ? `Partial refund of \u00a3${refundAmountValue.toFixed(2)} processed successfully`
            : 'Full refund processed successfully',
        refundId,
        refundAmount: refundAmountValue,
      });
    }

    logger.error(
      'Stripe refund failed during admin refund',
      stripeError as Error,
      {
        service: 'admin-refunds',
        escrowId,
      }
    );

    // A timeout can follow provider success. Keep the claim unavailable
    // until durable provider reconciliation establishes the outcome.
    throw new InternalServerError(
      'Refund outcome could not be confirmed. Funds remain unavailable pending reconciliation.'
    );
  }
}

/**
 * Writes an audit log entry for admin escrow actions.
 */
export async function writeAuditLog(
  adminId: string,
  action: string,
  escrowId: string,
  metadata: Record<string, unknown>
): Promise<void> {
  try {
    const { error: auditError } = await serverSupabase
      .from('audit_logs')
      .insert({
        user_id: adminId,
        action,
        resource_type: 'escrow_transaction',
        resource_id: escrowId,
        metadata,
      });

    if (auditError) throw auditError;
  } catch (err) {
    logger.error(
      'Failed to write audit log for admin refund action',
      err as Error,
      {
        service: 'admin-refunds',
        action,
        escrowId,
      }
    );
  }
}
