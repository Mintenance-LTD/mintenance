import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';

/**
 * Get saved jobs for contractor or save a job
 * GET /api/contractor/saved-jobs - Get list of saved job IDs
 * POST /api/contractor/saved-jobs - Save a job
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUserFromCookies();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'contractor') {
      return NextResponse.json({ error: 'Only contractors can view saved jobs' }, { status: 403 });
    }

    // Fetch saved job IDs for this contractor
    const { data: savedJobs, error: savedJobsError } = await serverSupabase
      .from('saved_jobs')
      .select('job_id')
      .eq('contractor_id', user.id)
      .order('created_at', { ascending: false });

    if (savedJobsError) {
      console.error('Error fetching saved jobs:', savedJobsError);
      return NextResponse.json({ error: 'Failed to fetch saved jobs' }, { status: 500 });
    }

    // Extract job IDs
    const jobIds = (savedJobs || []).map(saved => saved.job_id).filter(Boolean);

    return NextResponse.json({ jobIds });
  } catch (error) {
    console.error('Unexpected error in GET /api/contractor/saved-jobs', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUserFromCookies();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'contractor') {
      return NextResponse.json({ error: 'Only contractors can save jobs' }, { status: 403 });
    }

    // Check subscription requirement
    const { requireSubscriptionForAction } = await import('@/lib/middleware/subscription-check');
    const subscriptionCheck = await requireSubscriptionForAction(request, 'save_job');
    if (subscriptionCheck) {
      return subscriptionCheck;
    }

    const body = await request.json();
    const { jobId } = body;

    if (!jobId || typeof jobId !== 'string') {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
    }

    // Verify job exists
    const { data: job, error: jobError } = await serverSupabase
      .from('jobs')
      .select('id')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Check if already saved
    const { data: existing } = await serverSupabase
      .from('saved_jobs')
      .select('id')
      .eq('contractor_id', user.id)
      .eq('job_id', jobId)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'Job already saved' }, { status: 409 });
    }

    // Save the job
    const { error: saveError } = await serverSupabase
      .from('saved_jobs')
      .insert({
        contractor_id: user.id,
        job_id: jobId,
        created_at: new Date().toISOString(),
      });

    if (saveError) {
      console.error('Error saving job:', saveError);
      return NextResponse.json({ error: 'Failed to save job' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Job saved successfully' });
  } catch (error) {
    console.error('Unexpected error in POST /api/contractor/saved-jobs', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

