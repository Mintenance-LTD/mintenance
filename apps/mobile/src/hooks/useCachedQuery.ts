/**
 * Cached Query Hook
 * Combines React Query with multi-layer caching for optimal performance
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  QueryKey,
} from '@tanstack/react-query';
import type { Job } from '@/types';
import { CacheService } from '../services/CacheService';
import {
  CACHE_TIMES,
  STALE_TIMES,
  QUERY_KEYS,
} from '../config/reactQuery.config';
import { logger } from '../utils/logger';
import { mobileApiClient } from '../utils/mobileApiClient';
import { supabase } from '../config/supabase';

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
function useCachedQuery<TData>({
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
  const cacheKey = Array.isArray(queryKey)
    ? queryKey.join(':')
    : String(queryKey);

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
        logger.error('useCachedQuery', `Error fetching ${cacheKey}`, {
          error: error instanceof Error ? error.message : String(error),
        });
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
    retry: (failureCount, error: Error) => {
      // Don't retry on 4xx errors
      const status = (error as Error & { status?: number }).status;
      if (status && status >= 400 && status < 500) {
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
function usePrefetchCached() {
  const queryClient = useQueryClient();
  const cacheService = CacheService.getInstance();

  return async <TData>(
    queryKey: QueryKey,
    queryFn: () => Promise<TData>,
    options?: { cacheTime?: number }
  ) => {
    const cacheKey = Array.isArray(queryKey)
      ? queryKey.join(':')
      : String(queryKey);
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
      logger.error('usePrefetchCached', `Error prefetching ${cacheKey}`, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };
}

/**
 * Hook for cached mutations with optimistic updates
 */
function useCachedMutation<TData, TVariables>({
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
    updater: (old: unknown, variables: TVariables) => unknown;
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
        await queryClient.cancelQueries({
          queryKey: optimisticUpdate.queryKey,
        });

        // Snapshot previous value
        const previousValue = queryClient.getQueryData(
          optimisticUpdate.queryKey
        );

        // Optimistically update
        queryClient.setQueryData(optimisticUpdate.queryKey, (old: unknown) =>
          optimisticUpdate.updater(old, variables)
        );

        return { previousValue };
      }
    },
    onError: (error, variables, context) => {
      // Rollback on error
      const ctx = context as { previousValue?: unknown } | undefined;
      if (optimisticUpdate && ctx?.previousValue) {
        queryClient.setQueryData(optimisticUpdate.queryKey, ctx.previousValue);
      }

      logger.error('useCachedMutation', 'Mutation error', {
        error: error.message,
      });
      onError?.(error, variables);
    },
    onSuccess: async (data, variables) => {
      // Invalidate related queries
      if (invalidateKeys) {
        for (const key of invalidateKeys) {
          await queryClient.invalidateQueries({ queryKey: key });
          const cacheKey = Array.isArray(key) ? key.join(':') : String(key);
          await cacheService.remove(cacheKey);
        }
      }

      onSuccess?.(data, variables);
    },
  });
}

/**
 * Hook for getting cache statistics
 */
function useCacheStats() {
  const cacheService = CacheService.getInstance();

  return useQuery({
    queryKey: ['cache_stats'],
    queryFn: () => cacheService.getStats(),
    staleTime: STALE_TIMES.DYNAMIC,
    gcTime: CACHE_TIMES.DYNAMIC,
  });
}

/**
 * Hook for clearing cache
 */
function useClearCache() {
  const queryClient = useQueryClient();
  const cacheService = CacheService.getInstance();

  return async (options?: {
    clearReactQuery?: boolean;
    clearDisk?: boolean;
  }) => {
    try {
      if (options?.clearReactQuery !== false) {
        queryClient.clear();
      }

      if (options?.clearDisk !== false) {
        await cacheService.clear();
      }

      logger.info('useClearCache', 'Cache cleared successfully');
    } catch (error) {
      logger.error('useClearCache', 'Error clearing cache', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  };
}

/**
 * Example usage patterns
 */
const CACHE_PATTERNS = {
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
function useJobsWithCache() {
  return useCachedQuery<Job[]>({
    queryKey: [QUERY_KEYS.JOBS],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) {
        logger.error('useJobsWithCache', error.message);
        throw new Error(error.message);
      }
      return (data || []) as Job[];
    },
    ...CACHE_PATTERNS.DYNAMIC,
  });
}

/**
 * Example: Contractor profile with static caching
 */
function useContractorProfile(contractorId: string) {
  return useCachedQuery({
    queryKey: [QUERY_KEYS.CONTRACTORS, contractorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(
          'id, role, first_name, last_name, bio, city, country, profile_image_url, avatar_url, rating, total_jobs_completed, verified, admin_verified, skills, is_available, company_name, hourly_rate, years_experience, portfolio_images, created_at'
        )
        .eq('id', contractorId)
        .single();
      if (error) {
        logger.error('useContractorProfile', error.message);
        throw new Error(error.message);
      }
      return data;
    },
    ...CACHE_PATTERNS.SEMI_STATIC,
    enabled: !!contractorId,
  });
}

/**
 * Example: Create job with optimistic update
 */
function useCreateJob() {
  return useCachedMutation<Job, Record<string, unknown>>({
    mutationFn: (jobData) => mobileApiClient.post('/api/jobs', jobData),
    invalidateKeys: [[QUERY_KEYS.JOBS]],
    optimisticUpdate: {
      queryKey: [QUERY_KEYS.JOBS],
      updater: (old: unknown, variables: Record<string, unknown>) => {
        const oldArr = Array.isArray(old) ? old : [];
        return [
          ...oldArr,
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
