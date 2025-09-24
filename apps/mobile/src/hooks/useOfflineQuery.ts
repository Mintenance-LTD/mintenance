import React from 'react';
import {
  useQuery,
  useMutation,
  useQueryClient,
  type QueryKey,
} from '@tanstack/react-query';
import { useNetworkState } from './useNetworkState';
import { OfflineManager, OfflineAction } from '../services/OfflineManager';
import { LocalDatabase } from '../services/LocalDatabase';
import { SyncManager } from '../services/SyncManager';
import { logger } from '../utils/logger';

export interface OfflineQueryOptions {
  queryKey: QueryKey;
  queryFn: () => Promise<any>;
  staleTime?: number;
  gcTime?: number;
  enabled?: boolean;
  offlineFirst?: boolean; // Prefer cached data even when online
}

export interface OfflineMutationOptions<TVariables = any, TData = any> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  onlineOnly?: boolean; // Fail immediately if offline
  entity: string;
  actionType: OfflineAction['type'];
  optimisticUpdate?: (variables: TVariables) => any;
  getQueryKey?: (variables: TVariables) => QueryKey;
  retryCount?: number;
}

export const useOfflineQuery = <T = any>({
  queryKey,
  queryFn,
  staleTime = 5 * 60 * 1000, // 5 minutes
  gcTime = 30 * 60 * 1000, // 30 minutes for offline data
  enabled = true,
  offlineFirst = false,
}: OfflineQueryOptions) => {
  const { isOnline, connectionQuality } = useNetworkState();

  // Calculate dynamic stale time based on network conditions
  const dynamicStaleTime = React.useMemo(() => {
    if (offlineFirst) return Infinity;
    if (connectionQuality === 'poor') return 30 * 60 * 1000; // 30 minutes on poor connection
    if (!isOnline) return Infinity; // Never stale when offline
    return staleTime;
  }, [offlineFirst, connectionQuality, isOnline, staleTime]);

  // Calculate retry configuration
  const retryConfig = React.useMemo(() => {
    return {
      retry: (failureCount: number, error: any) => {
        // Don't retry if offline
        if (!isOnline) return false;

        // Don't retry on client errors (4xx)
        if (error?.status >= 400 && error?.status < 500) return false;

        // Limit retries on slow connections
        const maxRetries = connectionQuality === 'poor' ? 1 : 3;
        return failureCount < maxRetries;
      },
      retryDelay: (attemptIndex: number) => {
        const baseDelay = connectionQuality === 'poor' ? 2000 : 1000;
        return Math.min(baseDelay * Math.pow(2, attemptIndex), 30000);
      },
    };
  }, [isOnline, connectionQuality]);

  return useQuery<T>({
    queryKey,
    queryFn: async () => {
      try {
        // Try local database first if offline or offlineFirst is enabled
        if (!isOnline || offlineFirst) {
          const localData = await tryLocalQuery(queryKey);
          if (localData !== null) {
            logger.debug('Returning local data', {
              queryKey: (queryKey as string[]).join('.'),
            });
            return localData;
          }
        }

        // Fallback to remote query
        if (!isOnline && !offlineFirst) {
          throw new Error('No internet connection and no local data available');
        }

        const remoteData = await queryFn();

        // Cache successful remote data locally
        if (remoteData && isOnline) {
          await cacheLocalData(queryKey, remoteData).catch((error) => {
            logger.warn('Failed to cache local data:', error);
          });
        }

        return remoteData;
      } catch (error) {
        // Enhanced error logging
        logger.error('Query failed:', error, {
          queryKey: (queryKey as string[]).join('.'),
          isOnline,
          connectionQuality,
          offlineFirst,
        });

        // If online query failed, try local data as fallback
        if (isOnline && !offlineFirst) {
          const localData = await tryLocalQuery(queryKey);
          if (localData !== null) {
            logger.info('Using local data as fallback', {
              queryKey: (queryKey as string[]).join('.'),
            });
            return localData;
          }
        }

        throw error;
      }
    },
    staleTime: dynamicStaleTime,
    gcTime,
    enabled,
    ...retryConfig,
    // Enhanced refetch configuration
    refetchOnWindowFocus: isOnline,
    refetchOnReconnect: true,
    refetchOnMount: (query) => {
      // Only refetch on mount if data is stale or we're online with fresh connection
      return query.state.isInvalidated || (isOnline && !query.state.data);
    },
    meta: {
      offline: true,
      networkDependency: true,
    },
  });
};

