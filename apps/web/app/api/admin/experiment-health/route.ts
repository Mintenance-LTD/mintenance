import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminError } from '@/lib/middleware/requireAdmin';
import { getExperimentHealth } from '@/lib/monitoring/experimentHealth';
import { logger } from '@mintenance/shared';
import { handleAPIError, BadRequestError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';

const AB_TEST_EXPERIMENT_ID = process.env.AB_TEST_EXPERIMENT_ID;

/**
 * GET /api/admin/experiment-health
 *
 * Returns aggregated experiment health metrics for the A/B test experiment.
 * Admin-only endpoint.
 */
export async function GET(request: NextRequest) {
  try {
  // Rate limiting check
  const rateLimitResult = await rateLimiter.checkRateLimit({
    identifier: `${request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'anonymous'}:${request.url}`,
    windowMs: 60000,
    maxRequests: 10
  });

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimitResult.retryAfter || 60),
          'X-RateLimit-Limit': String(10),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
        }
      }
    );
  }

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

