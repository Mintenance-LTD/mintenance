import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { logger, ESCROW_STATUS } from '@mintenance/shared';
import { stripe } from '@/lib/stripe';
import { requireAdminFromDatabase } from '@/lib/admin-verification';
import { BadRequestError, NotFoundError } from '@/lib/errors/api-error';
import { NotificationService } from '@/lib/services/notifications/NotificationService';

// 2026-05-01 audit follow-up (check-api-contracts): Zod-validated body so
// the previous mix of `if (!action || !['release',...].includes(action))`
// and bare casts is replaced with a typed parse. Tighter: refundAmount is
// now a positive-finite number, reason is min 5 / max 500.
const refundActionSchema = z
  .object({
    action: z.enum(['release', 'refund', 'hold']),
    reason: z
      .string()
      .min(
        5,
        'A reason of at least 5 characters is required for all admin escrow actions'
      )
      .max(500),
    refundAmount: z.number().positive().max(1_000_000).optional(),
  })
  .strict();

/**
 * POST /api/admin/refunds/[id]
 * Admin actions on escrow transactions: release, refund, or hold.
 */
export const POST = withApiHandler(
  {
    roles: ['admin'],
    rateLimit: { maxRequests: 20 },
    // Moves funds (refund / release / hold on escrow) — never safe to
    // execute on a stale admin session. Match the 15-minute window used
    // by /api/admin/escrow/approve and /api/admin/escrow/hold.
    requireMfaVerifiedWithinMinutes: 15,
    logActivity: {
      actionType: 'escrow_admin_action',
      category: 'revenue',
      targetType: 'escrow',
      targetId: (params) => params.id,
      description: 'Performed an admin escrow action (release/refund/hold)',
    },
  },
  async (request: NextRequest, { user, params }) => {
    const escrowId = params.id;
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      throw new BadRequestError('Invalid JSON body');
    }
    const parsed = refundActionSchema.safeParse(raw);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      throw new BadRequestError(first?.message ?? 'Invalid request body');
    }
    const { action, reason, refundAmount } = parsed.data;

    // Verify admin role from database (not just JWT)
    await requireAdminFromDatabase(user.id);

    // Fetch the escrow transaction with job details
    const { data: escrow, error: fetchError } = await serverSupabase
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
      .eq('id', escrowId)
      .single();

    if (fetchError || !escrow) {
      throw new NotFoundError('Escrow transaction not found');
    }

    const job = escrow.jobs;
    const now = new Date().toISOString();

    // Execute the requested action
    switch (action) {
      case 'release': {
        // Only allow release from held or release_pending states
        if (
          escrow.status !== ESCROW_STATUS.HELD &&
          escrow.status !== ESCROW_STATUS.PENDING_REVIEW &&
          escrow.status !== ESCROW_STATUS.AWAITING_HOMEOWNER_APPROVAL
        ) {
          throw new BadRequestError(
            `Cannot release escrow in "${escrow.status}" status. Must be held, pending_review, or awaiting_homeowner_approval.`
          );
        }

        // Get contractor's Stripe Connect account
        const { data: contractor } = await serverSupabase
          .from('profiles')
          .select('stripe_connect_account_id')
          .eq('id', job.contractor_id)
          .single();

        if (!contractor?.stripe_connect_account_id) {
          throw new BadRequestError(
            'Contractor does not have a Stripe Connect account configured. Cannot release payment.'
          );
        }

        // Mark as release_pending first
        const { error: pendingError } = await serverSupabase
          .from('escrow_transactions')
          .update({
            status: ESCROW_STATUS.RELEASE_PENDING,
            release_reason: `admin_release: ${reason}`,
            updated_at: now,
          })
          .eq('id', escrowId);

        if (pendingError) {
          logger.error(
            'Failed to mark escrow as release_pending',
            pendingError,
            {
              service: 'admin-refunds',
              escrowId,
            }
          );
          throw new BadRequestError('Failed to update escrow status');
        }

        // Create Stripe transfer. Idempotency key keyed on escrow+amount so
        // duplicate admin-release clicks don't issue a second transfer.
        const amountCents = Math.round(escrow.amount * 100);
        try {
          const transfer = await stripe.transfers.create(
            {
              amount: amountCents,
              currency: 'gbp',
              destination: contractor.stripe_connect_account_id,
              description: `Admin release for job: ${job.title}`,
              metadata: {
                escrow_id: escrowId,
                job_id: job.id,
                admin_id: user.id,
                reason,
              },
            },
            {
              idempotencyKey: `admin_release_${escrowId}_${amountCents}`,
            }
          );

          // Mark as released
          await serverSupabase
            .from('escrow_transactions')
            .update({
              status: ESCROW_STATUS.RELEASED,
              transfer_id: transfer.id,
              released_at: now,
              updated_at: now,
            })
            .eq('id', escrowId);

          // Notify both parties via NotificationService (handles DB + push + email)
          // 2026-05-21 Mint Editorial voice \u2014 amount-led title, explicit
          // about admin involvement so users aren't confused.
          const fmtAmount = `\u00a3${Number(escrow.amount).toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
          await Promise.allSettled([
            NotificationService.createNotification({
              userId: job.contractor_id,
              type: 'escrow_released',
              title: `${fmtAmount} released by Mint admin for ${job.title}`,
              message: `Funds typically land in 1\u20132 business days.`,
              actionUrl: `/contractor/jobs/${job.id}`,
              metadata: { jobId: job.id, escrowId },
            }),
            NotificationService.createNotification({
              userId: job.homeowner_id,
              type: 'escrow_released',
              title: `${fmtAmount} released to your contractor for ${job.title}`,
              message: `Mint admin released the funds after review.`,
              actionUrl: `/jobs/${job.id}`,
              metadata: { jobId: job.id, escrowId },
            }),
          ]);

          // Write audit log
          await writeAuditLog(user.id, 'ADMIN_ESCROW_RELEASE', escrowId, {
            job_id: job.id,
            amount: escrow.amount,
            transfer_id: transfer.id,
            reason,
          });

          return NextResponse.json({
            success: true,
            message: 'Escrow released successfully',
            transferId: transfer.id,
          });
        } catch (stripeError) {
          // Revert to held on Stripe failure
          await serverSupabase
            .from('escrow_transactions')
            .update({
              status: ESCROW_STATUS.HELD,
              updated_at: now,
            })
            .eq('id', escrowId);

          logger.error(
            'Stripe transfer failed during admin release',
            stripeError as Error,
            {
              service: 'admin-refunds',
              escrowId,
            }
          );

          throw new BadRequestError(
            'Stripe transfer failed. Escrow has been reverted to held status.'
          );
        }
      }

      case 'refund': {
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

          const existingEscrowMetadata =
            typeof escrow.metadata === 'object' && escrow.metadata
              ? (escrow.metadata as Record<string, unknown>)
              : {};

          // Update escrow status
          await serverSupabase
            .from('escrow_transactions')
            .update({
              status: ESCROW_STATUS.REFUNDED,
              release_reason: `admin_refund: ${reason}`,
              refunded_at: now,
              released_at: now,
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
            .eq('id', escrowId);

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
          logger.error(
            'Stripe refund failed during admin refund',
            stripeError as Error,
            {
              service: 'admin-refunds',
              escrowId,
            }
          );
          throw new BadRequestError(
            'Stripe refund failed. Please check the payment status in Stripe dashboard.'
          );
        }
      }

      case 'hold': {
        // Can place hold on held, pending_review, or awaiting states
        if (
          escrow.status !== ESCROW_STATUS.HELD &&
          escrow.status !== ESCROW_STATUS.RELEASE_PENDING &&
          escrow.status !== ESCROW_STATUS.PENDING_REVIEW &&
          escrow.status !== ESCROW_STATUS.AWAITING_HOMEOWNER_APPROVAL
        ) {
          throw new BadRequestError(
            `Cannot place admin hold on escrow in "${escrow.status}" status.`
          );
        }

        // Update escrow with admin hold
        const { error: holdError } = await serverSupabase
          .from('escrow_transactions')
          .update({
            status: ESCROW_STATUS.PENDING_REVIEW,
            release_reason: `admin_hold: ${reason}`,
            updated_at: now,
          })
          .eq('id', escrowId);

        if (holdError) {
          logger.error('Failed to place admin hold on escrow', holdError, {
            service: 'admin-refunds',
            escrowId,
          });
          throw new BadRequestError('Failed to place hold on escrow');
        }

        // Notify both parties through NotificationService — same
        // `data` vs `metadata` bug as the refund branch above meant the
        // hold notification was silently rejected.
        // 2026-05-21 Mint Editorial voice — explicit on the 48h SLA so
        // both sides know when to expect a resolution.
        await Promise.allSettled([
          NotificationService.createNotification({
            userId: job.homeowner_id,
            type: 'escrow_hold',
            title: `${job.title} — Mint admin reviewing the payment`,
            message: `Funds stay held while we look at it. 48-hour SLA.`,
            actionUrl: `/jobs/${job.id}`,
            metadata: { jobId: job.id, escrowId },
          }),
          NotificationService.createNotification({
            userId: job.contractor_id,
            type: 'escrow_hold',
            title: `${job.title} — Mint admin reviewing the payment`,
            message: `Funds stay held while we look at it. 48-hour SLA.`,
            actionUrl: `/contractor/jobs/${job.id}`,
            metadata: { jobId: job.id, escrowId },
          }),
        ]);

        // Write audit log
        await writeAuditLog(user.id, 'ADMIN_ESCROW_HOLD', escrowId, {
          job_id: job.id,
          amount: escrow.amount,
          previous_status: escrow.status,
          reason,
        });

        return NextResponse.json({
          success: true,
          message: 'Escrow placed under admin review',
        });
      }

      default:
        throw new BadRequestError('Invalid action');
    }
  }
);

/**
 * Writes an audit log entry for admin escrow actions.
 */
async function writeAuditLog(
  adminId: string,
  action: string,
  escrowId: string,
  metadata: Record<string, unknown>
): Promise<void> {
  try {
    await serverSupabase.from('audit_logs').insert({
      user_id: adminId,
      action,
      resource_type: 'escrow_transaction',
      resource_id: escrowId,
      metadata,
    });
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
