/**
 * Rate Limiter Tests
 * Tests Redis rate limiting functionality and fallback behavior
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { RedisRateLimiter, checkWebhookRateLimit, checkApiRateLimit } from '../rate-limiter';

// Mock Redis
const mockRedis = {
  incr: jest.fn(),
  expire: jest.fn()
};

jest.mock('@upstash/redis', () => ({
  Redis: jest.fn(() => mockRedis)
}));

describe('RedisRateLimiter', () => {
  let rateLimiter: RedisRateLimiter;

  beforeEach(() => {
    jest.clearAllMocks();
    rateLimiter = new RedisRateLimiter();
    
    // Mock environment variables
    process.env.UPSTASH_REDIS_REST_URL = 'https://test-redis.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';
  });

  afterEach(() => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.NODE_ENV;
  });

  describe('Redis Initialization', () => {
    it('should initialize Redis when credentials are available', async () => {
      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const result = await rateLimiter.checkRateLimit({
        windowMs: 60000,
        maxRequests: 100,
        identifier: 'test-user'
      });
      
      expect(mockRedis.incr).toHaveBeenCalled();
      expect(mockRedis.expire).toHaveBeenCalled();
    });

    it('should fall back to in-memory when Redis is unavailable', async () => {
      delete process.env.UPSTASH_REDIS_REST_URL;
      
      const result = await rateLimiter.checkRateLimit({
        windowMs: 60000,
        maxRequests: 100,
        identifier: 'test-user'
      });
      
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(99);
    });
  });

  describe('Rate Limiting Logic', () => {
    beforeEach(async () => {
      // Ensure Redis is initialized
      await new Promise(resolve => setTimeout(resolve, 100));
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
      delete process.env.UPSTASH_REDIS_REST_URL;
      
      const result = await rateLimiter.checkRateLimit({
        windowMs: 60000,
        maxRequests: 100,
        identifier: 'test-user'
      });
      
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(99);
    });

    it('should fail closed in production without Redis', async () => {
      process.env.NODE_ENV = 'production';
      delete process.env.UPSTASH_REDIS_REST_URL;
      
      const result = await rateLimiter.checkRateLimit({
        windowMs: 60000,
        maxRequests: 100,
        identifier: 'test-user'
      });
      
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedis.incr.mockRejectedValue(new Error('Redis connection failed'));
      
      const result = await rateLimiter.checkRateLimit({
        windowMs: 60000,
        maxRequests: 100,
        identifier: 'test-user'
      });
      
      // Should fall back to in-memory
      expect(result.allowed).toBe(true);
    });
  });

  describe('Helper Functions', () => {
    beforeEach(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    it('should check webhook rate limit with correct parameters', async () => {
      mockRedis.incr.mockResolvedValue(5);
      mockRedis.expire.mockResolvedValue(1);
      
      const result = await checkWebhookRateLimit('webhook-test');
      
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(95);
      
      // Should use 1 minute window and 100 max requests
      expect(mockRedis.incr).toHaveBeenCalledWith(
        expect.stringContaining('rate_limit:webhook-test:')
      );
    });

    it('should check API rate limit with correct parameters', async () => {
      mockRedis.incr.mockResolvedValue(5);
      mockRedis.expire.mockResolvedValue(1);
      
      const result = await checkApiRateLimit('api-test');
      
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(995);
      
      // Should use 1 minute window and 1000 max requests
      expect(mockRedis.incr).toHaveBeenCalledWith(
        expect.stringContaining('rate_limit:api-test:')
      );
    });
  });

  describe('Edge Cases', () => {
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
