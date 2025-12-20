import { NextRequest, NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { logger } from '@mintenance/shared';

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
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify user owns the job or is the contractor
    const { data: job, error: jobError } = await serverSupabase
      .from('jobs')
      .select('id, homeowner_id, contractor_id')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    // Only homeowner can see who viewed their job
    if (job.homeowner_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
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
      return NextResponse.json(
        { error: 'Failed to fetch viewers' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      viewers: views || [],
    });
  } catch (error) {
    logger.error('Error in viewers route', error, {
      service: 'jobs',
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