export const useOfflineMutation = <TVariables = any, TData = any>({
  mutationFn,
  onlineOnly = false,
  entity,
  actionType,
  optimisticUpdate,
  getQueryKey,
  retryCount = 3,
}: OfflineMutationOptions<TVariables, TData>) => {
  const { isOnline, connectionQuality } = useNetworkState();
  const queryClient = useQueryClient();

  const mutationConfig = React.useMemo(
    () => ({
      retry: onlineOnly ? (isOnline ? 2 : 0) : 1,
      retryDelay: connectionQuality === 'poor' ? 3000 : 1000,
    }),
    [onlineOnly, isOnline, connectionQuality]
  );

  return useMutation<TData, Error, TVariables>({
    ...mutationConfig,
    mutationFn: async (variables: TVariables) => {
      // Enhanced validation
      if (onlineOnly && !isOnline) {
        const error = new Error('This action requires an internet connection');
        logger.warn('Offline mutation blocked:', { entity, actionType });
        throw error;
      }

      // Try online execution first
      if (isOnline) {
        try {
          const result = await mutationFn(variables);
          logger.info('Mutation executed successfully', { entity, actionType });
          return result;
        } catch (error) {
          // Enhanced error handling
          logger.error('Mutation failed online:', error, {
            entity,
            actionType,
            willQueue: !onlineOnly,
          });

          // Queue for offline sync if supported
          if (!onlineOnly) {
            const actionId = await OfflineManager.queueAction({
              type: actionType,
              entity,
              data: variables,
              maxRetries: retryCount,
              // Persist a mutable copy for offline storage
              queryKey: getQueryKey?.(variables) as unknown as string[],
            });

            logger.info('Mutation queued for offline sync', {
              entity,
              actionType,
              actionId,
            });

            // Return optimistic data if available
            if (optimisticUpdate) {
              return optimisticUpdate(variables) as TData;
            }
          }

          throw error;
        }
      }

      // Handle offline execution
      const actionId = await OfflineManager.queueAction({
        type: actionType,
        entity,
        data: variables,
        maxRetries: retryCount,
        // Persist a mutable copy for offline storage
        queryKey: getQueryKey?.(variables) as unknown as string[],
      });

      logger.info('Offline mutation queued', {
        entity,
        actionType,
        actionId,
      });

      // Return optimistic data if available
      if (optimisticUpdate) {
        return optimisticUpdate(variables) as TData;
      }

      // Create a more informative error for offline actions without optimistic updates
      const error = new Error(
        `${entity} ${actionType.toLowerCase()} has been queued and will sync when connection is restored`
      );
      error.name = 'OfflineQueuedError';
      throw error;
    },
    onMutate: async (variables: TVariables) => {
      // Apply optimistic update to cache if provided
      if (optimisticUpdate && getQueryKey) {
        const queryKey = getQueryKey(variables);

        // Cancel any outgoing refetches
        await queryClient.cancelQueries({ queryKey });

        // Snapshot the previous value
        const previousData = queryClient.getQueryData(queryKey);

        // Optimistically update the cache
        const optimisticData = optimisticUpdate(variables);
        queryClient.setQueryData(queryKey, optimisticData);

        return { previousData, queryKey };
      }
    },
    onError: (error, variables, context: any) => {
      // Rollback optimistic update on error
      if (context?.previousData && context?.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previousData);
      }

      logger.error('Mutation error:', error, {
        entity,
        actionType,
        variables,
      });
    },
    onSuccess: (data, variables) => {
      // Invalidate related queries on success
      if (getQueryKey) {
        const queryKey = getQueryKey(variables);
        queryClient.invalidateQueries({ queryKey });
      }

      logger.info('Mutation succeeded', {
        entity,
        actionType,
      });
    },
  });
};

