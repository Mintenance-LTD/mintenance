import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { NotificationService } from '@/lib/services/notifications/NotificationService';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { NotFoundError, BadRequestError } from '@/lib/errors/api-error';

export const POST = withApiHandler(
  { roles: ['contractor'] },
  async (_request, { user, params }) => {
    const jobId = params.id;
    const bidId = params.bidId;

    // Verify the bid exists, belongs to this contractor, and is still pending
    const { data: bid, error: bidError } = await serverSupabase
      .from('bids')
      .select('id, job_id, contractor_id, status')
      .eq('id', bidId)
      .eq('job_id', jobId)
      .single();

    if (bidError || !bid) {
      throw new NotFoundError('Bid not found');
    }

    if (bid.contractor_id !== user.id) {
      throw new NotFoundError('Bid not found');
    }

    if (bid.status !== 'pending') {
      throw new BadRequestError(`Cannot withdraw a bid that is already ${bid.status}`);
    }

    // Withdraw the bid
    const { error: withdrawError } = await serverSupabase
      .from('bids')
      .update({ status: 'withdrawn' })
      .eq('id', bidId);

    if (withdrawError) {
      logger.error('Failed to withdraw bid', withdrawError, { service: 'jobs', bidId, jobId });
      throw withdrawError;
    }

    logger.info('Bid withdrawn successfully', {
      service: 'jobs',
      bidId,
      jobId,
      contractorId: user.id,
    });

    // Notify the homeowner
    try {
      const { data: job } = await serverSupabase
        .from('jobs')
        .select('homeowner_id, title')
        .eq('id', jobId)
        .single();

      if (job?.homeowner_id) {
        const { data: contractor } = await serverSupabase
          .from('profiles')
          .select('full_name, company_name')
          .eq('id', user.id)
          .single();

        const contractorName = contractor?.company_name || contractor?.full_name || 'A contractor';

        await NotificationService.createNotification({
          userId: job.homeowner_id,
          title: 'Bid Withdrawn',
          message: `${contractorName} has withdrawn their bid for "${job.title || 'your job'}".`,
          type: 'bid_withdrawn',
          actionUrl: `/jobs/${jobId}`,
        });
      }
    } catch (notificationError) {
      logger.error('Failed to send bid withdrawal notification', notificationError, {
        service: 'jobs',
        bidId,
        jobId,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Bid withdrawn successfully',
    });
  }
);
