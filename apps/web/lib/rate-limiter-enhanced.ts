/**
 * Enhanced Rate Limiting System
 * Provides centralized rate limiting with multiple backend support
 *
 * Features:
 * - Sliding window algorithm for accurate rate limiting
 * - Multiple storage backends (Redis, Upstash, in-memory)
 * - User-tier based limits (anonymous, authenticated, admin, premium)
 * - Automatic fallback and failover
 * - Security event logging
 * - DDoS protection
 * - Rate limit headers (RateLimit-* and X-RateLimit-*)
 */

import { logger } from '@mintenance/shared';
import {
  getRateLimitConfig,
  getUserTier,
  shouldBypassRateLimit,
  type RateLimitTier,
} from './constants/rate-limits';
import type { NextRequest } from 'next/server';

// Types
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

interface RateLimitStore {
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<void>;
  ttl(key: string): Promise<number>;
  isHealthy(): Promise<boolean>;
}

// ============================================================================
// STORAGE BACKENDS
// ============================================================================

/**
 * Upstash Redis backend (recommended for production)
 */
interface RedisLikeClient {
  ping(): Promise<unknown>;
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<unknown>;
  ttl(key: string): Promise<number>;
}

class UpstashStore implements RateLimitStore {
  private client: RedisLikeClient | null = null;
  private initialized = false;

  async init() {
    if (this.initialized) return;

    try {
      if (
        !process.env.UPSTASH_REDIS_REST_URL ||
        !process.env.UPSTASH_REDIS_REST_TOKEN
      ) {
        throw new Error('Upstash Redis credentials not configured');
      }

      const { Redis } = await import('@upstash/redis');
      this.client = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      }) as RedisLikeClient;

      // Test connection
      await this.client.ping();
      this.initialized = true;
      logger.info('Upstash Redis rate limiter initialized', {
        service: 'rate-limiter',
      });
    } catch (error) {
      logger.error('Failed to initialize Upstash Redis', error, {
        service: 'rate-limiter',
      });
      throw error;
    }
  }

  async incr(key: string): Promise<number> {
    if (!this.initialized) await this.init();
    return await this.client!.incr(key);
  }

  async expire(key: string, seconds: number): Promise<void> {
    if (!this.initialized) await this.init();
    await this.client!.expire(key, seconds);
  }

  async ttl(key: string): Promise<number> {
    if (!this.initialized) await this.init();
    return await this.client!.ttl(key);
  }

  async isHealthy(): Promise<boolean> {
    try {
      if (!this.initialized) await this.init();
      await this.client!.ping();
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * In-memory store (development/fallback only)
 * WARNING: Does not sync across instances in production
 */
class InMemoryStore implements RateLimitStore {
  private store = new Map<string, { count: number; expiry: number }>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Cleanup expired entries every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  async incr(key: string): Promise<number> {
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || entry.expiry < now) {
      this.store.set(key, { count: 1, expiry: now + 60000 }); // Default 1 minute expiry
      return 1;
    }

    entry.count++;
    return entry.count;
  }

  async expire(key: string, seconds: number): Promise<void> {
    const entry = this.store.get(key);
    if (entry) {
      entry.expiry = Date.now() + seconds * 1000;
    }
  }

  async ttl(key: string): Promise<number> {
    const entry = this.store.get(key);
    if (!entry) return -1;

    const ttl = Math.ceil((entry.expiry - Date.now()) / 1000);
    return ttl > 0 ? ttl : -1;
  }

  async isHealthy(): Promise<boolean> {
    return true; // In-memory is always "healthy"
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (entry.expiry < now) {
        this.store.delete(key);
      }
    }
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.store.clear();
  }
}

// ============================================================================
// RATE LIMITER CLASS
// ============================================================================

export class EnhancedRateLimiter {
  private primaryStore: RateLimitStore | null = null;
  private fallbackStore: InMemoryStore;
  private initPromise: Promise<void> | null = null;

  constructor() {
    this.fallbackStore = new InMemoryStore();
    this.init();
  }

