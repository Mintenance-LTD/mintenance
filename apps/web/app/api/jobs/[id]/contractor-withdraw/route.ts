/**
 * POST /api/jobs/:id/contractor-withdraw
 *
 * Contractor withdraws from a job they've already accepted (post-bid-accept).
 * Transitions job: assigned | in_progress → posted (re-opens for new bids).
 *
 * 2026-05-13 lifecycle gap closure: the platform had a homeowner-side
 * `terminate-contractor` route but no symmetric contractor-side exit.
 * Schema already supports `bids.status='withdrawn'` and
 * `contracts.status='cancelled'`, but until now a contractor who needed
 * to back out (illness, scheduling conflict, scope blow-up) had no
 * clean route — the only options were admin intervention or letting the
 * job sit assigned indefinitely, blocking the homeowner from reposting.
 *
 * Behaviour mirrors terminate-contractor, with the actor flipped:
 *   • Allowed states: assigned, in_progress
 *   • Refunds the homeowner's escrow via Stripe (if status held)
 *   • Cancels the active contract
 *   • Sets the contractor's accepted bid to 'withdrawn'
 *   • Resets job to 'posted' and clears `contractor_id`
 *   • Notifies the homeowner (in-app + email-ready notification)
 *
 * A contractor who hasn't been accepted yet uses
 * /api/jobs/:id/bids/:bidId/withdraw (which is for pending bids).
 */

import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import {
  logger,
  JOB_STATUS,
  ESCROW_STATUS,
  validateStatusTransition,
  validateEscrowTransition,
  type JobStatus,
  type EscrowStatusValue,
} from '@mintenance/shared';
import { NotificationService } from '@/lib/services/notifications/NotificationService';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from '@/lib/errors/api-error';
import { stripe } from '@/lib/stripe';
import { z } from 'zod';
import { validateRequest } from '@/lib/validation/validator';
import {
  getIdempotencyKeyFromRequest,
  checkIdempotency,
  storeIdempotencyResult,
  releaseIdempotencyClaim,
} from '@/lib/idempotency';

const withdrawSchema = z.object({
  reason: z
    .string()
    .min(10, 'Please provide a reason (at least 10 characters)')
    .max(1000),
});

