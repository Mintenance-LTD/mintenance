import { Alert } from 'react-native';
import { logger } from './logger';

export interface AppError extends Error {
  code?: string;
  statusCode?: number;
  userMessage?: string;
}

export class ErrorHandler {
  static handle(error: any, context?: string): void {
    logger.error(`Error in ${context || 'unknown context'}:`, error);

    // Extract user-friendly message
    const userMessage = this.getUserMessage(error);

    // Show alert to user
    Alert.alert('Error', userMessage);

    // In production, send to error reporting service
    if (!__DEV__) {
      this.reportError(error, context);
    }
  }

  static getUserMessage(error: any): string {
    // Custom user message
    if (error.userMessage) {
      return error.userMessage;
    }

    // Handle Supabase specific error codes first
    const errorCode = error?.code || error?.error_code;

    // Supabase/PostgreSQL specific errors
    switch (errorCode) {
      case 'PGRST301':
      case 'PGRST116':
        return 'The requested item was not found.';
      case 'PGRST204':
        return 'You do not have permission to perform this action.';
      case '42501': // insufficient_privilege
        return 'You do not have permission to perform this action.';
      case '23505': // unique_violation
        return 'A record with these details already exists.';
      case '23503': // foreign_key_violation
        return 'Cannot perform this action because the item is being used elsewhere.';
      case '23514': // check_violation
        return 'The provided data is invalid.';
      case 'invalid_credentials':
        return 'Invalid email or password. Please check your credentials and try again.';
      case 'email_not_confirmed':
        return 'Please check your email and confirm your account before signing in.';
      case 'weak_password':
        return 'Password must be at least 8 characters long.';
      case 'email_address_invalid':
        return 'Please enter a valid email address.';
      case 'signup_disabled':
        return 'Account registration is currently disabled.';
    }

    // Message-based error detection for backward compatibility
    if (error.message) {
      const message = error.message.toLowerCase();

      if (message.includes('invalid login credentials')) {
        return 'Invalid email or password. Please check your credentials and try again.';
      }
      if (message.includes('email not confirmed')) {
        return 'Please check your email and confirm your account before signing in.';
      }
      if (
        message.includes('network request failed') ||
        message.includes('fetch')
      ) {
        return 'Network connection failed. Please check your internet connection and try again.';
      }
      if (message.includes('duplicate key')) {
        return 'This record already exists.';
      }
      if (message.includes('foreign key')) {
        return 'Cannot delete this item because it is being used elsewhere.';
      }
      if (message.includes('not found') || message.includes('pgrst116')) {
        return 'The requested item was not found.';
      }
      if (
        message.includes('permission denied') ||
        message.includes('row-level security') ||
        message.includes('policy')
      ) {
        return 'You do not have permission to perform this action.';
      }
      if (message.includes('password')) {
        return 'Password must be at least 8 characters long.';
      }
      if (message.includes('email')) {
        return 'Please enter a valid email address.';
      }
    }

    // HTTP status codes take precedence over generic network fallback
    switch (error.statusCode) {
      case 400:
        return 'Invalid request. Please check your input and try again.';
      case 401:
        return 'Please log in to continue.';
      case 403:
        return 'You do not have permission to perform this action.';
      case 404:
        return 'The requested item was not found.';
      case 409:
        return 'This action conflicts with the current state. Please refresh and try again.';
      case 422:
        return 'The provided data is invalid. Please check and try again.';
      case 429:
        return 'Too many requests. Please wait a moment and try again.';
      case 500:
        return 'Server error. Please try again later.';
      case 503:
        return 'Service temporarily unavailable. Please try again later.';
    }

    // Network errors
    if (
      error.code === 'NETWORK_ERROR' ||
      (typeof navigator !== 'undefined' && !navigator.onLine)
    ) {
      return 'Please check your internet connection and try again.';
    }

    // Generic fallback
    return 'An unexpected error occurred. Please try again.';
  }

