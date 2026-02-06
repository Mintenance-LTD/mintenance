/**
 * Enhanced Web Logger
 *
 * Production-ready logger for Next.js web application
 * Integrates with monitoring services and provides structured logging
 */

import { createLogger } from '@mintenance/shared/lib/logger-config';
import type { EnhancedLogger } from '@mintenance/shared/enhanced-logger';

// Create web-specific logger instance
const logger: EnhancedLogger = createLogger({
  service: 'mintenance-web',
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV || 'development',
  minLogLevel: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  enableDatadog: process.env.NEXT_PUBLIC_DATADOG_ENABLED === 'true',
  datadogApiKey: process.env.DATADOG_API_KEY,
  enableSentry: process.env.NEXT_PUBLIC_SENTRY_ENABLED === 'true'
});

// Add web-specific context
if (typeof window !== 'undefined') {
  // Browser context
  const browserContext = {
    platform: 'web-browser',
    userAgent: navigator.userAgent,
    language: navigator.language,
    screen: {
      width: window.screen.width,
      height: window.screen.height,
      pixelRatio: window.devicePixelRatio
    },
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight
    }
  };

  // Create child logger with browser context
  const browserLogger = logger.child(browserContext);

  // Track page views
  if (typeof window !== 'undefined' && window.location) {
    browserLogger.info('Page view', {
      url: window.location.href,
      pathname: window.location.pathname,
      referrer: document.referrer
    });
  }

  // Track uncaught errors
  window.addEventListener('error', (event) => {
    browserLogger.error('Uncaught error', event.error || new Error(event.message), {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    });
  });

  // Track unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    browserLogger.error('Unhandled promise rejection', event.reason, {
      promise: String(event.promise)
    });
  });

  // Export browser logger
  module.exports = browserLogger;
} else {
  // Server context
  const serverContext = {
    platform: 'web-server',
    nodeVersion: process.version,
    pid: process.pid
  };

  // Create child logger with server context
  const serverLogger = logger.child(serverContext);

  // Export server logger
  module.exports = serverLogger;
}

// Helper functions for common logging patterns

/**
 * Log API requests
 */
export function logApiRequest(
  method: string,
  endpoint: string,
  params?: unknown,
  headers?: unknown
): void {
  logger.info('API request', {
    method,
    endpoint,
    params: params ? JSON.stringify(params) : undefined,
    headers: headers ? JSON.stringify(headers) : undefined,
    timestamp: new Date().toISOString()
  });
}

/**
 * Log API responses
 */
export function logApiResponse(
  method: string,
  endpoint: string,
  status: number,
  duration: number,
  data?: unknown
): void {
  const level = status >= 400 ? 'error' : status >= 300 ? 'warn' : 'info';

  logger.log(level as 'debug' | 'info' | 'warn' | 'error', 'API response', {
    method,
    endpoint,
    status,
    duration,
    dataSize: data ? JSON.stringify(data).length : 0,
    timestamp: new Date().toISOString()
  });
}

/**
 * Log user actions
 */
export function logUserAction(
  action: string,
  category: string,
  metadata?: Record<string, unknown>
): void {
  logger.info('User action', {
    action,
    category,
    ...metadata,
    timestamp: new Date().toISOString(),
    sessionId: typeof window !== 'undefined' ? sessionStorage.getItem('sessionId') : undefined
  });
}

/**
 * Log performance metrics
 */
export function logPerformance(
  metric: string,
  value: number,
  unit: string = 'ms',
  metadata?: Record<string, unknown>
): void {
  logger.info('Performance metric', {
    metric,
    value,
    unit,
    ...metadata,
    timestamp: new Date().toISOString()
  });

  // Also send to performance monitoring if available
  if (typeof window !== 'undefined' && (window as unknown as { datadog?: { rum: { addAction: (metric: string, data: Record<string, unknown>) => void } } }).datadog) {
    (window as unknown as { datadog: { rum: { addAction: (metric: string, data: Record<string, unknown>) => void } } }).datadog.rum.addAction(metric, {
      value,
      unit,
      ...metadata
    });
  }
}

/**
 * Log feature usage
 */
export function logFeatureUsage(
  feature: string,
  action: string,
  metadata?: Record<string, unknown>
): void {
  logger.info('Feature usage', {
    feature,
    action,
    ...metadata,
    timestamp: new Date().toISOString(),
    userId: typeof window !== 'undefined' ? localStorage.getItem('userId') : undefined
  });
}

/**
 * Create a logger for a specific component
 */
export function createComponentLogger(componentName: string): EnhancedLogger {
  return logger.child({ component: componentName });
}

/**
 * Create a logger for a specific page
 */
export function createPageLogger(pageName: string): EnhancedLogger {
  return logger.child({ page: pageName });
}

/**
 * Middleware for Next.js API routes
 */
export function withLogging(handler: unknown) {
  return async (req: unknown, res: unknown) => {
    const startTime = Date.now();
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Add request ID to headers
    req.headers['x-request-id'] = requestId;
    res.setHeader('x-request-id', requestId);

    // Create request-specific logger
    const requestLogger = logger.child({
      requestId,
      method: req.method,
      url: req.url,
      ip: req.headers['x-forwarded-for'] || req.connection?.remoteAddress
    });

    // Log request
    requestLogger.info('API request received');

    try {
      // Add logger to request object
      req.logger = requestLogger;

      // Call the actual handler
      const result = await handler(req, res);

      // Log success
      const duration = Date.now() - startTime;
      requestLogger.info('API request completed', {
        statusCode: res.statusCode,
        duration
      });

      return result;
    } catch (error) {
      // Log error
      const duration = Date.now() - startTime;
      requestLogger.error('API request failed', error as Error, {
        statusCode: res.statusCode || 500,
        duration
      });

      // Re-throw error
      throw error;
    }
  };
}

// Export the logger instance and type
export { logger, EnhancedLogger };
export default logger;