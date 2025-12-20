import * as Sentry from '@sentry/react-native';
import { init } from 'sentry-expo';
import { User } from '../types';
import { setSentryFunctions, logger } from '../utils/logger';
import { config, isFeatureEnabled } from './environment';

export const initSentry = () => {
  // Check if crash reporting is enabled and if we have a DSN
  if (!isFeatureEnabled('enableCrashReporting') || !config.sentryDsn) {
    logger.info('Sentry disabled', {
      crashReportingEnabled: isFeatureEnabled('enableCrashReporting'),
      hasDsn: !!config.sentryDsn,
    });
    // Set up no-op functions for logger
    setSentryFunctions({
      captureMessage: () => {},
      captureException: () => {},
      addBreadcrumb: () => {},
    });
    return;
  }

  // Use sentry-expo for initialization
  init({
    dsn: config.sentryDsn,
    environment: config.environment,
    enableInExpoDevelopment: false,
    debug: config.environment === 'development',
    beforeSend(event) {
      // Don't send events in development unless explicitly enabled
      if (config.environment === 'development') {
        return null;
      }
      return event;
    },
  });

  // Set up Sentry functions for logger after initialization
  setSentryFunctions({
    captureMessage: Sentry.captureMessage,
    captureException: Sentry.captureException,
    addBreadcrumb: Sentry.addBreadcrumb,
  });
};

export const captureException = (error: Error, extra?: Record<string, any>) => {
  if (
    !isFeatureEnabled('enableCrashReporting') ||
    config.environment === 'development'
  ) {
    logger.error('Sentry', error, extra);
    return;
  }

  Sentry.captureException(error, {
    extra,
  });
};

export const captureMessage = (
  message: string,
  level: Sentry.SeverityLevel = 'info'
) => {
  if (
    !isFeatureEnabled('enableCrashReporting') ||
    config.environment === 'development'
  ) {
    if (level === 'error') {
      logger.error('Sentry', message);
    } else if (level === 'warning') {
      logger.warn('Sentry', message);
    } else {
      logger.info('Sentry', message);
    }
    return;
  }

  Sentry.captureMessage(message, level);
};

export const setUserContext = (user: User | null) => {
  if (user) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: `${user.first_name} ${user.last_name}`,
    });

    // Set additional context
    Sentry.setContext('user_profile', {
      role: user.role,
      created_at: user.created_at,
      updated_at: user.updated_at,
    });
  } else {
    Sentry.setUser(null);
  }
};

export const addBreadcrumb = (
  message: string,
  category?: string,
  data?: Record<string, any>
) => {
  Sentry.addBreadcrumb({
    message,
    category: category || 'app',
    level: 'info',
    data,
    timestamp: Date.now() / 1000,
  });
};

// Performance monitoring utilities
export const startTransaction = (name: string, op: string) => {
  if (
    !isFeatureEnabled('enablePerformanceMonitoring') ||
    config.environment === 'development'
  ) {
    logger.debug(`Transaction started: ${name} (${op})`);
    return null;
  }
  // Use breadcrumbs for tracking instead of transactions in sentry-expo
  Sentry.addBreadcrumb({
    message: `Transaction started: ${name}`,
    level: 'info',
    category: 'performance',
    data: { op },
  });
  return { name, op, finish: () => {} }; // Return mock transaction
};

export const measureAsyncPerformance = async <T>(
  operation: () => Promise<T>,
  name: string,
  op: string = 'function'
): Promise<T> => {
  const startTime = Date.now();

  try {
    const result = await operation();
    const duration = Date.now() - startTime;

    if (
      isFeatureEnabled('enablePerformanceMonitoring') &&
      config.environment !== 'development'
    ) {
      Sentry.addBreadcrumb({
        message: `${name} completed in ${duration}ms`,
        level: 'info',
        category: 'performance',
        data: { op, duration },
      });
    }

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;

    if (
      isFeatureEnabled('enablePerformanceMonitoring') &&
      config.environment !== 'development'
    ) {
      Sentry.addBreadcrumb({
        message: `${name} failed after ${duration}ms`,
        level: 'error',
        category: 'performance',
        data: { op, duration, error: (error as Error).message },
      });
    }

    captureException(error as Error, { operation: name });
    throw error;
  }
};

// Network request monitoring
export const trackNetworkRequest = (url: string, method: string) => {
  const requestId = `${method.toUpperCase()}_${url}`;
  const startTime = Date.now();

  if (!__DEV__) {
    Sentry.addBreadcrumb({
      message: `Network request: ${method.toUpperCase()} ${url}`,
      level: 'info',
      category: 'http',
      data: { url, method, startTime },
    });
  }

  return {
    success: (status: number) => {
      const duration = Date.now() - startTime;
      if (!__DEV__) {
        Sentry.addBreadcrumb({
          message: `Request success: ${requestId} (${status}) in ${duration}ms`,
          level: 'info',
          category: 'http',
          data: { url, method, status, duration },
        });
      }
    },
    error: (error: Error, status?: number) => {
      const duration = Date.now() - startTime;
      if (!__DEV__) {
        Sentry.addBreadcrumb({
          message: `Request failed: ${requestId} ${status ? `(${status})` : ''} in ${duration}ms`,
          level: 'error',
          category: 'http',
          data: { url, method, status, duration, error: error.message },
        });
      }
      captureException(error, { url, method, status });
    },
  };
};

// Navigation tracking
export const trackNavigation = (
  screenName: string,
  previousScreen?: string
) => {
  addBreadcrumb(`Navigated to ${screenName}`, 'navigation', {
    screenName,
    previousScreen,
  });

  Sentry.setContext('screen', {
    current: screenName,
    previous: previousScreen,
    timestamp: new Date().toISOString(),
  });
};

// Business logic monitoring
export const trackUserAction = (
  action: string,
  details?: Record<string, any>
) => {
  addBreadcrumb(`User action: ${action}`, 'user', details);
};

// App state monitoring
export const trackAppState = (state: 'active' | 'background' | 'inactive') => {
  addBreadcrumb(`App state changed to ${state}`, 'app.lifecycle');
};
