/**
 * Error Recovery Manager
 *
 * Provides intelligent error recovery strategies based on error types and context.
 * Helps error boundaries make better decisions about how to handle different errors.
 */

import { logger } from './logger';
import AccessibilityManager from './AccessibilityManager';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface ErrorContext {
  componentName?: string;
  screenName?: string;
  serviceName?: string;
  operation?: string;
  userAction?: string;
  timestamp?: number;
  retryCount?: number;
  maxRetries?: number;
  userId?: string;
  sessionId?: string;
}

export interface RecoveryStrategy {
  type: 'retry' | 'fallback' | 'redirect' | 'refresh' | 'ignore';
  maxAttempts?: number;
  delay?: number;
  fallbackComponent?: React.ComponentType<any>;
  redirectTarget?: string;
  message?: string;
  allowUserChoice?: boolean;
}

export interface ErrorCategory {
  name: string;
  patterns: RegExp[];
  strategy: RecoveryStrategy;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

// ============================================================================
// ERROR CATEGORIES
// ============================================================================

const ERROR_CATEGORIES: ErrorCategory[] = [
  // Network & API Errors
  {
    name: 'Network Error',
    patterns: [
      /network/i,
      /fetch/i,
      /timeout/i,
      /connection/i,
      /ECONNREFUSED/i,
      /Failed to fetch/i,
    ],
    strategy: {
      type: 'retry',
      maxAttempts: 3,
      delay: 2000,
      message: 'Network connection issue. Retrying...',
      allowUserChoice: true,
    },
    priority: 'high',
  },

  // Authentication Errors
  {
    name: 'Authentication Error',
    patterns: [
      /unauthorized/i,
      /authentication/i,
      /token/i,
      /session expired/i,
      /invalid credentials/i,
    ],
    strategy: {
      type: 'redirect',
      redirectTarget: 'Auth',
      message: 'Session expired. Please log in again.',
    },
    priority: 'critical',
  },

  // Validation Errors
  {
    name: 'Validation Error',
    patterns: [
      /validation/i,
      /invalid input/i,
      /required field/i,
      /format error/i,
    ],
    strategy: {
      type: 'fallback',
      message: 'Please check your input and try again.',
      allowUserChoice: false,
    },
    priority: 'medium',
  },

  // Permission Errors
  {
    name: 'Permission Error',
    patterns: [
      /permission/i,
      /forbidden/i,
      /access denied/i,
      /unauthorized access/i,
    ],
    strategy: {
      type: 'fallback',
      message: 'You don\'t have permission to access this feature.',
      redirectTarget: 'Main',
    },
    priority: 'high',
  },

  // Database Errors
  {
    name: 'Database Error',
    patterns: [
      /database/i,
      /sql/i,
      /connection pool/i,
      /query failed/i,
    ],
    strategy: {
      type: 'retry',
      maxAttempts: 2,
      delay: 3000,
      message: 'Database temporarily unavailable. Retrying...',
    },
    priority: 'high',
  },

  // Storage Errors
  {
    name: 'Storage Error',
    patterns: [
      /storage/i,
      /disk space/i,
      /write failed/i,
      /storage full/i,
    ],
    strategy: {
      type: 'fallback',
      message: 'Storage issue detected. Some features may be limited.',
    },
    priority: 'medium',
  },

  // UI Component Errors
  {
    name: 'UI Component Error',
    patterns: [
      /Cannot read propert/i,
      /undefined is not an object/i,
      /Cannot access before initialization/i,
    ],
    strategy: {
      type: 'fallback',
      maxAttempts: 1,
      message: 'Component loading issue. Refreshing...',
    },
    priority: 'low',
  },

  // Memory Errors
  {
    name: 'Memory Error',
    patterns: [
      /out of memory/i,
      /memory pressure/i,
      /heap/i,
    ],
    strategy: {
      type: 'refresh',
      message: 'Memory issue detected. Refreshing app to free resources.',
    },
    priority: 'critical',
  },
];

// ============================================================================
// ERROR RECOVERY MANAGER CLASS
// ============================================================================

class ErrorRecoveryManager {
  private static instance: ErrorRecoveryManager;
  private errorHistory: Map<string, number> = new Map();
  private recoveryAttempts: Map<string, number> = new Map();
  private accessibilityManager = AccessibilityManager;

  private constructor() {}

  public static getInstance(): ErrorRecoveryManager {
    if (!ErrorRecoveryManager.instance) {
      ErrorRecoveryManager.instance = new ErrorRecoveryManager();
    }
    return ErrorRecoveryManager.instance;
  }

