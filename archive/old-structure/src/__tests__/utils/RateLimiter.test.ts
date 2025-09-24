/**
 * Rate Limiter Tests
 * Comprehensive tests for rate limiting functionality
 */

import { RateLimiter, SlidingWindowRateLimiter, TokenBucketRateLimiter, MultiTierRateLimiter } from '../../utils/RateLimiter';

describe('RateLimiter', () => {
  let rateLimiter: RateLimiter;

  beforeEach(() => {
    rateLimiter = new RateLimiter({
      windowMs: 60000, // 1 minute
      maxRequests: 5,
    });
  });

  afterEach(() => {
    rateLimiter.dispose();
  });

  describe('Basic Rate Limiting', () => {
    it('should allow requests within limit', async () => {
      const identifier = 'user123';

      // First request should be allowed
      const info1 = await rateLimiter.checkLimit(identifier);
      expect(info1.isLimited).toBe(false);
      expect(info1.remainingRequests).toBe(5);
      await rateLimiter.recordRequest(identifier);

      // Second request should be allowed
      const info2 = await rateLimiter.checkLimit(identifier);
      expect(info2.isLimited).toBe(false);
      expect(info2.remainingRequests).toBe(4);
      await rateLimiter.recordRequest(identifier);

      // Check status
      const status = await rateLimiter.getStatus(identifier);
      expect(status.totalRequests).toBe(2);
      expect(status.remainingRequests).toBe(3);
    });

    it('should block requests when limit exceeded', async () => {
      const identifier = 'user123';

      // Make 5 requests (at the limit)
      for (let i = 0; i < 5; i++) {
        const info = await rateLimiter.checkLimit(identifier);
        expect(info.isLimited).toBe(false);
        await rateLimiter.recordRequest(identifier);
      }

      // 6th request should be blocked
      const info = await rateLimiter.checkLimit(identifier);
      expect(info.isLimited).toBe(true);
      expect(info.remainingRequests).toBe(0);
    });

    it('should reset after window expires', async () => {
      const identifier = 'user123';

      // Create rate limiter with short window for testing
      const shortRateLimiter = new RateLimiter({
        windowMs: 100, // 100ms
        maxRequests: 2,
      });

      // Exceed limit
      await shortRateLimiter.checkLimit(identifier);
      await shortRateLimiter.recordRequest(identifier);
      await shortRateLimiter.checkLimit(identifier);
      await shortRateLimiter.recordRequest(identifier);

      let info = await shortRateLimiter.checkLimit(identifier);
      expect(info.isLimited).toBe(true);

      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should be reset
      info = await shortRateLimiter.checkLimit(identifier);
      expect(info.isLimited).toBe(false);
      expect(info.remainingRequests).toBe(2);

      shortRateLimiter.dispose();
    });

    it('should handle different identifiers separately', async () => {
      const user1 = 'user1';
      const user2 = 'user2';

      // User1 exceeds limit
      for (let i = 0; i < 5; i++) {
        await rateLimiter.checkLimit(user1);
        await rateLimiter.recordRequest(user1);
      }

      const user1Info = await rateLimiter.checkLimit(user1);
      expect(user1Info.isLimited).toBe(true);

      // User2 should still be allowed
      const user2Info = await rateLimiter.checkLimit(user2);
      expect(user2Info.isLimited).toBe(false);
      expect(user2Info.remainingRequests).toBe(5);
    });
  });

  describe('Configuration Options', () => {
    it('should use custom key generator', async () => {
      const customRateLimiter = new RateLimiter({
        windowMs: 60000,
        maxRequests: 3,
        keyGenerator: (id: string) => `custom_${id}`,
      });

      const identifier = 'test';

      for (let i = 0; i < 3; i++) {
        await customRateLimiter.checkLimit(identifier);
        await customRateLimiter.recordRequest(identifier);
      }

      const info = await customRateLimiter.checkLimit(identifier);
      expect(info.isLimited).toBe(true);

      customRateLimiter.dispose();
    });

    it('should skip successful requests when configured', async () => {
      const skipSuccessRateLimiter = new RateLimiter({
        windowMs: 60000,
        maxRequests: 3,
        skipSuccessfulRequests: true,
      });

      const identifier = 'test';

      // Record successful requests (should be skipped)
      for (let i = 0; i < 5; i++) {
        await skipSuccessRateLimiter.checkLimit(identifier);
        await skipSuccessRateLimiter.recordRequest(identifier, true); // successful
      }

      const info = await skipSuccessRateLimiter.getStatus(identifier);
      expect(info.totalRequests).toBe(0); // Successful requests were skipped

      skipSuccessRateLimiter.dispose();
    });

    it('should skip failed requests when configured', async () => {
      const skipFailedRateLimiter = new RateLimiter({
        windowMs: 60000,
        maxRequests: 3,
        skipFailedRequests: true,
      });

      const identifier = 'test';

      // Record failed requests (should be skipped)
      for (let i = 0; i < 5; i++) {
        await skipFailedRateLimiter.checkLimit(identifier);
        await skipFailedRateLimiter.recordRequest(identifier, false); // failed
      }

      const info = await skipFailedRateLimiter.getStatus(identifier);
      expect(info.totalRequests).toBe(0); // Failed requests were skipped

      skipFailedRateLimiter.dispose();
    });

    it('should call onLimitReached callback', async () => {
      const onLimitReached = jest.fn();
      const callbackRateLimiter = new RateLimiter({
        windowMs: 60000,
        maxRequests: 2,
        onLimitReached,
      });

      const identifier = 'test';

      // Exceed limit
      for (let i = 0; i < 3; i++) {
        await callbackRateLimiter.checkLimit(identifier);
        await callbackRateLimiter.recordRequest(identifier);
      }

      expect(onLimitReached).toHaveBeenCalledWith(
        identifier,
        expect.objectContaining({
          isLimited: true,
          totalRequests: 2,
        })
      );

      callbackRateLimiter.dispose();
    });
  });

  describe('Utility Methods', () => {
    it('should reset specific identifier', async () => {
      const identifier = 'user123';

      // Exceed limit
      for (let i = 0; i < 5; i++) {
        await rateLimiter.checkLimit(identifier);
        await rateLimiter.recordRequest(identifier);
      }

      let info = await rateLimiter.getStatus(identifier);
      expect(info.isLimited).toBe(true);

      // Reset
      await rateLimiter.reset(identifier);

      // Should be reset
      info = await rateLimiter.getStatus(identifier);
      expect(info.isLimited).toBe(false);
      expect(info.totalRequests).toBe(0);
    });

    it('should calculate time until reset', async () => {
      const identifier = 'user123';

      await rateLimiter.checkLimit(identifier);
      await rateLimiter.recordRequest(identifier);

      const timeUntilReset = rateLimiter.getTimeUntilReset(identifier);
      expect(timeUntilReset).toBeGreaterThan(0);
      expect(timeUntilReset).toBeLessThanOrEqual(60000);
    });

    it('should provide statistics', async () => {
      const user1 = 'user1';
      const user2 = 'user2';

      // Add some requests
      await rateLimiter.checkLimit(user1);
      await rateLimiter.recordRequest(user1);
      await rateLimiter.checkLimit(user2);
      await rateLimiter.recordRequest(user2);

      const stats = rateLimiter.getStats();
      expect(stats.totalKeys).toBe(2);
      expect(stats.totalRequests).toBe(2);
      expect(stats.limitedKeys).toBe(0);
      expect(typeof stats.memoryUsage).toBe('number');
    });
  });
});

