/**
 * CacheService unit tests — multi-layer (memory → disk) cache.
 *
 * Uses modern fake timers so Date.now()/TTL math and the 5-minute cleanup
 * interval are deterministic. AsyncStorage is the in-memory mock from
 * jest-setup.js (a real backing store), so the disk layer round-trips for real.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Isolate the performance util so mockRecordMetric calls are inert + assertable.
const mockRecordMetric = jest.fn();
jest.mock('../../utils/performance', () => ({
  performanceMonitor: {
    recordMetric: (...a: unknown[]) => mockRecordMetric(...a),
  },
}));

// Import after the mock is registered.
// eslint-disable-next-line @typescript-eslint/no-var-requires
import { CacheService } from '../CacheService';

const CACHE_PREFIX = '@mintenance_cache:';

/** Reset the singleton so each test gets a constructor-fresh instance. */
function freshCache(): CacheService {
  (CacheService as unknown as { instance?: CacheService }).instance = undefined;
  return CacheService.getInstance();
}

describe('CacheService', () => {
  let cache: CacheService;

  beforeEach(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    mockRecordMetric.mockClear();
    await AsyncStorage.clear();
    cache = freshCache();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('getInstance', () => {
    it('returns the same singleton on repeated calls', () => {
      const a = CacheService.getInstance();
      const b = CacheService.getInstance();
      expect(a).toBe(b);
    });
  });

  describe('set + get (memory layer)', () => {
    it('stores and retrieves a value from the memory cache (memory hit)', async () => {
      await cache.set('k1', { v: 1 });
      const result = await cache.get<{ v: number }>('k1');
      expect(result).toEqual({ v: 1 });
      expect(cache.getStats().memoryHits).toBe(1);
    });

    it('also persists to the disk layer', async () => {
      await cache.set('k2', 'hello');
      const raw = await AsyncStorage.getItem(`${CACHE_PREFIX}k2`);
      expect(raw).toBeTruthy();
      expect(JSON.parse(raw as string).data).toBe('hello');
    });

    it('uses the default TTL when none is supplied', async () => {
      await cache.set('k3', 1);
      const raw = JSON.parse(
        (await AsyncStorage.getItem(`${CACHE_PREFIX}k3`)) as string
      );
      expect(raw.ttl).toBe(1000 * 60 * 30);
    });

    it('records a cache_set_duration metric', async () => {
      await cache.set('k4', 1);
      expect(mockRecordMetric).toHaveBeenCalledWith(
        'cache_set_duration',
        expect.any(Number),
        'custom'
      );
    });
  });

  describe('get (disk promotion + miss)', () => {
    it('returns null and counts a miss when the key is absent', async () => {
      const result = await cache.get('missing');
      expect(result).toBeNull();
      const stats = cache.getStats();
      expect(stats.memoryMisses).toBe(1);
      expect(stats.diskMisses).toBe(1);
    });

    it('reads from disk and promotes to memory on a disk hit', async () => {
      // Seed only the disk layer (fresh instance => empty memory cache).
      await cache.set('promote', { n: 7 });
      const memoryOnly = freshCache();
      // Re-point: new instance has empty memory but shares the AsyncStorage store.
      const first = await memoryOnly.get<{ n: number }>('promote');
      expect(first).toEqual({ n: 7 });
      expect(memoryOnly.getStats().diskHits).toBe(1);

      // Second read now comes from memory (promoted).
      const second = await memoryOnly.get<{ n: number }>('promote');
      expect(second).toEqual({ n: 7 });
      expect(memoryOnly.getStats().memoryHits).toBe(1);
    });
  });

  describe('TTL expiry', () => {
    it('treats an expired memory entry as a miss and evicts it', async () => {
      await cache.set('temp', 'x', 1000); // 1s TTL
      jest.advanceTimersByTime(1500);
      const result = await cache.get('temp');
      expect(result).toBeNull();
      // memory miss recorded, then disk also expired -> disk miss
      expect(cache.getStats().memoryMisses).toBe(1);
    });

    it('removes an expired entry from disk on read', async () => {
      await cache.set('diskexp', 'y', 1000);
      const fresh = freshCache(); // empty memory, forces disk path
      jest.advanceTimersByTime(2000);
      const result = await fresh.get('diskexp');
      expect(result).toBeNull();
      expect(await AsyncStorage.getItem(`${CACHE_PREFIX}diskexp`)).toBeNull();
    });
  });

  describe('remove + clear', () => {
    it('removes a key from both memory and disk', async () => {
      await cache.set('r', 1);
      await cache.remove('r');
      expect(await cache.get('r')).toBeNull();
      expect(await AsyncStorage.getItem(`${CACHE_PREFIX}r`)).toBeNull();
    });

    it('clears all cache entries and resets stats', async () => {
      await cache.set('a', 1);
      await cache.set('b', 2);
      await cache.get('a'); // generate a hit stat
      await cache.clear();
      expect(await cache.get('a')).toBeNull();
      const keys = (await AsyncStorage.getAllKeys()).filter((k) =>
        k.startsWith(CACHE_PREFIX)
      );
      expect(keys).toHaveLength(0);
      // After clear, stats reset; the get('a') above is the only counted request.
      const stats = cache.getStats();
      expect(stats.memoryHits).toBe(0);
    });
  });

  describe('getStats', () => {
    it('returns 0 rates when there is no traffic', () => {
      const stats = cache.getStats();
      expect(stats.hitRate).toBe(0);
      expect(stats.memoryHitRate).toBe(0);
      expect(stats.diskHitRate).toBe(0);
    });

    it('computes hit rates after mixed traffic', async () => {
      await cache.set('h', 1);
      await cache.get('h'); // memory hit
      await cache.get('nope'); // full miss
      const stats = cache.getStats();
      expect(stats.hitRate).toBeGreaterThan(0);
      expect(stats.memoryHitRate).toBeGreaterThan(0);
    });
  });

  describe('has', () => {
    it('returns true when present and false when absent', async () => {
      await cache.set('exists', 1);
      expect(await cache.has('exists')).toBe(true);
      expect(await cache.has('ghost')).toBe(false);
    });
  });

  describe('getMany + setMany', () => {
    it('sets and gets multiple keys, skipping absent ones', async () => {
      await cache.setMany(
        new Map([
          ['m1', 1],
          ['m2', 2],
        ])
      );
      const result = await cache.getMany<number>(['m1', 'm2', 'm3']);
      expect(result.get('m1')).toBe(1);
      expect(result.get('m2')).toBe(2);
      expect(result.has('m3')).toBe(false);
    });
  });

  describe('LRU eviction', () => {
    it('evicts the least-recently-used entry once memory is full', async () => {
      // MEMORY_CACHE_SIZE = 100. Fill it, then add one more.
      for (let i = 0; i < 100; i++) {
        await cache.set(`key${i}`, i);
      }
      // Touch key1 so it becomes most-recently-used; key0 is now LRU.
      await cache.get('key1');
      await cache.set('key100', 100); // triggers eviction of key0
      // key0 evicted from memory; but still on disk -> disk hit, not memory.
      const statsBefore = cache.getStats().memoryHits;
      await cache.get('key0');
      expect(cache.getStats().memoryHits).toBe(statsBefore); // not a memory hit
      expect(cache.getStats().diskHits).toBeGreaterThan(0);
    });
  });

  describe('calculateSize fallback', () => {
    it('does not throw when caching a value with circular references', async () => {
      const circular: Record<string, unknown> = {};
      circular.self = circular;
      await expect(cache.set('circ', circular)).resolves.toBeUndefined();
    });
  });

  describe('error handling', () => {
    it('returns null from get when the disk layer throws', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(
        new Error('disk boom')
      );
      const result = await cache.get('any');
      expect(result).toBeNull();
    });

    it('swallows errors from set when the disk write throws', async () => {
      (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(
        new Error('write boom')
      );
      await expect(cache.set('x', 1)).resolves.toBeUndefined();
    });

    it('swallows errors from remove when the disk delete throws', async () => {
      (AsyncStorage.removeItem as jest.Mock).mockRejectedValueOnce(
        new Error('rm boom')
      );
      await expect(cache.remove('x')).resolves.toBeUndefined();
    });

    it('swallows errors from clear when getAllKeys throws', async () => {
      (AsyncStorage.getAllKeys as jest.Mock).mockRejectedValueOnce(
        new Error('keys boom')
      );
      await expect(cache.clear()).resolves.toBeUndefined();
    });
  });

  describe('scheduled cleanup', () => {
    it('removes expired entries when the 5-minute timer fires', async () => {
      await cache.set('cleanme', 'v', 1000); // 1s TTL
      jest.advanceTimersByTime(2000); // expire it
      // Advance to the next cleanup tick (interval = 5 min).
      jest.advanceTimersByTime(1000 * 60 * 5);
      await Promise.resolve(); // let the async cleanup settle
      await Promise.resolve();
      // The cleanup removes the expired disk entry.
      expect(await AsyncStorage.getItem(`${CACHE_PREFIX}cleanme`)).toBeNull();
    });
  });
});
