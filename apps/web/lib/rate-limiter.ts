/**
 * Distributed rate limiting using Redis
 * Replaces in-memory rate limiting for webhook endpoints
 */
import {
  logger,
  BUSINESS_RULES,
  RATE_LIMITS,
  TIME_MS,
} from '@mintenance/shared';
import { getClientIp } from '@/lib/request-ip';

// Global type declaration for rate limit fallback
declare global {
  var rateLimitFallback: Map<string, number> | undefined;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  identifier: string;
  /**
   * Audit 2026-05-24 HIGH: opt-in fail-closed when the limiter has fallen
   * back to in-memory in production. The in-memory map only enforces
   * per-instance limits — on a multi-region Vercel deployment the same
   * IP can hit N instances and execute N × limit requests. For credential
   * primitives, payment endpoints, and admin mutations that is not
   * acceptable: the cost of a false rejection (a 60s 429 to a real user)
   * is much lower than the cost of allowing a credential-stuffing /
   * payment-replay / admin-spray attack through.
   *
   * Audit 2026-07-27: routes WITHOUT this field no longer keep the old
   * generous per-instance fallback. In production a degraded limiter now
   * applies a conservative shared-budget limit (global limit ÷ assumed
   * instance count, hard-capped) to unclassified routes — see
   * fallbackRateLimit. Tagged routes still fail fully closed.
   */
  criticality?: 'auth' | 'payment' | 'admin';
}

export class RedisRateLimiter {
  private redis: {
    incr: (key: string) => Promise<number>;
    expire: (key: string, seconds: number) => Promise<number>;
  } | null = null;
  private initialized = false;
  /**
   * Settles once the constructor's async Redis setup has finished. Awaited by
   * checkRateLimit so requests that arrive during cold start don't race the
   * initialization into the degraded in-memory fallback (and so tests can
   * deterministically inject a mock client after construction).
   */
  private readonly initPromise: Promise<void>;

  constructor() {
    this.initPromise = this.initializeRedis();
  }

  private async initializeRedis() {
    try {
      // Use Upstash Redis if available, otherwise fallback to in-memory
      if (
        process.env.UPSTASH_REDIS_REST_URL &&
        process.env.UPSTASH_REDIS_REST_TOKEN
      ) {
        const { Redis } = await import('@upstash/redis');
        this.redis = new Redis({
          url: process.env.UPSTASH_REDIS_REST_URL,
          token: process.env.UPSTASH_REDIS_REST_TOKEN,
        });
        this.initialized = true;
      } else {
        logger.warn(
          'Redis not configured, falling back to in-memory rate limiting',
          {
            service: 'rate_limiter',
          }
        );
        this.initialized = false;
      }
    } catch (error) {
      logger.warn(
        'Failed to initialize Redis, falling back to in-memory rate limiting',
        {
          service: 'rate_limiter',
          error,
        }
      );
      this.initialized = false;
    }
  }

  async checkRateLimit(config: RateLimitConfig): Promise<RateLimitResult> {
    // E2E bypass — same gate as the /api/test-auth/login fixture. Without
    // this, the production fail-closed posture (criticality-tagged routes
    // reject outright when Redis is absent; unclassified routes get a
    // shared-budget cap of ~5/window) blocks a serial Playwright suite that
    // funnels every request through one IP. E2E_TESTING is never set in
    // production (enforced by the test-auth route contract).
    if (process.env.E2E_TESTING === 'true') {
      return {
        allowed: true,
        remaining: config.maxRequests,
        resetTime: Date.now() + config.windowMs,
      };
    }

    await this.initPromise;
    if (!this.initialized) {
      return this.fallbackRateLimit(config);
    }

    try {
      const key = `rate_limit:${config.identifier}:${Math.floor(Date.now() / config.windowMs)}`;

      // Use Promise.race to timeout Redis operations
      const count = await Promise.race([
        this.redis!.incr(key),
        new Promise<number>((_, reject) => {
          setTimeout(
            () => reject(new Error('Redis timeout')),
            RATE_LIMITS.REDIS_TIMEOUT_MS
          );
        }),
      ]);

      // Set expiration if this is the first request in the window
      if (count === 1) {
        await Promise.race([
          this.redis!.expire(key, Math.ceil(config.windowMs / 1000)),
          new Promise<number>((_, reject) => {
            setTimeout(
              () => reject(new Error('Redis timeout')),
              RATE_LIMITS.REDIS_EXPIRE_TIMEOUT_MS
            );
          }),
        ]);
      }

      const remaining = Math.max(0, config.maxRequests - count);
      const resetTime = Date.now() + config.windowMs;
      const retryAfter =
        count > config.maxRequests
          ? Math.ceil((resetTime - Date.now()) / 1000)
          : 0;

      return {
        allowed: count <= config.maxRequests,
        remaining,
        resetTime,
        retryAfter,
      };
    } catch (error) {
      logger.error(
        'Redis rate limiting failed, falling back to in-memory',
        error,
        {
          service: 'rate_limiter',
          identifier: config.identifier,
        }
      );
      return this.fallbackRateLimit(config);
    }
  }

