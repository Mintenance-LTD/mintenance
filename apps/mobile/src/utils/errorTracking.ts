/**
 * COMPREHENSIVE ERROR TRACKING WITH SENTRY
 * Production-grade error monitoring and alerting
 *
 * Features:
 * - Real-time error tracking and alerting
 * - Performance monitoring
 * - User context and breadcrumbs
 * - Custom error categorization
 * - Integration with circuit breakers
 * - Business logic error tracking
 */

// Sentry import with Expo integration
import { logger } from './logger';

let Sentry: any = null;
try {
  Sentry = require('sentry-expo');
  logger.info('Sentry (sentry-expo) available for error tracking');
} catch (error) {
  try {
    Sentry = require('@sentry/react-native');
    logger.info('Sentry (react-native) available for error tracking');
  } catch (fallbackError) {
    logger.warn('Sentry not available, using fallback error tracking');
    Sentry = null;
  }
}

// Initialize Sentry configuration
const SENTRY_CONFIG = {
  dsn: process.env.SENTRY_DSN || 'https://your-sentry-dsn@sentry.io/project-id',
  environment: process.env.NODE_ENV || 'development',
  release: process.env.APP_VERSION || '1.0.0',
  dist: process.env.BUILD_NUMBER || '1',
  enableAutoSessionTracking: true,
  sessionTrackingIntervalMillis: 30000,
  enableOutOfMemoryTracking: true,
  enableNativeCrashHandling: true,
  attachStackTrace: true,
  debug: process.env.NODE_ENV === 'development',
};

// Error severity levels
export enum ErrorSeverity {
  FATAL = 'fatal',
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info',
  DEBUG = 'debug',
}

// Error categories for better organization
export enum ErrorCategory {
  // Technical Errors
  NETWORK = 'network',
  DATABASE = 'database',
  AUTHENTICATION = 'authentication',
  PAYMENT = 'payment',
  ML_INFERENCE = 'ml_inference',
  FILE_STORAGE = 'file_storage',

  // Business Logic Errors
  JOB_PROCESSING = 'job_processing',
  CONTRACTOR_MATCHING = 'contractor_matching',
  PRICING_CALCULATION = 'pricing_calculation',
  NOTIFICATION_DELIVERY = 'notification_delivery',

  // User Experience Errors
  UI_RENDERING = 'ui_rendering',
  NAVIGATION = 'navigation',
  FORM_VALIDATION = 'form_validation',

  // System Errors
  PERFORMANCE = 'performance',
  MEMORY = 'memory',
  STARTUP = 'startup',
}

// Business context interface
export interface BusinessContext {
  userId?: string;
  userRole?: 'homeowner' | 'contractor' | 'admin';
  jobId?: string;
  contractorId?: string;
  feature?: string;
  userJourney?: string;
  experimentVariant?: string;
}

// Error tracking class
export class ErrorTracker {
  private static instance: ErrorTracker;
  private initialized = false;

  constructor() {
    if (!ErrorTracker.instance) {
      ErrorTracker.instance = this;
    }
    return ErrorTracker.instance;
  }

  /**
   * Initialize Sentry with production configuration
   */
  static initialize(): void {
    const tracker = new ErrorTracker();

    if (tracker.initialized) {
      return;
    }

    try {
      // Only initialize Sentry if available
      if (Sentry) {
        Sentry.init({
          ...SENTRY_CONFIG,
          beforeSend(event: any) {
            // Filter out development errors in production
            if (SENTRY_CONFIG.environment === 'production') {
              if (event.exception?.values?.[0]?.value?.includes('__DEV__')) {
                return null;
              }
            }

            // Add custom processing
            return tracker.processEvent(event);
          },
          beforeBreadcrumb(breadcrumb: any) {
            // Filter sensitive information from breadcrumbs
            if (
              breadcrumb.message?.includes('password') ||
              breadcrumb.message?.includes('token')
            ) {
              return null;
            }

            return breadcrumb;
          },
        });

        // Set up performance monitoring
        tracker.setupPerformanceMonitoring();
        logger.info('Error tracking with Sentry initialized successfully');
      } else {
        // Fallback error tracking without Sentry
        logger.info(
          'Error tracking initialized with fallback system (Sentry not available)'
        );
        tracker.setupFallbackErrorTracking();
      }

      tracker.initialized = true;
    } catch (error) {
      logger.error('Failed to initialize error tracking', error);
    }
  }