  // ============================================================================
  // ERROR ANALYSIS
  // ============================================================================

  /**
   * Categorize an error based on its message and stack trace
   */
  public categorizeError(error: Error): ErrorCategory | null {
    const errorText = `${error.message} ${error.stack || ''}`;

    for (const category of ERROR_CATEGORIES) {
      if (category.patterns.some(pattern => pattern.test(errorText))) {
        return category;
      }
    }

    return null; // Unknown error type
  }

  /**
   * Generate a unique key for error tracking
   */
  private getErrorKey(error: Error, context?: ErrorContext): string {
    const baseKey = `${error.name}_${error.message.slice(0, 50)}`;
    const contextKey = context?.componentName || context?.serviceName || 'unknown';
    return `${baseKey}_${contextKey}`;
  }

  /**
   * Check if error has occurred frequently
   */
  private isRecurringError(errorKey: string): boolean {
    const count = this.errorHistory.get(errorKey) || 0;
    return count >= 3; // Consider recurring after 3 occurrences
  }

  /**
   * Track error occurrence
   */
  private trackError(errorKey: string): void {
    const currentCount = this.errorHistory.get(errorKey) || 0;
    this.errorHistory.set(errorKey, currentCount + 1);

    // Clean up old entries periodically (keep only last 100)
    if (this.errorHistory.size > 100) {
      const entries = Array.from(this.errorHistory.entries());
      const recentEntries = entries.slice(-50);
      this.errorHistory.clear();
      recentEntries.forEach(([key, value]) => {
        this.errorHistory.set(key, value);
      });
    }
  }

  // ============================================================================
  // RECOVERY STRATEGY DETERMINATION
  // ============================================================================

  /**
   * Determine the best recovery strategy for an error
   */
  public getRecoveryStrategy(
    error: Error,
    context?: ErrorContext
  ): RecoveryStrategy {
    const errorKey = this.getErrorKey(error, context);
    const isRecurring = this.isRecurringError(errorKey);

    // Track this error
    this.trackError(errorKey);

    // Get error category
    const category = this.categorizeError(error);

    if (!category) {
      // Unknown error - use safe fallback
      return {
        type: 'fallback',
        message: 'An unexpected error occurred. Please try again.',
        allowUserChoice: true,
      };
    }

    // Modify strategy based on context and recurrence
    let strategy = { ...category.strategy };

    // If error is recurring, escalate to more aggressive strategy
    if (isRecurring) {
      if (strategy.type === 'retry') {
        strategy = {
          type: 'fallback',
          message: 'This issue keeps occurring. Switching to safe mode.',
          redirectTarget: 'Main',
        };
      } else if (strategy.type === 'fallback') {
        strategy = {
          type: 'refresh',
          message: 'Multiple issues detected. Refreshing app.',
        };
      }
    }

    // Check retry limits
    const currentAttempts = this.recoveryAttempts.get(errorKey) || 0;
    if (strategy.maxAttempts && currentAttempts >= strategy.maxAttempts) {
      strategy = {
        type: 'fallback',
        message: 'Maximum retry attempts reached. Using fallback.',
        redirectTarget: strategy.redirectTarget,
      };
    }

    return strategy;
  }

  // ============================================================================
  // RECOVERY EXECUTION
  // ============================================================================

  /**
   * Execute recovery strategy
   */
  public async executeRecovery(
    error: Error,
    strategy: RecoveryStrategy,
    context?: ErrorContext,
    options?: {
      onRetry?: () => Promise<void> | void;
      onFallback?: () => void;
      onRedirect?: (target: string) => void;
      onRefresh?: () => void;
    }
  ): Promise<boolean> {
    const errorKey = this.getErrorKey(error, context);

    try {
      // Announce error to accessibility services
      this.accessibilityManager.announceError(
        strategy.message || 'An error occurred',
        context?.componentName
      );

      // Log recovery attempt
      logger.info('Executing error recovery', {
        strategy: strategy.type,
        errorKey,
        context,
        retryCount: this.recoveryAttempts.get(errorKey) || 0,
      });

      switch (strategy.type) {
        case 'retry':
          return await this.executeRetry(errorKey, strategy, options?.onRetry);

        case 'fallback':
          this.executeFallback(strategy, options?.onFallback);
          return true;

        case 'redirect':
          this.executeRedirect(strategy, options?.onRedirect);
          return true;

        case 'refresh':
          this.executeRefresh(strategy, options?.onRefresh);
          return true;

        case 'ignore':
          logger.info('Error ignored per recovery strategy');
          return true;

        default:
          return false;
      }
    } catch (recoveryError) {
      logger.error('Error recovery failed', recoveryError);
      return false;
    }
  }

