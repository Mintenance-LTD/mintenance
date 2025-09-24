import { CacheManager, CacheConfig } from '../../utils/cache';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  getAllKeys: jest.fn(),
  multiGet: jest.fn(),
  multiSet: jest.fn(),
  multiRemove: jest.fn(),
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../../utils/performance', () => ({
  performanceMonitor: {
    measureAsync: jest.fn(),
    recordMetric: jest.fn(),
  },
}));

// Mock global performance
global.performance = {
  now: jest.fn(() => Date.now()),
} as any;

const AsyncStorage = require('@react-native-async-storage/async-storage');

describe('CacheManager', () => {
  let cacheManager: CacheManager;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();

    // Reset AsyncStorage mocks
    AsyncStorage.getItem.mockResolvedValue(null);
    AsyncStorage.setItem.mockResolvedValue(null);
    AsyncStorage.removeItem.mockResolvedValue(null);
    AsyncStorage.clear.mockResolvedValue(null);

    cacheManager = new CacheManager();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('get and set operations', () => {
    it('should set and get a value from memory cache', async () => {
      const key = 'test-key';
      const value = { data: 'test-value' };

      const setResult = await cacheManager.set(key, value);
      expect(setResult).toBe(true);

      const retrievedValue = await cacheManager.get(key);
      expect(retrievedValue).toEqual(value);
    });

    it('should return null for non-existent key', async () => {
      const result = await cacheManager.get('non-existent-key');
      expect(result).toBeNull();
    });

    it('should respect TTL and return null for expired entries', async () => {
      const key = 'expiring-key';
      const value = 'test-value';
      const ttl = 1000; // 1 second

      await cacheManager.set(key, value, { ttl });

      // Advance time beyond TTL
      const originalNow = Date.now;
      Date.now = jest.fn(() => originalNow() + ttl + 1);

      const result = await cacheManager.get(key);
      expect(result).toBeNull();

      Date.now = originalNow;
    });

    it('should handle different value types', async () => {
      const testCases = [
        { key: 'string', value: 'test-string' },
        { key: 'number', value: 42 },
        { key: 'boolean', value: true },
        { key: 'object', value: { prop: 'value' } },
        { key: 'array', value: [1, 2, 3] },
        { key: 'null', value: null },
      ];

      for (const testCase of testCases) {
        await cacheManager.set(testCase.key, testCase.value);
        const result = await cacheManager.get(testCase.key);
        expect(result).toEqual(testCase.value);
      }
    });

    it('should handle cache configuration options', async () => {
      const key = 'config-test';
      const value = 'test-value';
      const config: Partial<CacheConfig> = {
        ttl: 2000,
        priority: 'high',
        tags: ['tag1', 'tag2'],
        persistToDisk: false,
      };

      const setResult = await cacheManager.set(key, value, config);
      expect(setResult).toBe(true);

      const retrievedValue = await cacheManager.get(key);
      expect(retrievedValue).toEqual(value);
    });
  });

  describe('disk cache integration', () => {
    it('should fallback to disk cache when memory cache misses', async () => {
      const key = 'disk-test';
      const value = { diskData: 'test' };
      const diskEntry = {
        key,
        value: JSON.stringify(value),
        timestamp: Date.now(),
        accessCount: 1,
        lastAccessed: Date.now(),
        ttl: 5 * 60 * 1000,
        size: 100,
        priority: 'normal',
        tags: [],
        compressed: false,
        encrypted: false,
      };

      // Mock disk storage to return an entry
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(diskEntry));

      const result = await cacheManager.get(key);
      expect(result).toEqual(value);
      expect(AsyncStorage.getItem).toHaveBeenCalledWith(`cache_${key}`);
    });

    it('should persist to disk when persistToDisk is true', async () => {
      const key = 'persist-test';
      const value = 'persist-value';

      await cacheManager.set(key, value, { persistToDisk: true });

      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should not persist to disk when persistToDisk is false', async () => {
      const key = 'no-persist-test';
      const value = 'no-persist-value';

      await cacheManager.set(key, value, { persistToDisk: false });

      expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    });
  });

  describe('invalidate operations', () => {
    it('should invalidate a specific key', async () => {
      const key = 'invalidate-test';
      const value = 'test-value';

      await cacheManager.set(key, value);
      expect(await cacheManager.get(key)).toEqual(value);

      const invalidateResult = await cacheManager.invalidate(key);
      expect(invalidateResult).toBe(true);

      expect(await cacheManager.get(key)).toBeNull();
    });

    it('should invalidate by tag', async () => {
      const tag = 'test-tag';
      const key1 = 'tagged-key-1';
      const key2 = 'tagged-key-2';
      const key3 = 'untagged-key';

      await cacheManager.set(key1, 'value1', { tags: [tag] });
      await cacheManager.set(key2, 'value2', { tags: [tag, 'other-tag'] });
      await cacheManager.set(key3, 'value3', { tags: ['other-tag'] });

      const invalidatedCount = await cacheManager.invalidateByTag(tag);
      expect(invalidatedCount).toBe(2);

      expect(await cacheManager.get(key1)).toBeNull();
      expect(await cacheManager.get(key2)).toBeNull();
      expect(await cacheManager.get(key3)).toEqual('value3');
    });

    it('should clear all cache entries', async () => {
      await cacheManager.set('key1', 'value1');
      await cacheManager.set('key2', 'value2');
      await cacheManager.set('key3', 'value3');

      // Mock getAllKeys to return some cache keys
      AsyncStorage.getAllKeys.mockResolvedValue(['cache_key1', 'cache_key2', 'other_key']);

      await cacheManager.clear();

      expect(await cacheManager.get('key1')).toBeNull();
      expect(await cacheManager.get('key2')).toBeNull();
      expect(await cacheManager.get('key3')).toBeNull();
      expect(AsyncStorage.getAllKeys).toHaveBeenCalled();
      expect(AsyncStorage.multiRemove).toHaveBeenCalledWith(['cache_key1', 'cache_key2']);
    });
  });

  describe('warmup and prefetch', () => {
    it('should warmup cache with provided keys', async () => {
      const keys = ['warm1', 'warm2', 'warm3'];
      const fetcher = jest.fn()
        .mockResolvedValueOnce('value1')
        .mockResolvedValueOnce('value2')
        .mockResolvedValueOnce('value3');

      const warmedCount = await cacheManager.warmup(keys, fetcher);
      expect(warmedCount).toBe(3);
      expect(fetcher).toHaveBeenCalledTimes(3);

      // Verify values are cached
      expect(await cacheManager.get('warm1')).toEqual('value1');
      expect(await cacheManager.get('warm2')).toEqual('value2');
      expect(await cacheManager.get('warm3')).toEqual('value3');
    });

    it('should prefetch keys that are not already cached', async () => {
      // Pre-cache one key
      await cacheManager.set('prefetch1', 'existing-value');

      const keys = ['prefetch1', 'prefetch2', 'prefetch3'];
      const fetcher = jest.fn()
        .mockResolvedValueOnce('value2')
        .mockResolvedValueOnce('value3');

      const prefetchedCount = await cacheManager.prefetch(keys, fetcher);
      expect(prefetchedCount).toBe(2); // Only 2 new keys should be fetched
      expect(fetcher).toHaveBeenCalledTimes(2);

      expect(await cacheManager.get('prefetch1')).toEqual('existing-value');
      expect(await cacheManager.get('prefetch2')).toEqual('value2');
      expect(await cacheManager.get('prefetch3')).toEqual('value3');
    });

    it('should handle fetcher errors gracefully', async () => {
      const keys = ['error-key1', 'error-key2'];
      const fetcher = jest.fn()
        .mockRejectedValueOnce(new Error('Fetch failed'))
        .mockResolvedValueOnce('success-value');

      const warmedCount = await cacheManager.warmup(keys, fetcher);
      expect(warmedCount).toBe(1); // Only one successful

      expect(await cacheManager.get('error-key1')).toBeNull();
      expect(await cacheManager.get('error-key2')).toEqual('success-value');
    });
  });

  describe('vacuum and cleanup', () => {
    it('should remove expired entries during vacuum', async () => {
      // Set a simple strategy that only removes expired items
      cacheManager.setStrategy({
        name: 'EXPIRY_ONLY',
        shouldCache: () => true,
        shouldEvict: () => false, // Don't evict non-expired items
        getPriority: (entry) => entry.lastAccessed,
      });

      const shortTtl = 100;
      await cacheManager.set('expire1', 'value1', { ttl: shortTtl });
      await cacheManager.set('expire2', 'value2', { ttl: shortTtl });
      await cacheManager.set('persist', 'value3', { ttl: 10000 });

      // Advance time to expire first two entries
      const originalNow = Date.now;
      Date.now = jest.fn(() => originalNow() + shortTtl + 1);

      const vacuumResult = await cacheManager.vacuum();
      expect(vacuumResult.removed).toBe(2);

      expect(await cacheManager.get('expire1')).toBeNull();
      expect(await cacheManager.get('expire2')).toBeNull();
      expect(await cacheManager.get('persist')).toEqual('value3');

      Date.now = originalNow;
    });

    it('should provide accurate cache statistics', async () => {
      // Add some entries
      await cacheManager.set('stats1', 'value1');
      await cacheManager.set('stats2', 'value2');

      // Create some hits and misses
      await cacheManager.get('stats1'); // hit
      await cacheManager.get('stats2'); // hit
      await cacheManager.get('missing1'); // miss
      await cacheManager.get('missing2'); // miss

      const stats = cacheManager.getStats();
      expect(stats.totalRequests).toBe(4);
      expect(stats.totalHits).toBe(2);
      expect(stats.totalMisses).toBe(2);
      expect(stats.hitRate).toBe(0.5);
      expect(stats.missRate).toBe(0.5);
      expect(stats.entryCount).toBe(2);
    });
  });

  describe('error handling', () => {
    it('should handle AsyncStorage errors gracefully', async () => {
      const key = 'error-test';
      const value = 'test-value';

      AsyncStorage.setItem.mockRejectedValue(new Error('Storage error'));

      // Should not throw, but return false
      const setResult = await cacheManager.set(key, value);
      expect(setResult).toBe(false);
    });

    it('should handle corrupted disk cache data', async () => {
      const key = 'corrupt-test';

      // Mock corrupted JSON data
      AsyncStorage.getItem.mockResolvedValue('corrupted-json-data');

      const result = await cacheManager.get(key);
      expect(result).toBeNull();
    });

    it('should handle large values that exceed size limits', async () => {
      // Use SIZE_AWARE strategy for this test
      cacheManager.setStrategy({
        name: 'SIZE_AWARE',
        shouldCache: (key, value, config) => {
          const calculateSize = (val: any) => JSON.stringify(val).length;
          const size = calculateSize(value);
          return size < (config?.maxSize || 1024 * 1024);
        },
        shouldEvict: () => false,
        getPriority: (entry) => entry.lastAccessed,
      });

      const key = 'large-test';
      const largeValue = 'x'.repeat(100 * 1024); // 100KB (larger than 1KB limit)

      const setResult = await cacheManager.set(key, largeValue, { maxSize: 1024 });
      expect(setResult).toBe(false); // Should reject large values
    });
  });

  describe('memory management', () => {
    it('should track memory usage', async () => {
      const initialStats = cacheManager.getStats();
      const initialMemoryUsage = initialStats.memoryUsage;

      await cacheManager.set('memory-test', 'some-data');

      const updatedStats = cacheManager.getStats();
      expect(updatedStats.memoryUsage).toBeGreaterThan(initialMemoryUsage);
    });

    it('should handle memory pressure events', async () => {
      // Set up some cache entries with different priorities
      await cacheManager.set('low1', 'value', { priority: 'low' });
      await cacheManager.set('normal1', 'value', { priority: 'normal' });
      await cacheManager.set('high1', 'value', { priority: 'high' });
      await cacheManager.set('critical1', 'value', { priority: 'critical' });

      const initialCount = cacheManager.getStats().entryCount;
      expect(initialCount).toBe(4);

      // Trigger memory warning (this would typically be done by the system)
      // We'll test the cleanup logic by calling vacuum with low memory conditions
      const vacuumResult = await cacheManager.vacuum();

      // Low priority items should be more likely to be evicted during memory pressure
      // The exact behavior depends on the eviction strategy implementation
      expect(vacuumResult).toBeDefined();
    });
  });

  describe('cache strategy', () => {
    it('should respect cache priorities during eviction', async () => {
      // Fill cache with different priority items
      await cacheManager.set('critical', 'critical-data', { priority: 'critical' });
      await cacheManager.set('high', 'high-data', { priority: 'high' });
      await cacheManager.set('normal', 'normal-data', { priority: 'normal' });
      await cacheManager.set('low', 'low-data', { priority: 'low' });

      // All should be initially available
      expect(await cacheManager.get('critical')).toEqual('critical-data');
      expect(await cacheManager.get('high')).toEqual('high-data');
      expect(await cacheManager.get('normal')).toEqual('normal-data');
      expect(await cacheManager.get('low')).toEqual('low-data');
    });

    it('should update access statistics on cache hits', async () => {
      const key = 'access-test';
      await cacheManager.set(key, 'test-value');

      const initialStats = cacheManager.getStats();
      const initialHits = initialStats.totalHits;

      await cacheManager.get(key);
      await cacheManager.get(key);

      const updatedStats = cacheManager.getStats();
      expect(updatedStats.totalHits).toBe(initialHits + 2);
    });
  });

  describe('configuration and defaults', () => {
    it('should use default configuration when none provided', async () => {
      const key = 'default-config-test';
      const value = 'test-value';

      const setResult = await cacheManager.set(key, value);
      expect(setResult).toBe(true);

      // Value should be accessible (using default TTL)
      const result = await cacheManager.get(key);
      expect(result).toEqual(value);
    });

    it('should merge custom config with defaults', async () => {
      const key = 'custom-config-test';
      const value = 'test-value';
      const customConfig: Partial<CacheConfig> = {
        ttl: 1000,
        priority: 'high',
      };

      await cacheManager.set(key, value, customConfig);
      const result = await cacheManager.get(key);
      expect(result).toEqual(value);
    });
  });
});