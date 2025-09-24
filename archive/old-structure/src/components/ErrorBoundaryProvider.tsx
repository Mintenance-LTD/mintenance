import React from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { ScreenErrorBoundary } from './ScreenErrorBoundary';
import { QueryErrorBoundary } from './QueryErrorBoundary';
import { AsyncErrorBoundary } from './AsyncErrorBoundary';

// Main app error boundary wrapper
interface AppErrorBoundaryProps {
  children: React.ReactNode;
}

export const AppErrorBoundary: React.FC<AppErrorBoundaryProps> = ({
  children,
}) => {
  const handleGlobalError = (error: Error, errorInfo: any) => {
    console.error('Global app error:', error);

    try {
      const { captureException } = require('../config/sentry');
      captureException(error, {
        tags: { errorBoundary: 'global' },
        extra: errorInfo,
      });
    } catch (sentryError) {
      console.warn('Failed to report global error:', sentryError);
    }
  };

  return <ErrorBoundary onError={handleGlobalError}>{children}</ErrorBoundary>;
};

// HOC for wrapping screens with error boundaries
export const withScreenErrorBoundary = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  screenName: string,
  options: {
    fallbackRoute?: string;
    showHomeButton?: boolean;
  } = {}
) => {
  const ComponentWithErrorBoundary = (props: P) =>
    // Cast to any to allow optional fields without altering component prop types
    React.createElement(ScreenErrorBoundary as any, {
      screenName,
      fallbackRoute: options.fallbackRoute,
      showHomeButton: options.showHomeButton,
      children: React.createElement(WrappedComponent, props as any),
    });

  ComponentWithErrorBoundary.displayName = `withScreenErrorBoundary(${screenName})`;
  return ComponentWithErrorBoundary;
};

// HOC for wrapping query components
export const withQueryErrorBoundary = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  queryName: string,
  onRetry?: () => void
) => {
  const ComponentWithQueryBoundary = (props: P) => (
    <QueryErrorBoundary queryName={queryName} onRetry={onRetry}>
      <WrappedComponent {...props} />
    </QueryErrorBoundary>
  );

  ComponentWithQueryBoundary.displayName = `withQueryErrorBoundary(${queryName})`;
  return ComponentWithQueryBoundary;
};

// HOC for wrapping async operations
export const withAsyncErrorBoundary = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  operationName: string,
  options: {
    onRetry?: () => Promise<void>;
    fallbackMessage?: string;
  } = {}
) => {
  const ComponentWithAsyncBoundary = (props: P) => (
    <AsyncErrorBoundary
      operationName={operationName}
      onRetry={options.onRetry}
      fallbackMessage={options.fallbackMessage}
    >
      <WrappedComponent {...props} />
    </AsyncErrorBoundary>
  );

  ComponentWithAsyncBoundary.displayName = `withAsyncErrorBoundary(${operationName})`;
  return ComponentWithAsyncBoundary;
};

// Export all boundary components
export {
  ErrorBoundary,
  ScreenErrorBoundary,
  QueryErrorBoundary,
  AsyncErrorBoundary,
};

// Error boundary hook for functional components
export const useErrorHandler = () => {
  const handleError = React.useCallback((error: Error, context?: string) => {
    console.error(`Error in ${context || 'component'}:`, error);

    // Report to error tracking service
    try {
      import('../config/sentry').then(({ captureException }) => {
        captureException(error, {
          tags: {
            context: context || 'manual',
          },
        });
      });
    } catch (sentryError) {
      console.warn('Failed to report error:', sentryError);
    }
  }, []);

  const handleAsyncError = React.useCallback(
    async (asyncOperation: () => Promise<any>, context?: string) => {
      try {
        return await asyncOperation();
      } catch (error) {
        handleError(error as Error, context);
        throw error; // Re-throw so caller can handle appropriately
      }
    },
    [handleError]
  );

  return { handleError, handleAsyncError };
};