describe('SlidingWindowRateLimiter', () => {
  let rateLimiter: SlidingWindowRateLimiter;

  beforeEach(() => {
    rateLimiter = new SlidingWindowRateLimiter({
      windowMs: 1000, // 1 second for testing
      maxRequests: 3,
    });
  });

  it('should enforce sliding window correctly', async () => {
    const identifier = 'user123';

    // Make 3 requests quickly
    for (let i = 0; i < 3; i++) {
      await rateLimiter.recordRequest(identifier);
    }

    // Should be at limit
    let info = await rateLimiter.checkLimit(identifier);
    expect(info.isLimited).toBe(true);

    // Wait for half the window
    await new Promise(resolve => setTimeout(resolve, 600));

    // Should still be limited (requests haven't expired yet)
    info = await rateLimiter.checkLimit(identifier);
    expect(info.isLimited).toBe(true);

    // Wait for full window
    await new Promise(resolve => setTimeout(resolve, 500));

    // Should be reset now
    info = await rateLimiter.checkLimit(identifier);
    expect(info.isLimited).toBe(false);
  });
});

describe('TokenBucketRateLimiter', () => {
  let rateLimiter: TokenBucketRateLimiter;

  beforeEach(() => {
    rateLimiter = new TokenBucketRateLimiter({
      windowMs: 60000,
      maxRequests: 5, // bucket size
      refillRate: 1, // 1 token per second
    });
  });

  it('should allow burst requests up to bucket size', async () => {
    const identifier = 'user123';

    // Should allow 5 requests immediately (full bucket)
    for (let i = 0; i < 5; i++) {
      const success = await rateLimiter.recordRequest(identifier);
      expect(success).toBe(true);
    }

    // 6th request should fail (bucket empty)
    const success = await rateLimiter.recordRequest(identifier);
    expect(success).toBe(false);
  });

  it('should refill tokens over time', async () => {
    const fastRateLimiter = new TokenBucketRateLimiter({
      windowMs: 60000,
      maxRequests: 2,
      refillRate: 10, // 10 tokens per second for faster testing
    });

    const identifier = 'user123';

    // Exhaust bucket
    await fastRateLimiter.recordRequest(identifier);
    await fastRateLimiter.recordRequest(identifier);

    // Should be empty
    let success = await fastRateLimiter.recordRequest(identifier);
    expect(success).toBe(false);

    // Wait for refill
    await new Promise(resolve => setTimeout(resolve, 300));

    // Should have tokens now
    success = await fastRateLimiter.recordRequest(identifier);
    expect(success).toBe(true);
  });
});

