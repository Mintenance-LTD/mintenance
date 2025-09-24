import React, { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { AppState, AppStateStatus } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import {
  queryClient,
  persistQueryClient,
  restoreQueryClient,
} from '../lib/queryClient';
import { OfflineManager } from '../services/OfflineManager';
import { logger } from '../utils/logger';

interface QueryProviderProps {
  children: React.ReactNode;
}

const QueryProvider: React.FC<QueryProviderProps> = ({ children }) => {
  // Restore cache on app start
  useEffect(() => {
    restoreQueryClient();
  }, []);

  // Persist cache when app goes to background
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        persistQueryClient();
      }
    };

    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange
    );
    return () => subscription?.remove();
  }, []);

  // Network-aware focus management
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        // Check network state before refetching
        NetInfo.fetch().then((state) => {
          if (state.isConnected && state.isInternetReachable) {
            // Refetch all queries when app becomes active and online
            queryClient.refetchQueries();

            // Try to sync offline queue
            OfflineManager.syncQueue();
          }
        });
      }
    };

    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange
    );
    return () => subscription?.remove();
  }, []);

  // Network state monitoring for offline sync
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable) {
        logger.info('Network connection restored, attempting sync');

        // Retry failed queries
        queryClient.refetchQueries({
          type: 'all',
          stale: true,
        });

        // Sync offline queue
        OfflineManager.syncQueue();
      } else {
        logger.info('Network connection lost, entering offline mode');
      }
    });

    return unsubscribe;
  }, []);

  // Note: User session management is handled in AuthContext
  // Cache clearing logic moved to AuthContext signOut method

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {__DEV__ && (
        <ReactQueryDevtools
          initialIsOpen={false}
          buttonPosition='bottom-right'
        />
      )}
    </QueryClientProvider>
  );
};

export default QueryProvider;
