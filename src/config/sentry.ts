import * as Sentry from '@sentry/react-native';
import { init } from 'sentry-expo';
import { User } from '../types';
import { logger } from '../utils/logger';

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

export const initSentry = () => {
  if (!SENTRY_DSN) {
    logger.warn('Sentry DSN not configured. Error reporting disabled.');
    return;
  }

  // Use sentry-expo for initialization
  init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    enableInExpoDevelopment: false,
    debug: __DEV__,
    beforeSend(event) {
      if (__DEV__) {
        return null;
      }
      return event;
    }
  });
};

export const captureException = (error: Error, extra?: Record<string, any>) => {
  if (__DEV__) {
    logger.error('Error:', error, extra);
    return;
  }

  Sentry.captureException(error, {
    extra,
  });
};

export const captureMessage = (message: string, level: Sentry.SeverityLevel = 'info') => {
  if (__DEV__) {
    logger.debug('[${level.toUpperCase()}] ${message}');
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

export const addBreadcrumb = (message: string, category?: string, data?: Record<string, any>) => {
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
  if (__DEV__) {
    logger.debug(`Transaction started: ${name} (${op})`);
    return null;
  }
  // Use breadcrumbs for tracking instead of transactions in sentry-expo
  Sentry.addBreadcrumb({
    message: `Transaction started: ${name}`,
    level: 'info',
    category: 'performance',
    data: { op }
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
    
    if (!__DEV__) {
      Sentry.addBreadcrumb({
        message: `${name} completed in ${duration}ms`,
        level: 'info',
        category: 'performance',
        data: { op, duration }
      });
    }
    
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    if (!__DEV__) {
      Sentry.addBreadcrumb({
        message: `${name} failed after ${duration}ms`,
        level: 'error',
        category: 'performance',
        data: { op, duration, error: (error as Error).message }
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
      data: { url, method, startTime }
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
          data: { url, method, status, duration }
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
          data: { url, method, status, duration, error: error.message }
        });
      }
      captureException(error, { url, method, status });
    },
  };
};

// Navigation tracking
export const trackNavigation = (screenName: string, previousScreen?: string) => {
  addBreadcrumb(
    `Navigated to ${screenName}`,
    'navigation',
    { screenName, previousScreen }
  );
  
  Sentry.setContext('screen', {
    current: screenName,
    previous: previousScreen,
    timestamp: new Date().toISOString(),
  });
};

// Business logic monitoring
export const trackUserAction = (action: string, details?: Record<string, any>) => {
  addBreadcrumb(`User action: ${action}`, 'user', details);
};

// App state monitoring
export const trackAppState = (state: 'active' | 'background' | 'inactive') => {
  addBreadcrumb(`App state changed to ${state}`, 'app.lifecycle');
};