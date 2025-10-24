/**
 * Distributed rate limiting using Redis
 * Replaces in-memory rate limiting for webhook endpoints
 */

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
}

export class RedisRateLimiter {
  private redis: { incr: (key: string) => Promise<number>; expire: (key: string, seconds: number) => Promise<number> } | null;
  private initialized = false;

  constructor() {
    this.initializeRedis();
  }

  private async initializeRedis() {
    try {
      // Use Upstash Redis if available, otherwise fallback to in-memory
      if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
        const { Redis } = await import('@upstash/redis');
        this.redis = new Redis({
          url: process.env.UPSTASH_REDIS_REST_URL,
          token: process.env.UPSTASH_REDIS_REST_TOKEN,
        });
        this.initialized = true;
      } else {
        console.warn('Redis not configured, falling back to in-memory rate limiting');
        this.initialized = false;
      }
    } catch (error) {
      console.warn('Failed to initialize Redis, falling back to in-memory rate limiting:', error);
      this.initialized = false;
    }
  }

  async checkRateLimit(config: RateLimitConfig): Promise<RateLimitResult> {
    if (!this.initialized) {
      return this.fallbackRateLimit(config);
    }

    try {
      const key = `rate_limit:${config.identifier}:${Math.floor(Date.now() / config.windowMs)}`;

      // Use Promise.race to timeout Redis operations
      const count = await Promise.race([
        this.redis.incr(key),
        new Promise<number>((_, reject) => {
          setTimeout(() => reject(new Error('Redis timeout')), 5000); // 5 second timeout
        })
      ]);
      
      // Set expiration if this is the first request in the window
      if (count === 1) {
        await Promise.race([
          this.redis.expire(key, Math.ceil(config.windowMs / 1000)),
          new Promise<number>((_, reject) => {
            setTimeout(() => reject(new Error('Redis timeout')), 2000); // 2 second timeout
          })
        ]);
      }

      const remaining = Math.max(0, config.maxRequests - count);
      const resetTime = Date.now() + config.windowMs;
      const retryAfter = count > config.maxRequests ? Math.ceil((resetTime - Date.now()) / 1000) : 0;

      return {
        allowed: count <= config.maxRequests,
        remaining,
        resetTime,
        retryAfter,
      };
    } catch (error) {
      console.error('Redis rate limiting failed, falling back to in-memory:', error);
      return this.fallbackRateLimit(config);
    }
  }

  private fallbackRateLimit(config: RateLimitConfig): RateLimitResult {
    // SECURITY: Graceful degradation when Redis unavailable in production
    // Allow reduced rate limit (10% of normal) to maintain availability
    const isProduction = process.env.NODE_ENV === 'production';

    if (isProduction) {
      console.warn('[rate-limiter] Redis unavailable - DEGRADED MODE active', {
        service: 'rate-limiter',
        identifier: config.identifier,
        environment: 'production',
        normalLimit: config.maxRequests,
        degradedLimit: Math.ceil(config.maxRequests * 0.1)
      });
    } else {
      console.warn('[rate-limiter] Using in-memory fallback - not suitable for production');
    }

    // Use in-memory fallback with reduced limits in production
    const effectiveMaxRequests = isProduction
      ? Math.ceil(config.maxRequests * 0.1)
      : config.maxRequests;

    const now = Date.now();
    const windowStart = Math.floor(now / config.windowMs) * config.windowMs;
    const key = `${config.identifier}:${windowStart}`;

    // Use a simple Map for fallback (note: won't sync across instances)
    if (!globalThis.rateLimitFallback) {
      globalThis.rateLimitFallback = new Map();
    }

    const record = globalThis.rateLimitFallback.get(key);
    const count = (record || 0) + 1;

    globalThis.rateLimitFallback.set(key, count);

    // Clean up old entries
    for (const [k] of globalThis.rateLimitFallback) {
      const windowTime = parseInt(k.split(':').pop() || '0');
      if (now - windowTime > config.windowMs) {
        globalThis.rateLimitFallback.delete(k);
      }
    }

    const remaining = Math.max(0, effectiveMaxRequests - count);
    const resetTime = windowStart + config.windowMs;
    const retryAfter = count > effectiveMaxRequests ? Math.ceil((resetTime - Date.now()) / 1000) : 0;

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
export async function checkWebhookRateLimit(identifier: string): Promise<RateLimitResult> {
  return rateLimiter.checkRateLimit({
    windowMs: 60000, // 1 minute
    maxRequests: 100, // Max 100 requests per minute
    identifier,
  });
}

// Helper function for API rate limiting
export async function checkApiRateLimit(identifier: string): Promise<RateLimitResult> {
  return rateLimiter.checkRateLimit({
    windowMs: 60000, // 1 minute
    maxRequests: 1000, // Max 1000 requests per minute
    identifier,
  });
}

// Helper function for login rate limiting
export async function checkLoginRateLimit(request: { headers: { get: (key: string) => string | null } } | string): Promise<RateLimitResult> {
  let identifier: string;

  if (typeof request === 'string') {
    identifier = request;
  } else {
    identifier = request.headers.get('x-forwarded-for')?.split(',')[0] ||
                 request.headers.get('x-real-ip') ||
                 'unknown';
  }

  return rateLimiter.checkRateLimit({
    windowMs: 900000, // 15 minutes
    maxRequests: 5, // Max 5 login attempts per 15 minutes
    identifier,
  });
}

// Helper function for password reset rate limiting
export async function checkPasswordResetRateLimit(identifier: string | { headers: { get: (key: string) => string | null } }): Promise<RateLimitResult> {
  let id: string;

  if (typeof identifier === 'string') {
    id = identifier;
  } else {
    // Extract identifier from NextRequest
    id = identifier.headers.get('x-forwarded-for')?.split(',')[0] ||
         identifier.headers.get('x-real-ip') ||
         'unknown';
  }

  return rateLimiter.checkRateLimit({
    windowMs: 3600000, // 1 hour
    maxRequests: 3, // Max 3 password resets per hour
    identifier: id,
  });
}

// Helper function to record successful login (for analytics)
export function recordSuccessfulLogin(request: { headers: { get: (key: string) => string | null } }): void {
  const identifier = request.headers.get('x-forwarded-for')?.split(',')[0] ||
                   request.headers.get('x-real-ip') ||
                   'unknown';
  console.log(`[rate-limiter] Successful login recorded for ${identifier}`);
}

// Helper function to create rate limit headers for response
export function createRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': '100',
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString(),
    'Retry-After': result.allowed ? '0' : Math.ceil((result.resetTime - Date.now()) / 1000).toString(),
  };
}