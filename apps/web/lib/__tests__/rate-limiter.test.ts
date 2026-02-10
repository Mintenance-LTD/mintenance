// globals: true in vitest.config — do not import from 'vitest' directly (breaks in v4)
/**
 * Rate Limiter Tests
 * Tests Redis rate limiting functionality and fallback behavior
 */

import { RedisRateLimiter } from '../rate-limiter';

// Mock @upstash/redis to prevent actual connections
vi.mock('@upstash/redis', () => ({
  Redis: vi.fn()
}));

describe('RedisRateLimiter', () => {
  let rateLimiter: RedisRateLimiter;
  let mockRedis: {
    incr: ReturnType<typeof vi.fn>;
    expire: ReturnType<typeof vi.fn>;
  };
  const savedNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    // Create fresh mock redis functions
    mockRedis = {
      incr: vi.fn(),
      expire: vi.fn()
    };

    // Set environment variables
    process.env.UPSTASH_REDIS_REST_URL = 'https://test-redis.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';

    // Clean global fallback state
    globalThis.rateLimitFallback = undefined;

    // Create rate limiter and directly inject the mock Redis
    // This bypasses the unreliable async initializeRedis()
    rateLimiter = new RedisRateLimiter();
  });

  afterEach(() => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    process.env.NODE_ENV = savedNodeEnv;
    globalThis.rateLimitFallback = undefined;
  });

  /**
   * Helper to inject mock Redis into the rate limiter.
   * Bypasses the async initializeRedis() by directly setting private fields.
   */
  function injectMockRedis(limiter: RedisRateLimiter): void {
    (limiter as any).redis = mockRedis;
    (limiter as any).initialized = true;
  }

  /**
   * Helper to simulate uninitialized (no Redis) state.
   */
  function clearRedis(limiter: RedisRateLimiter): void {
    (limiter as any).redis = null;
    (limiter as any).initialized = false;
  }

  describe('Redis Initialization', () => {
    it('should use Redis when initialized', async () => {
      injectMockRedis(rateLimiter);
      mockRedis.incr.mockResolvedValue(1);
      mockRedis.expire.mockResolvedValue(1);

      await rateLimiter.checkRateLimit({
        windowMs: 60000,
        maxRequests: 100,
        identifier: 'test-user'
      });

      expect(mockRedis.incr).toHaveBeenCalled();
      expect(mockRedis.expire).toHaveBeenCalled();
    });

    it('should fall back to in-memory when Redis is unavailable', async () => {
      clearRedis(rateLimiter);

      const result = await rateLimiter.checkRateLimit({
        windowMs: 60000,
        maxRequests: 100,
        identifier: 'test-user'
      });

      // Fallback uses reduced limits: min(HARD_CAP=10, ceil(100 * 0.05)) = min(10, 5) = 5
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4); // effectiveMax=5, count=1, remaining=5-1=4
    });
  });

  describe('Rate Limiting Logic', () => {
    beforeEach(() => {
      injectMockRedis(rateLimiter);
    });

    it('should allow requests within limit', async () => {
      mockRedis.incr.mockResolvedValue(5);
      mockRedis.expire.mockResolvedValue(1);

      const result = await rateLimiter.checkRateLimit({
        windowMs: 60000,
        maxRequests: 100,
        identifier: 'test-user'
      });

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(95);
      expect(result.resetTime).toBeGreaterThan(Date.now());
    });

    it('should reject requests over limit', async () => {
      mockRedis.incr.mockResolvedValue(101);
      mockRedis.expire.mockResolvedValue(1);

      const result = await rateLimiter.checkRateLimit({
        windowMs: 60000,
        maxRequests: 100,
        identifier: 'test-user'
      });

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should set expiration on first request', async () => {
      mockRedis.incr.mockResolvedValue(1);
      mockRedis.expire.mockResolvedValue(1);

      await rateLimiter.checkRateLimit({
        windowMs: 60000,
        maxRequests: 100,
        identifier: 'test-user'
      });

      expect(mockRedis.expire).toHaveBeenCalledWith(
        expect.stringContaining('rate_limit:test-user:'),
        60 // 60 seconds
      );
    });

    it('should not set expiration on subsequent requests', async () => {
      mockRedis.incr.mockResolvedValue(2);
      mockRedis.expire.mockResolvedValue(1);

      await rateLimiter.checkRateLimit({
        windowMs: 60000,
        maxRequests: 100,
        identifier: 'test-user'
      });

      expect(mockRedis.expire).not.toHaveBeenCalled();
    });
  });

  describe('Fallback Behavior', () => {
    it('should use in-memory fallback in development', async () => {
      process.env.NODE_ENV = 'development';
      clearRedis(rateLimiter);

      const result = await rateLimiter.checkRateLimit({
        windowMs: 60000,
        maxRequests: 100,
        identifier: 'test-user'
      });

      // Fallback uses reduced limits: min(10, ceil(100 * 0.05)) = min(10, 5) = 5
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4); // effectiveMax=5, count=1, remaining=5-1=4
    });

    it('should fail closed in production without Redis', async () => {
      process.env.NODE_ENV = 'production';
      clearRedis(rateLimiter);

      const result = await rateLimiter.checkRateLimit({
        windowMs: 60000,
        maxRequests: 100,
        identifier: 'test-user'
      });

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should handle Redis errors gracefully', async () => {
      injectMockRedis(rateLimiter);
      mockRedis.incr.mockRejectedValue(new Error('Redis connection failed'));

      const result = await rateLimiter.checkRateLimit({
        windowMs: 60000,
        maxRequests: 100,
        identifier: 'test-user'
      });

      // Falls back to in-memory (NODE_ENV=test is not production, so allowed)
      expect(result.allowed).toBe(true);
    });
  });

  describe('Helper Functions', () => {
    // Test rate limiter directly with the same parameters that helper functions use

    it('should check webhook rate limit with correct parameters', async () => {
      injectMockRedis(rateLimiter);
      mockRedis.incr.mockResolvedValue(5);
      mockRedis.expire.mockResolvedValue(1);

      const result = await rateLimiter.checkRateLimit({
        windowMs: 60000, // TIME_MS.MINUTE
        maxRequests: 100, // RATE_LIMITS.WEBHOOK_REQUESTS_PER_MINUTE
        identifier: 'webhook-test'
      });

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(95);

      expect(mockRedis.incr).toHaveBeenCalledWith(
        expect.stringContaining('rate_limit:webhook-test:')
      );
    });

    it('should check API rate limit with correct parameters', async () => {
      injectMockRedis(rateLimiter);
      mockRedis.incr.mockResolvedValue(5);
      mockRedis.expire.mockResolvedValue(1);

      const result = await rateLimiter.checkRateLimit({
        windowMs: 60000, // TIME_MS.MINUTE
        maxRequests: 1000, // RATE_LIMITS.API_REQUESTS_PER_MINUTE
        identifier: 'api-test'
      });

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(995);

      expect(mockRedis.incr).toHaveBeenCalledWith(
        expect.stringContaining('rate_limit:api-test:')
      );
    });
  });

  describe('Edge Cases', () => {
    beforeEach(() => {
      injectMockRedis(rateLimiter);
    });

    it('should handle zero max requests', async () => {
      mockRedis.incr.mockResolvedValue(1);

      const result = await rateLimiter.checkRateLimit({
        windowMs: 60000,
        maxRequests: 0,
        identifier: 'test-user'
      });

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should handle very large window times', async () => {
      mockRedis.incr.mockResolvedValue(1);
      mockRedis.expire.mockResolvedValue(1);

      const result = await rateLimiter.checkRateLimit({
        windowMs: 24 * 60 * 60 * 1000, // 24 hours
        maxRequests: 100,
        identifier: 'test-user'
      });

      expect(result.allowed).toBe(true);
      expect(mockRedis.expire).toHaveBeenCalledWith(
        expect.any(String),
        86400 // 24 hours in seconds
      );
    });

    it('should handle empty identifier', async () => {
      mockRedis.incr.mockResolvedValue(1);
      mockRedis.expire.mockResolvedValue(1);

      const result = await rateLimiter.checkRateLimit({
        windowMs: 60000,
        maxRequests: 100,
        identifier: ''
      });

      expect(result.allowed).toBe(true);
      expect(mockRedis.incr).toHaveBeenCalledWith(
        expect.stringContaining('rate_limit::')
      );
    });
  });
});
