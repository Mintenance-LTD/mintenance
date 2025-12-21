/**
 * AI Response Cache Service
 *
 * Comprehensive caching layer for all AI API responses:
 * - OpenAI GPT-4 Vision (damage assessment)
 * - OpenAI Embeddings
 * - Google Vision API
 * - Building Surveyor assessments
 *
 * COST SAVINGS TARGET: 60-80% reduction in AI API calls
 * ESTIMATED SAVINGS: $500-1000/month
 *
 * Features:
 * - LRU cache with automatic eviction
 * - Content-based cache keys (hash of inputs)
 * - Configurable TTL per service
 * - Cache statistics and metrics
 * - Optional Redis persistence for shared cache
 */

import { LRUCache } from 'lru-cache';
import * as crypto from 'crypto';
import { logger } from '@mintenance/shared';
import { Redis } from '@upstash/redis';

// Cache service types
export type AICacheServiceType =
  | 'gpt4-vision'
  | 'gpt4-chat'
  | 'embeddings'
  | 'google-vision'
  | 'building-surveyor'
  | 'maintenance-assessment';

// Cache configuration per service
interface ServiceCacheConfig {
  ttl: number; // milliseconds
  maxSize: number; // max entries
  useRedis: boolean; // whether to use Redis for persistence
}

const SERVICE_CONFIGS: Record<AICacheServiceType, ServiceCacheConfig> = {
  'gpt4-vision': {
    ttl: 24 * 60 * 60 * 1000, // 24 hours (images rarely change)
    maxSize: 500,
    useRedis: true,
  },
  'gpt4-chat': {
    ttl: 60 * 60 * 1000, // 1 hour (text responses)
    maxSize: 1000,
    useRedis: false,
  },
  'embeddings': {
    ttl: 7 * 24 * 60 * 60 * 1000, // 7 days (embeddings never change)
    maxSize: 2000,
    useRedis: true,
  },
  'google-vision': {
    ttl: 48 * 60 * 60 * 1000, // 48 hours (image analysis)
    maxSize: 500,
    useRedis: true,
  },
  'building-surveyor': {
    ttl: 7 * 24 * 60 * 60 * 1000, // 7 days (comprehensive assessments)
    maxSize: 500,
    useRedis: true,
  },
  'maintenance-assessment': {
    ttl: 24 * 60 * 60 * 1000, // 24 hours (damage assessments)
    maxSize: 500,
    useRedis: true,
  },
};

// Cost per API call (for savings calculation)
const API_COSTS: Record<AICacheServiceType, number> = {
  'gpt4-vision': 0.01275, // Per image with GPT-4 Vision
  'gpt4-chat': 0.002, // Per 1K tokens average
  'embeddings': 0.00001, // Per 1K tokens (text-embedding-3-small)
  'google-vision': 0.0015, // Per image
  'building-surveyor': 0.01275, // Same as GPT-4 Vision
  'maintenance-assessment': 0.01275, // Same as GPT-4 Vision
};

interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  hitCount: number;
  savedCost: number;
  ttl: number;
}

interface CacheStats {
  service: AICacheServiceType;
  hits: number;
  misses: number;
  hitRate: number;
  totalSavedCost: number;
  cacheSize: number;
  avgHitTime: number;
  avgMissTime: number;
}

/**
 * Unified AI Response Cache Service
 */
export class AIResponseCache {
  private static caches: Map<AICacheServiceType, LRUCache<string, CacheEntry>> = new Map();
  private static redis: Redis | null = null;
  private static stats: Map<AICacheServiceType, CacheStats> = new Map();

  /**
   * Initialize cache for a service type
   */
  private static getCache(service: AICacheServiceType): LRUCache<string, CacheEntry> {
    if (!this.caches.has(service)) {
      const config = SERVICE_CONFIGS[service];
      const cache = new LRUCache<string, CacheEntry>({
        max: config.maxSize,
        ttl: config.ttl,
        updateAgeOnGet: true,
        updateAgeOnHas: false,
        allowStale: false,
      });
      this.caches.set(service, cache);
    }
    return this.caches.get(service)!;
  }

