import React from 'react';
import { UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import { View, RefreshControl, ScrollView } from 'react-native';
import {
  LoadingState,
  EmptyState,
  ErrorState,
  SkeletonLoader,
  NetworkStatusIndicator,
} from './LoadingStates';
import { useNetworkState } from '../hooks/useNetworkState';
import { useOfflineSyncStatus } from '../hooks/useOfflineQuery';
import { logger } from '../utils/logger';

export interface QueryStateWrapperProps<TData = any> {
  query: UseQueryResult<TData>;
  children: (data: TData) => React.ReactNode;

  // Loading state customization
  loadingTitle?: string;
  loadingMessage?: string;
  showSkeleton?: boolean;
  skeletonCount?: number;

  // Empty state customization
  emptyTitle?: string;
  emptyMessage?: string;
  emptyIcon?: string;
  emptyActionText?: string;
  onEmptyAction?: () => void;

  // Error state customization
  errorTitle?: string;
  showErrorRetry?: boolean;

  // Pull to refresh
  enableRefresh?: boolean;
  refreshTitle?: string;

  // Container props
  containerStyle?: any;
  contentContainerStyle?: any;
  scrollable?: boolean;

  // Network awareness
  showNetworkIndicator?: boolean;
  offlineMessage?: string;
}

export interface MutationStateWrapperProps<TData = any, TVariables = any> {
  mutation: UseMutationResult<TData, Error, TVariables>;
  children: (
    mutate: (variables: TVariables) => void,
    result: TData | undefined
  ) => React.ReactNode;

  // Loading state
  loadingTitle?: string;
  loadingMessage?: string;
  showLoadingOverlay?: boolean;

  // Success state
  onSuccess?: (data: TData) => void;
  successMessage?: string;

  // Error handling
  showErrorAlert?: boolean;
  onError?: (error: Error) => void;
}

/**
 * Wrapper component for useQuery results that handles all common states
 */
export const QueryStateWrapper = <TData,>({
  query,
  children,
  loadingTitle = 'Loading',
  loadingMessage,
  showSkeleton = false,
  skeletonCount = 3,
  emptyTitle = 'No data found',
  emptyMessage = "There's nothing to show here yet.",
  emptyIcon = 'inbox',
  emptyActionText,
  onEmptyAction,
  errorTitle,
  showErrorRetry = true,
  enableRefresh = true,
  refreshTitle = 'Pull to refresh',
  containerStyle,
  contentContainerStyle,
  scrollable = true,
  showNetworkIndicator = true,
  offlineMessage = 'Some data may be outdated while offline',
}: QueryStateWrapperProps<TData>) => {
  const { isOnline } = useNetworkState();
  const { syncStatus } = useOfflineSyncStatus();

  // Handle different query states
  const renderContent = () => {
    // Loading state
    if (query.isLoading && !query.data) {
      if (showSkeleton) {
        return <SkeletonLoader count={skeletonCount} />;
      }
      return <LoadingState title={loadingTitle} message={loadingMessage} />;
    }

    // Error state
    if (query.isError && !query.data) {
      const isNetworkError =
        !isOnline || query.error?.message?.includes('fetch');

      return (
        <ErrorState
          title={errorTitle}
          message={query.error?.message}
          isNetworkError={isNetworkError}
          showRetry={showErrorRetry}
          onRetry={() => {
            logger.info('User triggered query retry');
            query.refetch();
          }}
        />
      );
    }

    // Empty state
    if (
      query.isSuccess &&
      (!query.data || (Array.isArray(query.data) && query.data.length === 0))
    ) {
      return (
        <EmptyState
          title={emptyTitle}
          message={emptyMessage}
          icon={emptyIcon as any}
          actionText={emptyActionText}
          onActionPress={onEmptyAction}
          showRetry={showErrorRetry}
          onRetry={() => query.refetch()}
        />
      );
    }

    // Success state with data
    if (query.isSuccess && query.data) {
      return children(query.data);
    }

    // Fallback
    return null;
  };

  const content = (
    <View style={[{ flex: 1 }, containerStyle]}>
      {/* Network status indicator */}
      {showNetworkIndicator && (
        <NetworkStatusIndicator
          isOnline={isOnline}
          hasError={query.isError}
          onRetry={() => query.refetch()}
        />
      )}

      {/* Offline data indicator */}
      {!isOnline && query.data && (
        <View
          style={{
            backgroundColor: '#f0f0f0',
            padding: 12,
            alignItems: 'center',
            borderBottomWidth: 1,
            borderBottomColor: '#e0e0e0',
          }}
        >
          <NetworkStatusIndicator
            isOnline={false}
            onRetry={() => query.refetch()}
          />
        </View>
      )}

      {renderContent()}
    </View>
  );

  // Wrap with scrollable container if enabled
  if (scrollable && enableRefresh) {
    return (
      <ScrollView
        style={[{ flex: 1 }, containerStyle]}
        contentContainerStyle={contentContainerStyle}
        refreshControl={
          <RefreshControl
            refreshing={query.isFetching && !query.isLoading}
            onRefresh={() => {
              logger.info('User triggered refresh');
              query.refetch();
            }}
            title={refreshTitle}
          />
        }
      >
        {content}
      </ScrollView>
    );
  }

  if (scrollable) {
    return (
      <ScrollView
        style={[{ flex: 1 }, containerStyle]}
        contentContainerStyle={contentContainerStyle}
      >
        {content}
      </ScrollView>
    );
  }

  return content;
};

/**
 * Wrapper component for useMutation results
 */
export const MutationStateWrapper = <TData, TVariables>({
  mutation,
  children,
  loadingTitle = 'Processing',
  loadingMessage = 'Please wait...',
  showLoadingOverlay = false,
  onSuccess,
  successMessage,
  showErrorAlert = true,
  onError,
}: MutationStateWrapperProps<TData, TVariables>) => {
  // Handle success
  React.useEffect(() => {
    if (mutation.isSuccess && mutation.data) {
      if (onSuccess) {
        onSuccess(mutation.data);
      }
      if (successMessage) {
        // Show success feedback (could integrate with toast/alert system)
        logger.info('Mutation succeeded:', successMessage);
      }
    }
  }, [(mutation as any).isSuccess, mutation.data, onSuccess, successMessage]);

  // Handle error
  React.useEffect(() => {
    if ((mutation as any).isError) {
      logger.error('Mutation failed:', mutation.error as any);

      if (onError && mutation.error) {
        onError(mutation.error as any);
      }

      if (showErrorAlert) {
        // Could integrate with your alert/toast system
        logger.error('Mutation error', (mutation.error as any)?.message);
      }
    }
  }, [(mutation as any).isError, mutation.error, onError, showErrorAlert]);

  const handleMutate = (variables: TVariables) => {
    logger.info('Triggering mutation with variables:', variables);
    mutation.mutate(variables);
  };

  return (
    <View style={{ flex: 1 }}>
      {children(handleMutate, mutation.data)}

      {/* Loading overlay */}
      {showLoadingOverlay && (mutation as any).isLoading && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
          }}
        >
          <View
            style={{
              backgroundColor: 'white',
              padding: 24,
              borderRadius: 8,
              alignItems: 'center',
            }}
          >
            <LoadingState
              title={loadingTitle}
              message={loadingMessage}
              showSpinner={true}
            />
          </View>
        </View>
      )}
    </View>
  );
};

