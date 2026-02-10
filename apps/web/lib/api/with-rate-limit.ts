/**
 * API Response Helper with Rate Limiting
 * Provides a wrapper for API route handlers to ensure rate limit headers are included
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, createRateLimitHeaders } from '@/lib/rate-limiter-enhanced';
import { logger } from '@mintenance/shared';
import type { RateLimitResult } from '@/lib/rate-limiter-enhanced';

export interface ApiHandlerContext {
  request: NextRequest;
  params?: unknown;
  rateLimitResult: RateLimitResult;
}

type ApiHandler = (context: ApiHandlerContext) => Promise<NextResponse> | NextResponse;

/**
 * Wraps an API route handler with rate limiting
 * Rate limiting is already applied in middleware, but this ensures headers are included
 */
export function withRateLimit(handler: ApiHandler) {
  return async (request: NextRequest, context?: Record<string, unknown>): Promise<NextResponse> => {
    try {
      // Get rate limit status (should already be checked in middleware)
      const rateLimitResult = await checkRateLimit(request);

      // This shouldn't happen as middleware blocks rate-limited requests
      // But we double-check for defense in depth
      if (!rateLimitResult.allowed) {
        logger.error('Rate limit check failed in API handler (should have been blocked by middleware)', {
          service: 'api',
          path: request.url,
        });

        return new NextResponse(
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
        );
      }

      // Call the actual handler
      const response = await handler({
        request,
        params: context?.params,
        rateLimitResult,
      });

      // Add rate limit headers to the response
      const headers = createRateLimitHeaders(rateLimitResult);
      Object.entries(headers).forEach(([key, value]) => {
        response.headers.set(key, value);
      });

      return response;

    } catch (error) {
      logger.error('API handler error', error, {
        service: 'api',
        path: request.url,
      });

      // Don't expose internal errors
      return new NextResponse(
        JSON.stringify({
          error: 'Internal Server Error',
          message: 'An unexpected error occurred. Please try again later.',
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }
  };
}

/**
 * Creates a standard JSON response with rate limit headers
 */
export function createApiResponse(
  data: unknown,
  status: number = 200,
  rateLimitResult?: RateLimitResult
): NextResponse {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Add rate limit headers if provided
  if (rateLimitResult) {
    Object.assign(headers, createRateLimitHeaders(rateLimitResult));
  }

  return new NextResponse(
    JSON.stringify(data),
    {
      status,
      headers,
    }
  );
}

/**
 * Creates an error response with rate limit headers
 */
export function createErrorResponse(
  message: string,
  status: number = 400,
  details?: unknown,
  rateLimitResult?: RateLimitResult
): NextResponse {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Add rate limit headers if provided
  if (rateLimitResult) {
    Object.assign(headers, createRateLimitHeaders(rateLimitResult));
  }

  return new NextResponse(
    JSON.stringify({
      error: getErrorName(status),
      message,
      ...(details ? { details } : {}),
    }),
    {
      status,
      headers,
    }
  );
}

/**
 * Get standard error name from status code
 */
function getErrorName(status: number): string {
  const errorNames: Record<number, string> = {
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    405: 'Method Not Allowed',
    409: 'Conflict',
    422: 'Unprocessable Entity',
    429: 'Too Many Requests',
    500: 'Internal Server Error',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
  };

  return errorNames[status] || 'Error';
}