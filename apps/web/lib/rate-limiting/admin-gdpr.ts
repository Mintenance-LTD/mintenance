/**
 * Rate Limiting Helpers for Admin and GDPR Endpoints
 */

import { NextRequest, NextResponse } from 'next/server';
import { rateLimiter } from '@/lib/rate-limiter';
import { logger } from '@mintenance/shared';
import { getCurrentUserFromCookies } from '@/lib/auth';

/**
 * Rate limit configuration for admin endpoints
 */
const ADMIN_RATE_LIMIT = {
  windowMs: 60000, // 1 minute
  maxRequests: 30, // Max 30 requests per minute per admin
};

/**
 * Rate limit configuration for GDPR endpoints
 */
const GDPR_RATE_LIMIT = {
  windowMs: 3600000, // 1 hour
  maxRequests: 5, // Max 5 requests per hour per user
};

/**
 * Rate limit configuration for account deletion
 */
const DELETE_ACCOUNT_RATE_LIMIT = {
  windowMs: 86400000, // 24 hours
  maxRequests: 1, // Max 1 deletion per day per user
};

/**
 * Check rate limit for admin endpoints
 * @param request - The NextRequest object
 * @returns Rate limit result or null if check passed
 */
export async function checkAdminRateLimit(request: NextRequest): Promise<NextResponse | null> {
  try {
    const user = await getCurrentUserFromCookies();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const identifier = `admin:${user.id}`;
    const result = await rateLimiter.checkRateLimit({
      ...ADMIN_RATE_LIMIT,
      identifier,
    });

    if (!result.allowed) {
      logger.warn('Admin rate limit exceeded', {
        service: 'rate-limiter',
        userId: user.id,
        identifier,
        retryAfter: result.retryAfter,
      });

      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: 'Too many requests. Please try again later.',
          retryAfter: result.retryAfter,
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': ADMIN_RATE_LIMIT.maxRequests.toString(),
            'X-RateLimit-Remaining': result.remaining.toString(),
            'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString(),
            'Retry-After': result.retryAfter?.toString() || '60',
          },
        }
      );
    }

    return null; // Rate limit check passed
  } catch (error) {
    logger.error('Rate limit check failed', error, { service: 'rate-limiter' });
    // Fail open - allow request if rate limiting fails
    return null;
  }
}

/**
 * Check rate limit for GDPR endpoints
 * @param request - The NextRequest object
 * @returns Rate limit result or null if check passed
 */
export async function checkGDPRRateLimit(request: NextRequest): Promise<NextResponse | null> {
  try {
    const user = await getCurrentUserFromCookies();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const identifier = `gdpr:${user.id}`;
    const result = await rateLimiter.checkRateLimit({
      ...GDPR_RATE_LIMIT,
      identifier,
    });

    if (!result.allowed) {
      logger.warn('GDPR rate limit exceeded', {
        service: 'rate-limiter',
        userId: user.id,
        identifier,
        retryAfter: result.retryAfter,
      });

      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: 'Too many GDPR requests. Please try again later.',
          retryAfter: result.retryAfter,
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': GDPR_RATE_LIMIT.maxRequests.toString(),
            'X-RateLimit-Remaining': result.remaining.toString(),
            'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString(),
            'Retry-After': result.retryAfter?.toString() || '3600',
          },
        }
      );
    }

    return null; // Rate limit check passed
  } catch (error) {
    logger.error('GDPR rate limit check failed', error, { service: 'rate-limiter' });
    // Fail open - allow request if rate limiting fails
    return null;
  }
}

/**
 * Check rate limit for account deletion endpoint
 * @param request - The NextRequest object
 * @returns Rate limit result or null if check passed
 */
export async function checkDeleteAccountRateLimit(request: NextRequest): Promise<NextResponse | null> {
  try {
    const user = await getCurrentUserFromCookies();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const identifier = `delete-account:${user.id}`;
    const result = await rateLimiter.checkRateLimit({
      ...DELETE_ACCOUNT_RATE_LIMIT,
      identifier,
    });

    if (!result.allowed) {
      logger.warn('Account deletion rate limit exceeded', {
        service: 'rate-limiter',
        userId: user.id,
        identifier,
        retryAfter: result.retryAfter,
      });

      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: 'Account deletion is limited to once per day. Please try again later.',
          retryAfter: result.retryAfter,
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': DELETE_ACCOUNT_RATE_LIMIT.maxRequests.toString(),
            'X-RateLimit-Remaining': result.remaining.toString(),
            'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString(),
            'Retry-After': result.retryAfter?.toString() || '86400',
          },
        }
      );
    }

    return null; // Rate limit check passed
  } catch (error) {
    logger.error('Delete account rate limit check failed', error, { service: 'rate-limiter' });
    // Fail open - allow request if rate limiting fails
    return null;
  }
}

