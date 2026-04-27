import { NextResponse } from 'next/server';
import {
  serverSupabase,
  createRequestScopedClient,
} from '@/lib/api/supabaseServer';
import { logger, BID_STATUS } from '@mintenance/shared';
import { withApiHandler } from '@/lib/api/with-api-handler';
import {
  ForbiddenError,
  NotFoundError,
  BadRequestError,
} from '@/lib/errors/api-error';

/**
 * POST /api/jobs/[id]/bids/[bidId]/unreject
 *
 * Reverses a recent rejection — used by the BidReview undo banner
 * (#1 step 4d). The bid state machine treats REJECTED as terminal,
 * so this endpoint deliberately bypasses `validateBidTransition` for
 * this single transition (REJECTED → PENDING) under a tight set of
 * safeguards:
 *
 *   1. Caller must be the homeowner of the job (matches reject route).
 *   2. The bid must currently be REJECTED.
 *   3. The bid must have been updated (rejected) within the last 60s.
 *      That bounds the undo window to roughly the snackbar lifetime
 *      and prevents a future caller from "undoing" rejections that
 *      have long since been seen / acted on by the contractor.
 *
 * If those pass, status flips back to PENDING and `rejection_reason`
 * is cleared. The earlier rejection notification stays in the
 * contractor's inbox — there's no clean way to "un-send" it without
 * adding a new column. UX is acceptable: the contractor sees both
 * the rejection and a follow-up state where the homeowner is
 * actively reviewing again.
 */
const UNDO_WINDOW_MS = 60_000;

export const POST = withApiHandler(
  { roles: ['homeowner'] },
  async (request, { user, params }) => {
    const userDb = createRequestScopedClient(request) ?? serverSupabase;
    const jobId = params.id;
    const bidId = params.bidId;

    // Verify the job belongs to this homeowner.
    const { data: job, error: jobError } = await userDb
      .from('jobs')
      .select('homeowner_id')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      logger.error(
        'Failed to fetch job',
        jobError || new Error('Job not found'),
        {
          service: 'jobs',
          jobId,
        }
      );
      throw new NotFoundError('Job not found');
    }

    if (job.homeowner_id !== user.id) {
      throw new ForbiddenError('Not authorized to unreject bids for this job');
    }

    // Verify the bid currently is REJECTED + still inside the
    // undo window.
    const { data: bid, error: bidError } = await userDb
      .from('bids')
      .select('id, job_id, status, updated_at')
      .eq('id', bidId)
      .eq('job_id', jobId)
      .single();

    if (bidError || !bid) {
      logger.error(
        'Failed to fetch bid',
        bidError || new Error('Bid not found'),
        {
          service: 'jobs',
          bidId,
          jobId,
        }
      );
      throw new NotFoundError('Bid not found');
    }

    if (bid.status !== BID_STATUS.REJECTED) {
      throw new BadRequestError(
        `Cannot undo: bid is currently '${bid.status}', not 'rejected'.`
      );
    }

    const updatedAt = bid.updated_at ? new Date(bid.updated_at).getTime() : 0;
    const elapsed = Date.now() - updatedAt;
    if (elapsed > UNDO_WINDOW_MS) {
      throw new BadRequestError(
        `Undo window has expired (rejection happened ${Math.round(elapsed / 1000)}s ago, max ${UNDO_WINDOW_MS / 1000}s).`
      );
    }

    const { error: updateError } = await serverSupabase
      .from('bids')
      .update({
        status: BID_STATUS.PENDING,
        rejection_reason: null,
      })
      .eq('id', bidId);

    if (updateError) {
      logger.error('Failed to unreject bid', updateError, {
        service: 'jobs',
        bidId,
        jobId,
      });
      throw updateError;
    }

    logger.info('Bid rejection reversed', {
      service: 'jobs',
      bidId,
      jobId,
      homeownerId: user.id,
      elapsedMs: elapsed,
    });

    return NextResponse.json({
      success: true,
      message: 'Bid rejection reversed',
    });
  }
);
