// ============================================================================
// SERVICE ERROR HANDLER
// Unified error handling for all service layer operations
// ============================================================================

import { ErrorHandlingService, ErrorCategory, ErrorSeverity, ErrorContext } from './errorHandling';
import { logger } from './logger';

// ============================================================================
// SERVICE-SPECIFIC ERROR TYPES
// ============================================================================

export interface ServiceOperationResult<T> {
  data?: T;
  error?: Error;
  success: boolean;
}

export interface ServiceErrorContext extends ErrorContext {
  service: string;
  method: string;
  params?: Record<string, any>;
}

// ============================================================================
// SERVICE ERROR HANDLER CLASS
// ============================================================================

export class ServiceErrorHandler {
  /**
   * Wrap service operations with standardized error handling
   */
  static async executeOperation<T>(
    operation: () => Promise<T>,
    context: ServiceErrorContext,
    showUserAlert = true
  ): Promise<ServiceOperationResult<T>> {
    try {
      const data = await operation();
      return { data, success: true };
    } catch (error) {
      const standardError = ErrorHandlingService.handleError(
        error as Error,
        context,
        showUserAlert
      );

      logger.error(`Service operation failed in ${context.service}.${context.method}`, {
        errorId: standardError.id,
        context,
        originalError: error,
      });

      return {
        error: error as Error,
        success: false
      };
    }
  }

  /**
   * Handle database/Supabase errors
   */
  static handleDatabaseError(
    error: any,
    context: ServiceErrorContext,
    showUserAlert = true
  ) {
    const enhancedContext = {
      ...context,
      category: ErrorCategory.DATABASE,
    };

    // Classify severity based on error type
    let severity = ErrorSeverity.MEDIUM;
    if (error?.code === 'PGRST301' || error?.code === 'PGRST116') {
      severity = ErrorSeverity.LOW; // Not found is usually low severity
    } else if (error?.code === '42501' || error?.code === 'PGRST204') {
      severity = ErrorSeverity.HIGH; // Permission issues are high severity
    }

    return ErrorHandlingService.createError(
      error?.message || 'Database operation failed',
      this.getDatabaseUserMessage(error),
      ErrorCategory.DATABASE,
      severity,
      enhancedContext,
      error
    );
  }

  /**
   * Handle validation errors
   */
  static handleValidationError(
    message: string,
    field: string,
    context: ServiceErrorContext,
    showUserAlert = true
  ) {
    const enhancedContext = {
      ...context,
      metadata: { field, ...context.metadata },
    };

    return ErrorHandlingService.createError(
      `Validation failed for ${field}: ${message}`,
      message,
      ErrorCategory.VALIDATION,
      ErrorSeverity.LOW,
      enhancedContext
    );
  }

  /**
   * Handle network/API errors
   */
  static handleNetworkError(
    error: any,
    context: ServiceErrorContext,
    showUserAlert = true
  ) {
    const enhancedContext = {
      ...context,
      category: ErrorCategory.NETWORK,
    };

    let severity = ErrorSeverity.MEDIUM;
    if (error?.status >= 500) {
      severity = ErrorSeverity.HIGH; // Server errors are high severity
    } else if (error?.status === 401 || error?.status === 403) {
      severity = ErrorSeverity.HIGH; // Auth errors are high severity
    }

    return ErrorHandlingService.createError(
      error?.message || 'Network operation failed',
      this.getNetworkUserMessage(error),
      ErrorCategory.NETWORK,
      severity,
      enhancedContext,
      error
    );
  }

  /**
   * Validate required parameters
   */
  static validateRequired(value: any, fieldName: string, context: ServiceErrorContext) {
    if (value === null || value === undefined || value === '') {
      throw this.handleValidationError(
        `${fieldName} is required`,
        fieldName,
        context
      );
    }
  }

  /**
   * Validate email format
   */
  static validateEmail(email: string, context: ServiceErrorContext) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw this.handleValidationError(
        'Please enter a valid email address',
        'email',
        context
      );
    }
  }

  /**
   * Validate password strength
   */
  static validatePassword(password: string, context: ServiceErrorContext) {
    if (!password || password.length < 8) {
      throw this.handleValidationError(
        'Password must be at least 8 characters long',
        'password',
        context
      );
    }
  }

  /**
   * Validate positive number
   */
  static validatePositiveNumber(value: number, fieldName: string, context: ServiceErrorContext) {
    if (value <= 0) {
      throw this.handleValidationError(
        `${fieldName} must be a positive number`,
        fieldName,
        context
      );
    }
  }

  // ========================================================================
  // PRIVATE HELPER METHODS
  // ========================================================================

  private static getDatabaseUserMessage(error: any): string {
    const errorCode = error?.code || error?.error_code;

    switch (errorCode) {
      case 'PGRST301':
      case 'PGRST116':
        return 'The requested item was not found.';
      case 'PGRST204':
      case '42501':
        return 'You do not have permission to perform this action.';
      case '23505':
        return 'A record with these details already exists.';
      case '23503':
        return 'Cannot perform this action because the item is being used elsewhere.';
      case '23514':
        return 'The provided data is invalid.';
      default:
        return 'A database error occurred. Please try again.';
    }
  }

  private static getNetworkUserMessage(error: any): string {
    if (error?.status >= 500) {
      return 'Server is currently unavailable. Please try again later.';
    } else if (error?.status === 401) {
      return 'Your session has expired. Please log in again.';
    } else if (error?.status === 403) {
      return 'You do not have permission to perform this action.';
    } else if (error?.status === 404) {
      return 'The requested resource was not found.';
    } else if (!navigator.onLine) {
      return 'No internet connection. Please check your network and try again.';
    } else {
      return 'A network error occurred. Please try again.';
    }
  }
}

export default ServiceErrorHandler;