export const POST = withApiHandler(
  { roles: ['contractor'], rateLimit: { maxRequests: 10 } },
  async (request, { user, params }) => {
    const jobId = params.id as string;

    // Validate input
    const validation = await validateRequest(request, withdrawSchema);
    if ('headers' in validation) return validation;
    const { reason } = validation.data;

    // Idempotency: a double-tap on the "Withdraw" CTA would otherwise
    // re-fire all notifications + re-attempt the Stripe refund (the
    // Stripe call below uses an idempotency key so the refund itself
    // is safe, but the notification spam is not).
    const idempotencyKey = getIdempotencyKeyFromRequest(
      request,
      'contractor_withdraw',
      user.id,
      jobId
    );
    const idem = await checkIdempotency<{
      success: boolean;
      message: string;
      escrowRefunded: boolean;
    }>(idempotencyKey, 'contractor_withdraw');
    if (idem?.isDuplicate && idem.cachedResult) {
      return NextResponse.json(idem.cachedResult);
    }

    // Past the duplicate path. We own the claim — release on failure so
    // the contractor can retry without waiting for the 60s stale takeover.
    try {
      // Fetch job
      const { data: job, error: jobError } = await serverSupabase
        .from('jobs')
        .select('id, status, title, homeowner_id, contractor_id')
        .eq('id', jobId)
        .single();

      if (jobError || !job) {
        throw new NotFoundError('Job not found');
      }

      if (job.contractor_id !== user.id) {
        throw new ForbiddenError(
          'You can only withdraw from jobs you have been assigned to'
        );
      }

      if (
        job.status !== JOB_STATUS.ASSIGNED &&
        job.status !== JOB_STATUS.IN_PROGRESS
      ) {
        throw new BadRequestError(
          `Cannot withdraw when job is "${job.status}". Withdrawal is only allowed for assigned or in-progress jobs.`
        );
      }

      // Validate state-machine transition back to posted
      validateStatusTransition(
        job.status as JobStatus,
        JOB_STATUS.POSTED as JobStatus
      );

      const homeownerId = job.homeowner_id;

      // ─── Refund escrow if held ────────────────────────────────────
      // Same Stripe-first pattern as /api/jobs/[id]/terminate-contractor
      // (the homeowner-side mirror). A Stripe failure aborts withdrawal
      // so the homeowner's funds never get DB-marked-refunded without
      // an actual Stripe refund.
      let escrowRefunded = false;
      const { data: escrow } = await serverSupabase
        .from('escrow_transactions')
        .select('id, status, amount, payment_intent_id, metadata')
        .eq('job_id', jobId)
        .in('status', [
          ESCROW_STATUS.HELD,
          ESCROW_STATUS.AWAITING_HOMEOWNER_APPROVAL,
        ])
        .limit(1)
        .single();

      if (escrow) {
        validateEscrowTransition(
          escrow.status as EscrowStatusValue,
          ESCROW_STATUS.REFUNDED as EscrowStatusValue
        );

        if (!escrow.payment_intent_id) {
          logger.error(
            'Cannot Stripe-refund escrow without payment_intent_id',
            new Error('Missing payment_intent_id on held escrow'),
            {
              service: 'jobs',
              jobId,
              escrowId: escrow.id,
            }
          );
          throw new BadRequestError(
            'Cannot process refund: escrow is missing its Stripe link. Please contact support.'
          );
        }

        let stripeRefundId: string | null = null;
        try {
          const refund = await stripe.refunds.create(
            {
              payment_intent: escrow.payment_intent_id,
              reason: 'requested_by_customer',
              metadata: {
                jobId,
                escrowId: escrow.id,
                homeownerId,
                withdrawnContractorId: user.id,
                source: 'contractor-withdraw',
              },
            },
            {
              idempotencyKey: `contractor_withdraw_refund_${escrow.id}`,
            }
          );
          stripeRefundId = refund.id;
          logger.info('Stripe refund issued for contractor withdrawal', {
            service: 'jobs',
            jobId,
            escrowId: escrow.id,
            refundId: stripeRefundId,
            amount: escrow.amount,
          });
        } catch (stripeErr) {
          logger.error(
            'Stripe refund failed during contractor withdraw',
            stripeErr,
            {
              service: 'jobs',
              jobId,
              escrowId: escrow.id,
              paymentIntentId: escrow.payment_intent_id,
            }
          );
          throw new BadRequestError(
            'Failed to refund payment. Please try again, or contact support if the issue persists.'
          );
        }

        const existingMetadata =
          typeof escrow.metadata === 'object' && escrow.metadata
            ? (escrow.metadata as Record<string, unknown>)
            : {};

        const { error: escrowError } = await serverSupabase
          .from('escrow_transactions')
          .update({
            status: ESCROW_STATUS.REFUNDED,
            refunded_at: new Date().toISOString(),
            release_reason: 'contractor_withdraw',
            metadata: {
              ...existingMetadata,
              stripe_refund_id: stripeRefundId,
              refunded_via: 'contractor-withdraw',
              refunded_reason_text: reason,
            },
            updated_at: new Date().toISOString(),
          })
          .eq('id', escrow.id);

        if (escrowError) {
          logger.error(
            'CRITICAL: Stripe refund succeeded but escrow DB update failed',
            escrowError,
            {
              service: 'jobs',
              jobId,
              escrowId: escrow.id,
              stripeRefundId,
            }
          );
          throw new BadRequestError(
            'Refund was issued but the platform record is out of sync. Please contact support.'
          );
        }

        escrowRefunded = true;
      }

      // ─── Cancel active contract ───────────────────────────────────
      const { error: contractError } = await serverSupabase
        .from('contracts')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('job_id', jobId)
        .in('status', [
          'draft',
          'pending_homeowner',
          'pending_contractor',
          'accepted',
        ]);

      if (contractError) {
        logger.error(
          'Failed to cancel contract during contractor withdraw',
          contractError,
          { service: 'jobs', jobId }
        );
        // Non-fatal — contract cancel can be reconciled by admin later.
      }

      // ─── Mark the contractor's accepted bid as withdrawn ──────────
      // `withdrawn` is the canonical status used by the bid-withdraw
      // route for not-yet-accepted bids — re-using here keeps the
      // analytics + dashboard counters consistent.
      //
      // 2026-05-24 audit-29 P1: previously demoted this failure to a
      // logger.warn and continued straight into the job-status reset.
      // That left a window where the job flipped back to 'posted' while
      // the contractor's old bid stayed status='accepted' — the homeowner
      // would reopen the listing with a stale accepted bid still pointing
      // at the departed contractor, blocking re-acceptance and confusing
      // contract/payment state. Now: bidErr is fatal. Escrow has already
      // been refunded by this point and the contract is cancelled, so a
      // retry path would hit the duplicate-refund branch on Stripe (idempo
      // key on the Stripe call) and the contract update is a no-op when
      // the status is already 'cancelled'. The accepted bid is the only
      // remaining piece that must succeed before we reopen the job.
      const { error: bidErr } = await serverSupabase
        .from('bids')
        .update({ status: 'withdrawn', updated_at: new Date().toISOString() })
        .eq('job_id', jobId)
        .eq('contractor_id', user.id)
        .eq('status', 'accepted');

      if (bidErr) {
        logger.error('Failed to mark accepted bid as withdrawn', bidErr, {
          service: 'jobs',
          jobId,
          contractorId: user.id,
        });
        throw new BadRequestError(
          'Failed to complete withdrawal — your accepted bid could not be released. ' +
            'Please retry; if this persists contact support so we can clear the bid manually before the job reopens.'
        );
      }

      // ─── Reset job back to posted ─────────────────────────────────
      const { error: jobUpdateErr } = await serverSupabase
        .from('jobs')
        .update({
          status: JOB_STATUS.POSTED,
          contractor_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId);

      if (jobUpdateErr) {
        logger.error(
          'Failed to reset job after contractor withdraw',
          jobUpdateErr,
          {
            service: 'jobs',
            jobId,
          }
        );
        throw new BadRequestError(
          'Failed to complete withdrawal. Please try again.'
        );
      }

      // ─── Notify homeowner ─────────────────────────────────────────
      try {
        // 2026-05-21 Mint Editorial voice — name the change, state where
        // the money is, point at the next step.
        await NotificationService.createNotification({
          userId: homeownerId,
          title: `${job.title || 'A job'} — contractor stepped back`,
          message: escrowRefunded
            ? `${reason} — payment refunded. The job's reopened for new bids.`
            : `${reason} — the job's reopened for new bids. Your escrow stays held until it's reassigned.`,
          type: 'job_terminated',
          actionUrl: `/jobs/${jobId}`,
          metadata: {
            jobId,
            escrowRefunded,
            reason,
          },
        });
      } catch (notificationError) {
        logger.error(
          'Failed to send contractor-withdraw notification',
          notificationError,
          {
            service: 'jobs',
            jobId,
            homeownerId,
          }
        );
      }

      logger.info('Contractor withdrew from job', {
        service: 'jobs',
        jobId,
        contractorId: user.id,
        homeownerId,
        reason,
        escrowRefunded,
        previousStatus: job.status,
      });

      const responseData = {
        success: true,
        message:
          'You have withdrawn from this job. The homeowner has been notified and the job is open for new bids.',
        escrowRefunded,
      };

      await storeIdempotencyResult(
        idempotencyKey,
        'contractor_withdraw',
        responseData,
        user.id,
        { jobId, homeownerId }
      );

      return NextResponse.json(responseData);
    } catch (err) {
      try {
        await releaseIdempotencyClaim(idempotencyKey, 'contractor_withdraw');
      } catch {
        // intentional: don't let release failure mask the original error
      }
      throw err;
    }
  }
);
