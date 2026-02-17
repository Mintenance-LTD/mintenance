import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { withApiHandler } from '@/lib/api/with-api-handler';

/**
 * Get job IDs that the contractor has viewed
 * GET /api/jobs/viewed
 */
export const GET = withApiHandler(
  { csrf: false },
  async (_request, { user }) => {
    // Fetch job IDs that the contractor has viewed
    const { data: jobViews, error: viewsError } = await serverSupabase
      .from('job_views')
      .select('job_id')
      .eq('contractor_id', user.id);

    if (viewsError) {
      logger.error('Error fetching viewed jobs', viewsError, {
        service: 'jobs',
        userId: user.id,
      });
      throw viewsError;
    }

    // Extract job IDs
    const jobIds = (jobViews || []).map(view => view.job_id).filter(Boolean);

    logger.info('Found viewed jobs for contractor', {
      service: 'jobs',
      userId: user.id,
      count: jobIds.length,
    });

    return NextResponse.json({ jobIds });
  }
);
