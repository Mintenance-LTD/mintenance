import { QueryClient, QueryCache, MutationCache, Query, Mutation } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import HapticService from '../utils/haptics';
import { logger } from '../utils/logger';

// ============================================================================
// GLOBAL ERROR HANDLERS
// Errors are logged centrally. UI-level error messages should be handled
// per-component (via useQuery's onError or error state), NOT via Alert.alert
// here, because background refetch failures would interrupt the user.
// ============================================================================

const handleQueryError = (error: unknown, query: Query<unknown, Error, unknown>): void => {
  logger.error('Query error', {
    queryKey: query.queryKey,
    message: error instanceof Error ? error.message : String(error),
  });

  HapticService.error();
};

const handleMutationError = (
  error: unknown,
  _variables: unknown,
  _context: unknown,
  mutation: Mutation<unknown, Error, unknown>,
): void => {
  logger.error('Mutation error', {
    mutationKey: mutation.options.mutationKey,
    message: error instanceof Error ? error.message : String(error),
  });

  HapticService.error();
};

// Query Cache configuration
const queryCache = new QueryCache({
  onError: handleQueryError,
});

// Mutation Cache configuration
const mutationCache = new MutationCache({
  onError: handleMutationError,
  onSuccess: (data, variables, context, mutation) => {
    // Haptic feedback for successful mutations
    HapticService.success();
  },
});

// Query Client configuration
export const queryClient = new QueryClient({
  queryCache,
  mutationCache,
  defaultOptions: {
    queries: {
      // Stale time - data considered fresh for 5 minutes
      staleTime: 5 * 60 * 1000, // 5 minutes

      // Cache time - how long data stays in cache when not used
      gcTime: 10 * 60 * 1000, // 10 minutes (was cacheTime in v4)

      // Network mode - for better offline handling
      networkMode: 'offlineFirst',

      // Retry configuration
      retry: (failureCount, error: unknown) => {
        const status = (error as { status?: number })?.status;
        const name = (error as { name?: string })?.name;
        const message = (error as { message?: string })?.message;

        // Don't retry on 4xx errors (client errors)
        if (typeof status === 'number' && status >= 400 && status < 500) {
          return false;
        }
        // Don't retry if the error indicates offline state
        if (name === 'NetworkError' || (message && message.includes('fetch'))) {
          return false;
        }
        // Retry up to 3 times for other errors
        return failureCount < 3;
      },

      // Retry delay with exponential backoff
      retryDelay: (attemptIndex) =>
        Math.min(1000 * Math.pow(2, attemptIndex), 30000),

      // Refetch configuration for better mobile experience
      refetchOnWindowFocus: false, // Disabled for mobile - use manual refresh
      refetchOnReconnect: 'always', // Always refetch when coming back online
      refetchOnMount: (query) => {
        // Smart refetch: only if data is stale or error state
        return (
          query.state.isInvalidated ||
          query.state.status === 'error' ||
          !query.state.data
        );
      },

      // Prevent infinite loading loops
      refetchInterval: false,
      refetchIntervalInBackground: false,
    },
    mutations: {
      // Retry failed mutations once, but not client errors
      retry: (failureCount, error: unknown) => {
        const status = (error as { status?: number })?.status;
        const name = (error as { name?: string })?.name;

        if (typeof status === 'number' && status >= 400 && status < 500) return false;
        if (name === 'OfflineQueuedError') return false;
        return failureCount < 2;
      },

      // Network mode for mutations
      networkMode: 'online',

      // Retry delay for mutations
      retryDelay: (attemptIndex) =>
        Math.min(1500 * Math.pow(2, attemptIndex), 10000),
    },
  },
});

// Persistence utilities for offline support
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const CACHE_MAX_ENTRIES = 500; // keep most recent 500 entries

// Keys that must never be persisted to unencrypted AsyncStorage (PII / financial data)
const EXCLUDED_CACHE_PREFIXES = [
  '["user","profile"',
  '["user","stats"',
  '["payment-history"',
  '["payment"',
  '["escrow"',
  '["financial"',
  '["subscription"',
];

const isSensitiveQuery = (key: string): boolean =>
  EXCLUDED_CACHE_PREFIXES.some((prefix) => key.startsWith(prefix));

