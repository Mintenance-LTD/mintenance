import React from 'react';

/**
 * ERROR MONITORING & TRACKING SYSTEM
 * Comprehensive error handling with analytics and reporting
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from './logger';
import { memoryManager } from './memoryManager';

export interface ErrorReport {
  id: string;
  type: 'javascript' | 'network' | 'performance' | 'user' | 'system';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  stack?: string;
  context: ErrorContext;
  timestamp: number;
  userId?: string;
  sessionId: string;
  resolved: boolean;
  count: number;
}

export interface ErrorContext {
  screen?: string;
  action?: string;
  component?: string;
  props?: Record<string, any>;
  state?: Record<string, any>;
  networkStatus?: 'online' | 'offline';
  memoryUsage?: number;
  buildVersion?: string;
  deviceInfo?: DeviceInfo;
}

export interface DeviceInfo {
  platform: string;
  version: string;
  model?: string;
  manufacturer?: string;
  totalMemory?: number;
  batteryLevel?: number;
}

export interface ErrorMetrics {
  totalErrors: number;
  uniqueErrors: number;
  criticalErrors: number;
  resolvedErrors: number;
  errorRate: number;
  topErrors: ErrorReport[];
  errorsByType: Record<string, number>;
  errorsBySeverity: Record<string, number>;
  trends: {
    daily: number[];
    weekly: number[];
    monthly: number[];
  };
}

export interface ErrorHandlerOptions {
  enableAutoReporting?: boolean;
  enableUserFeedback?: boolean;
  enableMemoryTracking?: boolean;
  maxStoredErrors?: number;
  enableRetryMechanism?: boolean;
  retryAttempts?: number;
}

class ErrorMonitoringSystem {
  private static instance: ErrorMonitoringSystem;
  private static readonly STORAGE_KEY = '@mintenance/error_reports';
  private static readonly SESSION_KEY = '@mintenance/session_id';
  
  private errorReports: ErrorReport[] = [];
  private sessionId: string = '';
  private errorHandlers = new Set<(error: ErrorReport) => void>();
  private options: ErrorHandlerOptions = {
    enableAutoReporting: true,
    enableUserFeedback: true,
    enableMemoryTracking: true,
    maxStoredErrors: 1000,
    enableRetryMechanism: true,
    retryAttempts: 3
  };

  static getInstance(): ErrorMonitoringSystem {
    if (!ErrorMonitoringSystem.instance) {
      ErrorMonitoringSystem.instance = new ErrorMonitoringSystem();
    }
    return ErrorMonitoringSystem.instance;
  }

  private constructor() {
    this.initializeSession();
    this.loadStoredErrors();
    this.setupGlobalErrorHandlers();
  }

  /**
   * Initialize error monitoring session
   */
  private async initializeSession(): Promise<void> {
    try {
      this.sessionId = await this.getOrCreateSessionId();
      logger.debug('Error monitoring session initialized', { sessionId: this.sessionId });
    } catch (error) {
      logger.error('Failed to initialize error monitoring session:', error as Error);
    }
  }

  /**
   * Get or create session ID
   */
  private async getOrCreateSessionId(): Promise<string> {
    try {
      let sessionId = await AsyncStorage.getItem(ErrorMonitoringSystem.SESSION_KEY);
      if (!sessionId) {
        sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await AsyncStorage.setItem(ErrorMonitoringSystem.SESSION_KEY, sessionId);
      }
      return sessionId;
    } catch {
      return `session_${Date.now()}_fallback`;
    }
  }

  /**
   * Setup global error handlers
   */
  private setupGlobalErrorHandlers(): void {
    // JavaScript errors
    const originalConsoleError = console.error;
    console.error = (...args: any[]) => {
      originalConsoleError(...args);
      
      const error = args[0];
      if (error instanceof Error) {
        this.reportError(error, {
          type: 'javascript',
          severity: 'high',
          context: { source: 'console.error' } as any
        });
      }
    };

    // Promise rejections
    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('unhandledrejection', (event) => {
        const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
        this.reportError(error, {
          type: 'javascript',
          severity: 'high',
          context: { source: 'unhandledrejection' } as any
        });
      });
    }
  }

  /**
   * Report an error to the monitoring system
   */
  async reportError(
    error: Error | string,
    options: {
      type?: ErrorReport['type'];
      severity?: ErrorReport['severity'];
      context?: Partial<ErrorContext>;
      userId?: string;
    } = {}
  ): Promise<string> {
    try {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      const errorId = this.generateErrorId(errorObj, options.context);
      
      // Check if this error already exists
      const existingError = this.errorReports.find(e => e.id === errorId);
      if (existingError) {
        existingError.count++;
        existingError.timestamp = Date.now();
        await this.saveErrorReports();
        return errorId;
      }

      const context = await this.enrichErrorContext(options.context || {});
      
      const errorReport: ErrorReport = {
        id: errorId,
        type: options.type || 'javascript',
        severity: options.severity || this.determineSeverity(errorObj),
        message: errorObj.message,
        stack: errorObj.stack,
        context,
        timestamp: Date.now(),
        userId: options.userId,
        sessionId: this.sessionId,
        resolved: false,
        count: 1
      };

      this.errorReports.push(errorReport);
      await this.saveErrorReports();

      // Notify error handlers
      this.notifyErrorHandlers(errorReport);

      // Auto-report if enabled
      if (this.options.enableAutoReporting) {
        await this.autoReportError(errorReport);
      }

      logger.error(`Error reported: ${errorReport.message}`, errorObj, {
        errorId,
        type: errorReport.type,
        severity: errorReport.severity
      });

      return errorId;

    } catch (reportingError) {
      logger.error('Failed to report error:', reportingError as Error);
      return 'error_reporting_failed';
    }
  }

  /**
   * Generate unique error ID based on error characteristics
   */
  private generateErrorId(error: Error, context?: Partial<ErrorContext>): string {
    const hashInput = `${error.message}_${error.stack?.split('\n')[0] || ''}_${context?.screen || ''}_${context?.component || ''}`;
    
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < hashInput.length; i++) {
      const char = hashInput.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return `error_${Math.abs(hash).toString(36)}_${Date.now().toString(36)}`;
  }

  /**
   * Determine error severity based on error characteristics
   */
  private determineSeverity(error: Error): ErrorReport['severity'] {
    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || '';

    if (
      message.includes('network') ||
      message.includes('timeout') ||
      stack.includes('fetch')
    ) {
      return 'medium';
    }

    if (
      message.includes('memory') ||
      message.includes('out of memory') ||
      message.includes('allocation')
    ) {
      return 'critical';
    }

    if (
      message.includes('security') ||
      message.includes('permission') ||
      message.includes('unauthorized')
    ) {
      return 'high';
    }

    if (
      message.includes('warning') ||
      message.includes('deprecated')
    ) {
      return 'low';
    }

    return 'medium';
  }

  /**
   * Enrich error context with additional information
   */
  private async enrichErrorContext(baseContext: Partial<ErrorContext>): Promise<ErrorContext> {
    const enrichedContext: ErrorContext = {
      ...baseContext,
      // @ts-expect-error allow timestamp in enriched context for diagnostics
      timestamp: Date.now(),
      networkStatus: 'online', // This would be determined by network status
      buildVersion: '1.1.0' // This would come from app config
    };

    // Add memory usage if tracking is enabled
    if (this.options.enableMemoryTracking) {
      try {
        const memoryUsage = await memoryManager.getCurrentMemoryUsage();
        enrichedContext.memoryUsage = memoryUsage.used;
      } catch (error) {
        logger.warn('Failed to get memory usage for error context:', { data: error });
      }
    }

    // Add device info
    enrichedContext.deviceInfo = await this.getDeviceInfo();

    return enrichedContext;
  }

  /**
   * Get device information
   */
  private async getDeviceInfo(): Promise<DeviceInfo> {
    // This would integrate with react-native-device-info or similar
    return {
      platform: 'react-native',
      version: '0.79.6',
      model: 'unknown',
      manufacturer: 'unknown'
    };
  }

  /**
   * Auto-report error to external service
   */
  private async autoReportError(errorReport: ErrorReport): Promise<void> {
    try {
      // This would integrate with Sentry, Bugsnag, or similar service
      logger.debug(`Auto-reporting error ${errorReport.id} to external service`);
      
      // Simulate external reporting
      if (errorReport.severity === 'critical') {
        logger.error('Critical error auto-reported:', new Error(errorReport.message), {
          errorId: errorReport.id,
          context: errorReport.context
        });
      }
    } catch (error) {
      logger.warn('Failed to auto-report error:', { data: error });
    }
  }

  /**
   * Load stored error reports
   */
  private async loadStoredErrors(): Promise<void> {
    try {
      const storedData = await AsyncStorage.getItem(ErrorMonitoringSystem.STORAGE_KEY);
      if (storedData) {
        this.errorReports = JSON.parse(storedData);
        logger.debug(`Loaded ${this.errorReports.length} stored error reports`);
      }
    } catch (error) {
      logger.warn('Failed to load stored error reports:', { data: error });
    }
  }

  /**
   * Save error reports to storage
   */
  private async saveErrorReports(): Promise<void> {
    try {
      // Limit stored errors to prevent storage bloat
      const maxErrors = this.options.maxStoredErrors || 1000;
      if (this.errorReports.length > maxErrors) {
        this.errorReports = this.errorReports.slice(-maxErrors);
      }

      await AsyncStorage.setItem(
        ErrorMonitoringSystem.STORAGE_KEY,
        JSON.stringify(this.errorReports)
      );
    } catch (error) {
      logger.warn('Failed to save error reports:', { data: error });
    }
  }

  /**
   * Notify registered error handlers
   */
  private notifyErrorHandlers(errorReport: ErrorReport): void {
    this.errorHandlers.forEach(handler => {
      try {
        handler(errorReport);
      } catch (error) {
        logger.warn('Error handler failed:', { data: error });
      }
    });
  }

  /**
   * Register error handler
   */
  registerErrorHandler(handler: (error: ErrorReport) => void): () => void {
    this.errorHandlers.add(handler);
    
    return () => {
      this.errorHandlers.delete(handler);
    };
  }

  /**
   * Mark error as resolved
   */
  async resolveError(errorId: string): Promise<boolean> {
    const error = this.errorReports.find(e => e.id === errorId);
    if (error) {
      error.resolved = true;
      await this.saveErrorReports();
      logger.debug(`Error ${errorId} marked as resolved`);
      return true;
    }
    return false;
  }

  /**
   * Get error metrics and analytics
   */
  getErrorMetrics(timeRange?: { start: number; end: number }): ErrorMetrics {
    const filteredErrors = timeRange 
      ? this.errorReports.filter(e => 
          e.timestamp >= timeRange.start && e.timestamp <= timeRange.end
        )
      : this.errorReports;

    const totalErrors = filteredErrors.reduce((sum, error) => sum + error.count, 0);
    const uniqueErrors = filteredErrors.length;
    const criticalErrors = filteredErrors.filter(e => e.severity === 'critical').length;
    const resolvedErrors = filteredErrors.filter(e => e.resolved).length;

    const errorsByType: Record<string, number> = {};
    const errorsBySeverity: Record<string, number> = {};

    filteredErrors.forEach(error => {
      errorsByType[error.type] = (errorsByType[error.type] || 0) + error.count;
      errorsBySeverity[error.severity] = (errorsBySeverity[error.severity] || 0) + error.count;
    });

    const topErrors = [...filteredErrors]
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalErrors,
      uniqueErrors,
      criticalErrors,
      resolvedErrors,
      errorRate: totalErrors / (uniqueErrors || 1),
      topErrors,
      errorsByType,
      errorsBySeverity,
      trends: {
        daily: [], // Would be calculated based on time ranges
        weekly: [],
        monthly: []
      }
    };
  }

  /**
   * Clear old error reports
   */
  async clearOldErrors(olderThanDays: number = 30): Promise<number> {
    const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
    const originalCount = this.errorReports.length;
    
    this.errorReports = this.errorReports.filter(error => 
      error.timestamp > cutoffTime || !error.resolved
    );
    
    const clearedCount = originalCount - this.errorReports.length;
    
    if (clearedCount > 0) {
      await this.saveErrorReports();
      logger.debug(`Cleared ${clearedCount} old error reports`);
    }
    
    return clearedCount;
  }

  /**
   * Generate error summary report
   */
  generateErrorReport(): {
    summary: string;
    recommendations: string[];
    metrics: ErrorMetrics;
  } {
    const metrics = this.getErrorMetrics();
    const recommendations: string[] = [];
    
    let summary = `Error Summary: ${metrics.totalErrors} total errors, ${metrics.uniqueErrors} unique`;
    
    if (metrics.criticalErrors > 0) {
      summary += `, ${metrics.criticalErrors} critical`;
      recommendations.push('Address critical errors immediately');
    }
    
    if (metrics.errorRate > 5) {
      recommendations.push('High error rate detected - review error patterns');
    }
    
    const topErrorType = Object.entries(metrics.errorsByType)
      .sort(([,a], [,b]) => b - a)[0];
    
    if (topErrorType && topErrorType[1] > metrics.totalErrors * 0.3) {
      recommendations.push(`Focus on ${topErrorType[0]} errors (${topErrorType[1]} occurrences)`);
    }

    return {
      summary,
      recommendations,
      metrics
    };
  }

  /**
   * Configure error monitoring options
   */
  configure(options: Partial<ErrorHandlerOptions>): void {
    this.options = { ...this.options, ...options };
    logger.debug('Error monitoring configured', { options: this.options });
  }

  /**
   * Get all error reports
   */
  getAllErrors(): ErrorReport[] {
    return [...this.errorReports];
  }
}