/**
 * Hook for managing query states in functional components
 */
export const useQueryState = <TData,>(query: UseQueryResult<TData>) => {
  const { isOnline } = useNetworkState();

  return React.useMemo(
    () => ({
      isLoading: query.isLoading,
      isError: query.isError,
      isEmpty:
        query.isSuccess &&
        (!query.data || (Array.isArray(query.data) && query.data.length === 0)),
      hasData: query.isSuccess && query.data,
      isOffline: !isOnline,
      isStale: query.isStale,
      isFetching: query.isFetching,
      error: query.error,
      retry: query.refetch,

      // Computed states
      isLoadingOrFetching: query.isLoading || query.isFetching,
      hasError: query.isError && !query.data,
      showOfflineIndicator: !isOnline && query.data,
      canRetry: query.isError || !isOnline,
    }),
    [
      query.isLoading,
      query.isError,
      query.isSuccess,
      query.data,
      query.isStale,
      query.isFetching,
      query.error,
      query.refetch,
      isOnline,
    ]
  );
};

/**
 * Hook for managing mutation states
 */
export const useMutationState = <TData, TVariables>(
  mutation: UseMutationResult<TData, Error, TVariables>
) => {
  return React.useMemo(
    () => ({
      isLoading: (mutation as any).isLoading,
      isError: (mutation as any).isError,
      isSuccess: (mutation as any).isSuccess,
      error: mutation.error,
      data: mutation.data,

      // Helper methods
      mutate: mutation.mutate,
      reset: mutation.reset,

      // Computed states
      canSubmit: !(mutation as any).isLoading,
      hasResult: (mutation as any).isSuccess || (mutation as any).isError,
    }),
    [
      (mutation as any).isLoading,
      (mutation as any).isError,
      (mutation as any).isSuccess,
      mutation.error,
      mutation.data,
      mutation.mutate,
      mutation.reset,
    ]
  );
};
