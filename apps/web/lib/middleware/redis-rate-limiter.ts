/**
 * Redis-based Rate Limiter using Upstash
 * Replaces in-memory rate limiting with persistent Redis storage
 *
 * Features:
 * - Sliding window algorithm for accurate rate limiting
 * - Multi-region support via Upstash
 * - Serverless-compatible (Vercel Edge Functions)
 * - Automatic cleanup of expired entries
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Initialize Redis client from environment variables
// Required: UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

/**
 * API Rate Limiter
 * Allows 100 requests per 15 minutes per IP
 */
export const apiRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, '15 m'),
  prefix: 'ratelimit:api',
  analytics: true,
});

/**
 * Authentication Rate Limiter
 * Allows 5 login attempts per 15 minutes per IP
 */
export const authRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '15 m'),
  prefix: 'ratelimit:auth',
  analytics: true,
});

/**
 * Strict Rate Limiter for sensitive endpoints
 * Allows 10 requests per hour
 */
export const strictRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 h'),
  prefix: 'ratelimit:strict',
  analytics: true,
});

/**
 * Public endpoint rate limiter
 * Allows 30 requests per minute
 */
export const publicRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, '1 m'),
  prefix: 'ratelimit:public',
  analytics: true,
});

/**
 * Helper function to get client identifier
 * Uses IP address, falling back to user agent as last resort
 */
export function getClientIdentifier(request: Request): string {
  // Try to get IP from headers
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Fallback to user agent (less reliable but better than nothing)
  const userAgent = request.headers.get('user-agent') || 'unknown';
  return `ua:${userAgent}`;
}

/**
 * Check rate limit and return standardized response
 */
export async function checkRateLimit(
  limiter: Ratelimit,
  identifier: string
): Promise<{
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}> {
  const result = await limiter.limit(identifier);

  return {
    success: result.success,
    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset,
  };
}

/**
 * Rate limit middleware wrapper
 * Returns 429 response if rate limit exceeded
 */
export async function withRateLimit(
  request: Request,
  limiter: Ratelimit,
  customIdentifier?: string
): Promise<Response | null> {
  const identifier = customIdentifier || getClientIdentifier(request);
  const result = await checkRateLimit(limiter, identifier);

  if (!result.success) {
    return new Response(
      JSON.stringify({
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.',
        limit: result.limit,
        reset: new Date(result.reset).toISOString(),
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': Math.ceil((result.reset - Date.now()) / 1000).toString(),
          'X-RateLimit-Limit': result.limit.toString(),
          'X-RateLimit-Remaining': result.remaining.toString(),
          'X-RateLimit-Reset': result.reset.toString(),
        },
      }
    );
  }

  return null; // No error, proceed with request
}

/**
 * Redis health check
 * Verifies connection to Upstash Redis
 */
export async function checkRedisHealth(): Promise<boolean> {
  try {
    await redis.ping();
    return true;
  } catch (error) {
    console.error('Redis health check failed:', error);
    return false;
  }
}