  /**
   * Track application errors with rich context
   */
  static captureError(
    error: Error,
    category: ErrorCategory,
    severity: ErrorSeverity = ErrorSeverity.ERROR,
    context?: BusinessContext,
    extra?: Record<string, any>
  ): string {
    try {
      if (Sentry) {
        // Use Sentry for error tracking
        // Set user context
        if (context?.userId) {
          Sentry.setUser({
            id: context.userId,
            role: context.userRole,
          });
        }

        // Set tags for better filtering
        Sentry.setTags({
          category,
          severity,
          feature: context?.feature,
          userJourney: context?.userJourney,
          experiment: context?.experimentVariant,
        });

        // Set additional context
        Sentry.setContext('business_context', {
          jobId: context?.jobId,
          contractorId: context?.contractorId,
          timestamp: new Date().toISOString(),
          ...extra,
        });

        // Capture the error
        const eventId = Sentry.captureException(error, {
          level: severity,
          tags: {
            category,
            severity,
          },
        });

        logger.error('Error tracked with Sentry', {
          eventId,
          category,
          severity,
          error: error.message,
          context,
        });

        return eventId;
      } else {
        // Fallback error tracking
        const fallbackEventId = `fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        logger.error('Error tracked (fallback)', {
          eventId: fallbackEventId,
          category,
          severity,
          error: error.message,
          stack: error.stack,
          context,
          extra,
        });

        return fallbackEventId;
      }
    } catch (trackingError) {
      console.error('Failed to track error:', trackingError);
      return '';
    }
  }

  /**
   * Track business logic errors with specialized context
   */
  static captureBusinessError(
    errorMessage: string,
    category: ErrorCategory,
    businessData: {
      operation: string;
      input?: any;
      expected?: any;
      actual?: any;
      userId?: string;
      jobId?: string;
      contractorId?: string;
    }
  ): string {
    const error = new Error(errorMessage);
    error.name = 'BusinessLogicError';

    return this.captureError(
      error,
      category,
      ErrorSeverity.ERROR,
      {
        userId: businessData.userId,
        jobId: businessData.jobId,
        contractorId: businessData.contractorId,
        feature: businessData.operation,
      },
      {
        operation: businessData.operation,
        input: businessData.input,
        expected: businessData.expected,
        actual: businessData.actual,
      }
    );
  }

  /**
   * Track performance issues
   */
  static capturePerformanceIssue(
    operation: string,
    duration: number,
    threshold: number,
    context?: BusinessContext
  ): void {
    if (duration > threshold) {
      const error = new Error(
        `Performance threshold exceeded: ${operation} took ${duration}ms (threshold: ${threshold}ms)`
      );
      error.name = 'PerformanceIssue';

      this.captureError(
        error,
        ErrorCategory.PERFORMANCE,
        ErrorSeverity.WARNING,
        context,
        {
          operation,
          duration,
          threshold,
          performanceRatio: duration / threshold,
        }
      );
    }
  }

  /**
   * Add breadcrumb for debugging context
   */
  static addBreadcrumb(
    message: string,
    category: string,
    level: 'debug' | 'info' | 'warning' | 'error' = 'info',
    data?: Record<string, any>
  ): void {
    Sentry.addBreadcrumb({
      message,
      category,
      level,
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Set user context
   */
  static setUserContext(user: {
    id: string;
    email?: string;
    role?: string;
    segment?: string;
  }): void {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.role,
      segment: user.segment,
    });
  }

  /**
   * Set release context
   */
  static setReleaseContext(version: string, buildNumber: string): void {
    Sentry.setTag('app_version', version);
    Sentry.setTag('build_number', buildNumber);
  }

  /**
   * Manually send message to Sentry
   */
  static captureMessage(
    message: string,
    level: ErrorSeverity = ErrorSeverity.INFO,
    context?: BusinessContext
  ): string {
    if (context) {
      Sentry.setContext('message_context', context);
    }

    return Sentry.captureMessage(message, level);
  }

  /**
   * Process events before sending to Sentry
   */
  private processEvent(event: any): any | null {
    // Add custom fingerprinting for better error grouping
    if (event.exception?.values?.[0]) {
      const error = event.exception.values[0];
      const errorType = error.type || 'UnknownError';
      const errorLocation =
        error.stacktrace?.frames?.[0]?.filename || 'unknown';

      event.fingerprint = [errorType, errorLocation];
    }

    // Add environment context
    event.contexts = event.contexts || {};
    event.contexts.app = {
      ...event.contexts.app,
      name: 'Mintenance',
      version: SENTRY_CONFIG.release,
      build: SENTRY_CONFIG.dist,
    };

    return event;
  }

  /**
   * Set up fallback error tracking when Sentry is not available
   */
  private setupFallbackErrorTracking(): void {
    // Set up basic error handlers without Sentry
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        logger.error('Global error caught (fallback):', {
          message: event.error?.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        });
      });

      window.addEventListener('unhandledrejection', (event) => {
        logger.error('Unhandled promise rejection (fallback):', {
          reason: event.reason,
        });
      });
    }
  }

  /**
   * Set up performance monitoring
   */
  private setupPerformanceMonitoring(): void {
    if (Sentry) {
      // Monitor app startup time with Sentry
      const startupTransaction = Sentry.startTransaction({
        name: 'app_startup',
        op: 'app.startup',
      });

      // Monitor critical operations
      this.monitorCriticalOperations();

      startupTransaction.finish();
    } else {
      // Fallback performance monitoring
      logger.info('Performance monitoring started (fallback mode)');
      this.monitorCriticalOperations();
    }
  }

  /**
   * Monitor critical business operations
   */
  private monitorCriticalOperations(): void {
    // These would be integrated with your business services
    const criticalOperations = [
      'job_posting',
      'contractor_matching',
      'payment_processing',
      'ml_pricing_calculation',
      'notification_delivery',
    ];

    criticalOperations.forEach((operation) => {
      Sentry.addGlobalEventProcessor((event: any) => {
        if (event.tags?.operation === operation) {
          event.level = 'error';
          event.contexts = event.contexts || {};
          event.contexts.critical_operation = {
            name: operation,
            timestamp: new Date().toISOString(),
          };
        }
        return event;
      });
    });
  }

  /**
   * Get current error tracking status
   */
  static getStatus(): {
    initialized: boolean;
    lastEventId?: string;
    environment: string;
    release: string;
  } {
    return {
      initialized: ErrorTracker.instance?.initialized || false,
      lastEventId: Sentry.lastEventId(),
      environment: SENTRY_CONFIG.environment,
      release: SENTRY_CONFIG.release,
    };
  }
}

// Helper functions for common error scenarios

/**
 * Track API errors with request context
 */
export const trackAPIError = (
  error: Error,
  endpoint: string,
  method: string,
  statusCode?: number,
  responseTime?: number
): string => {
  return ErrorTracker.captureError(
    error,
    ErrorCategory.NETWORK,
    ErrorSeverity.ERROR,
    {
      feature: `api_${endpoint}`,
    },
    {
      endpoint,
      method,
      statusCode,
      responseTime,
    }
  );
};

/**
 * Track ML inference errors
 */
export const trackMLError = (
  error: Error,
  modelName: string,
  inputData: any,
  inference?: any
): string => {
  return ErrorTracker.captureError(
    error,
    ErrorCategory.ML_INFERENCE,
    ErrorSeverity.ERROR,
    {
      feature: `ml_${modelName}`,
    },
    {
      modelName,
      inputDataSize: JSON.stringify(inputData).length,
      hasInference: !!inference,
    }
  );
};

/**
 * Track payment errors with transaction context
 */
export const trackPaymentError = (
  error: Error,
  paymentIntentId: string,
  amount: number,
  customerId: string
): string => {
  return ErrorTracker.captureError(
    error,
    ErrorCategory.PAYMENT,
    ErrorSeverity.FATAL,
    {
      userId: customerId,
      feature: 'payment_processing',
    },
    {
      paymentIntentId,
      amount,
      customerId,
    }
  );
};

/**
 * Track job processing errors
 */
export const trackJobError = (
  error: Error,
  jobId: string,
  operation: string,
  userId?: string
): string => {
  return ErrorTracker.captureError(
    error,
    ErrorCategory.JOB_PROCESSING,
    ErrorSeverity.ERROR,
    {
      userId,
      jobId,
      feature: `job_${operation}`,
    },
    {
      operation,
      jobId,
    }
  );
};

// Initialize error tracking
export const initializeErrorTracking = (): void => {
  ErrorTracker.initialize();

  // Set up global error handlers
  if (typeof window !== 'undefined') {
    window.addEventListener('unhandledrejection', (event) => {
      ErrorTracker.captureError(
        new Error(`Unhandled Promise Rejection: ${event.reason}`),
        ErrorCategory.STARTUP,
        ErrorSeverity.FATAL
      );
    });
  }
};

// Export singleton instance
export const errorTracker = new ErrorTracker();
