/**
 * LAZY LOADING BOUNDARY COMPONENT
 * Enhanced Suspense boundary with error handling and performance monitoring
 */

import React, { Suspense } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { LoadingSpinner } from './LoadingSpinner';
import { logger } from '../utils/logger';
import { codeSplittingManager } from '../utils/codeSplitting';

interface LazyLoadingBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<LazyLoadingFallbackProps>;
  chunkName?: string;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  enableMetrics?: boolean;
}

interface LazyLoadingFallbackProps {
  chunkName?: string;
  loadingMessage?: string;
}

interface LazyLoadingBoundaryState {
  hasError: boolean;
  error?: Error;
  retryCount: number;
  loadingStartTime?: number;
}

/**
 * Default fallback component for lazy loading
 */
const DefaultLazyFallback: React.FC<LazyLoadingFallbackProps> = ({
  chunkName,
  loadingMessage,
}) => {
  const message =
    loadingMessage || (chunkName ? `Loading ${chunkName}...` : 'Loading...');

  return (
    <View style={styles.fallbackContainer}>
      <LoadingSpinner
        message={message}
        size='large'
        {...({ testID: 'lazy-loading-spinner' } as any)}
      />
    </View>
  );
};

/**
 * Error fallback component for lazy loading failures
 */
const LazyErrorFallback: React.FC<{
  error: Error;
  retryCount: number;
  onRetry: () => void;
  chunkName?: string;
}> = ({ error, retryCount, onRetry, chunkName }) => (
  <View style={styles.errorContainer}>
    <Text style={styles.errorTitle}>Loading Failed</Text>
    <Text style={styles.errorMessage}>
      {chunkName ? `Failed to load ${chunkName}` : 'Component failed to load'}
    </Text>
    <Text style={styles.errorDetails}>{error.message}</Text>
    {retryCount < 3 && (
      <Text style={styles.retryButton} onPress={onRetry}>
        Retry ({retryCount}/3)
      </Text>
    )}
  </View>
);

/**
 * Enhanced lazy loading boundary with performance monitoring and error handling
 */
export class LazyLoadingBoundary extends React.Component<
  LazyLoadingBoundaryProps,
  LazyLoadingBoundaryState
> {
  private loadingTimeout?: NodeJS.Timeout;

  constructor(props: LazyLoadingBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      retryCount: 0,
      loadingStartTime: Date.now(),
    };
  }

  static getDerivedStateFromError(
    error: Error
  ): Partial<LazyLoadingBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    const { chunkName, onError, enableMetrics = true } = this.props;

    // Log the error
    logger.error(
      `Lazy loading error${chunkName ? ` for ${chunkName}` : ''}:`,
      error,
      {
        componentStack: errorInfo.componentStack,
        retryCount: this.state.retryCount,
      }
    );

    // Track metrics if enabled
    if (enableMetrics && chunkName) {
      // This would be tracked by the code splitting manager
      logger.performance(`Lazy load failed`, 0, {
        chunkName,
        retryCount: this.state.retryCount,
        error: error.message,
      });
    }

    // Call custom error handler
    if (onError) {
      onError(error, errorInfo);
    }
  }

  componentDidMount(): void {
    if (this.props.enableMetrics) {
      this.startLoadingTimer();
    }
  }

  componentWillUnmount(): void {
    if (this.loadingTimeout) {
      clearTimeout(this.loadingTimeout);
    }
  }

  /**
   * Start timer to track loading performance
   */
  private startLoadingTimer = (): void => {
    const { chunkName } = this.props;
    const startTime = Date.now();

    // Set a timeout to detect slow loading chunks
    this.loadingTimeout = setTimeout(() => {
      logger.warn(
        `Slow lazy loading detected${chunkName ? ` for ${chunkName}` : ''}`,
        {
          loadingTime: Date.now() - startTime,
          threshold: 5000,
        }
      );
    }, 5000); // 5 second threshold
  };

  /**
   * Handle retry attempts
   */
  private handleRetry = (): void => {
    if (this.state.retryCount < 3) {
      this.setState((prevState) => ({
        hasError: false,
        error: undefined,
        retryCount: prevState.retryCount + 1,
        loadingStartTime: Date.now(),
      }));

      // Clear any existing timeout
      if (this.loadingTimeout) {
        clearTimeout(this.loadingTimeout);
      }

      // Restart loading timer
      if (this.props.enableMetrics) {
        this.startLoadingTimer();
      }

      logger.debug(
        `Retrying lazy load${this.props.chunkName ? ` for ${this.props.chunkName}` : ''} (attempt ${this.state.retryCount + 1})`
      );
    }
  };

  render(): React.ReactNode {
    const { children, fallback: CustomFallback, chunkName } = this.props;
    const { hasError, error, retryCount } = this.state;

    // Show error fallback if there's an error
    if (hasError && error) {
      return (
        <LazyErrorFallback
          error={error}
          retryCount={retryCount}
          onRetry={this.handleRetry}
          chunkName={chunkName}
        />
      );
    }

    // Render with Suspense and fallback
    const FallbackComponent = CustomFallback || DefaultLazyFallback;

    return (
      <Suspense
        fallback={
          <FallbackComponent
            chunkName={chunkName}
            loadingMessage={chunkName ? `Loading ${chunkName}...` : undefined}
          />
        }
      >
        {children}
      </Suspense>
    );
  }
}

/**
 * Hook for lazy loading with automatic boundary
 */
export const useLazyComponent = <P extends object>(
  importFn: () => Promise<{ default: React.ComponentType<P> }>,
  chunkName: string,
  options?: {
    preload?: boolean;
    timeout?: number;
    retryAttempts?: number;
  }
): {
  Component: React.ComponentType<P>;
  LazyBoundary: React.ComponentType<{ children: React.ReactNode }>;
} => {
  const LazyComponent = React.useMemo(() => {
    return codeSplittingManager.createLazyComponent(importFn, {
      chunkName,
      preload: options?.preload,
      timeout: options?.timeout,
      retryAttempts: options?.retryAttempts,
    });
  }, [importFn, chunkName, options]);

  const LazyBoundary: React.ComponentType<{ children: React.ReactNode }> =
    React.useMemo(
      () =>
        ({ children }) => (
          <LazyLoadingBoundary chunkName={chunkName} enableMetrics>
            {children}
          </LazyLoadingBoundary>
        ),
      [chunkName]
    );

  return {
    Component: LazyComponent,
    LazyBoundary,
  };
};

const styles = StyleSheet.create({
  fallbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#d32f2f',
    marginBottom: 10,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorDetails: {
    fontSize: 12,
    color: '#999',
    marginBottom: 20,
    textAlign: 'center',
    fontFamily: 'monospace',
  },
  retryButton: {
    fontSize: 16,
    color: '#1976d2',
    fontWeight: '500',
    padding: 10,
    textDecorationLine: 'underline',
  },
});

export { DefaultLazyFallback, LazyErrorFallback };
