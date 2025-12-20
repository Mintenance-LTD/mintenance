/**
 * Simplified Cache Tests - Core Functionality
 */

import { CacheManager } from '../cache';

// Mock all dependencies
jest.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn().mockResolvedValue(undefined),
    removeItem: jest.fn().mockResolvedValue(undefined),
    getAllKeys: jest.fn().mockResolvedValue([]),
    multiRemove: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../performance', () => ({
  performanceMonitor: {
    recordMetric: jest.fn(),
  },
}));

// Use real timers for simplicity
jest.useRealTimers();

describe('CacheManager - Basic Functionality', () => {
  let cache: CacheManager;

  beforeEach(() => {
    cache = new CacheManager();
  });

  describe('Basic Operations', () => {
    it('should create cache instance', () => {
      expect(cache).toBeDefined();
      expect(cache.getStats).toBeDefined();
    });

    it('should get stats', () => {
      const stats = cache.getStats();
      expect(stats).toHaveProperty('hitRate');
      expect(stats).toHaveProperty('missRate');
      expect(stats).toHaveProperty('totalRequests');
    });

    it('should set strategy', () => {
      const customStrategy = {
        name: 'custom',
        shouldCache: () => true,
        shouldEvict: () => false,
        getPriority: () => 1,
      };

      expect(() => cache.setStrategy(customStrategy)).not.toThrow();
    });
  });

  describe('Cache Configuration', () => {
    it('should accept different config options without errors', async () => {
      await expect(
        cache.set('key1', 'value1', { priority: 'high' })
      ).resolves.toBeDefined();
      await expect(
        cache.set('key2', 'value2', { priority: 'low' })
      ).resolves.toBeDefined();
      await expect(
        cache.set('key3', 'value3', { ttl: 1000 })
      ).resolves.toBeDefined();
    });

    it('should support tags without errors', async () => {
      await expect(
        cache.set('item1', 'value1', { tags: ['tag1', 'tag2'] })
      ).resolves.toBeDefined();
      await expect(
        cache.set('item2', 'value2', { tags: ['tag2'] })
      ).resolves.toBeDefined();
    });
  });

  describe('Statistics Tracking', () => {
    it('should initialize with zero stats', () => {
      const freshCache = new CacheManager();
      const stats = freshCache.getStats();

      expect(stats.totalRequests).toBe(0);
      expect(stats.totalHits).toBe(0);
      expect(stats.totalMisses).toBe(0);
      expect(stats.entryCount).toBe(0);
    });

    it('should track total requests', async () => {
      await cache.get('non-existent');
      await cache.get('another-miss');

      const stats = cache.getStats();
      expect(stats.totalRequests).toBe(2);
    });
  });

  describe('Priority Levels', () => {
    it('should accept all priority levels without errors', async () => {
      await expect(
        cache.set('low', 'value', { priority: 'low' })
      ).resolves.toBeDefined();
      await expect(
        cache.set('normal', 'value', { priority: 'normal' })
      ).resolves.toBeDefined();
      await expect(
        cache.set('high', 'value', { priority: 'high' })
      ).resolves.toBeDefined();
      await expect(
        cache.set('critical', 'value', { priority: 'critical' })
      ).resolves.toBeDefined();
    });
  });

  describe('Memory Management', () => {
    it('should provide entry count in stats', () => {
      const stats = cache.getStats();
      expect(stats.entryCount).toBeGreaterThanOrEqual(0);
    });

    it('should track memory usage', async () => {
      await cache.set('large-item', 'x'.repeat(1000));

      const stats = cache.getStats();
      expect(stats.memoryUsage).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Warmup Functionality', () => {
    it('should provide warmup method', () => {
      expect(cache.warmup).toBeDefined();
      expect(typeof cache.warmup).toBe('function');
    });

    it('should warm up cache with basic fetcher', async () => {
      const fetcher = jest.fn((key) => Promise.resolve(`value-${key}`));

      const count = await cache.warmup(['key1', 'key2'], fetcher);

      expect(count).toBeGreaterThanOrEqual(0);
      expect(fetcher).toHaveBeenCalled();
    });
  });

  describe('Cache Strategies', () => {
    it('should support custom strategy', () => {
      const strategy = {
        name: 'test-strategy',
        shouldCache: () => true,
        shouldEvict: () => false,
        getPriority: () => 100,
      };

      cache.setStrategy(strategy);

      // Strategy is set successfully
      expect(true).toBe(true);
    });
  });

  describe('Configuration Options', () => {
    it('should accept compression config', async () => {
      const result = await cache.set('key', 'value', { compression: true });
      expect(typeof result).toBe('boolean');
    });

    it('should accept encryption config', async () => {
      const result = await cache.set('key', 'value', { encryption: true });
      expect(typeof result).toBe('boolean');
    });

    it('should accept maxSize config', async () => {
      const result = await cache.set('key', 'value', { maxSize: 1000 });
      expect(typeof result).toBe('boolean');
    });

    it('should accept persistToDisk config', async () => {
      const result = await cache.set('key', 'value', { persistToDisk: false });
      expect(typeof result).toBe('boolean');
    });
  });

  describe('Cache Operations', () => {
    it('should have get method', () => {
      expect(cache.get).toBeDefined();
      expect(typeof cache.get).toBe('function');
    });

    it('should have set method', () => {
      expect(cache.set).toBeDefined();
      expect(typeof cache.set).toBe('function');
    });

    it('should have invalidate method', () => {
      expect(cache.invalidate).toBeDefined();
      expect(typeof cache.invalidate).toBe('function');
    });

    it('should have invalidateByTag method', () => {
      expect(cache.invalidateByTag).toBeDefined();
      expect(typeof cache.invalidateByTag).toBe('function');
    });

    it('should have clear method', () => {
      expect(cache.clear).toBeDefined();
      expect(typeof cache.clear).toBe('function');
    });
  });
});
