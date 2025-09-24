// Use the global ErrorUtils provided by React Native
import { logger } from './logger';
declare const ErrorUtils: {
  setGlobalHandler: (handler: (error: any, isFatal?: boolean) => void) => void;
};

// Global error handler for unhandled JS errors
export const setupGlobalErrorHandler = () => {
  // Handle JS errors
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    logger.error('Global JS Error:', error);

    // Import Sentry dynamically
    import('@sentry/react-native')
      .then(({ captureException }) => {
        captureException(error, {
          contexts: {
            errorInfo: {
              isFatal,
              source: 'globalErrorHandler',
            },
          },
        });
      })
      .catch((e) => {
        logger.warn('Sentry not available for global error:', { data: e });
      });

    // In development, throw the error to show the red screen
    if (__DEV__ && !isFatal) {
      logger.warn('Non-fatal error handled globally:', { data: error });
    }
  });

  // Handle unhandled promise rejections
  const originalHandler =
    require('react-native/Libraries/Core/ExceptionsManager').unstable_setGlobalHandler;
  if (originalHandler) {
    originalHandler((error: any, isFatal: boolean) => {
      logger.error('Unhandled Promise Rejection:', error);

      import('@sentry/react-native')
        .then(({ captureException }) => {
          captureException(new Error(`Unhandled Promise Rejection: ${error}`), {
            contexts: {
              errorInfo: {
                isFatal,
                source: 'unhandledPromise',
              },
            },
          });
        })
        .catch((e) => {
          logger.warn('Sentry not available for promise rejection:', {
            data: e,
          });
        });
    });
  }
};

// Custom error logger
export const logError = (error: Error, context?: any) => {
  logger.error('App Error:', error, context);

  import('@sentry/react-native')
    .then(({ captureException }) => {
      captureException(error, {
        contexts: {
          customContext: context,
        },
      });
    })
    .catch((e) => {
      logger.warn('Sentry not available for custom error:', { data: e });
    });
};

// Performance monitoring
export const trackPerformance = (operation: string, duration: number) => {
  logger.debug(`Performance: ${operation} took ${duration}ms`);

  import('@sentry/react-native')
    .then(({ addBreadcrumb }) => {
      addBreadcrumb({
        message: `${operation} completed`,
        data: { duration },
        category: 'performance',
      });
    })
    .catch((e) => {
      logger.warn('Sentry not available for performance tracking:', {
        data: e,
      });
    });
};
