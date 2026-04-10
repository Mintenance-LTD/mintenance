// ============================================================================
// ADVANCED CACHING SYSTEM - CacheManager
// Multi-layer caching with smart invalidation and memory management
// ============================================================================

import { logger } from '../logger';
import { performanceMonitor } from '../performance';
import type {
  CacheConfig,
  CacheEntry,
  CacheStats,
  CacheStrategy,
} from './types';
import { calculateSize } from './types';
import { LRU_STRATEGY } from './strategies';
import {
  getDiskEntry,
  setDiskEntry,
  deleteDiskEntry,
  clearDiskCache,
  cleanupDiskCache,
} from './storage';

export class CacheManager {
  private memoryCache = new Map<string, CacheEntry>();
  private stats: CacheStats = {
    hitRate: 0,
    missRate: 0,
    totalRequests: 0,
    totalHits: 0,
    totalMisses: 0,
    memoryUsage: 0,
    diskUsage: 0,
    entryCount: 0,
    oldestEntry: Date.now(),
    newestEntry: Date.now(),
  };

  private readonly defaultConfig: Required<CacheConfig> = {
    ttl: 5 * 60 * 1000, // 5 minutes
    maxSize: 10 * 1024 * 1024, // 10MB
    priority: 'normal',
    compression: false,
    encryption: false,
    persistToDisk: true,
    invalidateOnMemoryWarning: true,
    tags: [],
  };

  private strategy: CacheStrategy = LRU_STRATEGY;
  private maxMemoryUsage = 50 * 1024 * 1024; // 50MB
  private cleanupInterval?: NodeJS.Timeout;
  private compressionWorker?: Worker;

