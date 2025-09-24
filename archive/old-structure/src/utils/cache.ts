// ============================================================================
// ADVANCED CACHING SYSTEM
// Multi-layer caching with smart invalidation and memory management
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from './logger';
import { performanceMonitor } from './performance';

// ============================================================================
// CACHE TYPES
// ============================================================================

export interface CacheConfig {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum cache size in bytes
  priority?: 'low' | 'normal' | 'high' | 'critical';
  compression?: boolean;
  encryption?: boolean;
  persistToDisk?: boolean;
  invalidateOnMemoryWarning?: boolean;
  tags?: string[]; // For bulk invalidation
}

export interface CacheEntry<T = any> {
  key: string;
  value: T;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
  ttl: number;
  size: number;
  priority: CacheConfig['priority'];
  tags: string[];
  compressed: boolean;
  encrypted: boolean;
}

export interface CacheStats {
  hitRate: number;
  missRate: number;
  totalRequests: number;
  totalHits: number;
  totalMisses: number;
  memoryUsage: number;
  diskUsage: number;
  entryCount: number;
  oldestEntry: number;
  newestEntry: number;
}

export interface CacheStrategy {
  name: string;
  shouldCache: (key: string, value: any, config?: CacheConfig) => boolean;
  shouldEvict: (entry: CacheEntry, stats: CacheStats) => boolean;
  getPriority: (entry: CacheEntry) => number;
}

// ============================================================================
// CACHE STRATEGIES
// ============================================================================

const LRU_STRATEGY: CacheStrategy = {
  name: 'LRU',
  shouldCache: () => true,
  shouldEvict: (entry, stats) => {
    const age = Date.now() - entry.lastAccessed;
    const avgAge = stats.totalRequests > 0 ? Date.now() - stats.oldestEntry : 0;
    return age > avgAge * 1.5; // Evict if 50% older than average
  },
  getPriority: (entry) => entry.lastAccessed,
};

const LFU_STRATEGY: CacheStrategy = {
  name: 'LFU',
  shouldCache: () => true,
  shouldEvict: (entry, stats) => {
    return entry.accessCount < 2; // Evict if accessed less than 2 times
  },
  getPriority: (entry) => entry.accessCount,
};

const SIZE_AWARE_STRATEGY: CacheStrategy = {
  name: 'SIZE_AWARE',
  shouldCache: (key, value, config) => {
    const size = calculateSize(value);
    return size < (config?.maxSize || 1024 * 1024); // 1MB default
  },
  shouldEvict: (entry, stats) => {
    const sizePressure = stats.memoryUsage / (100 * 1024 * 1024); // Relative to 100MB
    return entry.size > 1024 * 10 && sizePressure > 0.8; // Large entries when memory pressure
  },
  getPriority: (entry) => -entry.size, // Negative for descending order
};

