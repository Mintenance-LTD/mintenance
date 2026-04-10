// ============================================================================
// ADVANCED CACHING SYSTEM - Entry Point
// Re-exports types, strategies, the CacheManager class, and provides
// specialized cache instances and React hooks.
// ============================================================================

import { CacheManager } from './cache/CacheManager';
import {
  LRU_STRATEGY,
  LFU_STRATEGY,
  SIZE_AWARE_STRATEGY,
} from './cache/strategies';
import { calculateSize } from './cache/types';

// Re-export types, strategies and the manager class
export type { CacheConfig } from './cache/types';
export { CacheManager } from './cache/CacheManager';
// ============================================================================
// CACHE INSTANCES
// ============================================================================

// Global cache instance
const globalCache = new CacheManager();

// Specialized cache instances
const apiCache = new CacheManager();
apiCache.setStrategy(SIZE_AWARE_STRATEGY);

const imageCache = new CacheManager();
imageCache.setStrategy({
  ...LRU_STRATEGY,
  shouldCache: (_key, value, _config) => {
    const size = calculateSize(value);
    return size < 5 * 1024 * 1024; // 5MB limit for images
  },
});

const userDataCache = new CacheManager();
userDataCache.setStrategy({
  ...LFU_STRATEGY,
  shouldCache: () => true,
  shouldEvict: (entry) => entry.accessCount < 5, // Keep frequently accessed user data
});

// ============================================================================
// REACT HOOKS
// ============================================================================

const useCache = (cacheInstance = globalCache) => {
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
