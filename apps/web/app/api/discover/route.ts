import { NextRequest, NextResponse } from 'next/server';
import type { ContractorSummary } from '@mintenance/types/src/contracts';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { logger } from '@mintenance/shared';
import { handleAPIError, UnauthorizedError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';

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
      throw new UnauthorizedError('Authentication required to discover contractors');
    }

    const params = new URL(request.url).searchParams;
    const filters = {
      q: params.get('q') ?? null,
      category: params.get('category') ?? null,
      minRating: params.get('min_rating') ? Number(params.get('min_rating')) : null,
      lat: params.get('lat') ? Number(params.get('lat')) : null,
      lng: params.get('lng') ? Number(params.get('lng')) : null,
      radiusKm: params.get('radius_km') ? Number(params.get('radius_km')) : null,
      limit: Math.min(Number(params.get('limit') ?? 20), 50),
      cursor: params.get('cursor'),
    };

    const contractors: ContractorSummary[] = [];

    return NextResponse.json({ contractors, nextCursor: null, filters });
  } catch (err) {
    return handleAPIError(err);
  }
}