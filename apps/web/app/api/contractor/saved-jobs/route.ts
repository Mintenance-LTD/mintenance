import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { requireCSRF } from '@/lib/csrf';
import { logger } from '@mintenance/shared';

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

    // Fetch saved jobs with full job data for this contractor
    const { data: savedJobs, error: savedJobsError } = await serverSupabase
      .from('saved_jobs')
      .select(`
        id,
        job_id,
        created_at,
        job:jobs (
          id,
          title,
          description,
          budget,
          location,
          category,
          priority,
          status,
          photos,
          created_at,
          latitude,
          longitude,
          homeowner:homeowner_id (
            id,
            first_name,
            last_name,
            profile_image_url
          )
        )
      `)
      .eq('contractor_id', user.id)
      .order('created_at', { ascending: false });

    if (savedJobsError) {
      logger.error('Error fetching saved jobs', savedJobsError, {
        service: 'saved_jobs',
        userId: user.id,
      });
      return NextResponse.json({ error: 'Failed to fetch saved jobs' }, { status: 500 });
    }

    // Extract job IDs for backward compatibility
    const jobIds = (savedJobs || []).map(saved => saved.job_id).filter(Boolean);

    // Return both formats for compatibility
    return NextResponse.json({
      jobIds,
      savedJobs: savedJobs || []
    });
  } catch (error) {
    logger.error('Unexpected error in GET /api/contractor/saved-jobs', error, {
      service: 'saved_jobs',
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    
    // CSRF protection
    await requireCSRF(request);
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
      logger.error('Error saving job', saveError, {
        service: 'saved_jobs',
        userId: user.id,
        jobId,
      });
      return NextResponse.json({ error: 'Failed to save job' }, { status: 500 });
    }

    // Get job details for notification
    const { data: jobDetails } = await serverSupabase
      .from('jobs')
      .select('title, homeowner_id')
      .eq('id', jobId)
      .single();

    if (jobDetails?.homeowner_id) {
      // Create notification for homeowner
      await serverSupabase
        .from('notifications')
        .insert({
          user_id: jobDetails.homeowner_id,
          type: 'job_saved',
          title: 'Your job was saved',
          message: `A contractor saved your job "${jobDetails.title}"`,
          data: {
            job_id: jobId,
            contractor_id: user.id,
            action: 'saved',
          },
          is_read: false,
          created_at: new Date().toISOString(),
        });
    }

    return NextResponse.json({ success: true, message: 'Job saved successfully' });
  } catch (error) {
    logger.error('Unexpected error in POST /api/contractor/saved-jobs', error, {
      service: 'saved_jobs',
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // CSRF protection
    await requireCSRF(request);
    const user = await getCurrentUserFromCookies();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'contractor') {
      return NextResponse.json({ error: 'Only contractors can unsave jobs' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
    }

    // Delete the saved job
    const { error: deleteError } = await serverSupabase
      .from('saved_jobs')
      .delete()
      .eq('contractor_id', user.id)
      .eq('job_id', jobId);

    if (deleteError) {
      logger.error('Error unsaving job', deleteError, {
        service: 'saved_jobs',
        userId: user.id,
        jobId,
      });
      return NextResponse.json({ error: 'Failed to unsave job' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Job unsaved successfully' });
  } catch (error) {
    logger.error('Unexpected error in DELETE /api/contractor/saved-jobs', error, {
      service: 'saved_jobs',
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

