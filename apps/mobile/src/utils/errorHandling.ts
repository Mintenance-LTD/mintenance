import { Alert } from 'react-native';
import { logger } from './logger';

// ============================================================================
// ERROR TYPES & CATEGORIES
// ============================================================================

export enum ErrorCategory {
  NETWORK = 'network',
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  BUSINESS_LOGIC = 'business_logic',
  SYSTEM = 'system',
  EXTERNAL_API = 'external_api',
  DATABASE = 'database',
  FILE_SYSTEM = 'file_system',
  USER_INPUT = 'user_input',
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface ErrorContext {
  userId?: string;
  screen?: string;
  action?: string;
  feature?: string;
  metadata?: Record<string, any>;
}

export interface StandardError {
  id: string;
  message: string;
  userMessage: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  context: ErrorContext;
  originalError?: Error;
  timestamp: string;
  stackTrace?: string;
}

// ============================================================================
// ERROR HANDLING SERVICE
// ============================================================================

export class ErrorHandlingService {
  private static errorId = 0;

  /**
   * Generate unique error ID
   */
  private static generateErrorId(): string {
    return `error_${Date.now()}_${++this.errorId}`;
  }

  /**
   * Create standardized error object
   */
  static createError(
    message: string,
    userMessage: string,
    category: ErrorCategory,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    context: ErrorContext = {},
    originalError?: Error
  ): StandardError {
    return {
      id: this.generateErrorId(),
      message,
      userMessage,
      category,
      severity,
      context,
      originalError,
      timestamp: new Date().toISOString(),
      stackTrace: originalError?.stack || new Error().stack,
    };
  }

  /**
   * Handle errors with consistent logging and user feedback
   */
  static handleError(
    error: Error | StandardError,
    context: ErrorContext = {},
    showUserAlert = true
  ): StandardError {
    let standardError: StandardError;

    if (this.isStandardError(error)) {
      standardError = error;
    } else {
      standardError = this.classifyError(error, context);
    }

    // Log error with structured data
    this.logError(standardError);

    // Show user-friendly alert if requested
    if (showUserAlert) {
      this.showUserAlert(standardError);
    }

    // Report to crash analytics (in production)
    if (!__DEV__) {
      this.reportToCrashlytics(standardError);
    }

    return standardError;
  }

  /**
   * Classify unknown errors into standard format
   */
  private static classifyError(error: Error, context: ErrorContext): StandardError {
    const errorMessage = error.message.toLowerCase();

    // Network errors
    if (
      errorMessage.includes('network') ||
      errorMessage.includes('fetch') ||
      errorMessage.includes('connection') ||
      errorMessage.includes('timeout')
    ) {
      return this.createError(
        error.message,
        'Network connection failed. Please check your internet connection and try again.',
        ErrorCategory.NETWORK,
        ErrorSeverity.MEDIUM,
        context,
        error
      );
    }

    // Authentication errors
    if (
      errorMessage.includes('unauthorized') ||
      errorMessage.includes('authentication') ||
      errorMessage.includes('login') ||
      errorMessage.includes('token')
    ) {
      return this.createError(
        error.message,
        'Authentication failed. Please log in again.',
        ErrorCategory.AUTHENTICATION,
        ErrorSeverity.HIGH,
        context,
        error
      );
    }

    // Permission errors
    if (
      errorMessage.includes('forbidden') ||
      errorMessage.includes('permission') ||
      errorMessage.includes('access denied')
    ) {
      return this.createError(
        error.message,
        'You don\'t have permission to perform this action.',
        ErrorCategory.AUTHORIZATION,
        ErrorSeverity.MEDIUM,
        context,
        error
      );
    }

    // Validation errors
    if (
      errorMessage.includes('validation') ||
      errorMessage.includes('invalid') ||
      errorMessage.includes('required')
    ) {
      return this.createError(
        error.message,
        'Please check your input and try again.',
        ErrorCategory.VALIDATION,
        ErrorSeverity.LOW,
        context,
        error
      );
    }

    // Default to system error
    return this.createError(
      error.message,
      'An unexpected error occurred. Please try again.',
      ErrorCategory.SYSTEM,
      ErrorSeverity.MEDIUM,
      context,
      error
    );
  }

  /**
   * Check if error is already standardized
   */
  private static isStandardError(error: any): error is StandardError {
    return (
      typeof error === 'object' &&
      error !== null &&
      'id' in error &&
      'category' in error &&
      'severity' in error
    );
  }

  /**
   * Log error with appropriate level
   */
  private static logError(error: StandardError): void {
    const logData = {
      errorId: error.id,
      category: error.category,
      severity: error.severity,
      message: error.message,
      context: error.context,
      timestamp: error.timestamp,
    };

    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
        logger.error(`CRITICAL ERROR: ${error.message}`, logData);
        break;
      case ErrorSeverity.HIGH:
        logger.error(`HIGH SEVERITY: ${error.message}`, logData);
        break;
      case ErrorSeverity.MEDIUM:
        logger.warn(`MEDIUM SEVERITY: ${error.message}`, logData);
        break;
      case ErrorSeverity.LOW:
        logger.info(`LOW SEVERITY: ${error.message}`, logData);
        break;
    }
  }

