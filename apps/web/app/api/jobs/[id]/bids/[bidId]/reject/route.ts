import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  serverSupabase,
  createRequestScopedClient,
} from '@/lib/api/supabaseServer';
import {
  logger,
  validateBidTransition,
  BID_STATUS,
  type BidStatusValue,
} from '@mintenance/shared';
import { NotificationService } from '@/lib/services/notifications/NotificationService';
import { withApiHandler } from '@/lib/api/with-api-handler';
import {
  ForbiddenError,
  NotFoundError,
  BadRequestError,
} from '@/lib/errors/api-error';

// 2026-05-01 audit follow-up (check-api-contracts): optional rejection
// reason is now Zod-validated. Body is allowed to be empty (no reason
// provided) — the schema's optional + max-500 cap mirrors the prior
// `body?.reason.slice(0, 500)` cap.
const bidRejectSchema = z
  .object({
    reason: z.string().max(500).optional(),
  })
  .strict();

export const POST = withApiHandler(
  { roles: ['homeowner'] },
  async (request, { user, params }) => {
    const userDb = createRequestScopedClient(request) ?? serverSupabase;
    const jobId = params.id;
    const bidId = params.bidId;

    // Verify the job belongs to this homeowner (user-scoped read)
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
      throw new ForbiddenError('Not authorized to reject bids for this job');
    }

    // Verify the bid exists and belongs to this job (user-scoped read).
    // `quote_id` is selected too — if the contractor sent a quote tied
    // to this bid, we flip the quote → declined further down so the
    // contractor's funnel stats stay accurate (see 2026-05-13 quote↔bid
    // pipeline closure).
    const { data: bid, error: bidError } = await userDb
      .from('bids')
      .select('id, job_id, status, quote_id')
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

    // Validate bid transition using state machine
    validateBidTransition(
      bid.status as BidStatusValue,
      BID_STATUS.REJECTED as BidStatusValue
    );

    // Parse optional rejection reason from body. Body may be empty —
    // safeParse on an undefined `reason` is allowed by the schema.
    let reason: string | undefined;
    try {
      const raw = await request.json();
      const parsed = bidRejectSchema.safeParse(raw);
      if (parsed.success) {
        reason = parsed.data.reason;
      }
    } catch {
      // No body or invalid JSON — reason is optional
    }

    // Reject the bid (with optional reason)
    const updateData: Record<string, unknown> = { status: BID_STATUS.REJECTED };
    if (reason) {
      updateData.rejection_reason = reason;
    }
    const { error: rejectError } = await serverSupabase
      .from('bids')
      .update(updateData)
      .eq('id', bidId);

    if (rejectError) {
      logger.error('Failed to reject bid', rejectError, {
        service: 'jobs',
        bidId,
        jobId,
      });
      throw rejectError;
    }

    logger.info('Bid rejected successfully', {
      service: 'jobs',
      bidId,
      jobId,
      homeownerId: user.id,
    });

    // Mirror outcome onto linked contractor_quotes row (see helper docs
    // on the accept route).
    //
    // 2026-05-26 audit-59 P2: previously this used a detached `.then()`
    // chain that the Vercel serverless function frequently returned
    // before resolving — leaving contractor_quotes.status='sent'
    // even after the bid was rejected. Live-DB audit on 2026-05-26
    // counted 7 accepted bids in that drifted state across accept +
    // reject paths. Await the update so the route response reflects
    // the final quote state; failure is still non-fatal (logged but
    // doesn't fail the reject).
    if (bid.quote_id) {
      const { error: quoteUpdateError } = await serverSupabase
        .from('contractor_quotes')
        .update({
          status: 'declined',
          updated_at: new Date().toISOString(),
        })
        .eq('id', bid.quote_id);
      if (quoteUpdateError) {
        logger.warn('Failed to flip linked quote → declined', {
          service: 'quotes',
          quoteId: bid.quote_id,
          bidId,
          error: quoteUpdateError.message,
        });
      }
    }

    // Send notification to the contractor whose bid was rejected
    try {
      const { data: bidWithContractor } = await serverSupabase
        .from('bids')
        .select('contractor_id')
        .eq('id', bidId)
        .single();

      if (bidWithContractor?.contractor_id) {
        const { data: jobData } = await serverSupabase
          .from('jobs')
          .select('title')
          .eq('id', jobId)
          .single();

        await NotificationService.createNotification({
          userId: bidWithContractor.contractor_id,
          title: 'Bid Not Selected',
          message: `Your bid for "${jobData?.title || 'a job'}" was not selected. Keep bidding on other jobs to find your next project.`,
          type: 'bid_rejected',
          actionUrl: `/contractor/discover`,
        });
      }
    } catch (notificationError) {
      logger.error(
        'Failed to send bid rejection notification',
        notificationError,
        {
          service: 'jobs',
          bidId,
          jobId,
        }
      );
      // Don't fail the request if notification fails
    }

    return NextResponse.json({
      success: true,
      message: 'Bid rejected successfully',
    });
  }
);
