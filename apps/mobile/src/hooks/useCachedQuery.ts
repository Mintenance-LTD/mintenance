/**
 * Cached Query Hook
 * Combines React Query with multi-layer caching for optimal performance
 */

import { useQuery, useMutation, useQueryClient, QueryKey } from '@tanstack/react-query';
import { CacheService } from '../services/CacheService';
import { CACHE_TIMES, STALE_TIMES, QUERY_KEYS } from '../config/reactQuery.config';
import { logger } from '../utils/logger';

interface CachedQueryOptions<TData> {
  queryKey: QueryKey;
  queryFn: () => Promise<TData>;
  cacheTime?: number;
  staleTime?: number;
  cacheLevel?: 'memory' | 'disk' | 'network-only';
  enabled?: boolean;
  onSuccess?: (data: TData) => void;
  onError?: (error: Error) => void;
}

/**
 * Enhanced useQuery with multi-layer caching
 */
export function useCachedQuery<TData>({
  queryKey,
  queryFn,
  cacheTime = CACHE_TIMES.DYNAMIC,
  staleTime = STALE_TIMES.DYNAMIC,
  cacheLevel = 'disk',
  enabled = true,
  onSuccess,
  onError,
}: CachedQueryOptions<TData>) {
  const queryClient = useQueryClient();
  const cacheService = CacheService.getInstance();
  const cacheKey = Array.isArray(queryKey) ? queryKey.join(':') : String(queryKey);

  return useQuery<TData>({
    queryKey,
    queryFn: async () => {
      try {
        // Try cache first (unless network-only)
        if (cacheLevel !== 'network-only') {
          const cached = await cacheService.get<TData>(cacheKey);
          if (cached !== null) {
            logger.info('useCachedQuery', `Cache hit for ${cacheKey}`, {
              level: cacheLevel,
            });
            return cached;
          }
        }

        // Fetch from network
        logger.info('useCachedQuery', `Fetching ${cacheKey} from network`);
        const data = await queryFn();

        // Store in cache
        if (cacheLevel !== 'network-only') {
          await cacheService.set(cacheKey, data, cacheTime);
        }

        onSuccess?.(data);
        return data;
      } catch (error) {
        logger.error('useCachedQuery', `Error fetching ${cacheKey}`, error as Error);
        onError?.(error as Error);

        // Try to return stale cached data on error
        const staleData = await cacheService.get<TData>(cacheKey);
        if (staleData !== null) {
          logger.warn('useCachedQuery', `Returning stale data for ${cacheKey}`);
          return staleData;
        }

        throw error;
      }
    },
    gcTime: cacheTime,
    staleTime,
    enabled,
    retry: (failureCount, error: any) => {
      // Don't retry on 4xx errors
      if (error?.status >= 400 && error?.status < 500) {
        return false;
      }
      return failureCount < 3;
    },
    networkMode: 'offlineFirst',
  });
}

/**
 * Hook for prefetching data with caching
 */
export function usePrefetchCached() {
  const queryClient = useQueryClient();
  const cacheService = CacheService.getInstance();

  return async <TData>(
    queryKey: QueryKey,
    queryFn: () => Promise<TData>,
    options?: { cacheTime?: number }
  ) => {
    const cacheKey = Array.isArray(queryKey) ? queryKey.join(':') : String(queryKey);
    const cacheTime = options?.cacheTime || CACHE_TIMES.DYNAMIC;

    try {
      // Check cache first
      const cached = await cacheService.get<TData>(cacheKey);
      if (cached !== null) {
        queryClient.setQueryData(queryKey, cached);
        return;
      }

      // Prefetch and cache
      await queryClient.prefetchQuery({
        queryKey,
        queryFn: async () => {
          const data = await queryFn();
          await cacheService.set(cacheKey, data, cacheTime);
          return data;
        },
        gcTime: cacheTime,
      });
    } catch (error) {
      logger.error('usePrefetchCached', `Error prefetching ${cacheKey}`, error as Error);
    }
  };
}

/**
 * Hook for cached mutations with optimistic updates
 */
