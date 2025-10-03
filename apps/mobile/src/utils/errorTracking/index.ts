/**
 * Enhanced Error Tracking and Analytics System
 * Central module orchestrating error tracking, analytics, reporting, and recovery
 */

import { logger } from '../logger';
import { ErrorCapture } from './ErrorCapture';
import { ErrorReporting } from './ErrorReporting';
import { ErrorAnalytics } from './ErrorAnalytics';
import { ErrorRecovery } from './ErrorRecovery';

// Export all types
export * from './ErrorTypes';

/**
 * Enhanced Error Analytics Engine
 */
export class EnhancedErrorAnalytics {
  private static instance: EnhancedErrorAnalytics;
  private errorCapture: ErrorCapture;
  private errorReporting: ErrorReporting;
  private errorAnalytics: ErrorAnalytics;
  private errorRecovery: ErrorRecovery;
  private analyticsEnabled = true;

  // Legacy compatibility stubs
  private errorCounts = {
    total: 0,
    byCategory: new Map(),
    bySeverity: new Map()
  };
  private recentErrors: any[] = [];

  private constructor() {
    this.errorCapture = new ErrorCapture();
    this.errorReporting = new ErrorReporting();
    this.errorAnalytics = new ErrorAnalytics();
    this.errorRecovery = new ErrorRecovery();
  }

  static getInstance(): EnhancedErrorAnalytics {
    if (!this.instance) {
      this.instance = new EnhancedErrorAnalytics();
      this.instance.initialize();
    }
    return this.instance;
  }

  /**
   * Initialize the analytics system
   */
  private initialize(): void {
    logger.info('EnhancedErrorAnalytics', 'Initializing advanced error analytics');

    // Start cleanup routine
    this.errorRecovery.startCleanupRoutine(() => this.performCleanup());

    logger.info('EnhancedErrorAnalytics', 'Advanced error analytics initialized');
  }

  /**
   * Track an error with comprehensive analytics
   */
  trackError(
    error: Error,
    category: import('./ErrorTypes').ErrorCategory,
    severity: import('./ErrorTypes').ErrorSeverity,
    context: import('./ErrorTypes').ErrorContext = {},
    userId?: string
  ): string {
    if (!this.analyticsEnabled) return '';

    try {
      // Generate error signature for pattern recognition
      const signature = this.errorCapture.generateErrorSignature(error, context);

      // Create error occurrence
      const occurrence = this.errorCapture.createErrorOccurrence(error, context, userId);

      // Update or create error pattern
      this.errorAnalytics.updateErrorPattern(signature, error, category, severity, occurrence);

      // Update user profile
      if (userId) {
        this.errorAnalytics.updateUserProfile(userId, signature, category);
      }

      // Add to recent occurrences
      this.errorAnalytics.addOccurrence(occurrence);

      // Report to Sentry
      const eventId = this.errorReporting.reportError(error, category, severity, context, userId);

      // Generate insights and recommendations
      this.errorAnalytics.generateInsights(signature);

      logger.debug('EnhancedErrorAnalytics', 'Error tracked with analytics', {
        signature,
        category,
        severity,
        eventId
      });

      return eventId;
    } catch (trackingError) {
      logger.error('EnhancedErrorAnalytics', 'Failed to track error analytics', trackingError as Error);
      return '';
    }
  }

  /**
   * Add breadcrumb for user journey tracking
   */
  addBreadcrumb(
    message: string,
    category: string,
    level: 'debug' | 'info' | 'warning' | 'error' = 'info',
    data?: Record<string, any>
  ): void {
    this.errorCapture.addBreadcrumb(message, category, level, data);
  }

  /**
   * Generate error trends analysis
   */
  generateErrorTrends(period: import('./ErrorTypes').ErrorTrend['period'] = '24h'): import('./ErrorTypes').ErrorTrend {
    return this.errorAnalytics.generateErrorTrends(period);
  }

  /**
   * Get error patterns with insights
   */
  getErrorPatterns(options: {
    limit?: number;
    category?: import('./ErrorTypes').ErrorCategory;
    severity?: import('./ErrorTypes').ErrorSeverity;
    timeRange?: number;
    sortBy?: 'frequency' | 'impact' | 'recent';
  } = {}): import('./ErrorTypes').ErrorPattern[] {
    return this.errorAnalytics.getErrorPatterns(options);
  }

  /**
   * Get user error profiles
   */
  getUserErrorProfiles(options: {
    limit?: number;
    sortBy?: 'errorCount' | 'errorRate' | 'recent';
  } = {}): import('./ErrorTypes').UserErrorProfile[] {
    return this.errorAnalytics.getUserErrorProfiles(options);
  }

