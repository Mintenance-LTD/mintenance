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

    // Supabase/PostgreSQL errors
    if (error.message) {
      if (error.message.includes('duplicate key')) {
        return 'This record already exists.';
      }
      if (error.message.includes('foreign key')) {
        return 'Cannot delete this item because it is being used elsewhere.';
      }
      if (error.message.includes('not found') || error.code === 'PGRST116') {
        return 'The requested item was not found.';
      }
      if (error.message.includes('permission denied') || error.code === '42501') {
        return 'You do not have permission to perform this action.';
      }
    }

    // Network errors
    if (error.code === 'NETWORK_ERROR' || !navigator.onLine) {
      return 'Please check your internet connection and try again.';
    }

    // HTTP status codes
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

    // Generic fallback
    return 'An unexpected error occurred. Please try again.';
  }

  static reportError(error: any, context?: string): void {
    // Import Sentry dynamically to avoid circular dependencies
    import('../config/sentry').then(({ captureException }) => {
      captureException(error, { context });
    }).catch(() => {
      // Fallback if Sentry fails
      logger.error('Error reporting failed:', error, context);
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
        logger.error('Error in ${context}:', appError);
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
    return error.code === 'NETWORK_ERROR' || 
           error.message?.includes('Network') ||
           !navigator.onLine;
  }

  static isAuthError(error: any): boolean {
    return error.statusCode === 401 || 
           error.code === '42501' ||
           error.message?.includes('permission denied');
  }

  static isValidationError(error: any): boolean {
    return error.statusCode === 400 ||
           error.statusCode === 422 ||
           error.message?.includes('validation');
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