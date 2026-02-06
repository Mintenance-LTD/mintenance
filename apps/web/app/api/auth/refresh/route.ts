import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { rotateTokens, setAuthCookie } from '@/lib/auth';
import { verifyToken } from '@/lib/auth';
import { logger } from '@mintenance/shared';
import { requireCSRF } from '@/lib/csrf';
import { handleAPIError, UnauthorizedError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';

/**
 * Token Refresh API
 * Handles automatic token refresh for persistent sessions
 */
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
    const currentToken = cookieStore.get('__Host-mintenance-auth')?.value;
    const refreshToken = cookieStore.get('__Host-mintenance-refresh')?.value;
    const rememberMe = cookieStore.get('__Host-mintenance-remember')?.value === 'true';

    if (!currentToken) {
      logger.warn('Token refresh failed: No active session', { service: 'auth' });
      throw new UnauthorizedError('No active session');
    }

    // Verify current token to get user info
    const payload = await verifyToken(currentToken);

    if (!payload || !payload.sub) {
      logger.warn('Token refresh failed: Invalid token', { service: 'auth' });
      throw new UnauthorizedError('Invalid token');
    }

    // Check if token is about to expire (less than 15 minutes remaining)
    const now = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = (payload.exp || 0) - now;

    // Only refresh if token expires soon
    if (timeUntilExpiry > 15 * 60) {
      return NextResponse.json({
        success: true,
        message: 'Token still valid',
        expiresIn: timeUntilExpiry,
      });
    }

    // Use refresh token from HTTP-only cookie (secure)
    if (refreshToken) {
      // Rotate tokens using refresh token
      const { accessToken, refreshToken: newRefreshToken } = await rotateTokens(
        payload.sub,
        refreshToken
      );

      // Set new auth cookies
      await setAuthCookie(accessToken, rememberMe, newRefreshToken);

      logger.info('Token refreshed via rotation', {
        service: 'auth',
        userId: payload.sub
      });

      return NextResponse.json({
        success: true,
        message: 'Token refreshed successfully via rotation',
      });
    } else {
      // Do not mint new access tokens without a valid refresh token
      logger.warn('Token refresh blocked: Missing refresh token', {
        service: 'auth',
        userId: payload.sub
      });
      throw new UnauthorizedError('Missing refresh token. Please sign in again.');
    }
  } catch (error) {
    return handleAPIError(error);
  }
}

/**
 * GET endpoint to check token status
 */
export async function GET(request: NextRequest) {
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

    const cookieStore = await cookies();
    const currentToken = cookieStore.get('__Host-mintenance-auth')?.value;

    if (!currentToken) {
      throw new UnauthorizedError('Not authenticated');
    }

    const payload = await verifyToken(currentToken);

    if (!payload || !payload.exp) {
      throw new UnauthorizedError('Invalid token');
    }

    const now = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = payload.exp - now;

    return NextResponse.json({
      authenticated: true,
      expiresIn: timeUntilExpiry,
      needsRefresh: timeUntilExpiry < 15 * 60,
    });
  } catch (error) {
    return handleAPIError(error);
  }
}