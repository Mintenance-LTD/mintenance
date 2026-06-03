import { CacheManager } from '../../../utils/cache';
import AsyncStorage from '@react-native-async-storage/async-storage';

// NOTE (test realignment 2026-06-02): the original suite assumed a
// CacheManager(options) with delete()/getOrFetch()/setWithWriteThrough()/
// getWithRefreshAhead(), count-based LRU eviction, a number TTL arg, and a
// stats shape of { hits, misses, size, sizeInBytes }. None of that exists in
// src/utils/cache (CacheManager). The real class: constructor takes no args,
// set(key, value, config?) where config is a CacheConfig object ({ ttl, ... }),
// invalidate() (not delete), clear(), getStats() -> { hitRate, totalHits,
// totalMisses, entryCount, ... }. Persistence is an AsyncStorage disk layer
// keyed `cache_<key>`; values are JSON serialized. Rewritten to the CURRENT
// contract. No source changes made.

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn().mockResolvedValue(undefined),
    removeItem: jest.fn().mockResolvedValue(undefined),
    getAllKeys: jest.fn().mockResolvedValue([]),
    multiRemove: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../../../utils/performance', () => ({
  performanceMonitor: { recordMetric: jest.fn() },
}));

const mockedStorage = AsyncStorage as unknown as {
  getItem: jest.Mock;
  setItem: jest.Mock;
  removeItem: jest.Mock;
  getAllKeys: jest.Mock;
  multiRemove: jest.Mock;
};

describe('Cache Manager - Comprehensive', () => {
  let cache: CacheManager;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedStorage.getItem.mockResolvedValue(null);
    mockedStorage.setItem.mockResolvedValue(undefined);
    mockedStorage.removeItem.mockResolvedValue(undefined);
    mockedStorage.getAllKeys.mockResolvedValue([]);
    mockedStorage.multiRemove.mockResolvedValue(undefined);
    cache = new CacheManager();
  });

  describe('Basic Operations', () => {
    it('should set and get cache values (memory layer, round-trips JSON)', async () => {
      const data = { id: 1, name: 'Test' };

      const ok = await cache.set('key1', data);
      const retrieved = await cache.get('key1');

      expect(ok).toBe(true);
      expect(retrieved).toEqual(data);
    });

    it('should return null on a cache miss', async () => {
      mockedStorage.getItem.mockResolvedValue(null);

      const result = await cache.get('nonexistent');

      expect(result).toBeNull();
    });

    it('should persist to the disk layer under a cache_ key', async () => {
      await cache.set('key1', 'value');

      expect(mockedStorage.setItem).toHaveBeenCalledWith(
        'cache_key1',
        expect.any(String)
      );
    });

    it('should invalidate a single entry from disk and memory', async () => {
      await cache.set('key1', 'value');
      const removed = await cache.invalidate('key1');

      expect(removed).toBe(true);
      expect(mockedStorage.removeItem).toHaveBeenCalledWith('cache_key1');
      expect(await cache.get('key1')).toBeNull();
    });

    it('should clear all cache_-prefixed disk keys', async () => {
      mockedStorage.getAllKeys.mockResolvedValue([
        'cache_key1',
        'cache_key2',
        'other_key',
      ]);

      await cache.clear();

      expect(mockedStorage.multiRemove).toHaveBeenCalledWith([
        'cache_key1',
        'cache_key2',
      ]);
    });
  });

  describe('Disk Promotion', () => {
    it('should read a valid entry from disk and promote it to memory', async () => {
      const freshCache = new CacheManager();
      const entry = {
        key: 'dkey',
        value: JSON.stringify({ from: 'disk' }),
        timestamp: Date.now(),
        accessCount: 1,
        lastAccessed: Date.now(),
        ttl: 60_000,
        size: 10,
        priority: 'normal',
        tags: [],
        compressed: false,
        encrypted: false,
      };
      mockedStorage.getItem.mockResolvedValueOnce(JSON.stringify(entry));

      const result = await freshCache.get('dkey');

      expect(result).toEqual({ from: 'disk' });
    });
  });

  describe('TTL (Time To Live)', () => {
    it('should expose ttl on the stored entry and serve fresh values', async () => {
      await cache.set('key1', 'test data', { ttl: 1000 });
      expect(await cache.get('key1')).toBe('test data');
    });

    it('should treat an entry past its ttl as a miss', async () => {
      const realNow = Date.now;
      const base = realNow();
      const spy = jest.spyOn(Date, 'now');
      // Stamp the entry "now".
      spy.mockReturnValue(base);
      await cache.set('key1', 'data', { ttl: 1000, persistToDisk: false });
      expect(await cache.get('key1')).toBe('data');

      // Advance virtual clock past the TTL -> isValid() is false.
      spy.mockReturnValue(base + 2000);
      expect(await cache.get('key1')).toBeNull();

      spy.mockRestore();
    });
  });

  describe('Cache Statistics', () => {
    it('should track hits and misses and compute hitRate', async () => {
      await cache.set('key1', 'value');

      await cache.get('key1'); // hit
      await cache.get('missingKey'); // miss
      await cache.get('key1'); // hit

      const stats = cache.getStats();

      expect(stats.totalHits).toBe(2);
      expect(stats.totalMisses).toBe(1);
      expect(stats.totalRequests).toBe(3);
      expect(stats.hitRate).toBeCloseTo(2 / 3, 5);
    });

    it('should track entry count and memory usage', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');

      const stats = cache.getStats();

      expect(stats.entryCount).toBe(2);
      expect(stats.memoryUsage).toBeGreaterThan(0);
    });
  });

  describe('Tag Invalidation', () => {
    it('should invalidate all entries carrying a tag', async () => {
      await cache.set('a', '1', { tags: ['group'] });
      await cache.set('b', '2', { tags: ['group'] });
      await cache.set('c', '3', { tags: ['other'] });

      const count = await cache.invalidateByTag('group');

      expect(count).toBe(2);
      expect(await cache.get('a')).toBeNull();
      expect(await cache.get('b')).toBeNull();
      expect(await cache.get('c')).toBe('3');
    });
  });

  describe('Error Handling', () => {
    it('should return false when disk persistence fails', async () => {
      mockedStorage.setItem.mockRejectedValue(new Error('Storage full'));

      const result = await cache.set('key1', 'value');

      expect(result).toBe(false);
    });

    it('should return null for corrupted disk data', async () => {
      mockedStorage.getItem.mockResolvedValue('corrupted{json');

      const result = await cache.get('key1');

      expect(result).toBeNull();
    });
  });
});