  /**
   * Show user-friendly alert based on error severity
   */
  private static showUserAlert(error: StandardError): void {
    const title = this.getAlertTitle(error.category, error.severity);
    const buttons = this.getAlertButtons(error);

    Alert.alert(title, error.userMessage, buttons);
  }

  /**
   * Get appropriate alert title based on error type
   */
  private static getAlertTitle(
    category: ErrorCategory,
    severity: ErrorSeverity
  ): string {
    if (severity === ErrorSeverity.CRITICAL) {
      return 'Critical Error';
    }

    switch (category) {
      case ErrorCategory.NETWORK:
        return 'Connection Error';
      case ErrorCategory.AUTHENTICATION:
        return 'Authentication Required';
      case ErrorCategory.AUTHORIZATION:
        return 'Access Denied';
      case ErrorCategory.VALIDATION:
        return 'Input Error';
      case ErrorCategory.BUSINESS_LOGIC:
        return 'Operation Failed';
      default:
        return 'Error';
    }
  }

  /**
   * Get appropriate alert buttons
   */
  private static getAlertButtons(error: StandardError) {
    const buttons: any[] = [{ text: 'OK', style: 'default' }];

    // Add retry button for network errors
    if (error.category === ErrorCategory.NETWORK) {
      buttons.unshift({ text: 'Retry', style: 'default' });
    }

    // Add different button for critical errors
    if (error.severity === ErrorSeverity.CRITICAL) {
      buttons[0] = { text: 'Report Issue', style: 'default' };
    }

    return buttons;
  }

  /**
   * Report errors to crash analytics service
   */
  private static reportToCrashlytics(error: StandardError): void {
    // In a real app, you would integrate with services like:
    // - Firebase Crashlytics
    // - Sentry
    // - Bugsnag
    // For now, we'll just log it
    logger.error('Crash Analytics Report', {
      errorId: error.id,
      category: error.category,
      severity: error.severity,
      message: error.message,
      stackTrace: error.stackTrace,
      context: error.context,
    });
  }

  /**
   * Handle network errors specifically
   */
  static handleNetworkError(
    error: Error,
    context: ErrorContext = {}
  ): StandardError {
    return this.handleError(
      this.createError(
        error.message,
        'Unable to connect to the server. Please check your internet connection.',
        ErrorCategory.NETWORK,
        ErrorSeverity.MEDIUM,
        context,
        error
      ),
      context
    );
  }

  /**
   * Handle validation errors
   */
  static handleValidationError(
    messages: string[],
    context: ErrorContext = {}
  ): StandardError {
    const errorMessage = messages.join(', ');
    return this.handleError(
      this.createError(
        errorMessage,
        'Please correct the highlighted fields and try again.',
        ErrorCategory.VALIDATION,
        ErrorSeverity.LOW,
        context
      ),
      context
    );
  }

  /**
   * Handle authentication errors
   */
  static handleAuthenticationError(
    error: Error,
    context: ErrorContext = {}
  ): StandardError {
    return this.handleError(
      this.createError(
        error.message,
        'Your session has expired. Please log in again.',
        ErrorCategory.AUTHENTICATION,
        ErrorSeverity.HIGH,
        context,
        error
      ),
      context
    );
  }

  /**
   * Handle business logic errors
   */
  static handleBusinessError(
    message: string,
    userMessage: string,
    context: ErrorContext = {}
  ): StandardError {
    return this.handleError(
      this.createError(
        message,
        userMessage,
        ErrorCategory.BUSINESS_LOGIC,
        ErrorSeverity.MEDIUM,
        context
      ),
      context
    );
  }
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Quick error handler for common use cases
 */
export const handleError = (
  error: Error | StandardError,
  context?: ErrorContext,
  showAlert = true
) => ErrorHandlingService.handleError(error, context, showAlert);

/**
 * Network error handler
 */
export const handleNetworkError = (error: Error, context?: ErrorContext) =>
  ErrorHandlingService.handleNetworkError(error, context);

/**
 * Validation error handler
 */
export const handleValidationError = (messages: string[], context?: ErrorContext) =>
  ErrorHandlingService.handleValidationError(messages, context);

/**
 * Authentication error handler
 */
export const handleAuthError = (error: Error, context?: ErrorContext) =>
  ErrorHandlingService.handleAuthenticationError(error, context);

/**
 * Business logic error handler
 */
export const handleBusinessError = (
  message: string,
  userMessage: string,
  context?: ErrorContext
) => ErrorHandlingService.handleBusinessError(message, userMessage, context);