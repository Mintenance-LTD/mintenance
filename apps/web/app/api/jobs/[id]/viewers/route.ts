import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { ForbiddenError, NotFoundError } from '@/lib/errors/api-error';
import { withApiHandler } from '@/lib/api/with-api-handler';

/**
 * GET /api/jobs/[id]/viewers - get contractors who viewed a job.
 */
export const GET = withApiHandler({}, async (_request, { user, params }) => {
  const jobId = params.id;

  // Verify user owns the job
  const { data: job, error: jobError } = await serverSupabase
    .from('jobs')
    .select('id, homeowner_id, contractor_id')
    .eq('id', jobId)
    .single();

  if (jobError || !job) {
    throw new NotFoundError('Job not found');
  }

  if (job.homeowner_id !== user.id) {
    throw new ForbiddenError('Only the job owner can view job viewers');
  }

  const { data: views, error: viewsError } = await serverSupabase
    .from('job_views')
    .select(`
      id,
      contractor_id,
      viewed_at,
      contractor:profiles!job_views_contractor_id_fkey (
        id,
        first_name,
        last_name,
        email,
        phone,
        profile_image_url,
        location
      )
    `)
    .eq('job_id', jobId)
    .order('viewed_at', { ascending: false });

  if (viewsError) {
    logger.error('Error fetching viewers', viewsError, {
      service: 'jobs',
      jobId,
      userId: user.id,
    });
    throw viewsError;
  }

  return NextResponse.json({ viewers: views || [] });
});
