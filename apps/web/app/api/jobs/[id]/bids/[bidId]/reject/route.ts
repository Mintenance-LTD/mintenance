import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { requireCSRF } from '@/lib/csrf';
import { logger } from '@mintenance/shared';

export async function POST(  request: NextRequest,
  { params }: { params: Promise<{ id: string; bidId: string }> }
) {
  try {
    // CSRF protection
    await requireCSRF(request);
    const { id: jobId, bidId } = await params;
    const user = await getCurrentUserFromCookies();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'homeowner') {
      return NextResponse.json({ error: 'Only homeowners can reject bids' }, { status: 403 });
    }

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
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (job.homeowner_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized to reject bids for this job' }, { status: 403 });
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
      return NextResponse.json({ error: 'Bid not found' }, { status: 404 });
    }

    if (bid.status === 'rejected') {
      return NextResponse.json({ error: 'Bid has already been rejected' }, { status: 400 });
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
      return NextResponse.json({ error: 'Failed to reject bid' }, { status: 500 });
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
  } catch (error) {
    logger.error('Unexpected error in reject bid', error, {
      service: 'jobs',
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

