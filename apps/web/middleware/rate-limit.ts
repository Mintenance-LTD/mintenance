import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@mintenance/shared';
import {
  checkRateLimit,
  createRateLimitHeaders,
  type RateLimitResult,
} from '@/lib/rate-limiter-enhanced';
import {
  handlePreflightRequest,
  addCorsHeaders,
  shouldSkipCors,
} from '@/lib/cors';

const RATE_LIMIT_SKIP_EXACT = new Set([
  '/api/auth/session-status',
  '/api/auth/extend-session',
]);

const RATE_LIMIT_SKIP_PREFIXES = [
  '/api/notifications',
  '/api/messages',
  '/api/payments',
  '/api/contractors',
  '/api/jobs',
  '/api/contractor/',
  '/api/bids',
  '/api/user/',
  '/api/account',
  '/api/upload',
  '/api/ai/',
  '/api/building-surveyor',
  '/api/admin',
  '/api/escrow',
  '/api/properties',
  '/api/subscriptions',
];

interface ApiRateLimitResult {
  response?: NextResponse;
  headers?: Headers;
}

export async function handleApiRateLimit(
  request: NextRequest,
  pathname: string
): Promise<ApiRateLimitResult> {
  const skipCors = shouldSkipCors(pathname);

  // Handle CORS preflight (OPTIONS) requests
  // SECURITY: This must happen BEFORE rate limiting to avoid counting preflight requests
  if (request.method === 'OPTIONS' && !skipCors) {
    return { response: handlePreflightRequest(request) };
  }

  try {
    const skipMiddlewareRateLimit =
      RATE_LIMIT_SKIP_EXACT.has(pathname) ||
      RATE_LIMIT_SKIP_PREFIXES.some((prefix) => pathname.startsWith(prefix));

    const rateLimitResult = skipMiddlewareRateLimit
      ? ({
          allowed: true,
          limit: 0,
          remaining: 0,
          resetTime: Date.now() + 60000,
          tier: 'anonymous',
        } as RateLimitResult)
      : await checkRateLimit(request);

    if (!rateLimitResult.allowed) {
      logger.warn('API rate limit exceeded', {
        service: 'middleware',
        pathname,
        tier: rateLimitResult.tier,
        remaining: rateLimitResult.remaining,
      });

      return {
        response: new NextResponse(
          JSON.stringify({
            error: 'Too Many Requests',
            message: 'Rate limit exceeded. Please try again later.',
            retryAfter: rateLimitResult.retryAfter,
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              ...createRateLimitHeaders(rateLimitResult),
            },
          }
        ),
      };
    }

    // Add rate limit headers to request headers
    const requestHeaders = new Headers(request.headers);
    Object.entries(createRateLimitHeaders(rateLimitResult)).forEach(
      ([key, value]) => {
        requestHeaders.set(key, value);
      }
    );

    // Special handling for webhook endpoints (skip auth but apply rate limiting)
    if (pathname.startsWith('/api/webhooks')) {
      const response = NextResponse.next({
        request: { headers: requestHeaders },
      });
      return {
        response: skipCors ? response : addCorsHeaders(response, request),
      };
    }

    // Mark CORS as processed for other API routes
    requestHeaders.set('x-cors-processed', 'true');

    return { headers: requestHeaders };
  } catch (error) {
    logger.error('Rate limiting failed in middleware', error, {
      service: 'middleware',
      pathname,
    });

    // In production, fail closed for security
    if (process.env.NODE_ENV === 'production') {
      return {
        response: new NextResponse('Service Unavailable', { status: 503 }),
      };
    }

    return {};
  }
}
