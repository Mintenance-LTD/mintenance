/**
 * Mobile Rate Limiter
 *
 * In-memory token bucket rate limiter for security-sensitive mobile operations.
 * Prevents brute-force attacks on auth, bid spam, and message flooding
 * when mobile services call Supabase directly (bypassing web API rate limiting).
 *
 * Uses BUSINESS_RULES from @mintenance/shared for consistent limits.
 */

import { BUSINESS_RULES } from '@mintenance/shared';
import { logger } from '../utils/logger';

interface RateBucket {
  count: number;
  resetTime: number;
}

interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
}

const buckets = new Map<string, RateBucket>();

// Pre-configured limits matching web API behavior
const LIMITS: Record<string, RateLimitConfig> = {
  auth_login: {
    maxAttempts: BUSINESS_RULES.MAX_LOGIN_ATTEMPTS,
    windowMs: BUSINESS_RULES.LOGIN_LOCKOUT_DURATION_MINUTES * 60 * 1000,
  },
  auth_register: {
    maxAttempts: 3,
    windowMs: 60 * 1000, // 3 per minute
  },
  password_reset: {
    maxAttempts: BUSINESS_RULES.MAX_PASSWORD_RESETS_PER_HOUR,
    windowMs: 60 * 60 * 1000, // per hour
  },
  job_create: {
    maxAttempts: BUSINESS_RULES.MAX_JOBS_PER_HOUR,
    windowMs: 60 * 60 * 1000, // per hour
  },
  bid_submit: {
    maxAttempts: 10,
    windowMs: 60 * 1000, // 10 per minute
  },
  message_send: {
    maxAttempts: 30,
    windowMs: 60 * 1000, // 30 per minute
  },
  payment: {
    maxAttempts: 5,
    windowMs: 60 * 1000, // 5 per minute
  },
};

/**
 * Check if an action is allowed under rate limits.
 * Returns true if allowed, false if blocked.
 */
export function checkRateLimit(
  action: keyof typeof LIMITS,
  identifier: string = 'default',
): boolean {
  const config = LIMITS[action];
  if (!config) return true;

  const key = `${action}:${identifier}`;
  const now = Date.now();
  const bucket = buckets.get(key);

  // Window expired or first attempt
  if (!bucket || now > bucket.resetTime) {
    buckets.set(key, { count: 1, resetTime: now + config.windowMs });
    return true;
  }

  bucket.count++;

  if (bucket.count > config.maxAttempts) {
    const waitSec = Math.ceil((bucket.resetTime - now) / 1000);
    logger.warn(`[RateLimiter] ${action} blocked for ${identifier} — retry in ${waitSec}s`);
    return false;
  }

  return true;
}

/**
 * Reset rate limit for a specific action (e.g., on successful login).
 */
export function resetRateLimit(
  action: keyof typeof LIMITS,
  identifier: string = 'default',
): void {
  buckets.delete(`${action}:${identifier}`);
}

/**
 * Get remaining attempts for an action.
 */
export function getRemainingAttempts(
  action: keyof typeof LIMITS,
  identifier: string = 'default',
): number {
  const config = LIMITS[action];
  if (!config) return Infinity;

  const key = `${action}:${identifier}`;
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now > bucket.resetTime) return config.maxAttempts;
  return Math.max(0, config.maxAttempts - bucket.count);
}

// Clean up expired buckets every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (now > bucket.resetTime) buckets.delete(key);
  }
}, 5 * 60 * 1000);
