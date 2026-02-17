import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { ForbiddenError, NotFoundError, BadRequestError } from '@/lib/errors/api-error';

export const POST = withApiHandler(
  { roles: ['homeowner'] },
  async (_request, { user, params }) => {
    const jobId = params.id;
    const bidId = params.bidId;

    // Verify the job belongs to this homeowner
    const { data: job, error: jobError } = await serverSupabase
      .from('jobs')
      .select('homeowner_id')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      logger.error('Failed to fetch job', jobError || new Error('Job not found'), {
        service: 'jobs',
        jobId,
      });
      throw new NotFoundError('Job not found');
    }

    if (job.homeowner_id !== user.id) {
      throw new ForbiddenError('Not authorized to reject bids for this job');
    }

    // Verify the bid exists and belongs to this job
    const { data: bid, error: bidError } = await serverSupabase
      .from('bids')
      .select('id, job_id, status')
      .eq('id', bidId)
      .eq('job_id', jobId)
      .single();

    if (bidError || !bid) {
      logger.error('Failed to fetch bid', bidError || new Error('Bid not found'), {
        service: 'jobs',
        bidId,
        jobId,
      });
      throw new NotFoundError('Bid not found');
    }

    if (bid.status === 'rejected') {
      throw new BadRequestError('Bid has already been rejected');
    }

    // Reject the bid
    const { error: rejectError } = await serverSupabase
      .from('bids')
      .update({ status: 'rejected' })
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

    return NextResponse.json({
      success: true,
      message: 'Bid rejected successfully',
    });
  }
);
