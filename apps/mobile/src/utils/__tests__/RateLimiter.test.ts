/**
 * Tests for RateLimiter - Rate Limiting System
 */

import {
  RateLimiter,
  SlidingWindowRateLimiter,
  TokenBucketRateLimiter,
  MultiTierRateLimiter,
  rateLimitConfigs,
  userTierLimits,
} from '../RateLimiter';
import { logger } from '../logger';

// Mock logger
jest.mock('../logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('RateLimiter', () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    jest.clearAllMocks();
    limiter = new RateLimiter({
      windowMs: 60000, // 1 minute
      maxRequests: 10,
    });
  });

  afterEach(() => {
    limiter.dispose();
  });

  describe('Basic Rate Limiting', () => {
    it('should allow requests within limit', async () => {
      const info = await limiter.checkLimit('user1');

      expect(info.isLimited).toBe(false);
      expect(info.remainingRequests).toBe(10);
      expect(info.totalRequests).toBe(0);
    });

    it('should track request counts', async () => {
      await limiter.checkLimit('user1');
      await limiter.recordRequest('user1');

      const info = await limiter.getStatus('user1');
      expect(info.totalRequests).toBe(1);
      expect(info.remainingRequests).toBe(9);
    });

    it('should block requests when limit reached', async () => {
      // Record 10 requests
      for (let i = 0; i < 10; i++) {
        await limiter.checkLimit('user1');
        await limiter.recordRequest('user1');
      }

      const info = await limiter.getStatus('user1');
      expect(info.isLimited).toBe(true);
      expect(info.remainingRequests).toBe(0);
    });

    it('should handle multiple identifiers independently', async () => {
      await limiter.checkLimit('user1');
      await limiter.recordRequest('user1');
      await limiter.recordRequest('user1');
      await limiter.checkLimit('user2');
      await limiter.recordRequest('user2');

      const user1Info = await limiter.getStatus('user1');
      const user2Info = await limiter.getStatus('user2');

      expect(user1Info.totalRequests).toBe(2);
      expect(user2Info.totalRequests).toBe(1);
    });
  });

  describe('Skip Request Options', () => {
    it('should skip successful requests when configured', async () => {
      const limiter = new RateLimiter({
        windowMs: 60000,
        maxRequests: 10,
        skipSuccessfulRequests: true,
      });

      await limiter.checkLimit('user1');
      await limiter.recordRequest('user1', true); // Successful - should skip

      const info = await limiter.getStatus('user1');
      expect(info.totalRequests).toBe(0);

      limiter.dispose();
    });

    it('should skip failed requests when configured', async () => {
      const limiter = new RateLimiter({
        windowMs: 60000,
        maxRequests: 10,
        skipFailedRequests: true,
      });

      await limiter.checkLimit('user1');
      await limiter.recordRequest('user1', false); // Failed - should skip

      const info = await limiter.getStatus('user1');
      expect(info.totalRequests).toBe(0);

      limiter.dispose();
    });

    it('should count requests when success status not specified', async () => {
      const limiter = new RateLimiter({
        windowMs: 60000,
        maxRequests: 10,
        skipSuccessfulRequests: true,
      });

      await limiter.checkLimit('user1');
      await limiter.recordRequest('user1'); // No status - should count

      const info = await limiter.getStatus('user1');
      expect(info.totalRequests).toBe(1);

      limiter.dispose();
    });
  });

  describe('Window Reset', () => {
    it('should reset after window expires', async () => {
      jest.useFakeTimers();

      const limiter = new RateLimiter({
        windowMs: 1000, // 1 second
        maxRequests: 5,
      });

      // Hit the limit
      for (let i = 0; i < 5; i++) {
        await limiter.checkLimit('user1');
        await limiter.recordRequest('user1');
      }

      let info = await limiter.getStatus('user1');
      expect(info.isLimited).toBe(true);

      // Advance time past window
      jest.advanceTimersByTime(1001);

      info = await limiter.checkLimit('user1');
      expect(info.isLimited).toBe(false);
      expect(info.totalRequests).toBe(0);

      jest.useRealTimers();
      limiter.dispose();
    });
  });

  describe('Limit Reached Callback', () => {
    it('should call callback when limit reached', async () => {
      const callback = jest.fn();
      const limiter = new RateLimiter({
        windowMs: 60000,
        maxRequests: 2,
        onLimitReached: callback,
      });

      await limiter.checkLimit('user1');
      await limiter.recordRequest('user1');
      await limiter.checkLimit('user1');
      await limiter.recordRequest('user1');
      await limiter.checkLimit('user1'); // This should trigger callback

      expect(callback).toHaveBeenCalled();
      expect(callback).toHaveBeenCalledWith('user1', expect.objectContaining({
        isLimited: true,
      }));

      limiter.dispose();
    });
  });

  describe('Custom Key Generator', () => {
    it('should use custom key generator', async () => {
      const limiter = new RateLimiter({
        windowMs: 60000,
        maxRequests: 10,
        keyGenerator: (id) => `prefix:${id}`,
      });

      await limiter.checkLimit('user1');
      await limiter.recordRequest('user1');
      const info = await limiter.getStatus('user1');

      expect(info.totalRequests).toBe(1);

      limiter.dispose();
    });
  });

  describe('Status and Stats', () => {
    it('should return time until reset', async () => {
      await limiter.checkLimit('user1');

      const timeUntilReset = limiter.getTimeUntilReset('user1');
      expect(timeUntilReset).toBeGreaterThan(0);
      expect(timeUntilReset).toBeLessThanOrEqual(60000);
    });

    it('should return 0 time for non-existent key', () => {
      const timeUntilReset = limiter.getTimeUntilReset('nonexistent');
      expect(timeUntilReset).toBe(0);
    });

    it('should provide stats about rate limiter', async () => {
      await limiter.checkLimit('user1');
      await limiter.recordRequest('user1');
      await limiter.checkLimit('user2');
      await limiter.recordRequest('user2');

      const stats = limiter.getStats();
      expect(stats.totalKeys).toBe(2);
      expect(stats.totalRequests).toBe(2);
      expect(stats.limitedKeys).toBe(0);
    });

    it('should count limited keys in stats', async () => {
      for (let i = 0; i < 10; i++) {
        await limiter.checkLimit('user1');
        await limiter.recordRequest('user1');
      }

      const stats = limiter.getStats();
      expect(stats.limitedKeys).toBe(1);
    });
  });

  describe('Reset Functionality', () => {
    it('should reset limit for specific identifier', async () => {
      await limiter.checkLimit('user1');
      await limiter.recordRequest('user1');
      await limiter.recordRequest('user1');

      let info = await limiter.getStatus('user1');
      expect(info.totalRequests).toBe(2);

      await limiter.reset('user1');

      info = await limiter.getStatus('user1');
      expect(info.totalRequests).toBe(0);
    });

    it('should log reset', async () => {
      await limiter.reset('user1');

      expect(logger.info).toHaveBeenCalledWith(
        'RateLimiter',
        'Rate limit reset for key',
        expect.objectContaining({ key: 'user1' })
      );
    });
  });

  describe('Cleanup', () => {
    it('should clean up expired entries', async () => {
      jest.useFakeTimers();

      const limiter = new RateLimiter({
        windowMs: 1000,
        maxRequests: 10,
      });

      await limiter.checkLimit('user1');
      await limiter.recordRequest('user1');

      // Fast forward past cleanup interval (60 seconds)
      jest.advanceTimersByTime(61000);

      // Run pending timers
      jest.runOnlyPendingTimers();

      expect(logger.debug).toHaveBeenCalled();

      limiter.dispose();
      jest.useRealTimers();
    });
  });
});