export const persistQueryClient = async () => {
  try {
    const clientState = queryClient
      .getQueryCache()
      .getAll()
      .reduce(
        (acc, query) => {
          const { queryKey, state } = query;
          const serializedKey = JSON.stringify(queryKey);
          if (state.status === 'success' && state.data && !isSensitiveQuery(serializedKey)) {
            acc.push({
              key: serializedKey,
              data: state.data,
              dataUpdatedAt: state.dataUpdatedAt,
            });
          }
          return acc;
        },
        [] as { key: string; data: unknown; dataUpdatedAt: number }[]
      );

    // Apply TTL filter
    const now = Date.now();
    const fresh = clientState.filter((e) => now - e.dataUpdatedAt <= CACHE_TTL_MS);
    // Sort by recency and cap entries
    fresh.sort((a, b) => b.dataUpdatedAt - a.dataUpdatedAt);
    const limited = fresh.slice(0, CACHE_MAX_ENTRIES);

    // Rehydrate to object shape for storage
    const payload = limited.reduce((obj, e) => {
      (obj as Record<string, unknown>)[e.key] = { data: e.data, dataUpdatedAt: e.dataUpdatedAt };
      return obj;
    }, {} as Record<string, unknown>);

    await AsyncStorage.setItem('QUERY_CACHE', JSON.stringify(payload));
  } catch (error) {
    logger.error('Failed to persist query cache:', error);
  }
};

export const restoreQueryClient = async () => {
  try {
    const cachedData = await AsyncStorage.getItem('QUERY_CACHE');
    if (cachedData) {
      const parsedData = JSON.parse(cachedData) as Record<string, { data: unknown; dataUpdatedAt: number }>;

      const entries = Object.entries(parsedData)
        .map(([key, value]) => ({ key, ...value }))
        .filter((e) => Date.now() - e.dataUpdatedAt <= CACHE_TTL_MS)
        .sort((a, b) => b.dataUpdatedAt - a.dataUpdatedAt)
        .slice(0, CACHE_MAX_ENTRIES);

      entries.forEach((e) => {
        const queryKey = JSON.parse(e.key);
        queryClient.setQueryData(queryKey, e.data, {
          updatedAt: e.dataUpdatedAt,
        });
      });
    }
  } catch (error) {
    logger.error('Failed to restore query cache:', error);
  }
};

// Query keys factory for consistent key management
export const queryKeys = {
  // User-related queries
  user: {
    profile: (userId: string) => ['user', 'profile', userId] as const,
    stats: (userId: string) => ['user', 'stats', userId] as const,
    preferences: (userId: string) => ['user', 'preferences', userId] as const,
  },

  // Job-related queries
  jobs: {
    all: ['jobs'] as const,
    lists: () => ['jobs', 'list'] as const,
    list: (filters: string) => ['jobs', 'list', filters] as const,
    details: (jobId: string) => ['jobs', 'detail', jobId] as const,
    bids: (jobId: string) => ['jobs', 'bids', jobId] as const,
  },

  // Contractor-related queries
  contractors: {
    all: ['contractors'] as const,
    lists: () => ['contractors', 'list'] as const,
    list: (filters: string) => ['contractors', 'list', filters] as const,
    details: (contractorId: string) =>
      ['contractors', 'detail', contractorId] as const,
    reviews: (contractorId: string) =>
      ['contractors', 'reviews', contractorId] as const,
  },

  // Message-related queries
  messages: {
    all: ['messages'] as const,
    conversations: () => ['messages', 'conversations'] as const,
    conversation: (jobId: string) =>
      ['messages', 'conversation', jobId] as const,
    thread: (threadId: string) => ['messages', 'thread', threadId] as const,
  },

  // Social feed queries
  feed: {
    all: ['feed'] as const,
    posts: (filters?: string) => ['feed', 'posts', filters] as const,
    post: (postId: string) => ['feed', 'post', postId] as const,
    likes: (postId: string) => ['feed', 'likes', postId] as const,
    comments: (postId: string) => ['feed', 'comments', postId] as const,
  },

  // Search queries
  search: {
    all: ['search'] as const,
    contractors: (query: string, filters?: string) =>
      ['search', 'contractors', query, filters] as const,
    jobs: (query: string, filters?: string) =>
      ['search', 'jobs', query, filters] as const,
    services: (query: string) => ['search', 'services', query] as const,
  },
} as const;

// Utility functions for common operations
export const invalidateQueries = {
  userProfile: (userId: string) =>
    queryClient.invalidateQueries({ queryKey: queryKeys.user.profile(userId) }),
  userStats: (userId: string) =>
    queryClient.invalidateQueries({ queryKey: queryKeys.user.stats(userId) }),
  allJobs: () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all }),
  jobDetails: (jobId: string) =>
    queryClient.invalidateQueries({ queryKey: queryKeys.jobs.details(jobId) }),
  allMessages: () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.messages.all }),
  feedPosts: () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.feed.all }),
};

export default queryClient;
