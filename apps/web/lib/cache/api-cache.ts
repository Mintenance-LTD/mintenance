/**
 * API Response Caching with Redis
 * Implements intelligent caching for expensive database queries
 *
 * Part of SECURITY_REMEDIATION_PLAN Action #5
 *
 * Features:
 * - Automatic cache invalidation
 * - Pattern-based cache clearing
 * - TTL-based expiration
 * - Cache hit/miss metrics
 * - Graceful fallback if Redis unavailable
 */

import { Redis } from '@upstash/redis';
import { logger } from '@mintenance/shared';

// Initialize Redis client — only if credentials are available
function createRedisClient(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    logger.warn('Redis not configured for API cache — caching disabled', {
      service: 'api-cache',
    });
    return null;
  }
  return new Redis({ url, token });
}

const redis = createRedisClient();

// Cache TTL configurations (in seconds)
export const CACHE_TTL = {
  SHORT: 30, // 30 seconds - frequently changing data
  MEDIUM: 300, // 5 minutes - moderately stable data
  LONG: 3600, // 1 hour - stable data
  VERY_LONG: 86400, // 24 hours - rarely changing data
} as const;

// Cache key prefixes for organization
export const CACHE_KEYS = {
  JOB: 'job',
  JOBS_LIST: 'jobs:list',
  CONTRACTOR: 'contractor',
  CONTRACTORS_LIST: 'contractors:list',
  ASSESSMENT: 'assessment',
  USER: 'user',
  SEARCH: 'search',
} as const;

/**
 * Generate cache key with prefix
 */
function generateCacheKey(prefix: string, identifier: string | number): string {
  return `cache:${prefix}:${identifier}`;
}

/**
 * Get cached data or fetch and cache if not present
 */
export async function getCached<T>(
  key: string,
  ttl: number,
  fetchFn: () => Promise<T>,
  options: {
    forceRefresh?: boolean;
    logMetrics?: boolean;
  } = {}
): Promise<T> {
  const { forceRefresh = false, logMetrics = true } = options;

  try {
    // Skip cache if Redis not available or force refresh requested
    if (!forceRefresh && redis) {
      const cached = await redis.get(key);

      if (cached !== null) {
        if (logMetrics) {
          logger.info('Cache hit', {
            service: 'api-cache',
            key,
            ttl,
          });
        }

        return (typeof cached === 'string' ? JSON.parse(cached) : cached) as T;
      }
    }

    // Cache miss - fetch data
    if (logMetrics) {
      logger.info('Cache miss', {
        service: 'api-cache',
        key,
        ttl,
        forceRefresh,
      });
    }

    const data = await fetchFn();

    // Store in cache (skip if Redis not available)
    if (redis) {
      await redis.setex(key, ttl, JSON.stringify(data));
    }

    return data;
  } catch (error) {
    // If Redis fails, fallback to direct fetch
    logger.error('Cache operation failed, falling back to direct fetch', error, {
      service: 'api-cache',
      key,
    });

    return fetchFn();
  }
}

/**
 * Set cached data explicitly
 */
export async function setCache<T>(
  key: string,
  data: T,
  ttl: number
): Promise<void> {
  if (!redis) return;
  try {
    await redis.setex(key, ttl, JSON.stringify(data));

    logger.debug('Cache set', {
      service: 'api-cache',
      key,
      ttl,
    });
  } catch (error) {
    logger.error('Failed to set cache', error, {
      service: 'api-cache',
      key,
    });
  }
}

/**
 * Delete specific cache entry
 */
export async function deleteCache(key: string): Promise<void> {
  if (!redis) return;
  try {
    await redis.del(key);

    logger.debug('Cache deleted', {
      service: 'api-cache',
      key,
    });
  } catch (error) {
    logger.error('Failed to delete cache', error, {
      service: 'api-cache',
      key,
    });
  }
}

/**
 * Delete multiple cache entries by pattern
 * Note: Scan is expensive, use sparingly
 */
export async function deleteCachePattern(pattern: string): Promise<number> {
  if (!redis) return 0;
  try {
    let cursor = 0;
    let deleted = 0;
    const keys: string[] = [];

    // Scan for matching keys
    do {
      const result = await redis.scan(cursor, {
        match: pattern,
        count: 100,
      });

      cursor = Number(result[0]);
      keys.push(...result[1]);
    } while (cursor !== 0);

    // Delete all matching keys
    if (keys.length > 0) {
      deleted = await redis.del(...keys);
    }

    logger.info('Cache pattern deleted', {
      service: 'api-cache',
      pattern,
      keysDeleted: deleted,
    });

    return deleted;
  } catch (error) {
    logger.error('Failed to delete cache pattern', error, {
      service: 'api-cache',
      pattern,
    });
    return 0;
  }
}

/**
 * Clear all caches (use with extreme caution)
 */
export async function clearAllCache(): Promise<void> {
  if (!redis) return;
  try {
    await redis.flushdb();

    logger.warn('All cache cleared', {
      service: 'api-cache',
    });
  } catch (error) {
    logger.error('Failed to clear all cache', error, {
      service: 'api-cache',
    });
  }
}

// ============================================
// Domain-Specific Cache Functions
// ============================================

/**
 * Cache job data
 */