export function useCachedMutation<TData, TVariables>({
  mutationFn,
  invalidateKeys,
  optimisticUpdate,
  onSuccess,
  onError,
}: {
  mutationFn: (variables: TVariables) => Promise<TData>;
  invalidateKeys?: QueryKey[];
  optimisticUpdate?: {
    queryKey: QueryKey;
    updater: (old: any, variables: TVariables) => any;
  };
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: Error, variables: TVariables) => void;
}) {
  const queryClient = useQueryClient();
  const cacheService = CacheService.getInstance();

  return useMutation<TData, Error, TVariables>({
    mutationFn,
    onMutate: async (variables) => {
      if (optimisticUpdate) {
        // Cancel outgoing refetches
        await queryClient.cancelQueries({ queryKey: optimisticUpdate.queryKey });

        // Snapshot previous value
        const previousValue = queryClient.getQueryData(optimisticUpdate.queryKey);

        // Optimistically update
        queryClient.setQueryData(
          optimisticUpdate.queryKey,
          (old: any) => optimisticUpdate.updater(old, variables)
        );

        return { previousValue };
      }
    },
    onError: (error, variables, context: any) => {
      // Rollback on error
      if (optimisticUpdate && context?.previousValue) {
        queryClient.setQueryData(optimisticUpdate.queryKey, context.previousValue);
      }

      logger.error('useCachedMutation', 'Mutation error', error);
      onError?.(error, variables);
    },
    onSuccess: async (data, variables) => {
      // Invalidate related queries
      if (invalidateKeys) {
        for (const key of invalidateKeys) {
          await queryClient.invalidateQueries({ queryKey: key });
          const cacheKey = Array.isArray(key) ? key.join(':') : String(key);
          await cacheService.delete(cacheKey);
        }
      }

      onSuccess?.(data, variables);
    },
  });
}

/**
 * Hook for getting cache statistics
 */
export function useCacheStats() {
  const cacheService = CacheService.getInstance();

  return useQuery({
    queryKey: QUERY_KEYS.CACHE_STATS,
    queryFn: () => cacheService.getStats(),
    staleTime: STALE_TIMES.DYNAMIC,
    gcTime: CACHE_TIMES.DYNAMIC,
  });
}

/**
 * Hook for clearing cache
 */
export function useClearCache() {
  const queryClient = useQueryClient();
  const cacheService = CacheService.getInstance();

  return async (options?: { clearReactQuery?: boolean; clearDisk?: boolean }) => {
    try {
      if (options?.clearReactQuery !== false) {
        queryClient.clear();
      }

      if (options?.clearDisk !== false) {
        await cacheService.clearAll();
      }

      logger.info('useClearCache', 'Cache cleared successfully');
    } catch (error) {
      logger.error('useClearCache', 'Error clearing cache', error as Error);
      throw error;
    }
  };
}

/**
 * Example usage patterns
 */
export const CACHE_PATTERNS = {
  // Static data (rarely changes)
  STATIC: {
    cacheTime: CACHE_TIMES.STATIC,
    staleTime: STALE_TIMES.STATIC,
    cacheLevel: 'disk' as const,
  },

  // Semi-static (changes occasionally)
  SEMI_STATIC: {
    cacheTime: CACHE_TIMES.SEMI_STATIC,
    staleTime: STALE_TIMES.SEMI_STATIC,
    cacheLevel: 'disk' as const,
  },

  // Dynamic (frequently changes)
  DYNAMIC: {
    cacheTime: CACHE_TIMES.DYNAMIC,
    staleTime: STALE_TIMES.DYNAMIC,
    cacheLevel: 'disk' as const,
  },

  // Realtime (always fresh)
  REALTIME: {
    cacheTime: CACHE_TIMES.REALTIME,
    staleTime: STALE_TIMES.REALTIME,
    cacheLevel: 'memory' as const,
  },

  // Network only (no caching)
  NETWORK_ONLY: {
    cacheTime: 0,
    staleTime: 0,
    cacheLevel: 'network-only' as const,
  },
};

/**
 * Example: Jobs list with disk caching
 */
export function useJobsWithCache() {
  return useCachedQuery({
    queryKey: QUERY_KEYS.JOBS_LIST,
    queryFn: async () => {
      const response = await fetch('/api/jobs');
      return response.json();
    },
    ...CACHE_PATTERNS.DYNAMIC,
  });
}

/**
 * Example: Contractor profile with static caching
 */
export function useContractorProfile(contractorId: string) {
  return useCachedQuery({
    queryKey: QUERY_KEYS.CONTRACTOR_PROFILE(contractorId),
    queryFn: async () => {
      const response = await fetch(`/api/contractors/${contractorId}`);
      return response.json();
    },
    ...CACHE_PATTERNS.SEMI_STATIC,
    enabled: !!contractorId,
  });
}

/**
 * Example: Create job with optimistic update
 */
export function useCreateJob() {
  return useCachedMutation({
    mutationFn: async (jobData: any) => {
      const response = await fetch('/api/jobs', {
        method: 'POST',
        body: JSON.stringify(jobData),
      });
      return response.json();
    },
    invalidateKeys: [QUERY_KEYS.JOBS_LIST],
    optimisticUpdate: {
      queryKey: QUERY_KEYS.JOBS_LIST,
      updater: (old: any[], variables: any) => {
        return [
          ...old,
          {
            ...variables,
            id: `temp-${Date.now()}`,
            status: 'pending',
          },
        ];
      },
    },
  });
}