// Helper functions for local data handling
const tryLocalQuery = async (queryKey: QueryKey): Promise<any> => {
  try {
    await LocalDatabase.init();

    const [entity, operation, ...params] = queryKey as string[];

    switch (entity) {
      case 'jobs':
        return await handleJobsQuery(operation, params);
      case 'user':
        return await handleUserQuery(operation, params);
      case 'messages':
        return await handleMessagesQuery(operation, params);
      default:
        return null;
    }
  } catch (error) {
    logger.warn('Local query failed:', { error, queryKey });
    return null;
  }
};

const handleJobsQuery = async (
  operation: string,
  params: string[]
): Promise<any> => {
  switch (operation) {
    case 'list':
      if (params[0] === 'available') {
        return await LocalDatabase.getJobsByStatus('posted');
      } else if (params[0]?.startsWith('homeowner:')) {
        const homeownerId = params[0].split(':')[1];
        return await LocalDatabase.getJobsByHomeowner(homeownerId);
      } else if (params[0]?.startsWith('status:')) {
        const status = params[0].split(':')[1];
        const userId = params[0].includes('user:')
          ? params[0].split('user:')[1]
          : undefined;
        return await LocalDatabase.getJobsByStatus(status, userId);
      }
      break;
    case 'detail':
      return await LocalDatabase.getJob(params[0]);
    default:
      return null;
  }
  return null;
};

const handleUserQuery = async (
  operation: string,
  params: string[]
): Promise<any> => {
  switch (operation) {
    case 'profile':
      return await LocalDatabase.getUser(params[0]);
    default:
      return null;
  }
};

const handleMessagesQuery = async (
  operation: string,
  params: string[]
): Promise<any> => {
  switch (operation) {
    case 'conversation':
      return await LocalDatabase.getMessagesByJob(params[0]);
    default:
      return null;
  }
};

const cacheLocalData = async (queryKey: QueryKey, data: any): Promise<void> => {
  try {
    await LocalDatabase.init();

    const [entity, operation, ...params] = queryKey as string[];

    switch (entity) {
      case 'jobs':
        await cacheJobsData(operation, params, data);
        break;
      case 'user':
        await cacheUserData(operation, params, data);
        break;
      case 'messages':
        await cacheMessagesData(operation, params, data);
        break;
    }
  } catch (error) {
    logger.error('Failed to cache local data:', error, { queryKey });
  }
};

const cacheJobsData = async (
  operation: string,
  params: string[],
  data: any
): Promise<void> => {
  if (Array.isArray(data)) {
    for (const job of data) {
      await LocalDatabase.saveJob(job, false);
    }
  } else if (data) {
    await LocalDatabase.saveJob(data, false);
  }
};

const cacheUserData = async (
  operation: string,
  params: string[],
  data: any
): Promise<void> => {
  if (data) {
    await LocalDatabase.saveUser(data, false);
  }
};

const cacheMessagesData = async (
  operation: string,
  params: string[],
  data: any
): Promise<void> => {
  if (Array.isArray(data)) {
    for (const message of data) {
      const { senderName, senderRole, ...messageData } = message;
      await LocalDatabase.saveMessage(messageData, false);
    }
  }
};

// Hook to get offline sync status
export const useOfflineSyncStatus = () => {
  const { isOnline } = useNetworkState();
  const [syncStatus, setSyncStatus] = React.useState<any>(null);

  React.useEffect(() => {
    const unsubscribe = SyncManager.onSyncStatusChange(setSyncStatus);
    return unsubscribe;
  }, []);

  return {
    isOnline,
    syncStatus,
    hasPendingActions: async () => await OfflineManager.hasPendingActions(),
    getPendingCount: async () => await OfflineManager.getPendingActionsCount(),
    syncNow: () => SyncManager.forcSync(),
    clearQueue: () => OfflineManager.clearQueue(),
    resetAndResync: () => SyncManager.resetAndResync(),
  };
};