  private fallbackRateLimit(config: RateLimitConfig): RateLimitResult {
    // P1 Security: When Redis is down in production, use strict limits
    // In-memory Map won't sync across Vercel Edge instances
    const isProduction = process.env.NODE_ENV === 'production';

    // Audit 2026-05-24 HIGH: fail-closed for criticality-tagged configs
    // in production. The in-memory fallback enforces per-instance limits
    // only — for auth/payment/admin classes that is structurally unsafe
    // because the same source IP can replay against every region/instance.
    // We reject these requests outright with a Retry-After so the caller
    // backs off; logs note the fact so on-call knows Redis is degraded.
    if (isProduction && config.criticality) {
      logger.error(
        '[rate-limiter] FAIL-CLOSED — Redis unavailable in production for critical class',
        undefined,
        {
          service: 'rate_limiter',
          identifier: config.identifier,
          environment: 'production',
          criticality: config.criticality,
        }
      );
      return {
        allowed: false,
        remaining: 0,
        resetTime: Date.now() + config.windowMs,
        retryAfter: Math.ceil(config.windowMs / 1000),
      };
    }

    // Audit 2026-07-27 HIGH: DEFAULT is no longer "silently per-instance".
    // Unclassified routes in production now get a CONSERVATIVE SHARED-BUDGET
    // approximation: the configured global limit is divided across an assumed
    // instance fleet, so N instances × per-instance-limit ≈ the intended
    // global limit instead of N × the full limit. This closes the multi-region
    // amplification hole for every route while keeping legitimate traffic
    // (a real user hits one instance) flowing during a Redis outage.
    // Routes tagged 'auth' | 'payment' | 'admin' fail closed above — that
    // path is unchanged.
    const DEGRADED_ASSUMED_INSTANCES = 8;
    const DEGRADED_UNTAGGED_HARD_CAP = 5;

    let effectiveMaxRequests: number;
    if (isProduction) {
      effectiveMaxRequests = Math.max(
        1,
        Math.min(
          DEGRADED_UNTAGGED_HARD_CAP,
          Math.floor(config.maxRequests / DEGRADED_ASSUMED_INSTANCES)
        )
      );
      logger.error(
        '[rate-limiter] DEGRADED — Redis unavailable in production; applying conservative shared-budget per-instance limit for unclassified route',
        undefined,
        {
          service: 'rate_limiter',
          identifier: config.identifier,
          environment: 'production',
          normalLimit: config.maxRequests,
          degradedLimit: effectiveMaxRequests,
          assumedInstances: DEGRADED_ASSUMED_INSTANCES,
        }
      );
    } else {
      // Dev/test: 75% of normal limit (historical behaviour, unchanged)
      effectiveMaxRequests = Math.min(50, Math.ceil(config.maxRequests * 0.75));
    }

    const now = Date.now();
    const windowStart = Math.floor(now / config.windowMs) * config.windowMs;
    const key = `${config.identifier}:${windowStart}`;

    // Use a simple Map for fallback (WARNING: won't sync across instances)
    if (!globalThis.rateLimitFallback) {
      globalThis.rateLimitFallback = new Map();
    }

    const record = globalThis.rateLimitFallback.get(key);
    const count = (record || 0) + 1;

    globalThis.rateLimitFallback.set(key, count);

    // Clean up old entries to prevent memory leak (TTL-based eviction)
    for (const [k] of globalThis.rateLimitFallback) {
      const windowTime = parseInt(k.split(':').pop() || '0');
      if (now - windowTime > config.windowMs) {
        globalThis.rateLimitFallback.delete(k);
      }
    }

    // Additional safeguard: enforce max entries limit to prevent unbounded growth
    if (globalThis.rateLimitFallback.size > RATE_LIMITS.MAX_FALLBACK_ENTRIES) {
      // Remove oldest entries (first entries in Map iteration order)
      const entriesToRemove =
        globalThis.rateLimitFallback.size - RATE_LIMITS.MAX_FALLBACK_ENTRIES;
      let removed = 0;
      for (const [k] of globalThis.rateLimitFallback) {
        if (removed >= entriesToRemove) break;
        globalThis.rateLimitFallback.delete(k);
        removed++;
      }
      logger.warn(
        '[rate-limiter] Fallback map exceeded max entries, evicted oldest entries',
        {
          service: 'rate_limiter',
          evictedCount: removed,
          currentSize: globalThis.rateLimitFallback.size,
        }
      );
    }

    const remaining = Math.max(0, effectiveMaxRequests - count);
    const resetTime = windowStart + config.windowMs;
    const retryAfter =
      count > effectiveMaxRequests
        ? Math.ceil((resetTime - Date.now()) / 1000)
        : 0;

    return {
      allowed: count <= effectiveMaxRequests,
      remaining,
      resetTime,
      retryAfter,
    };
  }
}

// Singleton instance
export const rateLimiter = new RedisRateLimiter();