  /**
   * Generate comprehensive analytics report
   */
  generateAnalyticsReport(): string {
    return this.errorAnalytics.generateAnalyticsReport();
  }

  /**
   * Get analytics status and statistics
   */
  getAnalyticsStatus(): {
    enabled: boolean;
    patternsTracked: number;
    recentOccurrences: number;
    sessionsTracked: number;
    userProfiles: number;
    memoryUsage: string;
  } {
    const counts = this.errorAnalytics.getAnalyticsCounts();
    const estimatedMemory =
      (counts.patternsCount * 1000) +
      (counts.occurrencesCount * 500) +
      (counts.userProfilesCount * 200);

    return {
      enabled: this.analyticsEnabled,
      patternsTracked: counts.patternsCount,
      recentOccurrences: counts.occurrencesCount,
      sessionsTracked: this.errorCapture.getBreadcrumbsCount(),
      userProfiles: counts.userProfilesCount,
      memoryUsage: `~${Math.round(estimatedMemory / 1024)}KB`
    };
  }

  /**
   * Enable or disable analytics
   */
  setAnalyticsEnabled(enabled: boolean): void {
    this.analyticsEnabled = enabled;
    this.errorReporting.setReportingEnabled(enabled);
    logger.info('EnhancedErrorAnalytics', `Analytics ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Clear all analytics data
   */
  clearAnalyticsData(): void {
    this.errorAnalytics.clearAll();
    this.errorCapture.clearBreadcrumbs();
    logger.info('EnhancedErrorAnalytics', 'All analytics data cleared');
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.errorRecovery.dispose();
    this.clearAnalyticsData();
    this.analyticsEnabled = false;
    logger.info('EnhancedErrorAnalytics', 'Enhanced error analytics disposed');
  }

  /**
   * Private cleanup method
   */
  private performCleanup(): void {
    const now = Date.now();
    const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);

    // Clean old data from all modules
    this.errorAnalytics.performCleanup(oneWeekAgo);
    this.errorCapture.cleanOldBreadcrumbs(oneWeekAgo);

    const counts = this.errorAnalytics.getAnalyticsCounts();
    logger.debug('EnhancedErrorAnalytics', 'Cleanup completed', {
      patternsCount: counts.patternsCount,
      occurrencesCount: counts.occurrencesCount,
      sessionsCount: this.errorCapture.getBreadcrumbsCount()
    });
  }

  /**
   * Legacy compatibility methods
   */
  getErrorAnalytics(): any {
    return {
      totalErrors: this.errorCounts.total,
      errorsByCategory: Object.fromEntries(this.errorCounts.byCategory),
      errorsBySeverity: Object.fromEntries(this.errorCounts.bySeverity),
      recentErrors: this.recentErrors.slice(-10),
    };
  }

  recordError(data: any): void {
    logger.info('EnhancedErrorAnalytics', 'Recording error', data);
  }

  recordUserAction(data: any): void {
    logger.info('EnhancedErrorAnalytics', 'Recording user action', data);
  }

  getTrendAnalysis(): any {
    return {
      errorTrend: 'stable',
      performanceTrend: 'improving',
      userSatisfactionTrend: 'stable',
    };
  }
}

// Export singleton instance
export const enhancedErrorAnalytics = EnhancedErrorAnalytics.getInstance();

// Convenience functions
export const trackEnhancedError = (
  error: Error,
  category: import('./ErrorTypes').ErrorCategory,
  severity: import('./ErrorTypes').ErrorSeverity = import('./ErrorTypes').ErrorSeverity.ERROR,
  context: import('./ErrorTypes').ErrorContext = {},
  userId?: string
): string => {
  return enhancedErrorAnalytics.trackError(error, category, severity, context, userId);
};

export const addErrorBreadcrumb = (
  message: string,
  category: string,
  level: 'debug' | 'info' | 'warning' | 'error' = 'info',
  data?: Record<string, any>
): void => {
  enhancedErrorAnalytics.addBreadcrumb(message, category, level, data);
};

export const getErrorTrends = (period: import('./ErrorTypes').ErrorTrend['period'] = '24h'): import('./ErrorTypes').ErrorTrend => {
  return enhancedErrorAnalytics.generateErrorTrends(period);
};

export const getTopErrorPatterns = (limit: number = 10): import('./ErrorTypes').ErrorPattern[] => {
  return enhancedErrorAnalytics.getErrorPatterns({ limit, sortBy: 'impact' });
};

export const generateErrorReport = (): string => {
  return enhancedErrorAnalytics.generateAnalyticsReport();
};

// Auto-initialize analytics in production
if (!__DEV__) {
  logger.info('EnhancedErrorAnalytics', 'Auto-initializing enhanced error analytics');
}
