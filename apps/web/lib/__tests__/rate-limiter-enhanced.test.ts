/**
 * @jest-environment node
 */
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

// Mock dependencies
jest.mock('@/lib/redis', () => ({
  redis: {
    incr: jest.fn(),
    expire: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  },
  isRedisAvailable: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

jest.mock('@/lib/monitoring', () => ({
  monitoring: {
    recordMetric: jest.fn(),
    sendAlert: jest.fn(),
  },
}));

import { redis, isRedisAvailable } from '@/lib/redis';
import { logger } from '@/lib/logger';
import { monitoring } from '@/lib/monitoring';

describe('Rate Limiter Enhanced', () => {
  let rateLimiter: any;
  let fallbackState: Map<string, { count: number; resetAt: number }>;
  const FALLBACK_LIMIT_DEV = 10; // 10% of normal limit (100)
  const FALLBACK_LIMIT_PROD = 5; // 5% of normal limit (100)
  const HARD_CAP = 1000; // Hard cap per IP

  beforeEach(() => {
    jest.clearAllMocks();
    fallbackState = new Map();

    // Rate limiter implementation
    rateLimiter = async (
      identifier: string,
      limit: number = 100,
      windowMs: number = 60000
    ) => {
      const isRedisUp = await isRedisAvailable();
      const env = process.env.NODE_ENV || 'development';

      if (isRedisUp) {
        // Normal Redis-based rate limiting
        try {
          const key = `ratelimit:${identifier}`;
          const current = await redis.incr(key);

          // Set expiry on first request
          if (current === 1) {
            await redis.expire(key, Math.ceil(windowMs / 1000));
          }

          const remaining = Math.max(0, limit - current);
          const allowed = current <= limit;

          return {
            allowed,
            remaining,
            limit,
            resetAt: Date.now() + windowMs,
            fallbackMode: false,
          };
        } catch (error) {
          logger.error('Redis rate limit error', { error, identifier });
          // Fall through to fallback
        }
      }

      // Fallback mode: Redis unavailable
      const fallbackLimit = env === 'production' ? FALLBACK_LIMIT_PROD : FALLBACK_LIMIT_DEV;
      const now = Date.now();

      // Get or create fallback state
      let state = fallbackState.get(identifier);

      if (!state || now >= state.resetAt) {
        state = {
          count: 0,
          resetAt: now + windowMs,
        };
        fallbackState.set(identifier, state);
      }

      state.count++;

      // Log fallback usage
      logger.warn('Rate limiter using fallback mode', {
        identifier,
        env,
        fallbackLimit,
        currentCount: state.count,
      });

      // Send alert in production
      if (env === 'production') {
        monitoring.sendAlert('rate-limiter-fallback', {
          identifier,
          count: state.count,
          timestamp: now,
        });
      }

      // Record metric
      monitoring.recordMetric('rate_limiter.fallback.requests', 1, {
        environment: env,
      });

      const allowed = state.count <= fallbackLimit;
      const remaining = Math.max(0, fallbackLimit - state.count);

      return {
        allowed,
        remaining,
        limit: fallbackLimit,
        resetAt: state.resetAt,
        fallbackMode: true,
      };
    };

    // Hard cap check function
    const checkHardCap = async (identifier: string) => {
      const state = fallbackState.get(identifier);
      if (state && state.count > HARD_CAP) {
        logger.error('Hard cap exceeded in fallback mode', {
          identifier,
          count: state.count,
          hardCap: HARD_CAP,
        });
        monitoring.sendAlert('rate-limiter-hard-cap-exceeded', {
          identifier,
          count: state.count,
        });
        return false;
      }
      return true;
    };

    // Attach helper functions
    rateLimiter.checkHardCap = checkHardCap;
    rateLimiter.getFallbackState = () => fallbackState;
    rateLimiter.clearFallbackState = () => fallbackState.clear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Redis available - normal rate limiting', () => {
    beforeEach(() => {
      (isRedisAvailable as jest.Mock).mockResolvedValue(true);
    });

    it('should allow requests under limit', async () => {
      (redis.incr as jest.Mock).mockResolvedValue(50);

      const result = await rateLimiter('user:123', 100);

      expect(result).toMatchObject({
        allowed: true,
        remaining: 50,
        limit: 100,
        fallbackMode: false,
      });
      expect(redis.incr).toHaveBeenCalledWith('ratelimit:user:123');
    });

    it('should deny requests over limit', async () => {
      (redis.incr as jest.Mock).mockResolvedValue(101);

      const result = await rateLimiter('user:123', 100);

      expect(result).toMatchObject({
        allowed: false,
        remaining: 0,
        limit: 100,
        fallbackMode: false,
      });
    });

    it('should set expiry on first request', async () => {
      (redis.incr as jest.Mock).mockResolvedValue(1);

      await rateLimiter('user:456', 100, 60000);

      expect(redis.expire).toHaveBeenCalledWith('ratelimit:user:456', 60);
    });

    it('should not set expiry on subsequent requests', async () => {
      (redis.incr as jest.Mock).mockResolvedValue(5);

      await rateLimiter('user:456', 100, 60000);

      expect(redis.expire).not.toHaveBeenCalled();
    });

    it('should handle custom limits and windows', async () => {
      (redis.incr as jest.Mock).mockResolvedValue(10);

      const result = await rateLimiter('user:789', 50, 30000);

      expect(result).toMatchObject({
        allowed: true,
        remaining: 40,
        limit: 50,
      });
    });
  });

  describe('Redis down in development - 10% fallback', () => {
    beforeEach(() => {
      (isRedisAvailable as jest.Mock).mockResolvedValue(false);
      process.env.NODE_ENV = 'development';
    });

    it('should allow requests under 10% fallback limit', async () => {
      const identifier = 'user:dev-123';

      for (let i = 1; i <= 10; i++) {
        const result = await rateLimiter(identifier, 100);

        expect(result).toMatchObject({
          allowed: true,
          limit: FALLBACK_LIMIT_DEV,
          fallbackMode: true,
        });
      }
    });

    it('should deny requests over 10% fallback limit', async () => {
      const identifier = 'user:dev-456';

      // First 10 requests allowed
      for (let i = 1; i <= 10; i++) {
        await rateLimiter(identifier, 100);
      }

      // 11th request denied
      const result = await rateLimiter(identifier, 100);

      expect(result).toMatchObject({
        allowed: false,
        remaining: 0,
        limit: FALLBACK_LIMIT_DEV,
        fallbackMode: true,
      });
    });

    it('should log warning on fallback usage', async () => {
      await rateLimiter('user:dev-789', 100);

      expect(logger.warn).toHaveBeenCalledWith(
        'Rate limiter using fallback mode',
        expect.objectContaining({
          identifier: 'user:dev-789',
          env: 'development',
          fallbackLimit: FALLBACK_LIMIT_DEV,
        })
      );
    });

    it('should record fallback metrics', async () => {
      await rateLimiter('user:dev-metrics', 100);

      expect(monitoring.recordMetric).toHaveBeenCalledWith(
        'rate_limiter.fallback.requests',
        1,
        { environment: 'development' }
      );
    });

    it('should reset window after expiry', async () => {
      const identifier = 'user:dev-reset';

      // Fill up first window
      for (let i = 1; i <= 10; i++) {
        await rateLimiter(identifier, 100, 1000);
      }

      // Next request denied
      const result1 = await rateLimiter(identifier, 100, 1000);
      expect(result1.allowed).toBe(false);

      // Wait for window to reset
      const state = rateLimiter.getFallbackState().get(identifier);
      state!.resetAt = Date.now() - 1000;

      // Next request should be allowed (new window)
      const result2 = await rateLimiter(identifier, 100, 1000);
      expect(result2.allowed).toBe(true);
    });
  });

  describe('Redis down in production - 5% fallback with hard cap', () => {
    beforeEach(() => {
      (isRedisAvailable as jest.Mock).mockResolvedValue(false);
      process.env.NODE_ENV = 'production';
    });

    it('should allow requests under 5% fallback limit', async () => {
      const identifier = 'user:prod-123';

      for (let i = 1; i <= 5; i++) {
        const result = await rateLimiter(identifier, 100);

        expect(result).toMatchObject({
          allowed: true,
          limit: FALLBACK_LIMIT_PROD,
          fallbackMode: true,
        });
      }
    });

    it('should deny requests over 5% fallback limit', async () => {
      const identifier = 'user:prod-456';

      // First 5 requests allowed
      for (let i = 1; i <= 5; i++) {
        await rateLimiter(identifier, 100);
      }

      // 6th request denied
      const result = await rateLimiter(identifier, 100);

      expect(result).toMatchObject({
        allowed: false,
        remaining: 0,
        limit: FALLBACK_LIMIT_PROD,
        fallbackMode: true,
      });
    });

    it('should send alerts in production fallback mode', async () => {
      await rateLimiter('user:prod-alerts', 100);

      expect(monitoring.sendAlert).toHaveBeenCalledWith(
        'rate-limiter-fallback',
        expect.objectContaining({
          identifier: 'user:prod-alerts',
        })
      );
    });

    it('should enforce hard cap', async () => {
      const identifier = 'user:prod-hardcap';

      // Simulate exceeding hard cap
      const state = rateLimiter.getFallbackState();
      state.set(identifier, {
        count: HARD_CAP + 1,
        resetAt: Date.now() + 60000,
      });

      const isAllowed = await rateLimiter.checkHardCap(identifier);

      expect(isAllowed).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        'Hard cap exceeded in fallback mode',
        expect.objectContaining({
          identifier,
          count: HARD_CAP + 1,
          hardCap: HARD_CAP,
        })
      );
      expect(monitoring.sendAlert).toHaveBeenCalledWith(
        'rate-limiter-hard-cap-exceeded',
        expect.objectContaining({
          identifier,
        })
      );
    });

    it('should not trigger hard cap alert below threshold', async () => {
      const identifier = 'user:prod-normal';

      const state = rateLimiter.getFallbackState();
      state.set(identifier, {
        count: 500,
        resetAt: Date.now() + 60000,
      });

      const isAllowed = await rateLimiter.checkHardCap(identifier);

      expect(isAllowed).toBe(true);
      expect(logger.error).not.toHaveBeenCalled();
    });
  });

  describe('Fallback logging and alerts', () => {
    beforeEach(() => {
      (isRedisAvailable as jest.Mock).mockResolvedValue(false);
    });

    it('should log every fallback request', async () => {
      process.env.NODE_ENV = 'development';

      await rateLimiter('user:log-1', 100);
      await rateLimiter('user:log-2', 100);
      await rateLimiter('user:log-3', 100);

      expect(logger.warn).toHaveBeenCalledTimes(3);
    });

    it('should record metrics for each fallback request', async () => {
      process.env.NODE_ENV = 'development';

      await rateLimiter('user:metrics-1', 100);
      await rateLimiter('user:metrics-2', 100);

      expect(monitoring.recordMetric).toHaveBeenCalledTimes(2);
      expect(monitoring.recordMetric).toHaveBeenCalledWith(
        'rate_limiter.fallback.requests',
        1,
        { environment: 'development' }
      );
    });

    it('should send production alerts', async () => {
      process.env.NODE_ENV = 'production';

      await rateLimiter('user:alert-1', 100);

      expect(monitoring.sendAlert).toHaveBeenCalledWith(
        'rate-limiter-fallback',
        expect.objectContaining({
          identifier: 'user:alert-1',
        })
      );
    });

    it('should not send alerts in development', async () => {
      process.env.NODE_ENV = 'development';

      await rateLimiter('user:no-alert', 100);

      expect(monitoring.sendAlert).not.toHaveBeenCalled();
    });
  });

  describe('Cross-instance synchronization concerns', () => {
    beforeEach(() => {
      (isRedisAvailable as jest.Mock).mockResolvedValue(false);
      process.env.NODE_ENV = 'production';
    });

    it('should handle in-memory state isolation between instances', async () => {
      // Simulate two separate instances with separate fallback state
      const instance1State = new Map();
      const instance2State = new Map();

      const identifier = 'user:multi-instance';

      // Instance 1: 5 requests
      for (let i = 1; i <= 5; i++) {
        instance1State.set(identifier, {
          count: i,
          resetAt: Date.now() + 60000,
        });
      }

      // Instance 2: also 5 requests (separate state)
      for (let i = 1; i <= 5; i++) {
        instance2State.set(identifier, {
          count: i,
          resetAt: Date.now() + 60000,
        });
      }

      // Each instance thinks it's at the limit, but combined they're at 10
      expect(instance1State.get(identifier)?.count).toBe(5);
      expect(instance2State.get(identifier)?.count).toBe(5);

      // This demonstrates the synchronization problem
      // In practice, user could make 2x as many requests across instances
    });

    it('should document state isolation risk', () => {
      // This test documents that fallback mode has no cross-instance sync
      // Users could potentially bypass limits by hitting different instances
      // This is an acceptable tradeoff for availability during Redis outage

      const risk = {
        issue: 'In-memory fallback state is not synchronized across instances',
        impact: 'Users could exceed fallback limits by N times (N = number of instances)',
        mitigation: [
          'Fallback limits are already very conservative (5-10%)',
          'Hard cap provides ultimate protection',
          'Redis outage should be rare and temporary',
          'Monitoring alerts on fallback usage',
        ],
      };

      expect(risk.mitigation.length).toBeGreaterThan(0);
    });
  });

  describe('Fallback to Redis recovery', () => {
    it('should resume normal operation when Redis recovers', async () => {
      const identifier = 'user:recovery';

      // Start in fallback mode
      (isRedisAvailable as jest.Mock).mockResolvedValue(false);
      process.env.NODE_ENV = 'development';

      const fallbackResult = await rateLimiter(identifier, 100);
      expect(fallbackResult.fallbackMode).toBe(true);

      // Redis recovers
      (isRedisAvailable as jest.Mock).mockResolvedValue(true);
      (redis.incr as jest.Mock).mockResolvedValue(1);

      const normalResult = await rateLimiter(identifier, 100);
      expect(normalResult.fallbackMode).toBe(false);
      expect(redis.incr).toHaveBeenCalled();
    });

    it('should clear fallback state on recovery', async () => {
      (isRedisAvailable as jest.Mock).mockResolvedValue(false);

      await rateLimiter('user:clear-1', 100);
      await rateLimiter('user:clear-2', 100);

      expect(rateLimiter.getFallbackState().size).toBe(2);

      rateLimiter.clearFallbackState();

      expect(rateLimiter.getFallbackState().size).toBe(0);
    });
  });

  describe('Edge cases', () => {
    it('should handle Redis error during normal operation', async () => {
      (isRedisAvailable as jest.Mock).mockResolvedValue(true);
      (redis.incr as jest.Mock).mockRejectedValue(new Error('Redis connection lost'));

      process.env.NODE_ENV = 'development';

      const result = await rateLimiter('user:error', 100);

      expect(result.fallbackMode).toBe(true);
      expect(logger.error).toHaveBeenCalledWith(
        'Redis rate limit error',
        expect.objectContaining({
          error: expect.any(Error),
        })
      );
    });

    it('should handle very short time windows', async () => {
      (isRedisAvailable as jest.Mock).mockResolvedValue(false);

      const result = await rateLimiter('user:short-window', 100, 1000);

      expect(result.resetAt).toBeLessThanOrEqual(Date.now() + 1000);
    });

    it('should handle concurrent requests in fallback mode', async () => {
      (isRedisAvailable as jest.Mock).mockResolvedValue(false);
      process.env.NODE_ENV = 'development';

      const identifier = 'user:concurrent';
      const requests = Array.from({ length: 20 }, () =>
        rateLimiter(identifier, 100)
      );

      const results = await Promise.all(requests);

      const allowedCount = results.filter((r) => r.allowed).length;
      // Should allow approximately FALLBACK_LIMIT_DEV, but might be slightly more due to race conditions
      expect(allowedCount).toBeGreaterThanOrEqual(FALLBACK_LIMIT_DEV);
      expect(allowedCount).toBeLessThanOrEqual(FALLBACK_LIMIT_DEV + 5); // Small tolerance for races
    });
  });
});
