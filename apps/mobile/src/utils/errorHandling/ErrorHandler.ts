/**
 * Comprehensive Error Handling System
 * Centralized error management with recovery strategies
 */

import { captureException, captureMessage, addBreadcrumb } from '@sentry/react-native';
import { Alert } from 'react-native';
import { logger } from '../logger';

export enum ErrorType {
  NETWORK = 'NETWORK',
  AUTHENTICATION = 'AUTHENTICATION',
  VALIDATION = 'VALIDATION',
  PERMISSION = 'PERMISSION',
  STORAGE = 'STORAGE',
  BUSINESS_LOGIC = 'BUSINESS_LOGIC',
  UNKNOWN = 'UNKNOWN'
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface ErrorContext {
  userId?: string;
  screen?: string;
  action?: string;
  metadata?: Record<string, any>;
}

export interface ErrorRecoveryOptions {
  showToast?: boolean;
  showAlert?: boolean;
  retryable?: boolean;
  maxRetries?: number;
  fallbackAction?: () => void;
}

export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly severity: ErrorSeverity;
  public readonly context: ErrorContext;
  public readonly recoveryOptions: ErrorRecoveryOptions;
  public readonly timestamp: Date;
  public readonly retryCount: number;

  constructor(
    message: string,
    type: ErrorType = ErrorType.UNKNOWN,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    context: ErrorContext = {},
    recoveryOptions: ErrorRecoveryOptions = {}
  ) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.severity = severity;
    this.context = context;
    this.recoveryOptions = recoveryOptions;
    this.timestamp = new Date();
    this.retryCount = 0;
  }

  public withRetryCount(count: number): AppError {
    const error = new AppError(
      this.message,
      this.type,
      this.severity,
      this.context,
      this.recoveryOptions
    );
    (error as any).retryCount = count;
    return error;
  }
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorQueue: AppError[] = [];
  private isOnline: boolean = true;

  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  private constructor() {
    this.setupNetworkMonitoring();
  }

  private setupNetworkMonitoring(): void {
    // Monitor network status for error context
    const NetInfo = require('@react-native-community/netinfo');
    NetInfo.addEventListener((state: any) => {
      this.isOnline = state.isConnected && state.isInternetReachable;
    });
  }

  public handleError(
    error: Error | AppError,
    context: ErrorContext = {},
    recoveryOptions: ErrorRecoveryOptions = {}
  ): void {
    const appError = this.normalizeError(error, context, recoveryOptions);
    
    // Log error locally
    this.logError(appError);
    
    // Add to queue for batch processing
    this.errorQueue.push(appError);
    
    // Process error based on severity
    this.processError(appError);
    
    // Report to monitoring service
    this.reportError(appError);
  }

  private normalizeError(
    error: Error | AppError,
    context: ErrorContext,
    recoveryOptions: ErrorRecoveryOptions
  ): AppError {
    if (error instanceof AppError) {
      return error;
    }

    // Determine error type from error message or properties
    const type = this.determineErrorType(error);
    const severity = this.determineSeverity(error, type);
    
    return new AppError(
      error.message || 'Unknown error occurred',
      type,
      severity,
      { ...context, originalError: error.name },
      recoveryOptions
    );
  }

  private determineErrorType(error: Error): ErrorType {
    const message = error.message.toLowerCase();
    
    if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) {
      return ErrorType.NETWORK;
    }
    
    if (message.includes('auth') || message.includes('unauthorized') || message.includes('forbidden')) {
      return ErrorType.AUTHENTICATION;
    }
    
    if (message.includes('validation') || message.includes('invalid') || message.includes('required')) {
      return ErrorType.VALIDATION;
    }
    
    if (message.includes('permission') || message.includes('denied')) {
      return ErrorType.PERMISSION;
    }
    
    if (message.includes('storage') || message.includes('database') || message.includes('sqlite')) {
      return ErrorType.STORAGE;
    }
    
    return ErrorType.UNKNOWN;
  }

  private determineSeverity(error: Error, type: ErrorType): ErrorSeverity {
    // Critical errors that break core functionality
    if (type === ErrorType.AUTHENTICATION || type === ErrorType.STORAGE) {
      return ErrorSeverity.CRITICAL;
    }
    
    // High severity for business logic errors
    if (type === ErrorType.BUSINESS_LOGIC) {
      return ErrorSeverity.HIGH;
    }
    
    // Medium for network and validation errors
    if (type === ErrorType.NETWORK || type === ErrorType.VALIDATION) {
      return ErrorSeverity.MEDIUM;
    }
    
    // Low for permission and unknown errors
    return ErrorSeverity.LOW;
  }

  private logError(error: AppError): void {
    const logMessage = `[${error.severity.toUpperCase()}] ${error.type}: ${error.message}`;
    
    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
        logger.error(logMessage, error.context);
        break;
      case ErrorSeverity.HIGH:
        logger.warn(logMessage, error.context);
        break;
      case ErrorSeverity.MEDIUM:
        logger.info(logMessage, error.context);
        break;
      case ErrorSeverity.LOW:
        logger.debug(logMessage, error.context);
        break;
    }
  }

  private processError(error: AppError): void {
    // Handle user-facing error display
    if (error.recoveryOptions.showAlert) {
      this.showErrorAlert(error);
    }
    
    // Handle retryable errors
    if (error.recoveryOptions.retryable && error.retryCount < (error.recoveryOptions.maxRetries || 3)) {
      this.scheduleRetry(error);
    }
    
    // Execute fallback action
    if (error.recoveryOptions.fallbackAction) {
      try {
        error.recoveryOptions.fallbackAction();
      } catch (fallbackError) {
        logger.error('Fallback action failed', { fallbackError });
      }
    }
  }

  private showErrorAlert(error: AppError): void {
    const title = this.getErrorTitle(error);
    const message = this.getErrorMessage(error);
    
    Alert.alert(title, message, [
      { text: 'OK', style: 'default' },
      ...(error.recoveryOptions.retryable ? [{ text: 'Retry', onPress: () => this.retryError(error) }] : [])
    ]);
  }

  private getErrorTitle(error: AppError): string {
    switch (error.type) {
      case ErrorType.NETWORK:
        return 'Connection Error';
      case ErrorType.AUTHENTICATION:
        return 'Authentication Error';
      case ErrorType.VALIDATION:
        return 'Validation Error';
      case ErrorType.PERMISSION:
        return 'Permission Required';
      case ErrorType.STORAGE:
        return 'Storage Error';
      default:
        return 'Error';
    }
  }

  private getErrorMessage(error: AppError): string {
    switch (error.type) {
      case ErrorType.NETWORK:
        return 'Please check your internet connection and try again.';
      case ErrorType.AUTHENTICATION:
        return 'Your session has expired. Please log in again.';
      case ErrorType.VALIDATION:
        return 'Please check your input and try again.';
      case ErrorType.PERMISSION:
        return 'This feature requires additional permissions.';
      case ErrorType.STORAGE:
        return 'Unable to save data. Please try again.';
      default:
        return error.message || 'An unexpected error occurred.';
    }
  }

  private scheduleRetry(error: AppError): void {
    const delay = Math.min(1000 * Math.pow(2, error.retryCount), 10000); // Exponential backoff, max 10s
    
    setTimeout(() => {
      this.retryError(error);
    }, delay);
  }

  private retryError(error: AppError): void {
    const retryError = error.withRetryCount(error.retryCount + 1);
    logger.info(`Retrying error (attempt ${retryError.retryCount})`, { originalError: error.message });
    
    // Re-process the error with incremented retry count
    this.processError(retryError);
  }

  private reportError(error: AppError): void {
    // Add breadcrumb for context
    addBreadcrumb({
      category: 'error',
      message: error.message,
      level: error.severity,
      data: error.context
    });

    // Capture exception with Sentry
    if (error.severity === ErrorSeverity.CRITICAL || error.severity === ErrorSeverity.HIGH) {
      captureException(error);
    } else {
      captureMessage(error.message, {
        level: error.severity,
        extra: {
          type: error.type,
          context: error.context,
          retryCount: error.retryCount
        }
      });
    }
  }

  public clearErrorQueue(): void {
    this.errorQueue = [];
  }

  public getErrorQueue(): AppError[] {
    return [...this.errorQueue];
  }
}

// Convenience functions for common error scenarios
export const handleNetworkError = (error: Error, context: ErrorContext = {}) => {
  const errorHandler = ErrorHandler.getInstance();
  errorHandler.handleError(error, context, {
    showAlert: true,
    retryable: true,
    maxRetries: 3
  });
};

export const handleAuthError = (error: Error, context: ErrorContext = {}) => {
  const errorHandler = ErrorHandler.getInstance();
  errorHandler.handleError(error, context, {
    showAlert: true,
    fallbackAction: () => {
      // Navigate to login screen
      // NavigationService.navigate('Auth', { screen: 'Login' });
    }
  });
};

export const handleValidationError = (error: Error, context: ErrorContext = {}) => {
  const errorHandler = ErrorHandler.getInstance();
  errorHandler.handleError(error, context, {
    showAlert: true
  });
};

export const handleStorageError = (error: Error, context: ErrorContext = {}) => {
  const errorHandler = ErrorHandler.getInstance();
  errorHandler.handleError(error, context, {
    showAlert: true,
    retryable: true,
    maxRetries: 2
  });
};
