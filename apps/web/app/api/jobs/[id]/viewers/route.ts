import { NextRequest, NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { logger } from '@mintenance/shared';
import { handleAPIError, UnauthorizedError, ForbiddenError, NotFoundError } from '@/lib/errors/api-error';

/**
 * Get contractors who viewed a job
 * GET /api/jobs/[id]/viewers
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const jobId = resolvedParams.id;
    const user = await getCurrentUserFromCookies();

    if (!user) {
      throw new UnauthorizedError('Authentication required to view job viewers');
    }

    // Verify user owns the job or is the contractor
    const { data: job, error: jobError } = await serverSupabase
      .from('jobs')
      .select('id, homeowner_id, contractor_id')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      throw new NotFoundError('Job not found');
    }

    // Only homeowner can see who viewed their job
    if (job.homeowner_id !== user.id) {
      throw new ForbiddenError('Only the job owner can view job viewers');
    }

    // Fetch viewers with contractor info
    const { data: views, error: viewsError } = await serverSupabase
      .from('job_views')
      .select(`
        id,
        contractor_id,
        viewed_at,
        contractor:users!job_views_contractor_id_fkey (
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

    return NextResponse.json({
      viewers: views || [],
    });
  } catch (error) {
    return handleAPIError(error);
  }
}