describe('SlidingWindowRateLimiter', () => {
  let limiter: SlidingWindowRateLimiter;

  beforeEach(() => {
    limiter = new SlidingWindowRateLimiter({
      windowMs: 60000,
      maxRequests: 10,
    });
  });

  it('should allow requests within sliding window', async () => {
    const info = await limiter.checkLimit('user1');

    expect(info.isLimited).toBe(false);
    expect(info.remainingRequests).toBe(10);
  });

  it('should track requests in sliding window', async () => {
    await limiter.recordRequest('user1');
    await limiter.recordRequest('user1');

    const info = await limiter.checkLimit('user1');
    expect(info.totalRequests).toBe(2);
    expect(info.remainingRequests).toBe(8);
  });

  it('should remove old requests from window', async () => {
    jest.useFakeTimers();

    await limiter.recordRequest('user1');
    jest.advanceTimersByTime(61000); // Past window
    await limiter.recordRequest('user1');

    const info = await limiter.checkLimit('user1');
    expect(info.totalRequests).toBe(1); // Old request removed

    jest.useRealTimers();
  });
});

describe('TokenBucketRateLimiter', () => {
  let limiter: TokenBucketRateLimiter;

  beforeEach(() => {
    limiter = new TokenBucketRateLimiter({
      windowMs: 60000,
      maxRequests: 10,
      refillRate: 1, // 1 token per second
    });
  });

  it('should allow requests when tokens available', async () => {
    const success = await limiter.recordRequest('user1');
    expect(success).toBe(true);
  });

  it('should deny requests when no tokens', async () => {
    // Consume all tokens
    for (let i = 0; i < 10; i++) {
      await limiter.recordRequest('user1');
    }

    const success = await limiter.recordRequest('user1');
    expect(success).toBe(false);
  });

  it('should refill tokens over time', async () => {
    jest.useFakeTimers();

    // Consume all tokens
    for (let i = 0; i < 10; i++) {
      await limiter.recordRequest('user1');
    }

    // Wait for refill
    jest.advanceTimersByTime(5000); // 5 seconds = 5 tokens

    const info = await limiter.checkLimit('user1');
    expect(info.remainingRequests).toBeGreaterThan(0);

    jest.useRealTimers();
  });
});

