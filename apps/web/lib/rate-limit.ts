/**
 * API Rate Limiting Middleware
 * Protects API routes from abuse using sliding window algorithm
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@mintenance/shared';

export interface RateLimitConfig {
  interval: number; // Time window in milliseconds
  uniqueTokenPerInterval: number; // Max requests per interval
  identifier?: (req: NextRequest) => string; // Custom identifier function
}

interface RateLimitStore {
  count: number;
  resetTime: number;
  requests: number[]; // Timestamps of requests for sliding window
}

// In-memory store for rate limiting
// In production, use Redis or similar distributed cache
const rateLimitStore = new Map<string, RateLimitStore>();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Default identifier: IP address or user ID
 */
function getDefaultIdentifier(req: NextRequest): string {
  // Try to get user ID from headers (set by middleware)
  const userId = req.headers.get('x-user-id');
  if (userId) return `user:${userId}`;

  // Fall back to IP address
  const forwardedFor = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const ip = forwardedFor?.split(',')[0] || realIp || 'unknown';

  return `ip:${ip}`;
}

/**
 * Check if request is within rate limit
 */
export async function checkRateLimit(
  req: NextRequest,
  config: RateLimitConfig
): Promise<{
  success: boolean;
  remaining: number;
  resetTime: number;
  response?: NextResponse;
}> {
  const identifier = config.identifier?.(req) || getDefaultIdentifier(req);
  const now = Date.now();
  const windowStart = now - config.interval;

  // Get or create rate limit entry
  let entry = rateLimitStore.get(identifier);

  if (!entry || now >= entry.resetTime) {
    // Create new entry
    entry = {
      count: 0,
      resetTime: now + config.interval,
      requests: [],
    };
    rateLimitStore.set(identifier, entry);
  }

  // Remove requests outside the sliding window
  entry.requests = entry.requests.filter(timestamp => timestamp > windowStart);

  // Check if limit exceeded
  if (entry.requests.length >= config.uniqueTokenPerInterval) {
    logger.warn('Rate limit exceeded', {
      service: 'rate-limit',
      identifier,
      requests: entry.requests.length,
      limit: config.uniqueTokenPerInterval,
    });

    return {
      success: false,
      remaining: 0,
      resetTime: entry.resetTime,
      response: NextResponse.json(
        {
          error: 'Too many requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: Math.ceil((entry.resetTime - now) / 1000),
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': config.uniqueTokenPerInterval.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': entry.resetTime.toString(),
            'Retry-After': Math.ceil((entry.resetTime - now) / 1000).toString(),
          },
        }
      ),
    };
  }

  // Add current request
  entry.requests.push(now);
  entry.count++;

  return {
    success: true,
    remaining: config.uniqueTokenPerInterval - entry.requests.length,
    resetTime: entry.resetTime,
  };
}

/**
 * Rate limit middleware wrapper
 */
export function withRateLimit(
  handler: (req: NextRequest) => Promise<NextResponse>,
  config: RateLimitConfig
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const rateLimitResult = await checkRateLimit(req, config);

    if (!rateLimitResult.success) {
      return rateLimitResult.response!;
    }

    // Add rate limit headers to response
    const response = await handler(req);
    response.headers.set('X-RateLimit-Limit', config.uniqueTokenPerInterval.toString());
    response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
    response.headers.set('X-RateLimit-Reset', rateLimitResult.resetTime.toString());

    return response;
  };
}

/**
 * Pre-configured rate limit configs
 */
export const RATE_LIMIT_CONFIGS = {
  // Standard API endpoints: 100 requests per 15 minutes
  api: {
    interval: 15 * 60 * 1000,
    uniqueTokenPerInterval: 100,
  },

  // Authentication endpoints: 5 attempts per 15 minutes
  auth: {
    interval: 15 * 60 * 1000,
    uniqueTokenPerInterval: 5,
  },

  // Payment endpoints: 10 requests per hour
  payment: {
    interval: 60 * 60 * 1000,
    uniqueTokenPerInterval: 10,
  },

  // Search endpoints: 30 requests per minute
  search: {
    interval: 60 * 1000,
    uniqueTokenPerInterval: 30,
  },

  // File upload: 5 uploads per 5 minutes
  upload: {
    interval: 5 * 60 * 1000,
    uniqueTokenPerInterval: 5,
  },

  // Password reset: 3 attempts per hour
  passwordReset: {
    interval: 60 * 60 * 1000,
    uniqueTokenPerInterval: 3,
  },

  // Strict rate limit for sensitive operations: 10 per hour
  strict: {
    interval: 60 * 60 * 1000,
    uniqueTokenPerInterval: 10,
  },
} as const;

/**
 * Clear rate limit for identifier (admin use)
 */
export function clearRateLimit(identifier: string): boolean {
  return rateLimitStore.delete(identifier);
}

/**
 * Get rate limit stats
 */
export function getRateLimitStats(): {
  totalIdentifiers: number;
  activeIdentifiers: number;
  totalRequests: number;
} {
  const now = Date.now();
  let totalRequests = 0;
  let activeIdentifiers = 0;

  for (const entry of rateLimitStore.values()) {
    totalRequests += entry.count;
    if (now < entry.resetTime) {
      activeIdentifiers++;
    }
  }

  return {
    totalIdentifiers: rateLimitStore.size,
    activeIdentifiers,
    totalRequests,
  };
}
