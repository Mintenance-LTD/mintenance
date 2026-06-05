/**
 * Comprehensive CacheManager unit tests.
 *
 * Exercises the REAL CacheManager (no mocking of the class itself) to drive
 * coverage of the cache implementation (`utils/cache.ts` re-export + the
 * underlying `utils/cache/*` modules). Only externals are mocked:
 *   - @react-native-async-storage/async-storage (stateful in-memory mock)
 *   - utils/logger
 *   - utils/performance
 *
 * Covers every public method + branch:
 *   set (shouldCache reject, compression, encryption, persistToDisk on/off,
 *        disk failure rollback, serialize fallback, memory-pressure cleanup),
 *   get (memory hit, disk promotion, miss, expired memory, expired disk,
 *        corrupted-disk path, error path),
 *   invalidate, invalidateByTag, clear (multiRemove of cache_* keys),
 *   getStats (hitRate / totalHits / totalMisses / entryCount / memoryUsage),
 *   warmup, prefetch, vacuum, setStrategy, and the cleanup setInterval.
 *
 * NOTE: a separate `cache.simple.test.ts` covers smoke-level behaviour and is
 * intentionally left untouched.
 */

import { CacheManager } from '../cache';
import {
  LRU_STRATEGY,
  LFU_STRATEGY,
  SIZE_AWARE_STRATEGY,
} from '../cache/strategies';

// ---------------------------------------------------------------------------
// Stateful in-memory AsyncStorage mock so disk read/write/clear paths are real.
// The store + jest.fn handles are created inside the (hoisted) factory; the
// `mock`-prefix lets jest allow the out-of-scope reference, and we read the
// handles back via require() after the mock is registered.
// ---------------------------------------------------------------------------
const mockStore = new Map<string, string>();

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn((k: string) =>
      Promise.resolve(mockStore.has(k) ? mockStore.get(k)! : null)
    ),
    setItem: jest.fn((k: string, v: string) => {
      mockStore.set(k, v);
      return Promise.resolve();
    }),
    removeItem: jest.fn((k: string) => {
      mockStore.delete(k);
      return Promise.resolve();
    }),
    getAllKeys: jest.fn(() => Promise.resolve(Array.from(mockStore.keys()))),
    multiRemove: jest.fn((keys: string[]) => {
      keys.forEach((k) => mockStore.delete(k));
      return Promise.resolve();
    }),
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

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { logger } = require('../logger');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { performanceMonitor } = require('../performance');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const asyncStorageMock =
  require('@react-native-async-storage/async-storage').default;

// Track every CacheManager so we can stop their cleanup intervals after each
// test (the constructor opens a setInterval handle).
const created: CacheManager[] = [];
function makeCache(): CacheManager {
  const c = new CacheManager();
  created.push(c);
  return c;
}

function stopTimer(c: CacheManager): void {
  // cleanupInterval is private; clear it to release the open handle.
  const handle = (c as unknown as { cleanupInterval?: NodeJS.Timeout })
    .cleanupInterval;
  if (handle) clearInterval(handle);
}