// Helper function for webhook rate limiting
export async function checkWebhookRateLimit(
  identifier: string
): Promise<RateLimitResult> {
  return rateLimiter.checkRateLimit({
    windowMs: TIME_MS.MINUTE,
    maxRequests: RATE_LIMITS.WEBHOOK_REQUESTS_PER_MINUTE,
    identifier,
    // Fail closed on Redis outage: Stripe retries 429s with backoff for days,
    // so rejecting during a Redis blip is safe; accepting unmetered payment
    // webhook replays is not.
    criticality: 'payment',
  });
}

// Helper function for job creation rate limiting
export async function checkJobCreationRateLimit(
  userId: string
): Promise<RateLimitResult> {
  return rateLimiter.checkRateLimit({
    windowMs: TIME_MS.HOUR,
    maxRequests: BUSINESS_RULES.MAX_JOBS_PER_HOUR,
    identifier: `job-creation:${userId}`,
  });
}

// Helper function for API rate limiting
export async function checkApiRateLimit(
  identifier: string
): Promise<RateLimitResult> {
  return rateLimiter.checkRateLimit({
    windowMs: TIME_MS.MINUTE,
    maxRequests: RATE_LIMITS.API_REQUESTS_PER_MINUTE,
    identifier,
  });
}

// Helper function for login rate limiting
export async function checkLoginRateLimit(
  request: { headers: { get: (key: string) => string | null } } | string
): Promise<RateLimitResult> {
  const identifier =
    typeof request === 'string' ? request : getClientIp(request);

  return rateLimiter.checkRateLimit({
    windowMs: BUSINESS_RULES.LOGIN_LOCKOUT_DURATION_MINUTES * TIME_MS.MINUTE,
    maxRequests: BUSINESS_RULES.MAX_LOGIN_ATTEMPTS,
    identifier,
    // Credential primitive — fail closed when the limiter is degraded rather
    // than let credential stuffing spray across per-instance fallback maps.
    criticality: 'auth',
  });
}

// Helper function for password reset rate limiting
export async function checkPasswordResetRateLimit(
  identifier: string | { headers: { get: (key: string) => string | null } }
): Promise<RateLimitResult> {
  const id =
    typeof identifier === 'string' ? identifier : getClientIp(identifier);

  return rateLimiter.checkRateLimit({
    windowMs: TIME_MS.HOUR,
    maxRequests: BUSINESS_RULES.MAX_PASSWORD_RESETS_PER_HOUR,
    identifier: id,
    // Credential primitive — same fail-closed posture as login.
    criticality: 'auth',
  });
}

// Helper function for AI analysis rate limiting (expensive operations)
export async function checkAIAnalysisRateLimit(request: {
  headers: { get: (key: string) => string | null };
}): Promise<RateLimitResult> {
  const identifier = getClientIp(request);

  return rateLimiter.checkRateLimit({
    windowMs: TIME_MS.MINUTE,
    maxRequests: RATE_LIMITS.AI_ANALYSIS_PER_MINUTE,
    identifier: `ai-analyze:${identifier}`,
  });
}

// Helper function for AI search rate limiting
export async function checkAISearchRateLimit(request: {
  headers: { get: (key: string) => string | null };
}): Promise<RateLimitResult> {
  const identifier = getClientIp(request);

  return rateLimiter.checkRateLimit({
    windowMs: TIME_MS.MINUTE,
    maxRequests: RATE_LIMITS.AI_SEARCH_PER_MINUTE,
    identifier: `ai-search:${identifier}`,
  });
}

// Helper function for AI suggestions rate limiting
export async function checkAISuggestionsRateLimit(request: {
  headers: { get: (key: string) => string | null };
}): Promise<RateLimitResult> {
  const identifier = getClientIp(request);

  return rateLimiter.checkRateLimit({
    windowMs: TIME_MS.MINUTE,
    maxRequests: RATE_LIMITS.AI_SUGGESTIONS_PER_MINUTE,
    identifier: `ai-suggestions:${identifier}`,
  });
}

// Helper function to record successful login (for analytics)
export function recordSuccessfulLogin(request: {
  headers: { get: (key: string) => string | null };
}): void {
  const identifier = getClientIp(request);
  logger.info('Successful login recorded', {
    service: 'rate_limiter',
    identifier,
  });
}

// Helper function to create rate limit headers for response
export function createRateLimitHeaders(
  result: RateLimitResult
): Record<string, string> {
  return {
    'X-RateLimit-Limit': '100',
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString(),
    'Retry-After': result.allowed
      ? '0'
      : Math.ceil((result.resetTime - Date.now()) / 1000).toString(),
  };
}

// Helper function for per-user AI rate limiting (prevents single user from exhausting AI budget)
export async function checkAIUserRateLimit(
  userId: string
): Promise<RateLimitResult> {
  return rateLimiter.checkRateLimit({
    windowMs: TIME_MS.MINUTE,
    maxRequests: RATE_LIMITS.AI_USER_REQUESTS_PER_MINUTE ?? 3,
    identifier: `ai-user:${userId}`,
  });
}

// Alias for backward compatibility
export const checkRateLimit = checkApiRateLimit;