// ============================================================================
// CACHE MANAGER
// ============================================================================

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
        this.recordPerformance('cache_hit_memory', performance.now() - startTime);
        return this.deserializeValue(memoryEntry.value);
      }

      // Check disk cache
      const diskEntry = await this.getDiskEntry<T>(key);
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

  async set<T>(key: string, value: T, config?: Partial<CacheConfig>): Promise<boolean> {
    const startTime = performance.now();
    const finalConfig = { ...this.defaultConfig, ...config };

    try {
      if (!this.strategy.shouldCache(key, value, finalConfig)) {
        return false;
      }

      const serializedValue = this.serializeValue(value);
      const size = calculateSize(serializedValue);
      const now = Date.now();

      const entry: CacheEntry<T> = {
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
        const diskSuccess = await this.setDiskEntry(entry);
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
      await this.deleteDiskEntry(key);
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
      await this.clearDiskCache();
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

  async warmup(keys: string[], fetcher: (key: string) => Promise<any>): Promise<number> {
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

  async prefetch(keys: string[], fetcher: (key: string) => Promise<any>): Promise<number> {
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
      await this.cleanupDiskCache();

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
    return (now - entry.timestamp) < entry.ttl;
  }

  private updateAccessStats(entry: CacheEntry): void {
    entry.accessCount++;
    entry.lastAccessed = Date.now();
  }

  private updateMemoryUsage(): void {
    this.stats.memoryUsage = Array.from(this.memoryCache.values())
      .reduce((total, entry) => total + entry.size, 0);
  }

  private updateHitRate(): void {
    this.stats.hitRate = this.stats.totalRequests > 0
      ? this.stats.totalHits / this.stats.totalRequests
      : 0;
    this.stats.missRate = 1 - this.stats.hitRate;
  }

  private async checkMemoryPressure(): Promise<void> {
    if (this.stats.memoryUsage > this.maxMemoryUsage) {
      const { removed, freed } = await this.vacuum();
      logger.info('Cache memory pressure cleanup', {
        data: { removed, freed: `${freed / 1024 / 1024}MB` }
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

  private serializeValue<T>(value: T): any {
    try {
      return JSON.stringify(value);
    } catch {
      return value; // Return as-is if not serializable
    }
  }

  private deserializeValue<T>(value: any): T {
    try {
      return typeof value === 'string' ? JSON.parse(value) : value;
    } catch {
      return value;
    }
  }

  private async compressValue(value: any): Promise<any> {
    // In a real implementation, you'd use a compression library
    return value; // Placeholder
  }

  private async encryptValue(value: any): Promise<any> {
    // In a real implementation, you'd use encryption
    return value; // Placeholder
  }

  private async getDiskEntry<T>(key: string): Promise<CacheEntry<T> | null> {
    try {
      const stored = await AsyncStorage.getItem(`cache_${key}`);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  private async setDiskEntry(entry: CacheEntry): Promise<boolean> {
    try {
      await AsyncStorage.setItem(`cache_${entry.key}`, JSON.stringify(entry));
      return true;
    } catch (error) {
      logger.warn('Disk cache set error', { data: { key: entry.key, error } });
      return false;
    }
  }

  private async deleteDiskEntry(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(`cache_${key}`);
    } catch (error) {
      logger.warn('Disk cache delete error', { data: { key, error } });
    }
  }

  private async clearDiskCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith('cache_'));
      await AsyncStorage.multiRemove(cacheKeys);
    } catch (error) {
      logger.warn('Disk cache clear error', { data: error });
    }
  }

  private async cleanupDiskCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith('cache_'));

      for (const key of cacheKeys) {
        const entry = await this.getDiskEntry(key.replace('cache_', ''));
        if (entry && !this.isValid(entry)) {
          await AsyncStorage.removeItem(key);
        }
      }
    } catch (error) {
      logger.warn('Disk cache cleanup error', { data: error });
    }
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

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function calculateSize(value: any): number {
  if (typeof value === 'string') {
    return value.length * 2; // Rough estimate for UTF-16
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value).length * 2;
    } catch {
      return 1024; // Default estimate
    }
  }
  return 8; // Primitive types rough estimate
}

// ============================================================================
// CACHE INSTANCES
// ============================================================================

// Global cache instance
export const globalCache = new CacheManager();

// Specialized cache instances
export const apiCache = new CacheManager();
apiCache.setStrategy(SIZE_AWARE_STRATEGY);

export const imageCache = new CacheManager();
imageCache.setStrategy({
  ...LRU_STRATEGY,
  shouldCache: (key, value, config) => {
    const size = calculateSize(value);
    return size < 5 * 1024 * 1024; // 5MB limit for images
  },
});

export const userDataCache = new CacheManager();
userDataCache.setStrategy({
  ...LFU_STRATEGY,
  shouldCache: () => true,
  shouldEvict: (entry) => entry.accessCount < 5, // Keep frequently accessed user data
});

// ============================================================================
// REACT HOOKS
// ============================================================================

export const useCache = (cacheInstance = globalCache) => {
  return {
    get: cacheInstance.get.bind(cacheInstance),
    set: cacheInstance.set.bind(cacheInstance),
    invalidate: cacheInstance.invalidate.bind(cacheInstance),
    invalidateByTag: cacheInstance.invalidateByTag.bind(cacheInstance),
    clear: cacheInstance.clear.bind(cacheInstance),
    getStats: cacheInstance.getStats.bind(cacheInstance),
    warmup: cacheInstance.warmup.bind(cacheInstance),
    prefetch: cacheInstance.prefetch.bind(cacheInstance),
  };
};

export default globalCache;