// Export singleton instance
export const errorMonitoring = ErrorMonitoringSystem.getInstance();

// React error boundary integration
export const withErrorMonitoring = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName?: string
) => {
  const React = require('react');
  const name = componentName || WrappedComponent.displayName || WrappedComponent.name || 'Unknown';
  
  return class ErrorMonitoredComponent extends React.Component<P, { hasError: boolean }> {
    constructor(props: P) {
      super(props);
      this.state = { hasError: false };
    }

    static getDerivedStateFromError(): { hasError: boolean } {
      return { hasError: true };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
      errorMonitoring.reportError(error, {
        type: 'javascript',
        severity: 'high',
        context: {
          component: name,
          props: this.props as any,
          componentStack: errorInfo.componentStack
        }
      });
    }

    render() {
      if (this.state.hasError) {
        return React.createElement('div', null, `Error in ${name} component`);
      }

      return React.createElement(WrappedComponent, this.props);
    }
  };
};

// Hook for error reporting
export const useErrorReporting = () => {
  const reportError = React.useCallback((error: Error | string, options?: {
    type?: ErrorReport['type'];
    severity?: ErrorReport['severity'];
    context?: Partial<ErrorContext>;
  }) => {
    return errorMonitoring.reportError(error, options);
  }, []);

  return {
    reportError,
    metrics: errorMonitoring.getErrorMetrics(),
    clearOldErrors: errorMonitoring.clearOldErrors.bind(errorMonitoring)
  };
};
