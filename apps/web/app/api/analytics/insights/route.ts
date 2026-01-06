import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { ContractorAnalyticsService } from '@/lib/services/ContractorAnalyticsService';
import { logger } from '@mintenance/shared';
import { rateLimiter } from '@/lib/rate-limiter';

export async function GET(request: NextRequest) {
  let userId: string | undefined;
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
    userId = user?.id;

    if (!user || user.role !== 'contractor') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const insights = await ContractorAnalyticsService.getPerformanceInsights(user.id);

    return NextResponse.json({ insights });
  } catch (error: unknown) {
    logger.error('Error fetching analytics insights', error, {
      service: 'analytics',
      userId,
    });
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch insights';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