  static reportError(error: any, context?: string): void {
    // Import Sentry dynamically to avoid circular dependencies
    import('../config/sentry')
      .then(({ captureException }) => {
        captureException(error, { context });
      })
      .catch(() => {
        // Fallback if Sentry fails
        logger.error('Error reporting failed:', error, { context });
      });
  }

  static async handleAsync<T>(
    promise: Promise<T>,
    context?: string
  ): Promise<[T | null, AppError | null]> {
    try {
      const result = await promise;
      return [result, null];
    } catch (error) {
      const appError = error as AppError;
      if (context) {
        logger.error(`Error in ${context}:`, appError);
      }
      return [null, appError];
    }
  }

  static createError(
    message: string,
    code?: string,
    userMessage?: string
  ): AppError {
    const error = new Error(message) as AppError;
    error.code = code;
    error.userMessage = userMessage;
    return error;
  }

  static isNetworkError(error: any): boolean {
    const offline =
      typeof navigator !== 'undefined' && (navigator as any).onLine === false;
    return (
      error.code === 'NETWORK_ERROR' ||
      error.message?.toLowerCase?.().includes('network') ||
      offline
    );
  }

  static isAuthError(error: any): boolean {
    return (
      error.statusCode === 401 ||
      error.code === '42501' ||
      error.message?.includes('permission denied')
    );
  }

  static isValidationError(error: any): boolean {
    return (
      error.statusCode === 400 ||
      error.statusCode === 422 ||
      error.message?.includes('validation')
    );
  }

  // Validation helpers
  static validateEmail(email: string): void {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw this.createError(
        'Invalid email format',
        'VALIDATION_ERROR',
        'Please enter a valid email address.'
      );
    }
  }

  static validatePassword(password: string): void {
    if (!password || password.length < 8) {
      throw this.createError(
        'Password too short',
        'VALIDATION_ERROR',
        'Password must be at least 8 characters long.'
      );
    }
  }

  static validateRequired(value: any, fieldName: string): void {
    if (!value || (typeof value === 'string' && !value.trim())) {
      throw this.createError(
        `${fieldName} is required`,
        'VALIDATION_ERROR',
        `${fieldName} is required.`
      );
    }
  }

  static validateRequiredFields(
    data: Record<string, any>,
    requiredFields: string[]
  ): void {
    for (const field of requiredFields) {
      this.validateRequired(data[field], field);
    }
  }

  // Retry mechanism for network operations
  static async withRetry<T>(
    operation: () => Promise<T>,
    options: {
      maxAttempts?: number;
      delay?: number;
      backoff?: boolean;
      context?: string;
    } = {}
  ): Promise<T> {
    const { maxAttempts = 3, delay = 1000, backoff = true, context } = options;

    let lastError: any;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        // Don't retry if it's not a network error or server error
        if (!this.shouldRetry(error)) {
          throw error;
        }

        if (attempt === maxAttempts) {
          logger.error(`Operation failed after ${maxAttempts} attempts`, {
            context,
            error,
          });
          throw error;
        }

        const retryDelay = backoff ? delay * Math.pow(2, attempt - 1) : delay;
        logger.warn(
          `Retrying operation in ${retryDelay}ms (attempt ${attempt}/${maxAttempts})`,
          { context, error: (error as any)?.message || String(error) }
        );

        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }

    throw lastError;
  }

  static shouldRetry(error: any): boolean {
    // Retry network errors and server errors
    if (this.isNetworkError(error)) return true;
    if (error.statusCode >= 500) return true;

    // Retry specific Supabase errors that might be temporary
    const retryableCodes = ['PGRST301', 'PGRST116']; // Sometimes these are temporary
    if (retryableCodes.includes(error.code)) return true;

    return false;
  }
}

// Utility function for component error handling
export const handleError = (error: any, context?: string) => {
  ErrorHandler.handle(error, context);
};

// Utility function for async operations with error handling
export const safeAsync = <T>(promise: Promise<T>, context?: string) => {
  return ErrorHandler.handleAsync(promise, context);
};

export default ErrorHandler;
