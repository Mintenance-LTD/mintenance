import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { getExperimentHealth } from '@/lib/monitoring/experimentHealth';
import { BadRequestError } from '@/lib/errors/api-error';

const AB_TEST_EXPERIMENT_ID = process.env.AB_TEST_EXPERIMENT_ID;

/**
 * GET /api/admin/experiment-health
 * Returns aggregated experiment health metrics for the A/B test experiment.
 */
export const GET = withApiHandler(
  { roles: ['admin'], rateLimit: { maxRequests: 10 } },
  async (request) => {
    const experimentId = request.nextUrl.searchParams.get('experimentId') || AB_TEST_EXPERIMENT_ID;

    if (!experimentId) {
      throw new BadRequestError('A/B testing not configured - no experiment ID');
    }

    const health = await getExperimentHealth(experimentId);
    return NextResponse.json(health);
  }
);
