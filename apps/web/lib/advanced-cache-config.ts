/**
 * Advanced Caching Configuration for React Query
 * Multi-layer caching with intelligent invalidation
 */

import { QueryClient, QueryClientConfig, Query } from '@tanstack/react-query';
import { logger } from './logger';

// Cache duration constants
export const CACHE_TIME = {
  VERY_SHORT: 30 * 1000, // 30 seconds
  SHORT: 60 * 1000, // 1 minute
  MEDIUM: 5 * 60 * 1000, // 5 minutes
  LONG: 15 * 60 * 1000, // 15 minutes
  VERY_LONG: 60 * 60 * 1000, // 1 hour
  INFINITE: Infinity,
} as const;

// Stale time constants
export const STALE_TIME = {
  IMMEDIATE: 0,
  SHORT: 30 * 1000, // 30 seconds
  MEDIUM: 2 * 60 * 1000, // 2 minutes
  LONG: 10 * 60 * 1000, // 10 minutes
  VERY_LONG: 30 * 60 * 1000, // 30 minutes
} as const;

// Retry configuration
export const RETRY_CONFIG = {
  DEFAULT: 3,
  CRITICAL: 5,
  NONE: 0,
} as const;

/**
 * Custom query client configuration with advanced features
 */
export const queryClientConfig: QueryClientConfig = {
  defaultOptions: {
    queries: {
      // Network mode
      networkMode: 'offlineFirst',

      // Stale time - data is fresh for this duration
      staleTime: STALE_TIME.SHORT,

      // Cache time - keep unused data in cache for this duration
      gcTime: CACHE_TIME.MEDIUM, // was cacheTime in v4

      // Retry configuration
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors (client errors)
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          return false;
        }
        // Retry up to 3 times for other errors
        return failureCount < RETRY_CONFIG.DEFAULT;
      },

      retryDelay: (attemptIndex) => {
        // Exponential backoff: 1s, 2s, 4s
        return Math.min(1000 * 2 ** attemptIndex, 30000);
      },

      // Refetch configuration
      refetchOnMount: 'always',
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,

      // Enable placeholder data from cache while fetching
      placeholderData: (previousData) => previousData,

      // Structural sharing to avoid unnecessary re-renders
      structuralSharing: true,
    },

    mutations: {
      // Retry mutations only on network errors
      retry: (failureCount, error: any) => {
        if (error?.message?.includes('NetworkError')) {
          return failureCount < RETRY_CONFIG.DEFAULT;
        }
        return false;
      },

      networkMode: 'offlineFirst',
    },
  },
};

/**
 * Create optimized query client with persistence
 */
export function createOptimizedQueryClient(): QueryClient {
  const client = new QueryClient(queryClientConfig);

  // Log cache statistics periodically in development
  if (process.env.NODE_ENV === 'development') {
    setInterval(() => {
      const cache = client.getQueryCache();
      const queries = cache.getAll();

      logger.info('React Query Cache Stats', {
        totalQueries: queries.length,
        activeQueries: queries.filter(q => q.isActive()).length,
        staleQueries: queries.filter(q => q.isStale()).length,
        fetchingQueries: queries.filter(q => q.state.isFetching).length,
      });
    }, 60000); // Every minute
  }

  return client;
}

/**
 * Query key factory for consistent cache keys
 */
export const queryKeys = {
  // Contractors
  contractors: {
    all: ['contractors'] as const,
    lists: () => [...queryKeys.contractors.all, 'list'] as const,
    list: (filters?: any) => [...queryKeys.contractors.lists(), filters] as const,
    details: () => [...queryKeys.contractors.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.contractors.details(), id] as const,
    search: (query: string) => [...queryKeys.contractors.all, 'search', query] as const,
  },

  // Jobs
  jobs: {
    all: ['jobs'] as const,
    lists: () => [...queryKeys.jobs.all, 'list'] as const,
    list: (filters?: any) => [...queryKeys.jobs.lists(), filters] as const,
    details: () => [...queryKeys.jobs.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.jobs.details(), id] as const,
    myJobs: (userId: string) => [...queryKeys.jobs.all, 'my', userId] as const,
  },

  // User
  user: {
    all: ['user'] as const,
    profile: (id: string) => [...queryKeys.user.all, 'profile', id] as const,
    settings: () => [...queryKeys.user.all, 'settings'] as const,
    notifications: () => [...queryKeys.user.all, 'notifications'] as const,
  },

  // Messages
  messages: {
    all: ['messages'] as const,
    conversations: () => [...queryKeys.messages.all, 'conversations'] as const,
    conversation: (id: string) => [...queryKeys.messages.all, 'conversation', id] as const,
  },

  // Categories
  categories: {
    all: ['categories'] as const,
    services: () => [...queryKeys.categories.all, 'services'] as const,
  },
} as const;

/**
 * Cache invalidation utilities
 */
export class CacheInvalidator {
  constructor(private queryClient: QueryClient) {}

  /**
   * Invalidate all contractor-related queries
   */
  invalidateContractors() {
    logger.info('Invalidating contractors cache');
    return this.queryClient.invalidateQueries({
      queryKey: queryKeys.contractors.all,
    });
  }

  /**
   * Invalidate specific contractor
   */
  invalidateContractor(id: string) {
    logger.info('Invalidating contractor', { id });
    return this.queryClient.invalidateQueries({
      queryKey: queryKeys.contractors.detail(id),
    });
  }

  /**
   * Invalidate all job-related queries
   */
  invalidateJobs() {
    logger.info('Invalidating jobs cache');
    return this.queryClient.invalidateQueries({
      queryKey: queryKeys.jobs.all,
    });
  }

