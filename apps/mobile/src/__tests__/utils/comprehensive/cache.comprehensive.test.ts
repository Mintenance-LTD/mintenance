import { CacheManager } from '../../../utils/cache';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage');

describe('Cache Manager - Comprehensive', () => {
  let cache: CacheManager;

  beforeEach(() => {
    jest.clearAllMocks();
    cache = new CacheManager();
  });

  describe('Basic Operations', () => {
    it('should set and get cache values', async () => {
      const data = { id: 1, name: 'Test' };

      await cache.set('key1', data);
      const retrieved = await cache.get('key1');

      expect(retrieved).toEqual(data);
    });

    it('should handle cache miss', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await cache.get('nonexistent');

      expect(result).toBeNull();
    });

    it('should delete cache entries', async () => {
      await cache.set('key1', 'value');
      await cache.delete('key1');

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('cache_key1');
    });

    it('should clear all cache', async () => {
      (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue([
        'cache_key1',
        'cache_key2',
        'other_key',
      ]);

      await cache.clear();

      expect(AsyncStorage.multiRemove).toHaveBeenCalledWith([
        'cache_key1',
        'cache_key2',
      ]);
    });
  });

  describe('TTL (Time To Live)', () => {
    it('should respect TTL', async () => {
      const data = 'test data';
      const ttl = 1000; // 1 second

      await cache.set('key1', data, ttl);

      // Immediately should be available
      expect(await cache.get('key1')).toBe(data);

      // Mock time passing
      jest.advanceTimersByTime(1100);

      // Should be expired
      expect(await cache.get('key1')).toBeNull();
    });

    it('should handle infinite TTL', async () => {
      await cache.set('key1', 'data', Infinity);

      jest.advanceTimersByTime(1000000);

      expect(await cache.get('key1')).toBe('data');
    });
  });

  describe('Memory Management', () => {
    it('should enforce max size limit', async () => {
      cache = new CacheManager({ maxSize: 3 });

      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      await cache.set('key3', 'value3');
      await cache.set('key4', 'value4'); // Should evict oldest

      expect(await cache.get('key1')).toBeNull(); // Evicted
      expect(await cache.get('key4')).toBe('value4');
    });

    it('should use LRU eviction', async () => {
      cache = new CacheManager({ maxSize: 3, evictionPolicy: 'LRU' });

      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      await cache.set('key3', 'value3');

      // Access key1 to make it recently used
      await cache.get('key1');

      await cache.set('key4', 'value4');

      expect(await cache.get('key2')).toBeNull(); // Least recently used
      expect(await cache.get('key1')).toBe('value1'); // Still exists
    });
  });

  describe('Cache Patterns', () => {
    it('should implement cache-aside pattern', async () => {
      const fetchData = jest.fn().mockResolvedValue({ data: 'fresh' });

      const result = await cache.getOrFetch('key1', fetchData);

      expect(result).toEqual({ data: 'fresh' });
      expect(fetchData).toHaveBeenCalled();

      // Second call should use cache
      const cachedResult = await cache.getOrFetch('key1', fetchData);

      expect(cachedResult).toEqual({ data: 'fresh' });
      expect(fetchData).toHaveBeenCalledTimes(1); // Not called again
    });

    it('should implement write-through pattern', async () => {
      const persistData = jest.fn().mockResolvedValue(true);

      await cache.setWithWriteThrough('key1', 'data', persistData);

      expect(persistData).toHaveBeenCalledWith('key1', 'data');
      expect(await cache.get('key1')).toBe('data');
    });

    it('should implement refresh-ahead pattern', async () => {
      const fetchFresh = jest.fn().mockResolvedValue('fresh data');

      await cache.set('key1', 'stale data', 1000);

      // Set up refresh ahead at 80% of TTL
      await cache.getWithRefreshAhead('key1', fetchFresh, 0.8);

      jest.advanceTimersByTime(850); // Past 80% of TTL

      expect(fetchFresh).toHaveBeenCalled();
    });
  });

  describe('Cache Statistics', () => {
    it('should track cache hits and misses', async () => {
      await cache.set('key1', 'value');

      await cache.get('key1'); // Hit
      await cache.get('key2'); // Miss
      await cache.get('key1'); // Hit

      const stats = cache.getStats();

      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(0.67);
    });

    it('should track cache size', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');

      const stats = cache.getStats();

      expect(stats.size).toBe(2);
      expect(stats.sizeInBytes).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle storage errors gracefully', async () => {
      (AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error('Storage full'));

      const result = await cache.set('key1', 'value');

      expect(result).toBe(false);
    });

    it('should handle corrupted cache data', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('corrupted{json');

      const result = await cache.get('key1');

      expect(result).toBeNull();
    });
  });
});