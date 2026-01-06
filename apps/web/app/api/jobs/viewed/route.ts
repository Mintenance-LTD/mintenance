import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { handleAPIError, UnauthorizedError, ForbiddenError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';

/**
 * Get job IDs that the contractor has viewed
 * GET /api/jobs/viewed
 */
export async function GET(request: NextRequest) {
  try {
  // Rate limiting check
  const rateLimitResult = await rateLimiter.checkRateLimit({
    identifier: `${request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'anonymous'}:${request.url}`,
    windowMs: 60000,
    maxRequests: 30
  });

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimitResult.retryAfter || 60),
          'X-RateLimit-Limit': String(30),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
        }
      }
    );
  }

    const user = await getCurrentUserFromCookies();

    if (!user) {
      throw new UnauthorizedError('Authentication required to view job history');
    }

    // Only contractors can view their viewed jobs list
    if (user.role !== 'contractor') {
      throw new ForbiddenError('Only contractors can view their job views');
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
  } catch (error) {
    return handleAPIError(error);
  }
}