  constructor() {
    this.startCleanupTimer();
    this.setupMemoryWarningListener();
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  async get<T>(key: string): Promise<T | null> {
    const startTime = performance.now();
    this.stats.totalRequests++;

    try {
      // Check memory cache first
      const memoryEntry = this.memoryCache.get(key);
      if (memoryEntry && this.isValid(memoryEntry)) {
        this.updateAccessStats(memoryEntry);
        this.stats.totalHits++;
        this.recordPerformance(
          'cache_hit_memory',
          performance.now() - startTime
        );
        return this.deserializeValue(memoryEntry.value);
      }

      // Check disk cache
      const diskEntry = await getDiskEntry<T>(key);
      if (diskEntry && this.isValid(diskEntry)) {
        // Promote to memory cache
        this.memoryCache.set(key, diskEntry);
        this.updateAccessStats(diskEntry);
        this.updateMemoryUsage();
        this.stats.totalHits++;
        this.recordPerformance('cache_hit_disk', performance.now() - startTime);
        return this.deserializeValue(diskEntry.value);
      }

      // Cache miss
      this.stats.totalMisses++;
      this.recordPerformance('cache_miss', performance.now() - startTime);
      return null;
    } catch (error) {
      logger.warn('Cache get error', { data: { key, error } });
      this.stats.totalMisses++;
      return null;
    } finally {
      this.updateHitRate();
    }
  }

  async set<T>(
    key: string,
    value: T,
    config?: Partial<CacheConfig>
  ): Promise<boolean> {
    const startTime = performance.now();
    const finalConfig = { ...this.defaultConfig, ...config };

    try {
      if (!this.strategy.shouldCache(key, value, finalConfig)) {
        return false;
      }

      const serializedValue = this.serializeValue(value);
      const size = calculateSize(serializedValue);
      const now = Date.now();

      const entry: CacheEntry = {
        key,
        value: serializedValue,
        timestamp: now,
        accessCount: 1,
        lastAccessed: now,
        ttl: finalConfig.ttl,
        size,
        priority: finalConfig.priority,
        tags: finalConfig.tags,
        compressed: finalConfig.compression,
        encrypted: finalConfig.encryption,
      };

      // Compress if needed
      if (finalConfig.compression) {
        entry.value = await this.compressValue(entry.value);
        entry.size = calculateSize(entry.value);
      }

      // Encrypt if needed
      if (finalConfig.encryption) {
        entry.value = await this.encryptValue(entry.value);
      }

      // Store in memory
      this.memoryCache.set(key, entry);

      // Store to disk if configured
      if (finalConfig.persistToDisk) {
        const diskSuccess = await setDiskEntry(entry);
        if (!diskSuccess) {
          // Remove from memory if disk storage failed and it's required
          this.memoryCache.delete(key);
          return false;
        }
      }

      // Update stats
      this.updateMemoryUsage();
      this.stats.entryCount = this.memoryCache.size;
      this.stats.newestEntry = now;

      // Check for cleanup
      await this.checkMemoryPressure();

      this.recordPerformance('cache_set', performance.now() - startTime);
      return true;
    } catch (error) {
      logger.warn('Cache set error', { data: { key, error } });
      return false;
    }
  }

  async invalidate(key: string): Promise<boolean> {
    try {
      const deleted = this.memoryCache.delete(key);
      await deleteDiskEntry(key);
      this.updateMemoryUsage();
      return deleted;
    } catch (error) {
      logger.warn('Cache invalidate error', { data: { key, error } });
      return false;
    }
  }

  async invalidateByTag(tag: string): Promise<number> {
    let count = 0;

    try {
      const keysToDelete = Array.from(this.memoryCache.entries())
        .filter(([, entry]) => entry.tags.includes(tag))
        .map(([key]) => key);

      for (const key of keysToDelete) {
        await this.invalidate(key);
        count++;
      }

      return count;
    } catch (error) {
      logger.warn('Cache invalidate by tag error', { data: { tag, error } });
      return count;
    }
  }

  async clear(): Promise<void> {
    try {
      this.memoryCache.clear();
      await clearDiskCache();
      this.resetStats();
    } catch (error) {
      logger.warn('Cache clear error', { data: error });
    }
  }

  // ============================================================================
  // ADVANCED FEATURES
  // ============================================================================

  setStrategy(strategy: CacheStrategy): void {
    this.strategy = strategy;
  }

  async warmup(
    keys: string[],
    fetcher: (key: string) => Promise<unknown>
  ): Promise<number> {
    let warmedCount = 0;

    for (const key of keys) {
      try {
        const existing = await this.get(key);
        if (!existing) {
          const value = await fetcher(key);
          const success = await this.set(key, value, { priority: 'high' });
          if (success) warmedCount++;
        }
      } catch (error) {
        logger.warn('Cache warmup error', { data: { key, error } });
      }
    }

    return warmedCount;
  }

  async prefetch(
    keys: string[],
    fetcher: (key: string) => Promise<unknown>
  ): Promise<number> {
    const prefetchPromises = keys.map(async (key) => {
      try {
        const existing = await this.get(key);
        if (!existing) {
          const value = await fetcher(key);
          return this.set(key, value, { priority: 'low', ttl: 10 * 60 * 1000 }); // 10 min TTL
        }
      } catch (error) {
        logger.warn('Cache prefetch error', { data: { key, error } });
        return false;
      }
    });

    const results = await Promise.all(prefetchPromises);
    return results.filter(Boolean).length;
  }

  async vacuum(): Promise<{ removed: number; freed: number }> {
    let removed = 0;
    let freed = 0;

    try {
      const entries = Array.from(this.memoryCache.entries());
      const stats = this.getStats();

      for (const [key, entry] of entries) {
        if (!this.isValid(entry) || this.strategy.shouldEvict(entry, stats)) {
          freed += entry.size;
          await this.invalidate(key);
          removed++;
        }
      }

      // Cleanup disk cache
      await cleanupDiskCache(this.isValid.bind(this));

      return { removed, freed };
    } catch (error) {
      logger.warn('Cache vacuum error', { data: error });
      return { removed, freed };
    }
  }

  getStats(): CacheStats {
    return { ...this.stats };
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private isValid(entry: CacheEntry): boolean {
    const now = Date.now();
    return now - entry.timestamp < entry.ttl;
  }

  private updateAccessStats(entry: CacheEntry): void {
    entry.accessCount++;
    entry.lastAccessed = Date.now();
  }

  private updateMemoryUsage(): void {
    this.stats.memoryUsage = Array.from(this.memoryCache.values()).reduce(
      (total, entry) => total + entry.size,
      0
    );
  }

  private updateHitRate(): void {
    this.stats.hitRate =
      this.stats.totalRequests > 0
        ? this.stats.totalHits / this.stats.totalRequests
        : 0;
    this.stats.missRate = 1 - this.stats.hitRate;
  }

  private async checkMemoryPressure(): Promise<void> {
    if (this.stats.memoryUsage > this.maxMemoryUsage) {
      const { removed, freed } = await this.vacuum();
      logger.info('Cache memory pressure cleanup', {
        data: { removed, freed: `${freed / 1024 / 1024}MB` },
      });
    }
  }

  private startCleanupTimer(): void {
    this.cleanupInterval = setInterval(async () => {
      await this.vacuum();
    }, 60000); // Every minute
  }

  private setupMemoryWarningListener(): void {
    // In a real React Native app, you'd listen to memory warnings
    // global.addEventListener?.('memorywarning', () => this.handleMemoryWarning());
  }

  private async handleMemoryWarning(): Promise<void> {
    logger.warn('Memory warning received, clearing cache');
    await this.clear();
  }

  private serializeValue<T>(value: T): unknown {
    try {
      return JSON.stringify(value);
    } catch {
      return value; // Return as-is if not serializable
    }
  }

  private deserializeValue<T>(value: unknown): T {
    try {
      return typeof value === 'string'
        ? (JSON.parse(value) as T)
        : (value as T);
    } catch {
      return value as T;
    }
  }

  private async compressValue(value: unknown): Promise<unknown> {
    // In a real implementation, you'd use a compression library
    return value; // Placeholder
  }

  private async encryptValue(value: unknown): Promise<unknown> {
    // In a real implementation, you'd use encryption
    return value; // Placeholder
  }

  private resetStats(): void {
    this.stats = {
      hitRate: 0,
      missRate: 0,
      totalRequests: 0,
      totalHits: 0,
      totalMisses: 0,
      memoryUsage: 0,
      diskUsage: 0,
      entryCount: 0,
      oldestEntry: Date.now(),
      newestEntry: Date.now(),
    };
  }

  private recordPerformance(operation: string, duration: number): void {
    performanceMonitor.recordMetric(`cache_${operation}`, duration, 'storage');
  }
}