describe('MultiTierRateLimiter', () => {
  let limiter: MultiTierRateLimiter;

  beforeEach(() => {
    limiter = new MultiTierRateLimiter(userTierLimits);
  });

  afterEach(() => {
    limiter.dispose();
  });

  it('should enforce different limits for different tiers', async () => {
    const freeInfo = await limiter.checkLimit('free', 'user1');
    const premiumInfo = await limiter.checkLimit('premium', 'user2');

    expect(freeInfo.remainingRequests).toBe(50);
    expect(premiumInfo.remainingRequests).toBe(200);
  });

  it('should throw error for unknown tier', async () => {
    await expect(
      limiter.checkLimit('unknown', 'user1')
    ).rejects.toThrow('Unknown tier: unknown');
  });

  it('should list all tiers', () => {
    const tiers = limiter.getTiers();

    expect(tiers).toContain('free');
    expect(tiers).toContain('premium');
    expect(tiers).toContain('contractor');
    expect(tiers).toContain('admin');
  });

  it('should track requests per tier independently', async () => {
    await limiter.checkLimit('free', 'user1');
    await limiter.recordRequest('free', 'user1');
    await limiter.checkLimit('premium', 'user1');
    await limiter.recordRequest('premium', 'user1');

    const freeInfo = await limiter.checkLimit('free', 'user1');
    const premiumInfo = await limiter.checkLimit('premium', 'user1');

    expect(freeInfo.totalRequests).toBe(1);
    expect(premiumInfo.totalRequests).toBe(1);
  });
});

describe('Pre-configured Rate Limiters', () => {
  it('should have API rate limit config', () => {
    expect(rateLimitConfigs.api).toEqual({
      windowMs: 15 * 60 * 1000,
      maxRequests: 100,
    });
  });

  it('should have auth rate limit config', () => {
    expect(rateLimitConfigs.auth).toEqual({
      windowMs: 15 * 60 * 1000,
      maxRequests: 5,
      skipSuccessfulRequests: true,
    });
  });

  it('should have payment rate limit config', () => {
    expect(rateLimitConfigs.payment).toEqual({
      windowMs: 60 * 60 * 1000,
      maxRequests: 10,
    });
  });

  it('should have password reset config', () => {
    expect(rateLimitConfigs.passwordReset.maxRequests).toBe(3);
  });
});

describe('User Tier Limits', () => {
  it('should define limits for all user tiers', () => {
    expect(userTierLimits.free.maxRequests).toBe(50);
    expect(userTierLimits.premium.maxRequests).toBe(200);
    expect(userTierLimits.contractor.maxRequests).toBe(500);
    expect(userTierLimits.admin.maxRequests).toBe(1000);
  });

  it('should have same window for all tiers', () => {
    const windowMs = 15 * 60 * 1000;

    expect(userTierLimits.free.windowMs).toBe(windowMs);
    expect(userTierLimits.premium.windowMs).toBe(windowMs);
    expect(userTierLimits.contractor.windowMs).toBe(windowMs);
    expect(userTierLimits.admin.windowMs).toBe(windowMs);
  });
});