  /**
   * Initialize Redis connection for persistent caching
   */
  private static async initRedis(): Promise<void> {
    if (this.redis) return;

    try {
      const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
      const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

      if (!redisUrl || !redisToken) {
        logger.debug('Redis not configured, using in-memory cache only', {
          service: 'AIResponseCache',
        });
        return;
      }

      this.redis = new Redis({
        url: redisUrl,
        token: redisToken,
      });

      await this.redis.ping();
      logger.info('AI response cache Redis initialized', {
        service: 'AIResponseCache',
      });
    } catch (error) {
      logger.error('Failed to initialize Redis for AI cache', error);
      this.redis = null;
    }
  }

  /**
   * Generate cache key from inputs
   */
  private static generateCacheKey(
    service: AICacheServiceType,
    input: any
  ): string {
    // Normalize input for consistent hashing
    const normalized = typeof input === 'string'
      ? input
      : JSON.stringify(input, Object.keys(input).sort());

    // Create SHA-256 hash
    const hash = crypto
      .createHash('sha256')
      .update(normalized)
      .digest('hex')
      .substring(0, 32);

    return `ai-cache:${service}:${hash}`;
  }

  /**
   * Get cached response or execute fetch function
   */
  static async get<T>(
    service: AICacheServiceType,
    input: any,
    fetchFn: () => Promise<T>,
    options: {
      forceRefresh?: boolean;
      skipCache?: boolean;
    } = {}
  ): Promise<T> {
    const { forceRefresh = false, skipCache = false } = options;

    // Skip cache entirely if requested
    if (skipCache) {
      const result = await fetchFn();
      return result;
    }

    const startTime = Date.now();
    const cacheKey = this.generateCacheKey(service, input);
    const cache = this.getCache(service);
    const config = SERVICE_CONFIGS[service];

    // Try in-memory cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = cache.get(cacheKey);
      if (cached) {
        const duration = Date.now() - startTime;
        this.recordCacheHit(service, duration, cached.savedCost);

        // Update hit count and saved cost
        cached.hitCount++;
        cached.savedCost += API_COSTS[service];
        cache.set(cacheKey, cached);

        logger.debug('AI cache hit (in-memory)', {
          service,
          hitCount: cached.hitCount,
          savedCost: cached.savedCost,
          durationMs: duration,
        });

        return cached.data as T;
      }

      // Try Redis if configured for this service
      if (config.useRedis) {
        await this.initRedis();
        if (this.redis) {
          try {
            const redisData = await this.redis.get<CacheEntry<T>>(cacheKey);
            if (redisData) {
              const duration = Date.now() - startTime;

              // Restore to in-memory cache
              cache.set(cacheKey, redisData);

              // Update stats
              redisData.hitCount++;
              redisData.savedCost += API_COSTS[service];
              this.recordCacheHit(service, duration, redisData.savedCost);

              // Update Redis
              await this.redis.setex(
                cacheKey,
                Math.floor(config.ttl / 1000),
                redisData
              );

              logger.debug('AI cache hit (Redis)', {
                service,
                hitCount: redisData.hitCount,
                savedCost: redisData.savedCost,
                durationMs: duration,
              });

              return redisData.data;
            }
          } catch (error) {
            logger.warn('Redis cache lookup failed, continuing without cache', {
              service: 'AIResponseCache',
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }
      }
    }

    // Cache miss - fetch data
    const fetchStartTime = Date.now();
    const data = await fetchFn();
    const fetchDuration = Date.now() - fetchStartTime;

    this.recordCacheMiss(service, fetchDuration);

    // Store in cache
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      hitCount: 0,
      savedCost: 0,
      ttl: config.ttl,
    };

    // Store in memory
    cache.set(cacheKey, entry);

    // Store in Redis if configured
    if (config.useRedis) {
      await this.initRedis();
      if (this.redis) {
        try {
          await this.redis.setex(
            cacheKey,
            Math.floor(config.ttl / 1000),
            entry
          );
        } catch (error) {
          logger.warn('Failed to store in Redis cache', {
            service: 'AIResponseCache',
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    }

    logger.debug('AI cache miss', {
      service,
      fetchDurationMs: fetchDuration,
    });

    return data;
  }

  /**
   * Invalidate cache for specific input
   */
  static async invalidate(
    service: AICacheServiceType,
    input: any
  ): Promise<void> {
    const cacheKey = this.generateCacheKey(service, input);
    const cache = this.getCache(service);

    // Remove from in-memory cache
    cache.delete(cacheKey);

    // Remove from Redis
    const config = SERVICE_CONFIGS[service];
    if (config.useRedis && this.redis) {
      try {
        await this.redis.del(cacheKey);
      } catch (error) {
        logger.warn('Failed to delete from Redis cache', {
          service: 'AIResponseCache',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    logger.info('AI cache invalidated', {
      service,
      cacheKey,
    });
  }

  /**
   * Clear all cache for a service
   */
  static async clearService(service: AICacheServiceType): Promise<void> {
    const cache = this.getCache(service);
    cache.clear();

    // Clear from Redis
    const config = SERVICE_CONFIGS[service];
    if (config.useRedis && this.redis) {
      try {
        const pattern = `ai-cache:${service}:*`;
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
        logger.info('AI cache cleared (Redis)', {
          service,
          keysDeleted: keys.length,
        });
      } catch (error) {
        logger.warn('Failed to clear Redis cache', {
          service: 'AIResponseCache',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    logger.info('AI cache cleared', { service });
  }

  /**
   * Clear all caches
   */
  static async clearAll(): Promise<void> {
    for (const service of Object.keys(SERVICE_CONFIGS) as AICacheServiceType[]) {
      await this.clearService(service);
    }
  }

  /**
   * Get cache statistics
   */
  static getStats(service?: AICacheServiceType): CacheStats | Map<AICacheServiceType, CacheStats> {
    if (service) {
      return this.stats.get(service) || this.initStats(service);
    }
    return new Map(this.stats);
  }

  /**
   * Get aggregated statistics across all services
   */
  static getAggregatedStats(): {
    totalHits: number;
    totalMisses: number;
    overallHitRate: number;
    totalSavedCost: number;
    totalCacheSize: number;
    projectedMonthlySavings: number;
  } {
    let totalHits = 0;
    let totalMisses = 0;
    let totalSavedCost = 0;
    let totalCacheSize = 0;

    this.stats.forEach((stats, service) => {
      totalHits += stats.hits;
      totalMisses += stats.misses;
      totalSavedCost += stats.totalSavedCost;
      totalCacheSize += stats.cacheSize;
    });

    const total = totalHits + totalMisses;
    const overallHitRate = total > 0 ? totalHits / total : 0;

    // Project monthly savings based on current usage
    // Assume current stats represent 1 day of usage
    const projectedMonthlySavings = totalSavedCost * 30;

    return {
      totalHits,
      totalMisses,
      overallHitRate,
      totalSavedCost,
      totalCacheSize,
      projectedMonthlySavings,
    };
  }

  /**
   * Record cache hit
   */
  private static recordCacheHit(
    service: AICacheServiceType,
    duration: number,
    savedCost: number
  ): void {
    const stats = this.stats.get(service) || this.initStats(service);
    stats.hits++;
    stats.hitRate = stats.hits / (stats.hits + stats.misses);
    stats.totalSavedCost += savedCost;
    stats.avgHitTime = (stats.avgHitTime * (stats.hits - 1) + duration) / stats.hits;
    stats.cacheSize = this.getCache(service).size;
    this.stats.set(service, stats);
  }

  /**
   * Record cache miss
   */
  private static recordCacheMiss(
    service: AICacheServiceType,
    duration: number
  ): void {
    const stats = this.stats.get(service) || this.initStats(service);
    stats.misses++;
    stats.hitRate = stats.hits / (stats.hits + stats.misses);
    stats.avgMissTime = (stats.avgMissTime * (stats.misses - 1) + duration) / stats.misses;
    stats.cacheSize = this.getCache(service).size;
    this.stats.set(service, stats);
  }

  /**
   * Initialize stats for a service
   */
  private static initStats(service: AICacheServiceType): CacheStats {
    return {
      service,
      hits: 0,
      misses: 0,
      hitRate: 0,
      totalSavedCost: 0,
      cacheSize: 0,
      avgHitTime: 0,
      avgMissTime: 0,
    };
  }

  /**
   * Export cache statistics for monitoring
   */
  static exportMetrics(): Record<string, any> {
    const aggregated = this.getAggregatedStats();
    const perService: Record<string, CacheStats> = {};

    this.stats.forEach((stats, service) => {
      perService[service] = stats;
    });

    return {
      timestamp: new Date().toISOString(),
      aggregated,
      perService,
      configs: SERVICE_CONFIGS,
      costs: API_COSTS,
    };
  }
}
