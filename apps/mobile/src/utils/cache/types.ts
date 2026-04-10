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

export interface CacheEntry<T = unknown> {
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
  shouldCache: (key: string, value: unknown, config?: CacheConfig) => boolean;
  shouldEvict: (entry: CacheEntry, stats: CacheStats) => boolean;
  getPriority: (entry: CacheEntry) => number;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function calculateSize(value: unknown): number {
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
