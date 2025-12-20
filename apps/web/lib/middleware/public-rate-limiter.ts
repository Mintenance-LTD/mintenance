import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@mintenance/shared';

/**
 * Rate Limiter for Public Contractor Endpoints
 * Prevents scraping and enumeration attacks on public contractor data
 */

interface RateLimitRecord {
  count: number;
  resetTime: number;
  violations: number;
}

// In-memory rate limit store (use Redis in production)
const rateLimitStore = new Map<string, RateLimitRecord>();

// Rate limit configuration for different endpoint tiers
const RATE_LIMITS = {
  // Public contractor data endpoints
  public: {
    windowMs: 60000, // 1 minute
    maxRequests: 20, // 20 requests per minute
    blockDuration: 300000, // 5 minutes block on violation
  },
  // Bulk/search endpoints
  search: {
    windowMs: 60000,
    maxRequests: 10, // 10 searches per minute
    blockDuration: 600000, // 10 minutes block
  },
  // Individual resource endpoints
  resource: {
    windowMs: 60000,
    maxRequests: 60, // 60 individual requests per minute
    blockDuration: 60000, // 1 minute block
  },
};

/**
 * Get client identifier from request
 */
function getClientIdentifier(request: NextRequest): string {
  // Prefer authenticated user ID if available
  const userId = request.headers.get('x-user-id');
  if (userId) {
    return `user:${userId}`;
  }

  // Fall back to IP address for unauthenticated requests
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwardedFor?.split(',')[0] || realIp || 'unknown';

  return `ip:${ip}`;
}

/**
 * Check rate limit for a given tier
 */
export function checkPublicRateLimit(
  request: NextRequest,
  tier: keyof typeof RATE_LIMITS = 'public'
): {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
} {
  const config = RATE_LIMITS[tier];
  const identifier = getClientIdentifier(request);
  const key = `${tier}:${identifier}`;
  const now = Date.now();

  // Check if client is blocked due to violations
  const blockKey = `block:${identifier}`;
  const blockRecord = rateLimitStore.get(blockKey);
  if (blockRecord && now < blockRecord.resetTime) {
    const retryAfter = Math.ceil((blockRecord.resetTime - now) / 1000);

    logger.warn('Public endpoint rate limit block active', {
      service: 'rate-limiter',
      tier,
      identifier,
      retryAfter,
    });

    return {
      allowed: false,
      remaining: 0,
      resetTime: blockRecord.resetTime,
      retryAfter,
    };
  }

  // Get or initialize rate limit record
  let record = rateLimitStore.get(key);

  if (!record || now > record.resetTime) {
    // Reset window
    record = {
      count: 0,
      resetTime: now + config.windowMs,
      violations: record?.violations || 0,
    };
    rateLimitStore.set(key, record);
  }

  // Increment request count
  record.count++;

  // Check if limit exceeded
  if (record.count > config.maxRequests) {
    record.violations++;

    // Block client if multiple violations
    if (record.violations >= 3) {
      rateLimitStore.set(blockKey, {
        count: 0,
        resetTime: now + config.blockDuration,
        violations: 0,
      });

      logger.warn('Public endpoint rate limit block triggered', {
        service: 'rate-limiter',
        tier,
        identifier,
        violations: record.violations,
        blockDuration: config.blockDuration / 1000,
      });

      // Log security event
      try {
        // Security event logging would go here
        // (Requires database connection, handled separately)
      } catch (error) {
        logger.error('Failed to log security event', error, {
          service: 'rate-limiter',
        });
      }
    }

    const retryAfter = Math.ceil((record.resetTime - now) / 1000);

    return {
      allowed: false,
      remaining: 0,
      resetTime: record.resetTime,
      retryAfter,
    };
  }

  return {
    allowed: true,
    remaining: config.maxRequests - record.count,
    resetTime: record.resetTime,
  };
}

/**
 * Create rate limit response headers
 */
export function createPublicRateLimitHeaders(result: {
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
  };

  if (result.retryAfter) {
    headers['Retry-After'] = result.retryAfter.toString();
  }

  return headers;
}

/**
 * Middleware wrapper for public contractor endpoints
 */
export async function withPublicRateLimit(
  request: NextRequest,
  handler: (request: NextRequest) => Promise<NextResponse>,
  tier: keyof typeof RATE_LIMITS = 'public'
): Promise<NextResponse> {
  const rateLimitResult = checkPublicRateLimit(request, tier);

  if (!rateLimitResult.allowed) {
    const headers = createPublicRateLimitHeaders(rateLimitResult);

    logger.warn('Public endpoint rate limit exceeded', {
      service: 'rate-limiter',
      tier,
      identifier: getClientIdentifier(request),
      path: request.nextUrl.pathname,
    });

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
 * Cleanup expired rate limit records (call periodically)
 */
export function cleanupRateLimitStore(): void {
  const now = Date.now();
  let cleaned = 0;

  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    logger.info('Rate limit store cleaned up', {
      service: 'rate-limiter',
      recordsRemoved: cleaned,
    });
  }
}

// Run cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupRateLimitStore, 5 * 60 * 1000);
}
