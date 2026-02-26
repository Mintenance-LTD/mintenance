import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { BadRequestError, NotFoundError, ConflictError } from '@/lib/errors/api-error';
import { withApiHandler } from '@/lib/api/with-api-handler';

/**
 * GET /api/contractor/saved-jobs - Get list of saved job IDs
 * POST /api/contractor/saved-jobs - Save a job
 * DELETE /api/contractor/saved-jobs?jobId=... - Unsave a job
 */
export const GET = withApiHandler(
  { roles: ['contractor'], rateLimit: { maxRequests: 30 } },
  async (_request, { user }) => {
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
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (savedJobsError) {
      logger.error('Error fetching saved jobs', savedJobsError, { service: 'saved_jobs', userId: user.id });
      throw savedJobsError;
    }

    const jobIds = (savedJobs || []).map(saved => saved.job_id).filter(Boolean);

    return NextResponse.json({ jobIds, savedJobs: savedJobs || [] });
  }
);

export const POST = withApiHandler(
  { roles: ['contractor'], rateLimit: { maxRequests: 30 } },
  async (request, { user }) => {
    // Check subscription requirement
    const { requireSubscriptionForAction } = await import('@/lib/middleware/subscription-check');
    const subscriptionCheck = await requireSubscriptionForAction(request, 'save_job');
    if (subscriptionCheck) return subscriptionCheck;

    const body = await request.json();
    const { jobId } = body;

    if (!jobId || typeof jobId !== 'string') throw new BadRequestError('Job ID is required');

    // Verify job exists
    const { data: job, error: jobError } = await serverSupabase
      .from('jobs')
      .select('id')
      .eq('id', jobId)
      .single();

    if (jobError || !job) throw new NotFoundError('Job not found');

    // Check if already saved
    const { data: existing } = await serverSupabase
      .from('saved_jobs')
      .select('id')
      .eq('user_id', user.id)
      .eq('job_id', jobId)
      .single();

    if (existing) throw new ConflictError('Job already saved');

    const { error: saveError } = await serverSupabase
      .from('saved_jobs')
      .insert({ user_id: user.id, job_id: jobId, created_at: new Date().toISOString() });

    if (saveError) {
      logger.error('Error saving job', saveError, { service: 'saved_jobs', userId: user.id, jobId });
      throw saveError;
    }

    // Notify homeowner
    const { data: jobDetails } = await serverSupabase
      .from('jobs')
      .select('title, homeowner_id')
      .eq('id', jobId)
      .single();

    if (jobDetails?.homeowner_id) {
      await serverSupabase.from('notifications').insert({
        user_id: jobDetails.homeowner_id,
        type: 'job_saved',
        title: 'Your job was saved',
        message: `A contractor saved your job "${jobDetails.title}"`,
        data: { job_id: jobId, contractor_id: user.id, action: 'saved' },
        is_read: false,
        created_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({ success: true, message: 'Job saved successfully' });
  }
);

export const DELETE = withApiHandler(
  { roles: ['contractor'], rateLimit: { maxRequests: 30 } },
  async (request, { user }) => {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) throw new BadRequestError('Job ID is required');

    const { error: deleteError } = await serverSupabase
      .from('saved_jobs')
      .delete()
      .eq('user_id', user.id)
      .eq('job_id', jobId);

    if (deleteError) {
      logger.error('Error unsaving job', deleteError, { service: 'saved_jobs', userId: user.id, jobId });
      throw deleteError;
    }

    return NextResponse.json({ success: true, message: 'Job unsaved successfully' });
  }
);
