import { NextRequest, NextResponse } from 'next/server';
import { authManager } from '@/lib/auth-manager';
import { logger } from '@mintenance/shared';
import { requireCSRF } from '@/lib/csrf';
import { tokenBlacklist } from '@/lib/auth/token-blacklist';
import { cookies } from 'next/headers';
import { handleAPIError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';

export async function POST(request: NextRequest) {
  try {
  // Rate limiting check
  const rateLimitResult = await rateLimiter.checkRateLimit({
    identifier: `${request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'anonymous'}:${request.url}`,
    windowMs: 60000,
    maxRequests: 5
  });

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimitResult.retryAfter || 60),
          'X-RateLimit-Limit': String(5),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
        }
      }
    );
  }

    // CSRF protection
    await requireCSRF(request);

    const cookieStore = await cookies();
    const authToken = cookieStore.get('__Host-mintenance-auth')?.value;

    // Blacklist the current token if it exists
    if (authToken) {
      try {
        await tokenBlacklist.blacklistToken(authToken);
        logger.info('Token blacklisted on logout', { service: 'auth' });
      } catch (error) {
        logger.error('Failed to blacklist token on logout', error, { service: 'auth' });
        // Continue with logout even if blacklisting fails
      }
    }

    // Use AuthManager to handle logout (clears cookies)
    await authManager.logout();

    logger.info('User logged out successfully', { service: 'auth' });

    // Create response with client-side script to clear session
    const response = NextResponse.json(
      {
        message: 'Logout successful',
        clearSession: true, // Signal client to clear SessionManager
      },
      { status: 200 }
    );

    return response;
  } catch (error) {
    return handleAPIError(error);
  }
}