export async function getCachedJob<T>(
  jobId: string,
  fetchFn: () => Promise<T>
): Promise<T> {
  const key = generateCacheKey(CACHE_KEYS.JOB, jobId);
  return getCached(key, CACHE_TTL.MEDIUM, fetchFn);
}

/**
 * Invalidate job cache
 */
export async function invalidateJobCache(jobId: string): Promise<void> {
  const key = generateCacheKey(CACHE_KEYS.JOB, jobId);
  await deleteCache(key);

  // Also invalidate job lists
  await deleteCachePattern(`cache:${CACHE_KEYS.JOBS_LIST}:*`);
}

/**
 * Cache jobs list
 */
export async function getCachedJobsList<T>(
  listKey: string,
  fetchFn: () => Promise<T>
): Promise<T> {
  const key = generateCacheKey(CACHE_KEYS.JOBS_LIST, listKey);
  return getCached(key, CACHE_TTL.MEDIUM, fetchFn);
}

/**
 * Cache contractor data
 */
export async function getCachedContractor<T>(
  contractorId: string,
  fetchFn: () => Promise<T>
): Promise<T> {
  const key = generateCacheKey(CACHE_KEYS.CONTRACTOR, contractorId);
  return getCached(key, CACHE_TTL.LONG, fetchFn);
}

/**
 * Invalidate contractor cache
 */
export async function invalidateContractorCache(contractorId: string): Promise<void> {
  const key = generateCacheKey(CACHE_KEYS.CONTRACTOR, contractorId);
  await deleteCache(key);

  // Also invalidate contractor lists
  await deleteCachePattern(`cache:${CACHE_KEYS.CONTRACTORS_LIST}:*`);
}

/**
 * Cache contractors list (public endpoint - longer TTL)
 */
export async function getCachedContractorsList<T>(
  listKey: string,
  fetchFn: () => Promise<T>
): Promise<T> {
  const key = generateCacheKey(CACHE_KEYS.CONTRACTORS_LIST, listKey);
  return getCached(key, CACHE_TTL.LONG, fetchFn);
}

/**
 * Cache assessment data
 */
export async function getCachedAssessment<T>(
  assessmentId: string,
  fetchFn: () => Promise<T>
): Promise<T> {
  const key = generateCacheKey(CACHE_KEYS.ASSESSMENT, assessmentId);
  return getCached(key, CACHE_TTL.SHORT, fetchFn);
}

/**
 * Invalidate assessment cache
 */
export async function invalidateAssessmentCache(assessmentId: string): Promise<void> {
  const key = generateCacheKey(CACHE_KEYS.ASSESSMENT, assessmentId);
  await deleteCache(key);
}

/**
 * Cache user data
 */
export async function getCachedUser<T>(
  userId: string,
  fetchFn: () => Promise<T>
): Promise<T> {
  const key = generateCacheKey(CACHE_KEYS.USER, userId);
  return getCached(key, CACHE_TTL.MEDIUM, fetchFn);
}

/**
 * Invalidate user cache
 */
export async function invalidateUserCache(userId: string): Promise<void> {
  const key = generateCacheKey(CACHE_KEYS.USER, userId);
  await deleteCache(key);
}

/**
 * Cache search results
 */
export async function getCachedSearch<T>(
  searchQuery: string,
  fetchFn: () => Promise<T>
): Promise<T> {
  // Hash the search query using SHA-256 for consistent, collision-resistant key
  const crypto = await import('crypto');
  const queryHash = crypto
    .createHash('sha256')
    .update(searchQuery)
    .digest('hex');
  const key = generateCacheKey(CACHE_KEYS.SEARCH, queryHash);
  return getCached(key, CACHE_TTL.SHORT, fetchFn);
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  totalKeys: number;
  memoryUsage: string;
  hitRate?: number;
}> {
  if (!redis) return { totalKeys: 0, memoryUsage: 'unknown' };
  try {
    const info = await (redis as unknown as { info: () => Promise<string> }).info();

    // Parse info string
    const lines = info.split('\r\n');
    const stats: Record<string, string> = {};

    lines.forEach((line: string) => {
      const [key, value] = line.split(':');
      if (key && value) {
        stats[key] = value;
      }
    });

    return {
      totalKeys: parseInt(stats['db0']?.split('keys=')[1]?.split(',')[0] || '0'),
      memoryUsage: stats['used_memory_human'] || 'unknown',
    };
  } catch (error) {
    logger.error('Failed to get cache stats', error, {
      service: 'api-cache',
    });

    return {
      totalKeys: 0,
      memoryUsage: 'unknown',
    };
  }
}

/**
 * Warm cache with preloaded data
 * Useful for frequently accessed data
 */
export async function warmCache<T>(
  key: string,
  data: T,
  ttl: number
): Promise<void> {
  await setCache(key, data, ttl);

  logger.info('Cache warmed', {
    service: 'api-cache',
    key,
    ttl,
  });
}

/**
 * Cache middleware helper
 * Use in API routes to automatically cache responses
 */
export async function withCache<T>(
  cacheKey: string,
  ttl: number,
  handler: () => Promise<T>
): Promise<T> {
  return getCached(cacheKey, ttl, handler, { logMetrics: true });
}
