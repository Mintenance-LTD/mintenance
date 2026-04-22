/**
 * Redis-based Public Rate Limiter
 * Replaces in-memory rate limiting with persistent Redis storage for production use
 *
 * Migration from public-rate-limiter.ts to use Upstash Redis
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@mintenance/shared';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { getClientIp } from '@/lib/request-ip';

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
const redisConfigured = Boolean(redisUrl && redisToken);

// Initialize Redis client only when URL and token are set (avoids "Failed to parse URL from /pipeline")
const redis = redisConfigured
  ? new Redis({ url: redisUrl!, token: redisToken! })
  : null;

function getRedisLimiters() {
  if (!redis) return null;
  return {
    public: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(20, '1 m'),
      prefix: 'ratelimit:public',
      analytics: true,
    }),
    search: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '1 m'),
      prefix: 'ratelimit:search',
      analytics: true,
    }),
    resource: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(60, '1 m'),
      prefix: 'ratelimit:resource',
      analytics: true,
    }),
  };
}

let limiters: ReturnType<typeof getRedisLimiters> | null = null;
function getLimiters() {
  if (limiters === null) limiters = getRedisLimiters();
  return limiters;
}

const publicRateLimiter = {
  limit: async () => ({
    success: true,
    remaining: 999,
    reset: Date.now() + 60000,
  }),
} as unknown as Ratelimit;
const searchRateLimiter = publicRateLimiter;
const resourceRateLimiter = publicRateLimiter;

/**
 * Get client identifier from request
 */
function getClientIdentifier(request: NextRequest): string {
  // Prefer authenticated user ID if available
  const userId = request.headers.get('x-user-id');
  if (userId) {
    return `user:${userId}`;
  }

  // SECURITY: Vercel-trusted IP (see lib/request-ip.ts). Never the first
  // x-forwarded-for entry — it is client-settable and bypasses per-IP limits.
  return `ip:${getClientIp(request)}`;
}

/**
 * Check rate limit using Redis (or allow all when Redis not configured)
 */
export async function checkPublicRateLimit(
  request: NextRequest,
  tier: 'public' | 'search' | 'resource' = 'public'
): Promise<{
  allowed: boolean;
  remaining: number;
  reset: number;
  retryAfter?: number;
}> {
  const identifier = getClientIdentifier(request);

  // SECURITY: When Redis is not configured, fail closed in production to prevent abuse.
  // In development, allow requests through so local dev isn't blocked.
  const limiters = getLimiters();
  if (!limiters) {
    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction) {
      logger.error(
        'Redis not configured in production — rate limiting unavailable, rejecting request',
        {
          service: 'rate-limiter-redis',
          tier,
          identifier,
        }
      );
      return {
        allowed: false,
        remaining: 0,
        reset: Date.now() + 60000,
        retryAfter: 60,
      };
    }
    return {
      allowed: true,
      remaining: 999,
      reset: Date.now() + 60000,
    };
  }

  const limiter =
    tier === 'search'
      ? limiters.search
      : tier === 'resource'
        ? limiters.resource
        : limiters.public;

  try {
    const result = await limiter.limit(identifier);

    if (!result.success) {
      const retryAfter = Math.ceil((result.reset - Date.now()) / 1000);

      logger.warn('Public endpoint rate limit exceeded', {
        service: 'rate-limiter-redis',
        tier,
        identifier,
        retryAfter,
      });

      return {
        allowed: false,
        remaining: result.remaining,
        reset: result.reset,
        retryAfter,
      };
    }

    return {
      allowed: true,
      remaining: result.remaining,
      reset: result.reset,
    };
  } catch (error) {
    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction) {
      // SECURITY: Fail closed in production when Redis is unavailable
      logger.error(
        'Redis rate limit check failed — rejecting request (fail closed)',
        error,
        {
          service: 'rate-limiter-redis',
          tier,
          identifier,
        }
      );
      return {
        allowed: false,
        remaining: 0,
        reset: Date.now() + 60000,
        retryAfter: 60,
      };
    }
    // In development, allow through to avoid blocking local dev
    logger.error(
      'Redis rate limit check failed, allowing request (dev mode)',
      error,
      {
        service: 'rate-limiter-redis',
        tier,
        identifier,
      }
    );
    return {
      allowed: true,
      remaining: 999,
      reset: Date.now() + 60000,
    };
  }
}

/**
 * Create rate limit response headers
 */
function createPublicRateLimitHeaders(result: {
  remaining: number;
  reset: number;
  retryAfter?: number;
}): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': new Date(result.reset).toISOString(),
  };

  if (result.retryAfter) {
    headers['Retry-After'] = result.retryAfter.toString();
  }

  return headers;
}

/**
 * Middleware wrapper for public contractor endpoints
 */
async function withPublicRateLimit(
  request: NextRequest,
  handler: (request: NextRequest) => Promise<NextResponse>,
  tier: 'public' | 'search' | 'resource' = 'public'
): Promise<NextResponse> {
  const rateLimitResult = await checkPublicRateLimit(request, tier);

  if (!rateLimitResult.allowed) {
    const headers = createPublicRateLimitHeaders(rateLimitResult);

    return NextResponse.json(
      {
        error: 'Rate limit exceeded',
        message: 'Too many requests. Please try again later.',
        retryAfter: rateLimitResult.retryAfter,
      },
      {
        status: 429,
        headers,
      }
    );
  }

  // Execute handler and add rate limit headers
  const response = await handler(request);
  const headers = createPublicRateLimitHeaders(rateLimitResult);

  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

/**
 * Redis health check
 */
async function checkRedisHealth(): Promise<boolean> {
  if (!redis) return false;
  try {
    await redis.ping();
    return true;
  } catch (error) {
    logger.error('Redis health check failed', error, {
      service: 'rate-limiter-redis',
    });
    return false;
  }
}
