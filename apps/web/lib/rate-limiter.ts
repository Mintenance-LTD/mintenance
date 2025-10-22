/**
 * Distributed rate limiting using Redis
 * Replaces in-memory rate limiting for webhook endpoints
 */

import { NextRequest } from 'next/server';

// Global type declaration for rate limit fallback
declare global {
  var rateLimitFallback: Map<string, number> | undefined;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
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

    // Increment counter
      const count = await this.redis.incr(key);
      
      // Set expiration if this is the first request in the window
      if (count === 1) {
        await this.redis.expire(key, Math.ceil(config.windowMs / 1000));
      }

      const remaining = Math.max(0, config.maxRequests - count);
      const resetTime = Date.now() + config.windowMs;

      return {
        allowed: count <= config.maxRequests,
        remaining,
        resetTime,
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

    return {
      allowed: count <= effectiveMaxRequests,
      remaining,
      resetTime,
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
export async function checkLoginRateLimit(request: NextRequest): Promise<RateLimitResult> {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
             request.headers.get('x-real-ip') ||
             'unknown';
  return rateLimiter.checkRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // Max 5 login attempts per 15 minutes
    identifier: `login:${ip}`,
  });
}

// Helper to record successful login (for rate limiting)
export function recordSuccessfulLogin(request: NextRequest): void {
  // Can be used to reset rate limit on successful login if needed
}

// Helper to create rate limit headers
export function createRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': result.remaining.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
  };
}