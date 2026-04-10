/**
 * Enhanced Mobile Logger
 *
 * Production-ready logger for React Native mobile application
 * Integrates with crash reporting and provides structured logging
 */

import { createLogger } from '@mintenance/shared/lib/logger-config';
import type { EnhancedLogger } from '@mintenance/shared/enhanced-logger';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Application from 'expo-application';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Create mobile-specific logger instance
const baseLogger: EnhancedLogger = createLogger({
  service: 'mintenance-mobile',
  environment: __DEV__ ? 'development' : 'production',
  minLogLevel: __DEV__ ? 'debug' : 'info',
  enableDatadog: !__DEV__ && process.env.EXPO_PUBLIC_DATADOG_ENABLED === 'true',
  datadogApiKey: process.env.DATADOG_API_KEY,
  enableSentry: !__DEV__,
});

// Add mobile-specific context
const mobileContext = {
  platform: 'mobile' as const,
  device: `${Device.brand ?? 'unknown'}-${Device.modelName ?? 'unknown'}`,
  os: Platform.OS,
  osVersion: String(Platform.Version),
  deviceYear: Device.deviceYearClass ?? undefined,
  deviceType: Device.deviceType ?? undefined,
  appVersion: Application.nativeApplicationVersion ?? undefined,
  appBuildVersion: Application.nativeBuildVersion ?? undefined,
  isDevice: Device.isDevice,
};

// Create logger with mobile context
const logger = baseLogger.child(mobileContext);

// Track app state changes
let appStateSubscription: { remove: () => void } | undefined;

if (Platform.OS !== 'web') {
  import('react-native').then(({ AppState }) => {
    appStateSubscription = AppState.addEventListener(
      'change',
      (nextAppState) => {
        logger.info('App state changed', { appState: nextAppState });
      }
    );
  });
}

// Helper functions for mobile-specific logging

/**
 * Log navigation events
 */
function logNavigation(from: string, to: string, params?: unknown): void {
  logger.info('Navigation', {
    from,
    to,
    params: params ? JSON.stringify(params) : undefined,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Log screen views
 */
function logScreenView(
  screenName: string,
  metadata?: Record<string, unknown>
): void {
  logger.info('Screen view', {
    screenName,
    ...metadata,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Log user interactions
 */
function logInteraction(
  component: string,
  action: string,
  metadata?: Record<string, unknown>
): void {
  logger.info('User interaction', {
    component,
    action,
    ...metadata,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Log API calls
 */
function logApiCall(
  method: string,
  endpoint: string,
  status?: number,
  duration?: number,
  error?: Error
): void {
  if (error) {
    logger.error('API call failed', error, {
      method,
      endpoint,
      status,
      duration,
    });
  } else {
    const level = status && status >= 400 ? 'error' : 'info';
    logger.log(level as 'info' | 'error', 'API call', {
      method,
      endpoint,
      status,
      duration,
    });
  }
}

/**
 * Log performance metrics
 */
function logPerformance(
  operation: string,
  duration: number,
  metadata?: Record<string, unknown>
): void {
  logger.info('Performance', {
    operation,
    duration,
    ...metadata,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Log storage operations
 */
function logStorage(
  operation: 'get' | 'set' | 'remove' | 'clear',
  key?: string,
  success: boolean = true,
  error?: Error
): void {
  if (error) {
    logger.error('Storage operation failed', error, {
      operation,
      key,
    });
  } else {
    logger.debug('Storage operation', {
      operation,
      key,
      success,
    });
  }
}

/**
 * Log permission requests
 */
function logPermission(
  permission: string,
  status: string,
  metadata?: Record<string, unknown>
): void {
  logger.info('Permission request', {
    permission,
    status,
    ...metadata,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Log push notification events
 */
function logNotification(
  event: 'received' | 'opened' | 'dismissed',
  notificationId?: string,
  metadata?: Record<string, unknown>
): void {
  logger.info('Push notification', {
    event,
    notificationId,
    ...metadata,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Log authentication events
 */
function logAuth(
  action: 'login' | 'logout' | 'register' | 'refresh',
  success: boolean,
  method?: string,
  error?: Error
): void {
  if (error) {
    logger.error('Authentication failed', error, {
      action,
      method,
    });
  } else {
    logger.info('Authentication', {
      action,
      success,
      method,
    });
  }
}

/**
 * Log offline/online status changes
 */
function logConnectivity(isConnected: boolean, connectionType?: string): void {
  logger.info('Connectivity changed', {
    isConnected,
    connectionType,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Log camera/media operations
 */
export function logMedia(
  operation: 'capture' | 'select' | 'upload' | 'process',
  mediaType: 'photo' | 'video',
  success: boolean,
  metadata?: Record<string, unknown>
): void {
  logger.info('Media operation', {
    operation,
    mediaType,
    success,
    ...metadata,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Log payment events
 */
function logPayment(
  action: string,
  amount?: number,
  currency?: string,
  success?: boolean,
  error?: Error
): void {
  // Be careful not to log sensitive payment data
  const safeMetadata = {
    action,
    amount,
    currency,
    success,
    timestamp: new Date().toISOString(),
  };

  if (error) {
    logger.error('Payment operation failed', error, safeMetadata);
  } else {
    logger.info('Payment operation', safeMetadata);
  }
}

/**
 * Create a logger for a specific screen
 */
function createScreenLogger(screenName: string): EnhancedLogger {
  return logger.child({ screen: screenName });
}

/**
 * Create a logger for a specific service
 */
function createServiceLogger(serviceName: string): EnhancedLogger {
  return logger.child({ service: serviceName });
}

/**
 * Log app crashes (to be called from error boundaries)
 */
function logCrash(error: Error, errorInfo?: unknown): void {
  logger.error('App crashed', error, {
    errorInfo: errorInfo ? JSON.stringify(errorInfo) : undefined,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Initialize crash reporting
 */
function initializeCrashReporting(): void {
  if (!__DEV__) {
    // Set up global error handler
    const originalHandler = ErrorUtils.getGlobalHandler();

    ErrorUtils.setGlobalHandler((error, isFatal) => {
      logger.error('Unhandled error', error as Error, {
        isFatal,
        timestamp: new Date().toISOString(),
      });

      // Call original handler
      if (originalHandler) {
        originalHandler(error, isFatal);
      }
    });
  }
}

/**
 * Log session start (to be called on app launch)
 */
async function logSessionStart(): Promise<void> {
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  await AsyncStorage.setItem('sessionId', sessionId);

  logger.info('Session started', {
    sessionId,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Log session end (to be called on app background/close)
 */
async function logSessionEnd(): Promise<void> {
  const sessionId = await AsyncStorage.getItem('sessionId');

  logger.info('Session ended', {
    sessionId: sessionId ?? undefined,
    timestamp: new Date().toISOString(),
  });
}

// Clean up on unmount
function cleanup(): void {
  if (appStateSubscription) {
    appStateSubscription.remove();
  }
}

// Export the logger instance and type
export { logger };
export default logger;
