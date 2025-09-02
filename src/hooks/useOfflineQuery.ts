import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNetworkState } from './useNetworkState';
import { OfflineManager, OfflineAction } from '../services/OfflineManager';
import { logger } from '../utils/logger';

export interface OfflineQueryOptions {
  queryKey: string[];
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
  getQueryKey?: (variables: TVariables) => string[];
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

  return useQuery<T>({
    queryKey,
    queryFn,
    staleTime: offlineFirst ? Infinity : staleTime,
    gcTime,
    enabled,
    retry: (failureCount, error: any) => {
      // Don't retry if offline
      if (!isOnline) {
        return false;
      }
      
      // Don't retry on client errors (4xx)
      if (error?.status >= 400 && error?.status < 500) {
        return false;
      }
      
      // Limit retries on slow connections
      const maxRetries = connectionQuality === 'poor' ? 1 : 3;
      return failureCount < maxRetries;
    },
    retryDelay: (attemptIndex) => {
      // Longer delay on slow connections
      const baseDelay = connectionQuality === 'poor' ? 2000 : 1000;
      return Math.min(baseDelay * 2 ** attemptIndex, 30000);
    },
    // Prefer cached data on slow connections
    staleTime: connectionQuality === 'poor' ? Infinity : staleTime,
    meta: {
      offline: true,
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
  const { isOnline } = useNetworkState();
  const queryClient = useQueryClient();

  return useMutation<TData, Error, TVariables>({
    mutationFn: async (variables: TVariables) => {
      // If online-only and we're offline, throw error
      if (onlineOnly && !isOnline) {
        throw new Error('This action requires an internet connection');
      }

      // If online, try to execute immediately
      if (isOnline) {
        try {
          return await mutationFn(variables);
        } catch (error) {
          // If immediate execution fails and we support offline, queue it
          if (!onlineOnly) {
            logger.warn('Online mutation failed, queueing for offline sync', {
              entity,
              actionType,
              error: (error as Error).message,
            });
            
            await OfflineManager.queueAction({
              type: actionType,
              entity,
              data: variables,
              maxRetries: retryCount,
              queryKey: getQueryKey?.(variables),
            });

            // Return optimistic data if available
            if (optimisticUpdate) {
              return optimisticUpdate(variables) as TData;
            }
            
            // Re-throw if no optimistic update
            throw error;
          }
          throw error;
        }
      }

      // If offline, queue the action
      await OfflineManager.queueAction({
        type: actionType,
        entity,
        data: variables,
        maxRetries: retryCount,
        queryKey: getQueryKey?.(variables),
      });

      logger.info('Action queued for offline sync', {
        entity,
        actionType,
      });

      // Return optimistic data if available
      if (optimisticUpdate) {
        return optimisticUpdate(variables) as TData;
      }

      // If no optimistic update, we can't return data
      throw new Error('Action queued for when connection is restored');
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

// Hook to get offline sync status
export const useOfflineSyncStatus = () => {
  const { isOnline } = useNetworkState();
  
  return {
    isOnline,
    hasPendingActions: async () => await OfflineManager.hasPendingActions(),
    getPendingCount: async () => await OfflineManager.getPendingActionsCount(),
    syncNow: () => OfflineManager.syncQueue(),
    clearQueue: () => OfflineManager.clearQueue(),
  };
};