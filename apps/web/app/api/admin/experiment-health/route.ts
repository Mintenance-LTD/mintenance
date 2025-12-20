import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { getExperimentHealth } from '@/lib/monitoring/experimentHealth';
import { logger } from '@mintenance/shared';

const AB_TEST_EXPERIMENT_ID = process.env.AB_TEST_EXPERIMENT_ID;

/**
 * GET /api/admin/experiment-health
 *
 * Returns aggregated experiment health metrics for the A/B test experiment.
 * Admin-only endpoint.
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getCurrentUserFromCookies();

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized - admin access required' }, { status: 401 });
    }

    // Get experiment ID from query params or env
    const searchParams = request.nextUrl.searchParams;
    const experimentId = searchParams.get('experimentId') || AB_TEST_EXPERIMENT_ID;

    if (!experimentId) {
      return NextResponse.json(
        { error: 'A/B testing not configured - no experiment ID' },
        { status: 503 }
      );
    }

    // Get experiment health
    const health = await getExperimentHealth(experimentId);

    return NextResponse.json(health);
  } catch (error) {
    logger.error('Error fetching experiment health', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch experiment health',
        experimentId: AB_TEST_EXPERIMENT_ID || null,
      },
      { status: 500 }
    );
  }
}

