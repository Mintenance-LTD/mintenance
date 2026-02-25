/**
 * CSRF Token API Endpoint
 *
 * Provides CSRF tokens to clients for form submissions and API requests.
 * Call this endpoint before making state-changing requests.
 */

import { NextResponse } from 'next/server';
import { generateCSRFToken } from '@/lib/csrf';
import { logger } from '@mintenance/shared';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { rateLimiter } from '@/lib/rate-limiter';

/**
 * Parse cookie string into key-value pairs
 */
function parseCookie(cookieString: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieString) return cookies;

  cookieString.split(';').forEach(cookie => {
    const [name, value] = cookie.trim().split('=');
    if (name && value) {
      cookies[name] = decodeURIComponent(value);
    }
  });

  return cookies;
}

/**
 * GET /api/csrf
 * Return existing CSRF token from cookie if valid, otherwise generate a new one
 */
export const GET = withApiHandler(
  { auth: false, rateLimit: false },
  async (request) => {
    // Custom rate limit: CSRF is fetched often (every form load, save, delete, etc.)
    const rateLimitResult = await rateLimiter.checkRateLimit({
      identifier: `csrf:${request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'anonymous'}`,
      windowMs: 60000,
      maxRequests: 120,
    });

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult.retryAfter || 60),
            'X-RateLimit-Limit': String(120),
            'X-RateLimit-Remaining': String(rateLimitResult.remaining),
            'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString(),
          },
        }
      );
    }

    const isDevelopment = process.env.NODE_ENV === 'development';
    const cookieName = isDevelopment ? 'csrf-token' : '__Host-csrf-token';

    // Check if a valid CSRF token already exists in cookies
    const cookieHeader = request.headers.get('cookie') || '';
    const cookies = parseCookie(cookieHeader);
    const existingToken = cookies[cookieName];

    // Reuse existing token if it exists and is valid (64 hex characters = 32 bytes)
    let token = existingToken;
    if (!token || token.length !== 64 || !/^[a-f0-9]{64}$/.test(token)) {
      token = generateCSRFToken();
      logger.info('CSRF token generated (new)', { service: 'csrf' });
    } else {
      logger.info('CSRF token reused from cookie', { service: 'csrf' });
    }

    const cookieSecure = !isDevelopment;
    const cookieSameSite = isDevelopment ? 'Lax' : 'Strict';

    const response = NextResponse.json(
      { token },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );

    // Set CSRF token as HTTP-only cookie
    const cookieOptions = [
      `${cookieName}=${token}`,
      'HttpOnly',
      cookieSecure ? 'Secure' : '',
      `SameSite=${cookieSameSite}`,
      'Path=/',
      'Max-Age=3600',
    ].filter(Boolean).join('; ');

    response.headers.set('Set-Cookie', cookieOptions);

    return response;
  }
);
