/**
 * React Query Configuration
 * Optimized for performance with smart caching strategies
 */

import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { logger } from '../utils/logger';
import { performanceMonitor } from '../utils/performance';

// Cache time constants (in milliseconds)
export const CACHE_TIMES = {
  // Static data that rarely changes
  STATIC: 1000 * 60 * 60 * 24, // 24 hours

  // Semi-static data (user profiles, categories)
  SEMI_STATIC: 1000 * 60 * 30, // 30 minutes

  // Dynamic data (jobs, bids, messages)
  DYNAMIC: 1000 * 60 * 5, // 5 minutes

  // Real-time data (notifications, live updates)
  REALTIME: 1000 * 30, // 30 seconds

  // Search results
  SEARCH: 1000 * 60 * 2, // 2 minutes
} as const;

// Stale time constants (when to refetch in background)
export const STALE_TIMES = {
  STATIC: 1000 * 60 * 60 * 12, // 12 hours
  SEMI_STATIC: 1000 * 60 * 15, // 15 minutes
  DYNAMIC: 1000 * 60 * 2, // 2 minutes
  REALTIME: 1000 * 10, // 10 seconds
  SEARCH: 1000 * 60, // 1 minute
} as const;

// Query key prefixes for organization
export const QUERY_KEYS = {
  JOBS: 'jobs',
  BIDS: 'bids',
  USERS: 'users',
  CONTRACTORS: 'contractors',
  MESSAGES: 'messages',
  PAYMENTS: 'payments',
  REVIEWS: 'reviews',
  NOTIFICATIONS: 'notifications',
  SEARCH: 'search',
  AUTH: 'auth',
} as const;

// Global error handler
const handleError = (error: Error) => {
  logger.error('React Query error', error);
  performanceMonitor.recordMetric('query_error', 1, 'network');
};

// Global success handler with performance tracking
const handleSuccess = (queryKey: unknown[], duration: number) => {
  performanceMonitor.recordMetric(
    `query_success_${String(queryKey[0])}`,
    duration,
    'network'
  );
};

// Query Cache configuration
const queryCache = new QueryCache({
  onError: (error, query) => {
    handleError(error as Error);

    // Log query details for debugging
    logger.debug('Query failed', {
      queryKey: query.queryKey,
      queryHash: query.queryHash,
      error: (error as Error).message,
    });
  },

  onSuccess: (data, query) => {
    const duration = Date.now() - (query.state.dataUpdatedAt || Date.now());
    handleSuccess([...query.queryKey], duration);
  },
});

// Mutation Cache configuration
const mutationCache = new MutationCache({
  onError: (error, _variables, _context, mutation) => {
    handleError(error as Error);

    logger.debug('Mutation failed', {
      mutationKey: mutation.options.mutationKey,
      error: (error as Error).message,
    });
  },

  onSuccess: (_data, _variables, _context, mutation) => {
    logger.debug('Mutation succeeded', {
      mutationKey: mutation.options.mutationKey,
    });

    performanceMonitor.recordMetric('mutation_success', 1, 'network');
  },
});

// Create optimized Query Client
const createQueryClient = () => {
  return new QueryClient({
    queryCache,
    mutationCache,

    defaultOptions: {
      queries: {
        // Cache time: How long data stays in cache after becoming unused
        gcTime: CACHE_TIMES.DYNAMIC,

        // Stale time: How long before data is considered stale and refetched
        staleTime: STALE_TIMES.DYNAMIC,

        // Retry configuration
        retry: (failureCount, error: unknown) => {
          // Don't retry on 4xx errors (client errors)
          if (
            ((error as { status?: number })?.status ?? 0) >= 400 &&
            ((error as { status?: number })?.status ?? 0) < 500
          ) {
            return false;
          }

          // Retry up to 3 times for network errors
          return failureCount < 3;
        },

        retryDelay: (attemptIndex) => {
          // Exponential backoff: 1s, 2s, 4s
          return Math.min(1000 * Math.pow(2, attemptIndex), 10000);
        },

        // Refetch configuration
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        refetchOnMount: true,

        // Network mode
        networkMode: 'offlineFirst', // Use cached data when offline

        // Meta for tracking
        meta: {
          performanceTracking: true,
        },
      },

      mutations: {
        // Retry configuration for mutations
        retry: 1, // Retry failed mutations once

        retryDelay: 1000,

        // Network mode
        networkMode: 'online', // Mutations require network

        // Meta for tracking
        meta: {
          performanceTracking: true,
        },
      },
    },
  });
};

// Query client instance (singleton)
const queryClient = createQueryClient();

// Helper function to create query keys


// Helper function to prefetch queries
const prefetchQuery = async <T>(
  queryKey: unknown[],
  queryFn: () => Promise<T>,
  staleTime: number = STALE_TIMES.DYNAMIC
) => {
  await queryClient.prefetchQuery({
    queryKey,
    queryFn,
    staleTime,
  });
};

// Helper function to warm cache with multiple queries


// Helper function for optimistic updates


// Helper function to invalidate related queries


// Helper function to clear all cache


// Helper function to get cache stats


// Export types



