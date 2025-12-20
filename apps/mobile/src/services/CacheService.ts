/**
 * Multi-Layer Cache Service
 * Implements memory → disk → network caching strategy
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../utils/logger';
import { performanceMonitor } from '../utils/performance';

// Cache configuration
const CACHE_CONFIG = {
  // Memory cache size limit (items)
  MEMORY_CACHE_SIZE: 100,

  // Disk cache size limit (bytes)
  DISK_CACHE_SIZE: 10 * 1024 * 1024, // 10MB

  // Default TTL (time to live) in milliseconds
  DEFAULT_TTL: 1000 * 60 * 30, // 30 minutes

  // Cache key prefix
  CACHE_PREFIX: '@mintenance_cache:',
} as const;

// Cache entry interface
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  size: number;
}

// Cache statistics
interface CacheStats {
  memoryHits: number;
  memoryMisses: number;
  diskHits: number;
  diskMisses: number;
  totalSize: number;
  itemCount: number;
}

export class CacheService {
  private static instance: CacheService;

  // Memory cache (in-memory Map)
  private memoryCache: Map<string, CacheEntry<any>>;

  // LRU tracking for memory cache
  private lruKeys: string[];

  // Cache statistics
  private stats: CacheStats;

  private constructor() {
    this.memoryCache = new Map();
    this.lruKeys = [];
    this.stats = {
      memoryHits: 0,
      memoryMisses: 0,
      diskHits: 0,
      diskMisses: 0,
      totalSize: 0,
      itemCount: 0,
    };

    // Initialize cache cleanup
    this.startCleanupTimer();
  }

  static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  /**
   * Get item from cache (memory → disk → null)
   */
  async get<T>(key: string): Promise<T | null> {
    const startTime = Date.now();

    try {
      // Try memory cache first
      const memoryResult = this.getFromMemory<T>(key);
      if (memoryResult !== null) {
        this.stats.memoryHits++;
        this.recordCacheHit('memory', Date.now() - startTime);
        return memoryResult;
      }

      this.stats.memoryMisses++;

      // Try disk cache
      const diskResult = await this.getFromDisk<T>(key);
      if (diskResult !== null) {
        this.stats.diskHits++;

        // Promote to memory cache
        this.setInMemory(key, diskResult.data, diskResult.ttl);

        this.recordCacheHit('disk', Date.now() - startTime);
        return diskResult.data;
      }

      this.stats.diskMisses++;
      this.recordCacheMiss(Date.now() - startTime);

      return null;
    } catch (error) {
      logger.error('Cache get error', error as Error);
      return null;
    }
  }

  /**
   * Set item in cache (memory + disk)
   */
  async set<T>(
    key: string,
    data: T,
    ttl: number = CACHE_CONFIG.DEFAULT_TTL
  ): Promise<void> {
    const startTime = Date.now();

    try {
      // Set in memory cache
      this.setInMemory(key, data, ttl);

      // Set in disk cache asynchronously
      await this.setOnDisk(key, data, ttl);

      const duration = Date.now() - startTime;
      performanceMonitor.recordMetric('cache_set_duration', duration, 'custom');

      logger.debug('Cache set', { key, ttl, duration });
    } catch (error) {
      logger.error('Cache set error', error as Error);
    }
  }

  /**
   * Remove item from cache
   */
  async remove(key: string): Promise<void> {
    try {
      // Remove from memory
      this.memoryCache.delete(key);
      this.lruKeys = this.lruKeys.filter(k => k !== key);

      // Remove from disk
      await AsyncStorage.removeItem(this.getDiskKey(key));

      logger.debug('Cache removed', { key });
    } catch (error) {
      logger.error('Cache remove error', error as Error);
    }
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    try {
      // Clear memory cache
      this.memoryCache.clear();
      this.lruKeys = [];

      // Clear disk cache
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(k => k.startsWith(CACHE_CONFIG.CACHE_PREFIX));
      await AsyncStorage.multiRemove(cacheKeys);

      // Reset stats
      this.resetStats();

      logger.info('Cache cleared');
    } catch (error) {
      logger.error('Cache clear error', error as Error);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats & {
    hitRate: number;
    memoryHitRate: number;
    diskHitRate: number;
  } {
    const totalRequests =
      this.stats.memoryHits +
      this.stats.memoryMisses +
      this.stats.diskHits +
      this.stats.diskMisses;

    const totalHits = this.stats.memoryHits + this.stats.diskHits;

    return {
      ...this.stats,
      hitRate: totalRequests > 0 ? (totalHits / totalRequests) * 100 : 0,
      memoryHitRate:
        this.stats.memoryHits + this.stats.memoryMisses > 0
          ? (this.stats.memoryHits /
              (this.stats.memoryHits + this.stats.memoryMisses)) *
            100
          : 0,
      diskHitRate:
        this.stats.diskHits + this.stats.diskMisses > 0
          ? (this.stats.diskHits / (this.stats.diskHits + this.stats.diskMisses)) *
            100
          : 0,
    };
  }

  /**
   * Check if key exists in cache
   */
  async has(key: string): Promise<boolean> {
    return (await this.get(key)) !== null;
  }

  /**
   * Get multiple items from cache
   */
  async getMany<T>(keys: string[]): Promise<Map<string, T>> {
    const results = new Map<string, T>();

    await Promise.all(
      keys.map(async key => {
        const value = await this.get<T>(key);
        if (value !== null) {
          results.set(key, value);
        }
      })
    );

    return results;
  }

  /**
   * Set multiple items in cache
   */
  async setMany<T>(
    items: Map<string, T>,
    ttl: number = CACHE_CONFIG.DEFAULT_TTL
  ): Promise<void> {
    await Promise.all(
      Array.from(items.entries()).map(([key, value]) => this.set(key, value, ttl))
    );
  }

  // ============================================================================
  // MEMORY CACHE OPERATIONS
  // ============================================================================

  private getFromMemory<T>(key: string): T | null {
    const entry = this.memoryCache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.memoryCache.delete(key);
      this.lruKeys = this.lruKeys.filter(k => k !== key);
      return null;
    }

    // Update LRU
    this.updateLRU(key);

    return entry.data;
  }

  private setInMemory<T>(key: string, data: T, ttl: number): void {
    const size = this.calculateSize(data);

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
      size,
    };

    // Check if cache is full
    if (this.memoryCache.size >= CACHE_CONFIG.MEMORY_CACHE_SIZE) {
      this.evictLRU();
    }

    this.memoryCache.set(key, entry);
    this.updateLRU(key);
  }

  private updateLRU(key: string): void {
    // Remove key if exists
    this.lruKeys = this.lruKeys.filter(k => k !== key);

    // Add to end (most recently used)
    this.lruKeys.push(key);
  }

  private evictLRU(): void {
    if (this.lruKeys.length === 0) return;

    // Remove least recently used
    const keyToEvict = this.lruKeys.shift();
    if (keyToEvict) {
      this.memoryCache.delete(keyToEvict);
      logger.debug('Memory cache eviction', { key: keyToEvict });
    }
  }

  // ============================================================================
  // DISK CACHE OPERATIONS
  // ============================================================================

  private async getFromDisk<T>(key: string): Promise<CacheEntry<T> | null> {
    try {
      const diskKey = this.getDiskKey(key);
      const json = await AsyncStorage.getItem(diskKey);

      if (!json) {
        return null;
      }

      const entry: CacheEntry<T> = JSON.parse(json);

      // Check if expired
      if (Date.now() - entry.timestamp > entry.ttl) {
        await AsyncStorage.removeItem(diskKey);
        return null;
      }

      return entry;
    } catch (error) {
      logger.error('Disk cache read error', error as Error);
      return null;
    }
  }

  private async setOnDisk<T>(key: string, data: T, ttl: number): Promise<void> {
    try {
      const size = this.calculateSize(data);

      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl,
        size,
      };

      const diskKey = this.getDiskKey(key);
      await AsyncStorage.setItem(diskKey, JSON.stringify(entry));
    } catch (error) {
      logger.error('Disk cache write error', error as Error);
    }
  }

  private getDiskKey(key: string): string {
    return `${CACHE_CONFIG.CACHE_PREFIX}${key}`;
  }

  // ============================================================================
  // CLEANUP & MAINTENANCE
  // ============================================================================

  private startCleanupTimer(): void {
    // Clean up expired entries every 5 minutes
    setInterval(() => {
      this.cleanupExpired();
    }, 1000 * 60 * 5);
  }

  private async cleanupExpired(): Promise<void> {
    try {
      const startTime = Date.now();
      let cleaned = 0;

      // Cleanup memory cache
      for (const [key, entry] of this.memoryCache.entries()) {
        if (Date.now() - entry.timestamp > entry.ttl) {
          this.memoryCache.delete(key);
          this.lruKeys = this.lruKeys.filter(k => k !== key);
          cleaned++;
        }
      }

      // Cleanup disk cache
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(k => k.startsWith(CACHE_CONFIG.CACHE_PREFIX));

      for (const diskKey of cacheKeys) {
        const json = await AsyncStorage.getItem(diskKey);
        if (json) {
          const entry: CacheEntry<any> = JSON.parse(json);
          if (Date.now() - entry.timestamp > entry.ttl) {
            await AsyncStorage.removeItem(diskKey);
            cleaned++;
          }
        }
      }

      const duration = Date.now() - startTime;

      logger.info('Cache cleanup completed', { cleaned, duration });
      performanceMonitor.recordMetric('cache_cleanup_duration', duration, 'custom');
    } catch (error) {
      logger.error('Cache cleanup error', error as Error);
    }
  }

  // ============================================================================
  // UTILITIES
  // ============================================================================

  private calculateSize(data: any): number {
    try {
      return JSON.stringify(data).length;
    } catch {
      return 0;
    }
  }

  private recordCacheHit(layer: 'memory' | 'disk', duration: number): void {
    performanceMonitor.recordMetric(
      `cache_hit_${layer}`,
      duration,
      'custom',
      { layer }
    );
  }

  private recordCacheMiss(duration: number): void {
    performanceMonitor.recordMetric('cache_miss', duration, 'custom');
  }

  private resetStats(): void {
    this.stats = {
      memoryHits: 0,
      memoryMisses: 0,
      diskHits: 0,
      diskMisses: 0,
      totalSize: 0,
      itemCount: 0,
    };
  }
}

// Export singleton instance
export const cacheService = CacheService.getInstance();
export default cacheService;
