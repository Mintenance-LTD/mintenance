import { logger } from '@mintenance/shared';
import {
  getRateLimitConfig,
  shouldBypassRateLimit,
  type RateLimitTier,
} from '../constants/rate-limits';
import type { NextRequest } from 'next/server';
import type { RateLimitStore } from './stores/types';
import { UpstashStore } from './stores/UpstashStore';
import { InMemoryStore } from './stores/InMemoryStore';
import {
  getIdentifier,
  getTierFromRequest,
  createRateLimitHeaders,
} from './helpers';
import { logViolation, handlePotentialDDoS } from './security/violations';
import type { RateLimitResult, RateLimitOptions } from './index';

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
        if (redisRequired) {
          const msg =
            'Rate limiter requires Upstash Redis in production. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN, or set REDIS_REQUIRED=false.';
          logger.error(
            '[CRITICAL] ' + msg,
            new Error('REDIS_REQUIRED but not configured'),
            { service: 'rate-limiter', severity: 'CRITICAL' }
          );
          throw new Error(msg);
        }
        logger.warn(
          'No Redis configured, using in-memory rate limiting. Not suitable for multi-instance.',
          { service: 'rate-limiter' }
        );
      } catch (error) {
        logger.error('Failed to initialize primary rate limit store', error, {
          service: 'rate-limiter',
          severity: redisRequired ? 'CRITICAL' : 'MEDIUM',
        });
        if (redisRequired) throw error;
      }
    })();
    return this.initPromise;
  }

  private async getStore(): Promise<RateLimitStore> {
    await this.init();
    if (this.primaryStore) {
      const isHealthy = await this.primaryStore.isHealthy();
      if (isHealthy) return this.primaryStore;
      logger.warn('Primary rate limit store unhealthy, using fallback', {
        service: 'rate-limiter',
      });
    }
    return this.fallbackStore;
  }

  async checkLimit(
    request: NextRequest | string,
    options: RateLimitOptions = {}
  ): Promise<RateLimitResult> {
    try {
      const path =
        typeof request === 'string' ? request : new URL(request.url).pathname;
      const identifier = options.identifier || getIdentifier(request);
      const tier = options.tier || getTierFromRequest(request);

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

      const config = getRateLimitConfig(options.path || path);
      const limit = config.max[tier];
      if (limit === 0) {
        return {
          allowed: false,
          limit: 0,
          remaining: 0,
          resetTime: Date.now() + config.windowMs,
          retryAfter: Math.ceil(config.windowMs / 1000),
          tier,
        };
      }

      const store = await this.getStore();
      const isUsingFallback = store === this.fallbackStore;
      const effectiveLimit =
        isUsingFallback && process.env.NODE_ENV === 'production'
          ? Math.max(3, Math.ceil(limit * 0.75))
          : limit;

      const window = Math.floor(Date.now() / config.windowMs);
      const key = `rl:${path}:${tier}:${identifier}:${window}`;
      const count = await store.incr(key);
      if (count === 1)
        await store.expire(key, Math.ceil(config.windowMs / 1000));

      const allowed = count <= effectiveLimit;
      const remaining = Math.max(0, effectiveLimit - count);
      const resetTime = (window + 1) * config.windowMs;
      const retryAfter = allowed
        ? undefined
        : Math.ceil((resetTime - Date.now()) / 1000);

      if (!allowed)
        await logViolation(path, identifier, tier, count, effectiveLimit);
      if (count > effectiveLimit * 3)
        await handlePotentialDDoS(identifier, path, count);

      return {
        allowed,
        limit: effectiveLimit,
        remaining,
        resetTime,
        retryAfter,
        tier,
      };
    } catch (error) {
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

  createHeaders(result: RateLimitResult): Record<string, string> {
    return createRateLimitHeaders(result);
  }

  async reset(identifier: string, path: string): Promise<void> {
    const store = await this.getStore();
    const config = getRateLimitConfig(path);
    const window = Math.floor(Date.now() / config.windowMs);
    const tiers: RateLimitTier[] = [
      'anonymous',
      'authenticated',
      'admin',
      'premium',
    ];
    for (const tier of tiers) {
      const key = `rl:${path}:${tier}:${identifier}:${window}`;
      await store.expire(key, 0);
    }
    logger.info('Rate limit reset', {
      service: 'rate-limiter',
      identifier,
      path,
    });
  }
}