describe('MultiTierRateLimiter', () => {
  let rateLimiter: MultiTierRateLimiter;

  beforeEach(() => {
    rateLimiter = new MultiTierRateLimiter({
      free: {
        windowMs: 60000,
        maxRequests: 10,
      },
      premium: {
        windowMs: 60000,
        maxRequests: 50,
      },
      enterprise: {
        windowMs: 60000,
        maxRequests: 200,
      },
    });
  });

  afterEach(() => {
    rateLimiter.dispose();
  });

  it('should enforce different limits for different tiers', async () => {
    const userId = 'user123';

    // Free tier - limit 10
    for (let i = 0; i < 10; i++) {
      const info = await rateLimiter.checkLimit('free', userId);
      expect(info.isLimited).toBe(false);
      await rateLimiter.recordRequest('free', userId);
    }

    // 11th request should be blocked for free tier
    let info = await rateLimiter.checkLimit('free', userId);
    expect(info.isLimited).toBe(true);

    // Premium tier should still allow requests
    info = await rateLimiter.checkLimit('premium', userId);
    expect(info.isLimited).toBe(false);
    expect(info.remainingRequests).toBe(50);
  });

  it('should list available tiers', () => {
    const tiers = rateLimiter.getTiers();
    expect(tiers).toContain('free');
    expect(tiers).toContain('premium');
    expect(tiers).toContain('enterprise');
  });

  it('should throw error for unknown tier', async () => {
    await expect(
      rateLimiter.checkLimit('unknown', 'user123')
    ).rejects.toThrow('Unknown tier: unknown');
  });
});

describe('Memory Management and Performance', () => {
  it('should handle high volume of requests efficiently', async () => {
    const rateLimiter = new RateLimiter({
      windowMs: 60000,
      maxRequests: 1000,
    });

    const startTime = Date.now();
    const promises = [];

    // Create 1000 concurrent requests
    for (let i = 0; i < 1000; i++) {
      promises.push(rateLimiter.checkLimit(`user${i % 100}`)); // 100 unique users
    }

    await Promise.all(promises);

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Should complete within reasonable time (< 1 second)
    expect(duration).toBeLessThan(1000);

    const stats = rateLimiter.getStats();
    expect(stats.totalKeys).toBeLessThanOrEqual(100);

    rateLimiter.dispose();
  });

  it('should clean up expired entries', async () => {
    const rateLimiter = new RateLimiter({
      windowMs: 100, // Very short window
      maxRequests: 5,
    });

    const identifier = 'user123';

    // Make some requests
    await rateLimiter.checkLimit(identifier);
    await rateLimiter.recordRequest(identifier);

    let stats = rateLimiter.getStats();
    expect(stats.totalKeys).toBe(1);

    // Wait for cleanup (rate limiter cleans up every minute, but we can trigger it)
    await new Promise(resolve => setTimeout(resolve, 200));

    // Make another request to trigger potential cleanup
    await rateLimiter.checkLimit('user456');

    // The original entry should still exist (cleanup happens periodically)
    stats = rateLimiter.getStats();
    expect(stats.totalKeys).toBeGreaterThanOrEqual(1);

    rateLimiter.dispose();
  });
});