import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';

/**
 * Get job IDs that the contractor has viewed
 * GET /api/jobs/viewed
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUserFromCookies();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only contractors can view their viewed jobs list
    if (user.role !== 'contractor') {
      return NextResponse.json({ error: 'Only contractors can view their job views' }, { status: 403 });
    }

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
      return NextResponse.json({ error: 'Failed to fetch viewed jobs' }, { status: 500 });
    }

    // Extract job IDs
    const jobIds = (jobViews || []).map(view => view.job_id).filter(Boolean);

    logger.info('Found viewed jobs for contractor', {
      service: 'jobs',
      userId: user.id,
      count: jobIds.length,
    });

    return NextResponse.json({ jobIds });
  } catch (error) {
    logger.error('Unexpected error in GET /api/jobs/viewed', error, {
      service: 'jobs',
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

