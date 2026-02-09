import { LRUCache } from 'lru-cache';
import { Redis } from '@upstash/redis';
import { logger } from '@mintenance/shared';
interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  invalidateOn?: string[]; // Events that should invalidate this cache
  useRedis?: boolean; // Whether to use Redis for persistence
}
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}
/**
 * Database Query Cache Service
 * Reduces database load by caching frequently accessed queries
 * Uses LRU in-memory cache with optional Redis persistence
 */
export class DatabaseQueryCache {
  private static instance: DatabaseQueryCache;
  // In-memory LRU cache
  private memoryCache: LRUCache<string, CacheEntry<unknown>>;
  // Redis client for distributed cache
  private redis: Redis | null = null;
  // Cache statistics
  private stats = {
    hits: 0,
    misses: 0,
    errors: 0,
    evictions: 0,
  };
  // Default TTL values for different data types (in milliseconds)
  private static readonly DEFAULT_TTL = {
    STATIC: 15 * 60 * 1000,      // 15 minutes (contractor profiles, skills)
    SEMI_STATIC: 5 * 60 * 1000,  // 5 minutes (job listings, user profiles)
    DYNAMIC: 60 * 1000,          // 1 minute (dashboards, analytics)
    LONG: 60 * 60 * 1000,        // 1 hour (completed jobs, reviews)
  };
  private constructor() {
    // Initialize LRU cache with 500MB limit
    this.memoryCache = new LRUCache<string, CacheEntry<unknown>>({
      max: 500, // Maximum number of items
      maxSize: 50 * 1024 * 1024, // 50MB max size
      sizeCalculation: (value) => {
        // Estimate size of cached data
        return JSON.stringify(value).length;
      },
      ttl: 5 * 60 * 1000, // Default 5 minutes
      updateAgeOnGet: false,
      updateAgeOnHas: false,
      dispose: (value, key, reason) => {
        if (reason === 'evict') {
          this.stats.evictions++;
        }
      },
    });
    // Initialize Redis if credentials are available
    this.initializeRedis();
  }
  private initializeRedis(): void {
    try {
      const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
      const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
      if (redisUrl && redisToken) {
        this.redis = new Redis({
          url: redisUrl,
          token: redisToken,
        });
        logger.info('DatabaseQueryCache: Redis initialized');
      } else {
        logger.info('DatabaseQueryCache: Running with in-memory cache only');
      }
    } catch (error) {
      logger.error('DatabaseQueryCache: Redis initialization failed', error);
      this.redis = null;
    }
  }
  public static getInstance(): DatabaseQueryCache {
    if (!DatabaseQueryCache.instance) {
      DatabaseQueryCache.instance = new DatabaseQueryCache();
    }
    return DatabaseQueryCache.instance;
  }
  /**
   * Generate cache key from query parameters
   */
  private generateKey(namespace: string, params?: unknown): string {
    const sortedParams = params ? JSON.stringify(this.sortObject(params)) : '';
    return `db:${namespace}:${sortedParams}`;
  }
  /**
   * Sort object keys for consistent cache key generation
   */
  private sortObject(obj: unknown): unknown {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(item => this.sortObject(item));
    const record = obj as Record<string, unknown>;
    return Object.keys(record)
      .sort()
      .reduce((sorted: Record<string, unknown>, key) => {
        sorted[key] = this.sortObject(record[key]);
        return sorted;
      }, {});
  }
  /**
   * Get data from cache or fetch from database
   */
  public async get<T>(
    key: string,
    fetchFn: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const cacheKey = this.generateKey(key, options);
    const ttl = options.ttl ?? DatabaseQueryCache.DEFAULT_TTL.SEMI_STATIC;
    try {
      // Check memory cache first
      const memoryResult = this.memoryCache.get(cacheKey);
      if (memoryResult && Date.now() - memoryResult.timestamp < memoryResult.ttl) {
        this.stats.hits++;
        return memoryResult.data as T;
      }
      // Check Redis if enabled
      if (options.useRedis && this.redis) {
        try {
          const redisResult = await this.redis.get(cacheKey);
          if (redisResult) {
            const entry = JSON.parse(redisResult as string) as CacheEntry<T>;
            if (Date.now() - entry.timestamp < entry.ttl) {
              // Update memory cache
              this.memoryCache.set(cacheKey, entry);
              this.stats.hits++;
              return entry.data;
            }
          }
        } catch (redisError) {
          logger.warn('DatabaseQueryCache: Redis get failed', { key: cacheKey, error: redisError });
        }
      }
      // Cache miss - fetch from database
      this.stats.misses++;
      const data = await fetchFn();
      // Store in cache
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl,
      };
      // Update memory cache
      this.memoryCache.set(cacheKey, entry);
      // Update Redis if enabled
      if (options.useRedis && this.redis) {
        try {
          await this.redis.set(
            cacheKey,
            JSON.stringify(entry),
            { ex: Math.floor(ttl / 1000) }
          );
        } catch (redisError) {
          logger.warn('DatabaseQueryCache: Redis set failed', { key: cacheKey, error: redisError });
        }
      }
      return data;
    } catch (error) {
      this.stats.errors++;
      logger.error('DatabaseQueryCache: Error in get operation', { key, error });
      // Fallback to direct fetch on error
      return await fetchFn();
    }
  }
  /**
   * Invalidate specific cache entries
   */
  public async invalidate(patterns: string[]): Promise<void> {
    for (const pattern of patterns) {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      // Clear from memory cache
      for (const key of this.memoryCache.keys()) {
        if (regex.test(key)) {
          this.memoryCache.delete(key);
        }
      }
      // Clear from Redis if enabled
      if (this.redis) {
        try {
          // Note: This is a simplified implementation
          // For production, consider using Redis SCAN command
          await this.redis.eval(
            `
            local keys = redis.call('keys', ARGV[1])
            for i=1,#keys do
              redis.call('del', keys[i])
            end
            return #keys
            `,
            [],
            [`db:${pattern}*`]
          );
        } catch (redisError) {
          logger.warn('DatabaseQueryCache: Redis invalidation failed', { pattern, error: redisError });
        }
      }
    }
  }
  /**
   * Clear all cache entries
   */
  public async clear(): Promise<void> {
    this.memoryCache.clear();
    if (this.redis) {
      try {
        // Use Redis Lua script to clear all database cache keys
        await (this.redis as unknown as { eval: (script: string, keys: string[], args: string[]) => Promise<unknown> }).eval(
          `
          local keys = redis.call('keys', 'db:*')
          for i=1,#keys do
            redis.call('del', keys[i])
          end
          return #keys
          `,
          [],
          []
        );
      } catch (redisError) {
        logger.warn('DatabaseQueryCache: Redis clear failed', { error: redisError });
      }
    }
  }
  /**
   * Get cache statistics
   */
  public getStats() {
    const hitRate = this.stats.hits / (this.stats.hits + this.stats.misses) || 0;
    return {
      ...this.stats,
      hitRate: Math.round(hitRate * 100),
      memoryCacheSize: this.memoryCache.size,
      memoryCacheCalculatedSize: this.memoryCache.calculatedSize,
    };
  }
  /**
   * Cache presets for common query types
   */
  public static readonly CachePresets = {
    // Contractor profiles - cache for 15 minutes
    contractorProfile: (contractorId: string) => ({
      key: `contractor:${contractorId}`,
      ttl: DatabaseQueryCache.DEFAULT_TTL.STATIC,
      useRedis: true,
    }),
    // Featured contractors - cache for 10 minutes
    featuredContractors: () => ({
      key: 'featured-contractors',
      ttl: 10 * 60 * 1000,
      useRedis: true,
    }),
    // Job listing - cache for 5 minutes
    jobListing: (jobId: string) => ({
      key: `job:${jobId}`,
      ttl: DatabaseQueryCache.DEFAULT_TTL.SEMI_STATIC,
      useRedis: true,
    }),
    // Job search results - cache for 2 minutes
    jobSearch: (params: Record<string, unknown>) => ({
      key: `job-search:${JSON.stringify(params)}`,
      ttl: 2 * 60 * 1000,
      useRedis: false, // Don't persist search results
    }),
    // User profile - cache for 5 minutes
    userProfile: (userId: string) => ({
      key: `user:${userId}`,
      ttl: DatabaseQueryCache.DEFAULT_TTL.SEMI_STATIC,
      useRedis: true,
    }),
    // Dashboard analytics - cache for 1 minute
    dashboardAnalytics: (userId: string, type: string) => ({
      key: `dashboard:${userId}:${type}`,
      ttl: DatabaseQueryCache.DEFAULT_TTL.DYNAMIC,
      useRedis: false,
    }),
    // Payment history - cache for 1 hour (immutable data)
    paymentHistory: (userId: string) => ({
      key: `payments:${userId}`,
      ttl: DatabaseQueryCache.DEFAULT_TTL.LONG,
      useRedis: true,
    }),
    // Reviews - cache for 30 minutes
    reviews: (targetId: string, type: string) => ({
      key: `reviews:${type}:${targetId}`,
      ttl: 30 * 60 * 1000,
      useRedis: true,
    }),
    // Platform statistics - cache for 30 minutes
    platformStats: () => ({
      key: 'platform-stats',
      ttl: 30 * 60 * 1000,
      useRedis: true,
    }),
  };
}
// Export singleton instance
export const queryCache = DatabaseQueryCache.getInstance();