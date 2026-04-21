import { NextRequest, NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { logger, ESCROW_STATUS } from '@mintenance/shared';
import { stripe } from '@/lib/stripe';
import { requireAdminFromDatabase } from '@/lib/admin-verification';
import { BadRequestError, NotFoundError } from '@/lib/errors/api-error';
import { NotificationService } from '@/lib/services/notifications/NotificationService';

/**
 * POST /api/admin/refunds/[id]
 * Admin actions on escrow transactions: release, refund, or hold.
 */
export const POST = withApiHandler(
  {
    roles: ['admin'],
    rateLimit: { maxRequests: 20 },
  },
  async (request: NextRequest, { user, params }) => {
    const escrowId = params.id;
    const body = await request.json();
    const { action, reason, refundAmount } = body as {
      action: 'release' | 'refund' | 'hold';
      reason: string;
      refundAmount?: number;
    };

    // Validate inputs
    if (!action || !['release', 'refund', 'hold'].includes(action)) {
      throw new BadRequestError(
        'Invalid action. Must be one of: release, refund, hold'
      );
    }

    if (!reason || reason.trim().length < 5) {
      throw new BadRequestError(
        'A reason of at least 5 characters is required for all admin escrow actions'
      );
    }

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

        // Create Stripe transfer
        const amountCents = Math.round(escrow.amount * 100);
        try {
          const transfer = await stripe.transfers.create({
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
          });

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
          await Promise.allSettled([
            NotificationService.createNotification({
              userId: job.contractor_id,
              type: 'escrow_released',
              title: 'Payment Released',
              message: `Payment of \u00a3${escrow.amount.toFixed(2)} for "${job.title}" has been released by admin.`,
              actionUrl: `/contractor/jobs/${job.id}`,
              metadata: { jobId: job.id, escrowId },
            }),
            NotificationService.createNotification({
              userId: job.homeowner_id,
              type: 'escrow_released',
              title: 'Payment Released',
              message: `Payment of \u00a3${escrow.amount.toFixed(2)} for "${job.title}" has been released to the contractor.`,
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
          const refund = await stripe.refunds.create({
            payment_intent: escrow.payment_intent_id,
            amount: refundCents,
            reason: 'requested_by_customer',
            metadata: {
              escrow_id: escrowId,
              job_id: job.id,
              admin_id: user.id,
              admin_reason: reason,
            },
          });

          // Update escrow status
          await serverSupabase
            .from('escrow_transactions')
            .update({
              status: ESCROW_STATUS.REFUNDED,
              release_reason: `admin_refund: ${reason}`,
              released_at: now,
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
          await Promise.allSettled([
            NotificationService.createNotification({
              userId: job.homeowner_id,
              type: 'escrow_refunded',
              title: 'Payment Refunded',
              message: `A refund of \u00a3${refundAmountValue.toFixed(2)} for "${job.title}" has been processed. It may take 5-10 business days to appear.`,
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
              title: 'Job Payment Refunded',
              message: `The payment of \u00a3${refundAmountValue.toFixed(2)} for "${job.title}" has been refunded to the homeowner.`,
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
        await Promise.allSettled([
          NotificationService.createNotification({
            userId: job.homeowner_id,
            type: 'escrow_hold',
            title: 'Payment Under Review',
            message: `The payment for "${job.title}" is under admin review.`,
            actionUrl: `/jobs/${job.id}`,
            metadata: { jobId: job.id, escrowId },
          }),
          NotificationService.createNotification({
            userId: job.contractor_id,
            type: 'escrow_hold',
            title: 'Payment Under Review',
            message: `The payment for "${job.title}" is under admin review.`,
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
