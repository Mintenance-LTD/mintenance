import type { CacheStrategy } from './types';
import { calculateSize } from './types';

// ============================================================================
// CACHE STRATEGIES
// ============================================================================

export const LRU_STRATEGY: CacheStrategy = {
  name: 'LRU',
  shouldCache: () => true,
  shouldEvict: (entry, stats) => {
    const age = Date.now() - entry.lastAccessed;
    const avgAge = stats.totalRequests > 0 ? Date.now() - stats.oldestEntry : 0;
    return age > avgAge * 1.5; // Evict if 50% older than average
  },
  getPriority: (entry) => entry.lastAccessed,
};

export const LFU_STRATEGY: CacheStrategy = {
  name: 'LFU',
  shouldCache: () => true,
  shouldEvict: (entry, _stats) => {
    return entry.accessCount < 2; // Evict if accessed less than 2 times
  },
  getPriority: (entry) => entry.accessCount,
};

export const SIZE_AWARE_STRATEGY: CacheStrategy = {
  name: 'SIZE_AWARE',
  shouldCache: (_key, value, config) => {
    const size = calculateSize(value);
    return size < (config?.maxSize || 1024 * 1024); // 1MB default
  },
  shouldEvict: (entry, stats) => {
    const sizePressure = stats.memoryUsage / (100 * 1024 * 1024); // Relative to 100MB
    return entry.size > 1024 * 10 && sizePressure > 0.8; // Large entries when memory pressure
  },
  getPriority: (entry) => -entry.size, // Negative for descending order
};
