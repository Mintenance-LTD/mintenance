import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { logger } from '@mintenance/shared';
import { handleAPIError, UnauthorizedError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';

export async function GET(request: NextRequest) {
  // E2E Test Mode: Return mock user ONLY when Playwright sends the E2E header.
  // This prevents real users from seeing test-homeowner@example.com when PLAYWRIGHT_TEST
  // is left true in .env.local (e.g. after running playwright test).
  const e2eTestHeader = request.headers.get('x-e2e-test-user');
  const isPlaywrightRequest = process.env.PLAYWRIGHT_TEST === 'true' && e2eTestHeader;

  if (isPlaywrightRequest) {
    try {
      const testUser = JSON.parse(e2eTestHeader);
      const mockUser = {
        id: testUser.id ?? '62b92aaf-f4ea-485c-9ef9-b016d4d1ee29',
        email: testUser.email ?? 'test-homeowner@example.com',
        role: (testUser.role ?? 'homeowner') as const,
        first_name: testUser.first_name ?? 'Test',
        last_name: testUser.last_name ?? 'Homeowner',
        phone: testUser.phone ?? null,
        avatar_url: testUser.avatar_url ?? null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      logger.debug('E2E Test Mode: Returning mock user', { service: 'auth', userId: mockUser.id });
      return NextResponse.json({ user: mockUser });
    } catch {
      // Invalid header, fall through to real session
    }
  }

  try {
  // Rate limiting check - generous limit for session checks
  const rateLimitResult = await rateLimiter.checkRateLimit({
    identifier: `${request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'anonymous'}:${request.url}`,
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

