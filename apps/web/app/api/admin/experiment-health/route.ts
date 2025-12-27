import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminError } from '@/lib/middleware/requireAdmin';
import { getExperimentHealth } from '@/lib/monitoring/experimentHealth';
import { logger } from '@mintenance/shared';
import { handleAPIError, BadRequestError } from '@/lib/errors/api-error';

const AB_TEST_EXPERIMENT_ID = process.env.AB_TEST_EXPERIMENT_ID;

/**
 * GET /api/admin/experiment-health
 *
 * Returns aggregated experiment health metrics for the A/B test experiment.
 * Admin-only endpoint.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (isAdminError(auth)) return auth.error;
    const user = auth.user;

    // Get experiment ID from query params or env
    const searchParams = request.nextUrl.searchParams;
    const experimentId = searchParams.get('experimentId') || AB_TEST_EXPERIMENT_ID;

    if (!experimentId) {
      throw new BadRequestError('A/B testing not configured - no experiment ID');
    }

    // Get experiment health
    const health = await getExperimentHealth(experimentId);

    return NextResponse.json(health);
  } catch (error) {
    return handleAPIError(error);
  }
}