  private async init() {
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      const redisRequired =
        process.env.REDIS_REQUIRED === 'true' ||
        process.env.NODE_ENV === 'production';
      const hasRedisConfig = !!process.env.UPSTASH_REDIS_REST_URL;

      try {
        if (hasRedisConfig) {
          const upstash = new UpstashStore();
          await upstash.init();
          this.primaryStore = upstash;
          return;
        }

        // No Redis configured
        if (redisRequired) {
          const msg =
            'Rate limiter requires Upstash Redis in production. ' +
            'Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN, ' +
            'or set REDIS_REQUIRED=false to explicitly opt out (single-instance deployments only).';
          logger.error(
            '[CRITICAL] ' + msg,
            new Error('REDIS_REQUIRED but not configured'),
            {
              service: 'rate-limiter',
              severity: 'CRITICAL',
            }
          );
          throw new Error(msg);
        }

        logger.warn(
          'No Redis configured, using in-memory rate limiting. ' +
            'This is NOT suitable for multi-instance production deployments — ' +
            'each instance tracks its own counters, effectively multiplying limits by instance count.',
          { service: 'rate-limiter' }
        );
      } catch (error) {
        logger.error('Failed to initialize primary rate limit store', error, {
          service: 'rate-limiter',
          severity: redisRequired ? 'CRITICAL' : 'MEDIUM',
        });
        // Re-throw in production so startup fails loudly
        if (redisRequired) throw error;
      }
    })();

    return this.initPromise;
  }

  /**
   * Get the active storage backend
   */
  private async getStore(): Promise<RateLimitStore> {
    await this.init();

    // Check primary store health
    if (this.primaryStore) {
      const isHealthy = await this.primaryStore.isHealthy();
      if (isHealthy) {
        return this.primaryStore;
      }

      // Primary store unhealthy, log warning
      logger.warn('Primary rate limit store unhealthy, using fallback', {
        service: 'rate-limiter',
      });
    }

    // Use fallback store with reduced limits
    return this.fallbackStore;
  }

  /**
   * Check rate limit for a request
   */
  async checkLimit(
    request: NextRequest | string,
    options: RateLimitOptions = {}
  ): Promise<RateLimitResult> {
    try {
      // Extract request details
      const path =
        typeof request === 'string' ? request : new URL(request.url).pathname;
      const identifier = options.identifier || this.getIdentifier(request);
      const tier = options.tier || this.getTierFromRequest(request);

      // Check bypass rules
      if (
        !options.bypassCheck &&
        typeof request !== 'string' &&
        shouldBypassRateLimit(request)
      ) {
        return {
          allowed: true,
          limit: Number.MAX_SAFE_INTEGER,
          remaining: Number.MAX_SAFE_INTEGER,
          resetTime: Date.now() + 60000,
          tier,
        };
      }

      // Get configuration for this path
      const config = getRateLimitConfig(options.path || path);
      const limit = config.max[tier];

      // If tier has no access (limit = 0), reject immediately
      if (limit === 0) {
        logger.warn('Access denied for tier', {
          service: 'rate-limiter',
          path,
          tier,
          identifier,
        });
        return {
          allowed: false,
          limit: 0,
          remaining: 0,
          resetTime: Date.now() + config.windowMs,
          retryAfter: Math.ceil(config.windowMs / 1000),
          tier,
        };
      }

      // Get storage backend
      const store = await this.getStore();
      const isUsingFallback = store === this.fallbackStore;

      // Apply reduced limits when using fallback in production
      // Note: In-memory fallback is per-instance only on Vercel, so each
      // serverless instance tracks independently. 75% is reasonable since
      // requests are distributed across instances anyway.
      const effectiveLimit =
        isUsingFallback && process.env.NODE_ENV === 'production'
          ? Math.max(3, Math.ceil(limit * 0.75)) // 75% of normal limit, minimum 3
          : limit;

      // Generate rate limit key
      const window = Math.floor(Date.now() / config.windowMs);
      const key = `rl:${path}:${tier}:${identifier}:${window}`;

      // Increment counter
      const count = await store.incr(key);

      // Set expiry on first request
      if (count === 1) {
        await store.expire(key, Math.ceil(config.windowMs / 1000));
      }

      // Calculate result
      const allowed = count <= effectiveLimit;
      const remaining = Math.max(0, effectiveLimit - count);
      const resetTime = (window + 1) * config.windowMs;
      const retryAfter = allowed
        ? undefined
        : Math.ceil((resetTime - Date.now()) / 1000);

      // Log violations
      if (!allowed) {
        await this.logViolation(path, identifier, tier, count, effectiveLimit);
      }

      // Check for DDoS patterns
      if (count > effectiveLimit * 3) {
        await this.handlePotentialDDoS(identifier, path, count);
      }

      return {
        allowed,
        limit: effectiveLimit,
        remaining,
        resetTime,
        retryAfter,
        tier,
      };
    } catch (error) {
      // Policy: fail-CLOSED on rate-limiter errors in production.
      // Rationale: for a financial platform, allowing unlimited requests
      // during a rate-limiter outage creates a DDoS vector.
      // In development, fail open to avoid blocking local dev.
      // Mitigations:
      //   1. REDIS_REQUIRED=true + init-time check (see init()) prevents
      //      silently starting without Redis in production
      //   2. Every fail-closed decision is logged at CRITICAL severity so it's
      //      visible in monitoring
      //   3. retryAfter tells clients when to retry
      const isProd = process.env.NODE_ENV === 'production';

      logger.error(
        `[CRITICAL] Rate limiter error — request ${isProd ? 'BLOCKED' : 'allowed (dev)'} due to check failure`,
        error,
        { service: 'rate-limiter', severity: 'CRITICAL' }
      );

      return {
        allowed: !isProd,
        limit: isProd ? 100 : 1000,
        remaining: 0,
        resetTime: Date.now() + 60000,
        retryAfter: 60,
        tier: 'anonymous' as const,
      };
    }
  }

  /**
   * Get identifier from request (IP, user ID, etc.)
   */
  private getIdentifier(request: NextRequest | string): string {
    if (typeof request === 'string') {
      return request;
    }

    // Try to get user ID from headers (set by middleware)
    const userId = request.headers.get('x-user-id');
    if (userId) {
      return `user:${userId}`;
    }

    // Fall back to IP address
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      request.headers.get('cf-connecting-ip') || // Cloudflare
      'unknown';

    return `ip:${ip}`;
  }

  /**
   * Get user tier from request
   */
  private getTierFromRequest(request: NextRequest | string): RateLimitTier {
    if (typeof request === 'string') {
      return 'anonymous';
    }

    const role = request.headers.get('x-user-role');
    const userId = request.headers.get('x-user-id');

    if (!userId) return 'anonymous';
    if (role === 'admin') return 'admin';

    // TODO: Check premium status from database/cache
    return 'authenticated';
  }

  /**
   * Log rate limit violation to structured logger + persist to security_events
   * for monitoring and audit trail. The event_type 'suspicious_activity' is
   * reused from the security_events CHECK constraint (see 004_security_audit.sql).
   */
  private async logViolation(
    path: string,
    identifier: string,
    tier: RateLimitTier,
    attempts: number,
    limit: number
  ): Promise<void> {
    const severity: 'medium' | 'high' =
      attempts > limit * 2 ? 'high' : 'medium';

    logger.warn('Rate limit exceeded', {
      service: 'rate-limiter',
      path,
      identifier,
      tier,
      attempts,
      limit,
      severity,
    });

    // Fire-and-forget — do not block the request path on security-event writes.
    void this.persistSecurityEvent({
      event_type: 'suspicious_activity',
      severity,
      identifier,
      details: {
        kind: 'rate_limit_exceeded',
        path,
        tier,
        attempts,
        limit,
        overage_factor: +(attempts / limit).toFixed(2),
      },
    });
  }

  /**
   * Handle potential DDoS attack — log at CRITICAL, persist security event.
   * IP blocking is handled at the edge (Cloudflare/WAF), not here.
   * If you need active IP blocking, configure it via CF_API_TOKEN
   * (see docs/CI_QUALITY_GATES.md — not currently implemented).
   */
  private async handlePotentialDDoS(
    identifier: string,
    path: string,
    attempts: number
  ): Promise<void> {
    logger.error('[SECURITY] Potential DDoS detected', {
      service: 'rate-limiter',
      identifier,
      path,
      attempts,
      severity: 'CRITICAL',
    });

    void this.persistSecurityEvent({
      event_type: 'suspicious_activity',
      severity: 'critical',
      identifier,
      details: {
        kind: 'ddos_suspected',
        path,
        attempts,
      },
    });
  }

  /**
   * Persist a security event to Supabase. Fire-and-forget — never throws.
   * Dynamic import of the server client keeps this module usable in edge
   * runtimes that don't ship the Supabase SDK.
   */
  private async persistSecurityEvent(event: {
    event_type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    identifier: string;
    details: Record<string, unknown>;
  }): Promise<void> {
    try {
      const { serverSupabase } = await import('./api/supabaseServer');
      // Best-effort: extract IP from "ip:x.x.x.x" or user id from "user:uuid"
      const [kind, value] = event.identifier.split(':');
      const ip_address = kind === 'ip' ? value : null;
      const user_id = kind === 'user' ? value : null;

      await serverSupabase.from('security_events').insert({
        event_type: event.event_type,
        severity: event.severity,
        ip_address,
        user_id,
        details: event.details,
      });
    } catch (err) {
      // Don't let a security-event write failure affect the request path.
      logger.error('Failed to persist security event', err, {
        service: 'rate-limiter',
      });
    }
  }

  /**
   * Create rate limit headers for HTTP response
   */
  createHeaders(result: RateLimitResult): Record<string, string> {
    const headers: Record<string, string> = {
      // Modern RateLimit-* headers (draft-ietf-httpapi-ratelimit-headers)
      'RateLimit-Limit': result.limit.toString(),
      'RateLimit-Remaining': result.remaining.toString(),
      'RateLimit-Reset': new Date(result.resetTime).toISOString(),
      'RateLimit-Policy': `${result.limit};w=${Math.ceil(result.resetTime / 1000)}`,
    };

    // Legacy X-RateLimit-* headers for compatibility
    headers['X-RateLimit-Limit'] = result.limit.toString();
    headers['X-RateLimit-Remaining'] = result.remaining.toString();
    headers['X-RateLimit-Reset'] = Math.ceil(
      result.resetTime / 1000
    ).toString();

    // Add Retry-After header when rate limited
    if (!result.allowed && result.retryAfter) {
      headers['Retry-After'] = result.retryAfter.toString();
    }

    // Add tier information for debugging
    if (process.env.NODE_ENV === 'development') {
      headers['X-RateLimit-Tier'] = result.tier;
    }

    return headers;
  }

  /**
   * Reset rate limit for a specific identifier (admin use)
   */
  async reset(identifier: string, path: string): Promise<void> {
    const store = await this.getStore();
    const config = getRateLimitConfig(path);
    const window = Math.floor(Date.now() / config.windowMs);

    // Reset for all tiers
    const tiers: RateLimitTier[] = [
      'anonymous',
      'authenticated',
      'admin',
      'premium',
    ];
    for (const tier of tiers) {
      const key = `rl:${path}:${tier}:${identifier}:${window}`;
      await store.expire(key, 0); // Expire immediately
    }

    logger.info('Rate limit reset', {
      service: 'rate-limiter',
      identifier,
      path,
    });
  }
}

// ============================================================================
// SINGLETON INSTANCE & EXPORTS
// ============================================================================

// Create singleton instance
let rateLimiterInstance: EnhancedRateLimiter | null = null;

export function getRateLimiter(): EnhancedRateLimiter {
  if (!rateLimiterInstance) {
    rateLimiterInstance = new EnhancedRateLimiter();
  }
  return rateLimiterInstance;
}

// Export convenience functions for backward compatibility
export async function checkRateLimit(
  request: NextRequest | string,
  options?: RateLimitOptions
): Promise<RateLimitResult> {
  return getRateLimiter().checkLimit(request, options);
}

export function createRateLimitHeaders(
  result: RateLimitResult
): Record<string, string> {
  return getRateLimiter().createHeaders(result);
}

// Export specific rate limit checkers for common use cases
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

// For backward compatibility with existing code
export { recordSuccessfulLogin } from './rate-limiter';
