import type { NextRequest } from 'next/server';
import { getUserTier, type RateLimitTier } from '../constants/rate-limits';
import { getClientIp } from '../request-ip';
import type { RateLimitResult } from './index';

/**
 * Get identifier from request (IP, user ID, etc.)
 *
 * SECURITY: IP extraction refuses the first entry of `x-forwarded-for`
 * because it is client-settable and lets attackers spoof per-IP limits.
 * See `apps/web/lib/request-ip.ts` for the trust-order spec.
 */
export function getIdentifier(request: NextRequest | string): string {
  if (typeof request === 'string') return request;
  const userId = request.headers.get('x-user-id');
  if (userId) return `user:${userId}`;
  return `ip:${getClientIp(request)}`;
}

/**
 * Get user tier from request
 */
export function getTierFromRequest(
  request: NextRequest | string
): RateLimitTier {
  if (typeof request === 'string') return 'anonymous';
  const role = request.headers.get('x-user-role');
  const userId = request.headers.get('x-user-id');
  if (!userId) return 'anonymous';
  if (role === 'admin') return 'admin';
  return 'authenticated';
}

/**
 * Create rate limit headers for HTTP response
 */
export function createRateLimitHeaders(
  result: RateLimitResult
): Record<string, string> {
  const headers: Record<string, string> = {
    'RateLimit-Limit': result.limit.toString(),
    'RateLimit-Remaining': result.remaining.toString(),
    'RateLimit-Reset': new Date(result.resetTime).toISOString(),
    'RateLimit-Policy': `${result.limit};w=${Math.ceil(result.resetTime / 1000)}`,
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString(),
  };
  if (!result.allowed && result.retryAfter) {
    headers['Retry-After'] = result.retryAfter.toString();
  }
  if (process.env.NODE_ENV === 'development') {
    headers['X-RateLimit-Tier'] = result.tier;
  }
  return headers;
}