  /**
   * Invalidate specific job
   */
  invalidateJob(id: string) {
    logger.info('Invalidating job', { id });
    return this.queryClient.invalidateQueries({
      queryKey: queryKeys.jobs.detail(id),
    });
  }

  /**
   * Invalidate user data
   */
  invalidateUser(id: string) {
    logger.info('Invalidating user', { id });
    return this.queryClient.invalidateQueries({
      queryKey: queryKeys.user.profile(id),
    });
  }

  /**
   * Invalidate all caches
   */
  invalidateAll() {
    logger.warn('Invalidating all caches');
    return this.queryClient.invalidateQueries();
  }

  /**
   * Clear all caches
   */
  clearAll() {
    logger.warn('Clearing all caches');
    this.queryClient.clear();
  }
}

/**
 * Prefetch utilities
 */
export class CachePrefetcher {
  constructor(private queryClient: QueryClient) {}

  /**
   * Prefetch contractors list
   */
  async prefetchContractors(filters?: any) {
    await this.queryClient.prefetchQuery({
      queryKey: queryKeys.contractors.list(filters),
      queryFn: () => {
        // This would be replaced with actual API call
        throw new Error('Prefetch function not implemented');
      },
      staleTime: STALE_TIME.MEDIUM,
    });
  }

  /**
   * Prefetch contractor details
   */
  async prefetchContractor(id: string) {
    await this.queryClient.prefetchQuery({
      queryKey: queryKeys.contractors.detail(id),
      queryFn: () => {
        throw new Error('Prefetch function not implemented');
      },
      staleTime: STALE_TIME.MEDIUM,
    });
  }

  /**
   * Prefetch jobs list
   */
  async prefetchJobs(filters?: any) {
    await this.queryClient.prefetchQuery({
      queryKey: queryKeys.jobs.list(filters),
      queryFn: () => {
        throw new Error('Prefetch function not implemented');
      },
      staleTime: STALE_TIME.SHORT,
    });
  }
}

/**
 * Optimistic update utilities
 */
export class OptimisticUpdater {
  constructor(private queryClient: QueryClient) {}

  /**
   * Optimistically update contractor
   */
  async updateContractor<T>(id: string, updater: (old: T | undefined) => T) {
    await this.queryClient.cancelQueries({
      queryKey: queryKeys.contractors.detail(id),
    });

    const previous = this.queryClient.getQueryData<T>(
      queryKeys.contractors.detail(id)
    );

    this.queryClient.setQueryData<T>(
      queryKeys.contractors.detail(id),
      updater
    );

    return { previous };
  }

  /**
   * Optimistically update job
   */
  async updateJob<T>(id: string, updater: (old: T | undefined) => T) {
    await this.queryClient.cancelQueries({
      queryKey: queryKeys.jobs.detail(id),
    });

    const previous = this.queryClient.getQueryData<T>(
      queryKeys.jobs.detail(id)
    );

    this.queryClient.setQueryData<T>(
      queryKeys.jobs.detail(id),
      updater
    );

    return { previous };
  }

  /**
   * Rollback on error
   */
  rollback<T>(queryKey: readonly unknown[], previousData: T | undefined) {
    if (previousData) {
      this.queryClient.setQueryData(queryKey, previousData);
    }
  }
}

/**
 * Multi-layer cache manager
 */
export class MultiLayerCacheManager {
  private memoryCache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly MEMORY_CACHE_TTL = CACHE_TIME.SHORT;

  constructor(private queryClient: QueryClient) {}

  /**
   * Get from multi-layer cache (Memory → React Query → Network)
   */
  async get<T>(
    queryKey: readonly unknown[],
    fetchFn: () => Promise<T>,
    options?: {
      staleTime?: number;
      cacheTime?: number;
      useMemoryCache?: boolean;
    }
  ): Promise<T> {
    const cacheKey = JSON.stringify(queryKey);

    // Layer 1: Memory cache (fastest)
    if (options?.useMemoryCache !== false) {
      const memoryCached = this.memoryCache.get(cacheKey);
      if (
        memoryCached &&
        Date.now() - memoryCached.timestamp < this.MEMORY_CACHE_TTL
      ) {
        logger.debug('Cache hit: Memory', { queryKey });
        return memoryCached.data as T;
      }
    }

    // Layer 2: React Query cache
    const queryCache = this.queryClient.getQueryData<T>(queryKey);
    if (queryCache) {
      logger.debug('Cache hit: React Query', { queryKey });
      // Update memory cache
      if (options?.useMemoryCache !== false) {
        this.memoryCache.set(cacheKey, {
          data: queryCache,
          timestamp: Date.now(),
        });
      }
      return queryCache;
    }

    // Layer 3: Network
    logger.debug('Cache miss: Fetching from network', { queryKey });
    const data = await fetchFn();

    // Update all cache layers
    this.queryClient.setQueryData(queryKey, data);
    if (options?.useMemoryCache !== false) {
      this.memoryCache.set(cacheKey, {
        data,
        timestamp: Date.now(),
      });
    }

    return data;
  }

  /**
   * Clear memory cache
   */
  clearMemoryCache() {
    logger.info('Clearing memory cache');
    this.memoryCache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      memoryCacheSize: this.memoryCache.size,
      reactQueryCacheSize: this.queryClient.getQueryCache().getAll().length,
    };
  }
}

/**
 * Export configured utilities
 */
export function createCacheUtilities(queryClient: QueryClient) {
  return {
    invalidator: new CacheInvalidator(queryClient),
    prefetcher: new CachePrefetcher(queryClient),
    optimistic: new OptimisticUpdater(queryClient),
    multiLayer: new MultiLayerCacheManager(queryClient),
    queryKeys,
  };
}