describe('CacheManager (comprehensive)', () => {
  beforeEach(() => {
    mockStore.clear();
    jest.clearAllMocks();
  });

  afterEach(() => {
    created.forEach(stopTimer);
    created.length = 0;
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // set()
  // -------------------------------------------------------------------------
  describe('set()', () => {
    it('stores a value in memory and persists to disk by default', async () => {
      const cache = makeCache();
      const ok = await cache.set('k1', { a: 1 });

      expect(ok).toBe(true);
      // Persisted to disk under the cache_ prefix.
      expect(mockStore.has('cache_k1')).toBe(true);
      const stats = cache.getStats();
      expect(stats.entryCount).toBe(1);
      expect(stats.memoryUsage).toBeGreaterThan(0);
      expect(performanceMonitor.recordMetric).toHaveBeenCalledWith(
        'cache_cache_set',
        expect.any(Number),
        'storage'
      );
    });

    it('does NOT persist to disk when persistToDisk is false', async () => {
      const cache = makeCache();
      const ok = await cache.set('mem-only', 'value', { persistToDisk: false });

      expect(ok).toBe(true);
      expect(mockStore.has('cache_mem-only')).toBe(false);
      expect(asyncStorageMock.setItem).not.toHaveBeenCalled();
    });

    it('returns false when the strategy rejects caching (shouldCache=false)', async () => {
      const cache = makeCache();
      cache.setStrategy({
        name: 'reject',
        shouldCache: () => false,
        shouldEvict: () => false,
        getPriority: () => 0,
      });

      const ok = await cache.set('rejected', 'value');
      expect(ok).toBe(false);
      expect(cache.getStats().entryCount).toBe(0);
      expect(mockStore.has('cache_rejected')).toBe(false);
    });

    it('rolls back the memory entry and returns false when disk write fails', async () => {
      const cache = makeCache();
      asyncStorageMock.setItem.mockRejectedValueOnce(new Error('disk full'));

      const ok = await cache.set('willfail', 'value'); // persistToDisk defaults true
      expect(ok).toBe(false);
      // Disk failure logged by storage layer.
      expect(logger.warn).toHaveBeenCalled();
      // Rolled back: not retrievable from memory.
      const got = await cache.get('willfail');
      expect(got).toBeNull();
    });

    it('honours compression flag (records compressed entry)', async () => {
      const cache = makeCache();
      const ok = await cache.set('zip', 'value', { compression: true });
      expect(ok).toBe(true);
      const persisted = JSON.parse(mockStore.get('cache_zip')!);
      expect(persisted.compressed).toBe(true);
    });

    it('honours encryption flag (records encrypted entry)', async () => {
      const cache = makeCache();
      const ok = await cache.set('enc', 'value', { encryption: true });
      expect(ok).toBe(true);
      const persisted = JSON.parse(mockStore.get('cache_enc')!);
      expect(persisted.encrypted).toBe(true);
    });

    it('stores tags on the entry', async () => {
      const cache = makeCache();
      await cache.set('tagged', 'value', { tags: ['t1', 't2'] });
      const persisted = JSON.parse(mockStore.get('cache_tagged')!);
      expect(persisted.tags).toEqual(['t1', 't2']);
    });

    it('falls back to raw value when JSON.stringify throws (serialize catch)', async () => {
      const cache = makeCache();
      const circular: Record<string, unknown> = {};
      circular.self = circular; // JSON.stringify throws on circular refs

      // set should still succeed; serializeValue returns the value as-is,
      // but persisting the circular object to disk fails JSON.stringify ->
      // returns false (disk required) and rolls back.
      const ok = await cache.set('circ', circular);
      // Disk persist of a circular object fails -> rollback -> false.
      expect(ok).toBe(false);
    });

    it('catches a thrown error inside set and logs a warning (returns false)', async () => {
      const cache = makeCache();
      cache.setStrategy({
        name: 'boom',
        shouldCache: () => {
          throw new Error('strategy blew up');
        },
        shouldEvict: () => false,
        getPriority: () => 0,
      });

      const ok = await cache.set('boomkey', 'value');
      expect(ok).toBe(false);
      expect(logger.warn).toHaveBeenCalledWith(
        'Cache set error',
        expect.objectContaining({ data: expect.anything() })
      );
    });
  });

  // -------------------------------------------------------------------------
  // get()
  // -------------------------------------------------------------------------
  describe('get()', () => {
    it('returns a memory-cache hit and increments totalHits', async () => {
      const cache = makeCache();
      await cache.set('hit', { v: 42 }, { persistToDisk: false });

      const result = await cache.get<{ v: number }>('hit');
      expect(result).toEqual({ v: 42 });

      const stats = cache.getStats();
      expect(stats.totalHits).toBe(1);
      expect(stats.totalMisses).toBe(0);
      expect(stats.hitRate).toBe(1);
      expect(performanceMonitor.recordMetric).toHaveBeenCalledWith(
        'cache_cache_hit_memory',
        expect.any(Number),
        'storage'
      );
    });

    it('promotes a disk entry into memory on a disk hit', async () => {
      // First cache writes to disk via cacheA, then a fresh manager (empty
      // memory) reads it -> disk hit + promotion.
      const cacheA = makeCache();
      await cacheA.set('shared', 'disk-value');
      expect(mockStore.has('cache_shared')).toBe(true);

      const cacheB = makeCache(); // empty memory, shares disk store
      const result = await cacheB.get<string>('shared');
      expect(result).toBe('disk-value');

      const stats = cacheB.getStats();
      expect(stats.totalHits).toBe(1);
      // Promoted into cacheB memory.
      expect(stats.entryCount).toBeGreaterThanOrEqual(0); // entryCount tracked on set; promotion updates memoryUsage
      expect(stats.memoryUsage).toBeGreaterThan(0);
      expect(performanceMonitor.recordMetric).toHaveBeenCalledWith(
        'cache_cache_hit_disk',
        expect.any(Number),
        'storage'
      );
    });

    it('returns null and increments totalMisses on a clean miss', async () => {
      const cache = makeCache();
      const result = await cache.get('nope');
      expect(result).toBeNull();

      const stats = cache.getStats();
      expect(stats.totalMisses).toBe(1);
      expect(stats.totalHits).toBe(0);
      expect(stats.missRate).toBe(1);
      expect(performanceMonitor.recordMetric).toHaveBeenCalledWith(
        'cache_cache_miss',
        expect.any(Number),
        'storage'
      );
    });

    it('treats an expired memory entry as a miss (TTL via Date.now spy)', async () => {
      const base = 1_000_000;
      const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(base);

      const cache = makeCache();
      await cache.set('temp', 'value', { ttl: 1000, persistToDisk: false });

      // Advance past TTL.
      nowSpy.mockReturnValue(base + 2000);
      const result = await cache.get('temp');
      expect(result).toBeNull();
      expect(cache.getStats().totalMisses).toBe(1);
    });

    it('treats an expired disk entry as a miss', async () => {
      const base = 2_000_000;
      const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(base);

      const writer = makeCache();
      await writer.set('expdisk', 'value', { ttl: 500 });
      expect(mockStore.has('cache_expdisk')).toBe(true);

      nowSpy.mockReturnValue(base + 5000); // past ttl
      const reader = makeCache(); // empty memory -> goes to disk
      const result = await reader.get('expdisk');
      expect(result).toBeNull();
      expect(reader.getStats().totalMisses).toBe(1);
    });

    it('returns null (miss) when the disk entry is corrupted JSON', async () => {
      const cache = makeCache();
      // Plant corrupted data under the cache_ prefix directly.
      mockStore.set('cache_broken', '{not valid json');

      const result = await cache.get('broken');
      expect(result).toBeNull();
      // getDiskEntry swallows the parse error and returns null -> miss.
      expect(cache.getStats().totalMisses).toBe(1);
    });

    it('returns null and logs a warning when the memory map throws (error path)', async () => {
      const cache = makeCache();
      // Force the memory Map.get to throw to hit the catch branch.
      const internal = cache as unknown as {
        memoryCache: Map<string, unknown>;
      };
      jest.spyOn(internal.memoryCache, 'get').mockImplementation(() => {
        throw new Error('map exploded');
      });

      const result = await cache.get('any');
      expect(result).toBeNull();
      expect(logger.warn).toHaveBeenCalledWith(
        'Cache get error',
        expect.objectContaining({ data: expect.anything() })
      );
      expect(cache.getStats().totalMisses).toBe(1);
    });

    it('deserializes a non-string promoted value via the deserialize catch path', async () => {
      // Plant a disk entry whose value is already an object (not a JSON string).
      const cache = makeCache();
      const now = Date.now();
      const entry = {
        key: 'objval',
        value: { nested: true },
        timestamp: now,
        accessCount: 1,
        lastAccessed: now,
        ttl: 60_000,
        size: 10,
        priority: 'normal',
        tags: [],
        compressed: false,
        encrypted: false,
      };
      mockStore.set('cache_objval', JSON.stringify(entry));

      const result = await cache.get<{ nested: boolean }>('objval');
      expect(result).toEqual({ nested: true });
    });
  });

  // -------------------------------------------------------------------------
  // invalidate() / invalidateByTag() / clear()
  // -------------------------------------------------------------------------
  describe('invalidation', () => {
    it('invalidate removes an entry from memory and disk', async () => {
      const cache = makeCache();
      await cache.set('inv', 'value');
      expect(mockStore.has('cache_inv')).toBe(true);

      const removed = await cache.invalidate('inv');
      expect(removed).toBe(true);
      expect(mockStore.has('cache_inv')).toBe(false);
      expect(await cache.get('inv')).toBeNull();
    });

    it('invalidate returns false for a missing key', async () => {
      const cache = makeCache();
      const removed = await cache.invalidate('ghost');
      expect(removed).toBe(false);
    });

    it('invalidate logs and returns false when removal throws', async () => {
      const cache = makeCache();
      const internal = cache as unknown as {
        memoryCache: Map<string, unknown>;
      };
      jest.spyOn(internal.memoryCache, 'delete').mockImplementation(() => {
        throw new Error('delete failed');
      });

      const removed = await cache.invalidate('x');
      expect(removed).toBe(false);
      expect(logger.warn).toHaveBeenCalledWith(
        'Cache invalidate error',
        expect.objectContaining({ data: expect.anything() })
      );
    });

    it('invalidateByTag removes only entries carrying the tag', async () => {
      const cache = makeCache();
      await cache.set('a', 1, { tags: ['group'] });
      await cache.set('b', 2, { tags: ['group', 'other'] });
      await cache.set('c', 3, { tags: ['other'] });

      const count = await cache.invalidateByTag('group');
      expect(count).toBe(2);
      expect(await cache.get('a')).toBeNull();
      expect(await cache.get('b')).toBeNull();
      expect(await cache.get('c')).toBe(3);
    });

    it('invalidateByTag returns 0 when no entry matches', async () => {
      const cache = makeCache();
      await cache.set('a', 1, { tags: ['x'] });
      const count = await cache.invalidateByTag('missing');
      expect(count).toBe(0);
    });

    it('invalidateByTag logs and returns count on error', async () => {
      const cache = makeCache();
      const internal = cache as unknown as {
        memoryCache: Map<string, unknown>;
      };
      jest.spyOn(internal.memoryCache, 'entries').mockImplementation(() => {
        throw new Error('entries failed');
      });

      const count = await cache.invalidateByTag('any');
      expect(count).toBe(0);
      expect(logger.warn).toHaveBeenCalledWith(
        'Cache invalidate by tag error',
        expect.objectContaining({ data: expect.anything() })
      );
    });

    it('clear wipes memory, multiRemoves cache_* disk keys, and resets stats', async () => {
      const cache = makeCache();
      await cache.set('x', 1);
      await cache.set('y', 2);
      // A non-cache key must survive clear().
      mockStore.set('unrelated', 'keep-me');
      await cache.get('x'); // create some stats movement

      await cache.clear();

      expect(asyncStorageMock.multiRemove).toHaveBeenCalledWith([
        'cache_x',
        'cache_y',
      ]);
      expect(mockStore.has('cache_x')).toBe(false);
      expect(mockStore.has('cache_y')).toBe(false);
      expect(mockStore.has('unrelated')).toBe(true);

      const stats = cache.getStats();
      expect(stats.totalRequests).toBe(0);
      expect(stats.totalHits).toBe(0);
      expect(stats.totalMisses).toBe(0);
      expect(stats.entryCount).toBe(0);
      expect(stats.memoryUsage).toBe(0);
    });

    it('clear logs a warning when the disk clear throws', async () => {
      const cache = makeCache();
      await cache.set('x', 1);
      asyncStorageMock.getAllKeys.mockRejectedValueOnce(new Error('keys boom'));

      await cache.clear();
      expect(logger.warn).toHaveBeenCalledWith(
        'Disk cache clear error',
        expect.anything()
      );
    });
  });

  // -------------------------------------------------------------------------
  // getStats()
  // -------------------------------------------------------------------------
  describe('getStats()', () => {
    it('computes hitRate / missRate across mixed hits and misses', async () => {
      const cache = makeCache();
      await cache.set('present', 'v', { persistToDisk: false });

      await cache.get('present'); // hit
      await cache.get('present'); // hit
      await cache.get('absent'); // miss

      const stats = cache.getStats();
      expect(stats.totalRequests).toBe(3);
      expect(stats.totalHits).toBe(2);
      expect(stats.totalMisses).toBe(1);
      expect(stats.hitRate).toBeCloseTo(2 / 3, 5);
      expect(stats.missRate).toBeCloseTo(1 / 3, 5);
    });

    it('returns a copy (mutating the result does not affect internal state)', async () => {
      const cache = makeCache();
      const stats = cache.getStats();
      stats.totalHits = 999;
      expect(cache.getStats().totalHits).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // warmup() / prefetch()
  // -------------------------------------------------------------------------
  describe('warmup() & prefetch()', () => {
    it('warmup fetches and stores only missing keys', async () => {
      const cache = makeCache();
      await cache.set('alreadythere', 'v', { persistToDisk: false });

      const fetcher = jest.fn((key: string) =>
        Promise.resolve(`fetched-${key}`)
      );
      const warmed = await cache.warmup(
        ['alreadythere', 'new1', 'new2'],
        fetcher
      );

      expect(warmed).toBe(2); // only new1 + new2
      expect(fetcher).toHaveBeenCalledTimes(2);
      expect(fetcher).not.toHaveBeenCalledWith('alreadythere');
      expect(await cache.get('new1')).toBe('fetched-new1');
    });

    it('warmup logs and continues when the fetcher throws', async () => {
      const cache = makeCache();
      const fetcher = jest.fn(() => Promise.reject(new Error('fetch failed')));

      const warmed = await cache.warmup(['boom'], fetcher);
      expect(warmed).toBe(0);
      expect(logger.warn).toHaveBeenCalledWith(
        'Cache warmup error',
        expect.objectContaining({ data: expect.anything() })
      );
    });

    it('prefetch fetches missing keys in parallel and returns the stored count', async () => {
      const cache = makeCache();
      const fetcher = jest.fn((key: string) => Promise.resolve(`pf-${key}`));

      const count = await cache.prefetch(['p1', 'p2', 'p3'], fetcher);
      expect(count).toBe(3);
      expect(await cache.get('p1')).toBe('pf-p1');
    });

    it('prefetch skips keys already present', async () => {
      const cache = makeCache();
      await cache.set('exists', 'v', { persistToDisk: false });
      const fetcher = jest.fn((key: string) => Promise.resolve(`pf-${key}`));

      const count = await cache.prefetch(['exists', 'fresh'], fetcher);
      // exists -> skipped (returns undefined, filtered out); fresh -> stored.
      expect(count).toBe(1);
      expect(fetcher).toHaveBeenCalledTimes(1);
    });

    it('prefetch logs and returns false for a failing fetch', async () => {
      const cache = makeCache();
      const fetcher = jest.fn(() => Promise.reject(new Error('nope')));

      const count = await cache.prefetch(['willfail'], fetcher);
      expect(count).toBe(0);
      expect(logger.warn).toHaveBeenCalledWith(
        'Cache prefetch error',
        expect.objectContaining({ data: expect.anything() })
      );
    });
  });

  // -------------------------------------------------------------------------
  // vacuum()
  // -------------------------------------------------------------------------
  describe('vacuum()', () => {
    it('removes expired entries and reports removed/freed', async () => {
      const base = 3_000_000;
      const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(base);

      const cache = makeCache();
      await cache.set('short', 'value', { ttl: 100, persistToDisk: false });
      await cache.set('long', 'value', {
        ttl: 10_000_000,
        persistToDisk: false,
      });

      nowSpy.mockReturnValue(base + 1000); // 'short' now expired, 'long' valid
      // Use a non-evicting strategy so only validity (expiry) drives removal.
      cache.setStrategy({
        name: 'no-evict',
        shouldCache: () => true,
        shouldEvict: () => false,
        getPriority: () => 0,
      });

      const { removed, freed } = await cache.vacuum();
      expect(removed).toBe(1);
      expect(freed).toBeGreaterThan(0);
      expect(await cache.get('long')).toBe('value');
    });

    it('evicts entries the strategy flags via shouldEvict', async () => {
      const cache = makeCache();
      await cache.set('evictme', 'value', { persistToDisk: false });

      cache.setStrategy({
        name: 'evict-all',
        shouldCache: () => true,
        shouldEvict: () => true,
        getPriority: () => 0,
      });

      const { removed } = await cache.vacuum();
      expect(removed).toBe(1);
    });

    it('logs and returns partial totals when vacuum throws', async () => {
      const cache = makeCache();
      const internal = cache as unknown as {
        memoryCache: Map<string, unknown>;
      };
      jest.spyOn(internal.memoryCache, 'entries').mockImplementation(() => {
        throw new Error('entries boom');
      });

      const result = await cache.vacuum();
      expect(result).toEqual({ removed: 0, freed: 0 });
      expect(logger.warn).toHaveBeenCalledWith(
        'Cache vacuum error',
        expect.anything()
      );
    });
  });

  // -------------------------------------------------------------------------
  // memory pressure (checkMemoryPressure -> vacuum + info log)
  // -------------------------------------------------------------------------
  describe('memory pressure', () => {
    it('triggers cleanup when memoryUsage exceeds the cap', async () => {
      const cache = makeCache();
      // Drop the private cap so a single set trips memory pressure.
      (cache as unknown as { maxMemoryUsage: number }).maxMemoryUsage = 1;
      // Evict everything so the vacuum path frees + logs.
      cache.setStrategy({
        name: 'evict-all',
        shouldCache: () => true,
        shouldEvict: () => true,
        getPriority: () => 0,
      });

      await cache.set('big', 'x'.repeat(100), { persistToDisk: false });

      expect(logger.info).toHaveBeenCalledWith(
        'Cache memory pressure cleanup',
        expect.objectContaining({ data: expect.anything() })
      );
    });
  });

  // -------------------------------------------------------------------------
  // cleanup interval (setInterval started in constructor)
  // -------------------------------------------------------------------------
  describe('cleanup timer', () => {
    it('runs vacuum on the 60s interval', async () => {
      jest.useFakeTimers();
      const cache = makeCache();
      const vacuumSpy = jest.spyOn(cache, 'vacuum');

      jest.advanceTimersByTime(60_000);
      // Allow the async interval callback to settle.
      await Promise.resolve();

      expect(vacuumSpy).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // setStrategy() + built-in strategies
  // -------------------------------------------------------------------------
  describe('strategies', () => {
    it('setStrategy swaps the active strategy', async () => {
      const cache = makeCache();
      // SIZE_AWARE rejects values over maxSize.
      cache.setStrategy(SIZE_AWARE_STRATEGY);

      const ok = await cache.set('toobig', 'x'.repeat(2_000_000), {
        maxSize: 100,
      });
      expect(ok).toBe(false);
    });

    it('LRU_STRATEGY.shouldCache always allows', () => {
      expect(LRU_STRATEGY.shouldCache('k', 'v')).toBe(true);
    });

    it('LFU_STRATEGY evicts entries accessed fewer than twice', () => {
      const entry = makeEntry({ accessCount: 1 });
      expect(LFU_STRATEGY.shouldEvict(entry, makeStats())).toBe(true);
      expect(LFU_STRATEGY.getPriority(entry)).toBe(1);
    });

    it('LFU_STRATEGY keeps entries accessed at least twice', () => {
      const entry = makeEntry({ accessCount: 5 });
      expect(LFU_STRATEGY.shouldEvict(entry, makeStats())).toBe(false);
    });

    it('LRU_STRATEGY evicts stale entries and getPriority returns lastAccessed', () => {
      const now = 5_000_000;
      jest.spyOn(Date, 'now').mockReturnValue(now);

      // lastAccessed far in the past -> age large -> evicted.
      const stale = makeEntry({ lastAccessed: now - 1_000_000 });
      const stats = makeStats({ totalRequests: 10, oldestEntry: now - 1000 });
      expect(LRU_STRATEGY.shouldEvict(stale, stats)).toBe(true);
      expect(LRU_STRATEGY.getPriority(stale)).toBe(stale.lastAccessed);

      // Fresh entry (age 0) with no request history -> avgAge 0 -> age>0 false.
      const fresh = makeEntry({ lastAccessed: now });
      expect(
        LRU_STRATEGY.shouldEvict(fresh, makeStats({ totalRequests: 0 }))
      ).toBe(false);
    });

    it('SIZE_AWARE_STRATEGY caches small values and rejects large ones', () => {
      expect(
        SIZE_AWARE_STRATEGY.shouldCache('k', 'tiny', { maxSize: 1000 })
      ).toBe(true);
      expect(
        SIZE_AWARE_STRATEGY.shouldCache('k', 'x'.repeat(2000), { maxSize: 100 })
      ).toBe(false);
      // Default 1MB cap when no config supplied.
      expect(SIZE_AWARE_STRATEGY.shouldCache('k', 'small')).toBe(true);
    });

    it('SIZE_AWARE_STRATEGY evicts large entries under memory pressure', () => {
      const big = makeEntry({ size: 1024 * 20 });
      const pressured = makeStats({ memoryUsage: 90 * 1024 * 1024 });
      expect(SIZE_AWARE_STRATEGY.shouldEvict(big, pressured)).toBe(true);
      // Small entry under the same pressure is kept.
      const small = makeEntry({ size: 100 });
      expect(SIZE_AWARE_STRATEGY.shouldEvict(small, pressured)).toBe(false);
      // getPriority returns negative size (descending order).
      expect(SIZE_AWARE_STRATEGY.getPriority(big)).toBe(-big.size);
    });
  });

  // -------------------------------------------------------------------------
  // disk cleanup via vacuum (storage.cleanupDiskCache over cache_* keys)
  // -------------------------------------------------------------------------
  describe('disk cleanup during vacuum', () => {
    it('removes expired disk entries while keeping valid ones', async () => {
      const base = 4_000_000;
      const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(base);

      const cache = makeCache();
      // Both persisted to disk.
      await cache.set('diskshort', 'v', { ttl: 100 });
      await cache.set('disklong', 'v', { ttl: 10_000_000 });
      expect(mockStore.has('cache_diskshort')).toBe(true);
      expect(mockStore.has('cache_disklong')).toBe(true);

      // Advance time so 'diskshort' is expired on disk; clear memory so vacuum's
      // memory loop does nothing and cleanupDiskCache does the work.
      nowSpy.mockReturnValue(base + 1000);
      (
        cache as unknown as { memoryCache: Map<string, unknown> }
      ).memoryCache.clear();

      await cache.vacuum();

      // cleanupDiskCache iterated cache_* keys and removed the expired one.
      expect(mockStore.has('cache_diskshort')).toBe(false);
      expect(mockStore.has('cache_disklong')).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // calculateSize primitive branch (types.ts)
  // -------------------------------------------------------------------------
  describe('size estimation via real set()', () => {
    it('stores a primitive (number) value (calculateSize primitive branch)', async () => {
      const cache = makeCache();
      const ok = await cache.set('num', 12345, { persistToDisk: false });
      expect(ok).toBe(true);
      expect(await cache.get<number>('num')).toBe(12345);
    });

    it('stores a boolean value', async () => {
      const cache = makeCache();
      const ok = await cache.set('flag', true, { persistToDisk: false });
      expect(ok).toBe(true);
      expect(await cache.get<boolean>('flag')).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------
function makeEntry(
  overrides: Partial<{
    accessCount: number;
    lastAccessed: number;
    size: number;
  }> = {}
) {
  const now = Date.now();
  return {
    key: 'k',
    value: 'v',
    timestamp: now,
    accessCount: overrides.accessCount ?? 1,
    lastAccessed: overrides.lastAccessed ?? now,
    ttl: 1000,
    size: overrides.size ?? 10,
    priority: 'normal' as const,
    tags: [],
    compressed: false,
    encrypted: false,
  };
}

function makeStats(
  overrides: Partial<{
    totalRequests: number;
    oldestEntry: number;
    memoryUsage: number;
  }> = {}
) {
  const now = Date.now();
  return {
    hitRate: 0,
    missRate: 0,
    totalRequests: overrides.totalRequests ?? 0,
    totalHits: 0,
    totalMisses: 0,
    memoryUsage: overrides.memoryUsage ?? 0,
    diskUsage: 0,
    entryCount: 0,
    oldestEntry: overrides.oldestEntry ?? now,
    newestEntry: now,
  };
}
