import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; bidId: string }> }
) {
  try {
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
      console.error('Failed to fetch job', {
        service: 'jobs',
        jobId,
        error: jobError?.message,
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
      console.error('Failed to fetch bid', {
        service: 'jobs',
        bidId,
        error: bidError?.message,
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
      console.error('Failed to reject bid', {
        service: 'jobs',
        bidId,
        error: rejectError.message,
      });
      return NextResponse.json({ error: 'Failed to reject bid' }, { status: 500 });
    }

    console.log('Bid rejected successfully', {
      service: 'jobs',
      bidId,
      jobId,
    });

    return NextResponse.json({
      success: true,
      message: 'Bid rejected successfully',
    });
  } catch (error) {
    console.error('Unexpected error in reject bid', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

