import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { logger } from '@mintenance/shared';
import { handleAPIError, UnauthorizedError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';

export async function GET(request: NextRequest) {
  try {
  // Rate limiting check - generous limit for session checks (IP-based, not per-URL)
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'anonymous';
  const rateLimitResult = await rateLimiter.checkRateLimit({
    identifier: `session:${ip}`,
    windowMs: 60000,
    maxRequests: 100
  });

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimitResult.retryAfter || 60),
          'X-RateLimit-Limit': String(100),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
        }
      }
    );
  }

    const user = await getCurrentUser();

    if (!user) {
      logger.debug('Session check - no user', { service: 'auth' });
      throw new UnauthorizedError('No active session');
    }

    logger.debug('Session retrieved', { service: 'auth', userId: user.id });
    return NextResponse.json({ user });
  } catch (error) {
    return handleAPIError(error);
  }
}

