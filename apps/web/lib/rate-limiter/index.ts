/**
 * Enhanced Rate Limiting System — Module Index
 *
 * All consumers import from '@/lib/rate-limiter-enhanced' which
 * re-exports from this module via a one-line facade.
 */

import type { NextRequest } from 'next/server';
import type { RateLimitTier } from '../constants/rate-limits';
import { EnhancedRateLimiter } from './core';

// ── Types ────────────────────────────────────────────────────────

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
  tier: RateLimitTier;
}

export interface RateLimitOptions {
  identifier?: string;
  tier?: RateLimitTier;
  path?: string;
  bypassCheck?: boolean;
}

// ── Re-exports ────────────────────────────────────────────────────

export { EnhancedRateLimiter } from './core';
export type { RateLimitStore } from './stores/types';
export { UpstashStore } from './stores/UpstashStore';
export { InMemoryStore } from './stores/InMemoryStore';
export { createRateLimitHeaders } from './helpers';

// ── Singleton ────────────────────────────────────────────────────

let rateLimiterInstance: EnhancedRateLimiter | null = null;

export function getRateLimiter(): EnhancedRateLimiter {
  if (!rateLimiterInstance) rateLimiterInstance = new EnhancedRateLimiter();
  return rateLimiterInstance;
}

// ── Convenience functions ────────────────────────────────────────

export async function checkRateLimit(
  request: NextRequest | string,
  options?: RateLimitOptions
): Promise<RateLimitResult> {
  return getRateLimiter().checkLimit(request, options);
}

export async function checkLoginRateLimit(
  request: NextRequest | string
): Promise<RateLimitResult> {
  return checkRateLimit(request, { path: '/api/auth/login' });
}

export async function checkPasswordResetRateLimit(
  request: NextRequest | string
): Promise<RateLimitResult> {
  return checkRateLimit(request, { path: '/api/auth/forgot-password' });
}

export async function checkJobCreationRateLimit(
  request: NextRequest | string
): Promise<RateLimitResult> {
  return checkRateLimit(request, { path: '/api/jobs' });
}

export async function checkApiRateLimit(
  request: NextRequest
): Promise<RateLimitResult> {
  return checkRateLimit(request);
}

export async function checkWebhookRateLimit(
  identifier: string
): Promise<RateLimitResult> {
  return checkRateLimit(identifier, { path: '/api/webhooks/*' });
}