  private async executeRetry(
    errorKey: string,
    strategy: RecoveryStrategy,
    onRetry?: () => Promise<void> | void
  ): Promise<boolean> {
    const currentAttempts = this.recoveryAttempts.get(errorKey) || 0;

    if (strategy.maxAttempts && currentAttempts >= strategy.maxAttempts) {
      return false;
    }

    // Update retry count
    this.recoveryAttempts.set(errorKey, currentAttempts + 1);

    // Wait before retrying if delay specified
    if (strategy.delay) {
      await new Promise(resolve => setTimeout(resolve, strategy.delay));
    }

    // Execute retry callback if provided
    if (onRetry) {
      await onRetry();
    }

    return true;
  }

  private executeFallback(
    strategy: RecoveryStrategy,
    onFallback?: () => void
  ): void {
    if (onFallback) {
      onFallback();
    }

    // If redirect target specified, trigger navigation
    if (strategy.redirectTarget && strategy.allowUserChoice) {
      // Navigation would be handled by the calling component
      logger.info('Fallback with redirect suggested', {
        target: strategy.redirectTarget,
      });
    }
  }

  private executeRedirect(
    strategy: RecoveryStrategy,
    onRedirect?: (target: string) => void
  ): void {
    if (strategy.redirectTarget && onRedirect) {
      onRedirect(strategy.redirectTarget);
    }
  }

  private executeRefresh(
    strategy: RecoveryStrategy,
    onRefresh?: () => void
  ): void {
    if (onRefresh) {
      onRefresh();
    } else {
      // Default refresh behavior - this would need to be implemented
      // by the calling application context
      logger.info('App refresh requested');
    }
  }

  // ============================================================================
  // CLEANUP & MAINTENANCE
  // ============================================================================

  /**
   * Reset recovery attempts for a specific error
   */
  public resetRecoveryAttempts(error: Error, context?: ErrorContext): void {
    const errorKey = this.getErrorKey(error, context);
    this.recoveryAttempts.delete(errorKey);
  }

  /**
   * Clear all error tracking data
   */
  public clearErrorHistory(): void {
    this.errorHistory.clear();
    this.recoveryAttempts.clear();
  }

  /**
   * Get error statistics for monitoring
   */
  public getErrorStatistics(): {
    totalUniqueErrors: number;
    totalOccurrences: number;
    recurringErrors: number;
    activeRecoveries: number;
    topErrors: Array<{ key: string; count: number }>;
  } {
    const totalUniqueErrors = this.errorHistory.size;
    const totalOccurrences = Array.from(this.errorHistory.values())
      .reduce((sum, count) => sum + count, 0);
    const recurringErrors = Array.from(this.errorHistory.values())
      .filter(count => count >= 3).length;
    const activeRecoveries = this.recoveryAttempts.size;

    const topErrors = Array.from(this.errorHistory.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([key, count]) => ({ key, count }));

    return {
      totalUniqueErrors,
      totalOccurrences,
      recurringErrors,
      activeRecoveries,
      topErrors,
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export default ErrorRecoveryManager.getInstance();

// ============================================================================
// CONVENIENCE HOOKS AND UTILITIES
// ============================================================================

/**
 * Hook for using error recovery in components
 */
export const useErrorRecovery = () => {
  const manager = ErrorRecoveryManager.getInstance();

  return {
    categorizeError: manager.categorizeError.bind(manager),
    getRecoveryStrategy: manager.getRecoveryStrategy.bind(manager),
    executeRecovery: manager.executeRecovery.bind(manager),
    resetRecoveryAttempts: manager.resetRecoveryAttempts.bind(manager),
    getErrorStatistics: manager.getErrorStatistics.bind(manager),
  };
};

/**
 * Enhanced error boundary props with recovery integration
 */
export interface EnhancedErrorBoundaryProps {
  children: React.ReactNode;
  context?: ErrorContext;
  onRecoveryAction?: (action: string, data?: any) => void;
  fallbackComponent?: React.ComponentType<{
    error: Error;
    strategy: RecoveryStrategy;
    onRetry: () => void;
    onNavigate: (target: string) => void;
  }>;
}