/**
 * Enhanced Error Handling Utilities
 *
 * Provides error categorization, retry logic, and user-friendly error messages.
 * Part of the error handling improvement initiative.
 */

import { logger } from './logger';

/**
 * Error categories for better error handling
 */
export enum ErrorCategory {
  NETWORK = 'network',
  VALIDATION = 'validation',
  SERVER = 'server',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  NOT_FOUND = 'not_found',
  RATE_LIMIT = 'rate_limit',
  UNKNOWN = 'unknown',
}

/**
 * Categorized error with metadata
 */
export class CategorizedError extends Error {
  constructor(
    message: string,
    public readonly category: ErrorCategory,
    public readonly code: string,
    public readonly retryable: boolean = false,
    public readonly userMessage?: string,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = 'CategorizedError';
    Error.captureStackTrace(this, CategorizedError);
  }
}

/**
 * Retry configuration options
 */
export interface RetryConfig {
  maxAttempts: number;
  delayMs: number;
  backoffMultiplier: number;
  maxDelayMs: number;
  retryableErrors?: ErrorCategory[];
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  delayMs: 1000,
  backoffMultiplier: 2,
  maxDelayMs: 10000,
  retryableErrors: [
    ErrorCategory.NETWORK,
    ErrorCategory.SERVER,
    ErrorCategory.RATE_LIMIT,
  ],
};

/**
 * Categorizes an error based on its properties
 *
 * @param error - The error to categorize
 * @returns Categorized error
 */
export function categorizeError(error: unknown): CategorizedError {
  // Already categorized
  if (error instanceof CategorizedError) {
    return error;
  }

  // Handle standard Error objects
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    const errorAny = error as any;

    // Network errors
    if (
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('timeout') ||
      message.includes('connection') ||
      errorAny.code === 'ECONNREFUSED' ||
      errorAny.code === 'ETIMEDOUT'
    ) {
      return new CategorizedError(
        error.message,
        ErrorCategory.NETWORK,
        errorAny.code || 'NETWORK_ERROR',
        true, // Retryable
        'Connection error. Please check your internet and try again.',
        error
      );
    }

    // Authentication errors
    if (
      message.includes('unauthorized') ||
      message.includes('authentication') ||
      message.includes('invalid token') ||
      errorAny.status === 401
    ) {
      return new CategorizedError(
        error.message,
        ErrorCategory.AUTHENTICATION,
        'AUTH_ERROR',
        false,
        'You need to sign in again.',
        error
      );
    }

    // Authorization errors
    if (
      message.includes('forbidden') ||
      message.includes('not authorized') ||
      message.includes('permission denied') ||
      errorAny.status === 403
    ) {
      return new CategorizedError(
        error.message,
        ErrorCategory.AUTHORIZATION,
        'FORBIDDEN',
        false,
        'You don\'t have permission to perform this action.',
        error
      );
    }

    // Not found errors
    if (
      message.includes('not found') ||
      errorAny.status === 404
    ) {
      return new CategorizedError(
        error.message,
        ErrorCategory.NOT_FOUND,
        'NOT_FOUND',
        false,
        'The requested resource was not found.',
        error
      );
    }

    // Rate limiting errors
    if (
      message.includes('rate limit') ||
      message.includes('too many requests') ||
      errorAny.status === 429
    ) {
      return new CategorizedError(
        error.message,
        ErrorCategory.RATE_LIMIT,
        'RATE_LIMIT',
        true,
        'Too many requests. Please wait a moment and try again.',
        error
      );
    }

    // Validation errors
    if (
      message.includes('validation') ||
      message.includes('invalid') ||
      message.includes('required') ||
      errorAny.status === 400
    ) {
      return new CategorizedError(
        error.message,
        ErrorCategory.VALIDATION,
        'VALIDATION_ERROR',
        false,
        'Please check your input and try again.',
        error
      );
    }

    // Server errors
    if (
      errorAny.status >= 500 ||
      message.includes('server error') ||
      message.includes('internal error')
    ) {
      return new CategorizedError(
        error.message,
        ErrorCategory.SERVER,
        'SERVER_ERROR',
        true,
        'Server error. Please try again later.',
        error
      );
    }
  }

  // Unknown error
  return new CategorizedError(
    String(error),
    ErrorCategory.UNKNOWN,
    'UNKNOWN_ERROR',
    false,
    'An unexpected error occurred. Please try again.',
    error
  );
}

/**
 * Executes a function with automatic retry logic
 *
 * @param fn - The async function to execute
 * @param config - Retry configuration
 * @returns Promise with the function result
 *
 * @example
 * ```typescript
 * const data = await withRetry(
 *   () => fetchDataFromAPI(),
 *   { maxAttempts: 3, delayMs: 1000 }
 * );
 * ```
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: CategorizedError | undefined;

  for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const categorized = categorizeError(error);
      lastError = categorized;

      // Check if error is retryable
      const isRetryable =
        categorized.retryable &&
        (!finalConfig.retryableErrors ||
          finalConfig.retryableErrors.includes(categorized.category));

      // Don't retry if not retryable or last attempt
      if (!isRetryable || attempt >= finalConfig.maxAttempts) {
        logger.error(`Operation failed after ${attempt} attempt(s)`, {
          category: categorized.category,
          code: categorized.code,
          message: categorized.message,
        });
        throw categorized;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        finalConfig.delayMs * Math.pow(finalConfig.backoffMultiplier, attempt - 1),
        finalConfig.maxDelayMs
      );

      logger.warn(`Retrying operation (attempt ${attempt}/${finalConfig.maxAttempts}) after ${delay}ms`, {
        category: categorized.category,
        code: categorized.code,
      });

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError || new Error('Retry failed with unknown error');
}

/**
 * Gets a user-friendly error message from any error
 *
 * @param error - The error to extract message from
 * @returns User-friendly error message
 */
export function getUserFriendlyMessage(error: unknown): string {
  const categorized = categorizeError(error);
  return categorized.userMessage || categorized.message || 'An error occurred';
}

/**
 * Checks if an error is retryable
 *
 * @param error - The error to check
 * @returns true if the error is retryable
 */
export function isRetryable(error: unknown): boolean {
  const categorized = categorizeError(error);
  return categorized.retryable;
}

/**
 * Logs an error with proper categorization
 *
 * @param error - The error to log
 * @param context - Additional context for logging
 */
export function logCategorizedError(
  error: unknown,
  context?: Record<string, any>
): void {
  const categorized = categorizeError(error);

  const logData = {
    category: categorized.category,
    code: categorized.code,
    message: categorized.message,
    retryable: categorized.retryable,
    userMessage: categorized.userMessage,
    ...context,
  };

  switch (categorized.category) {
    case ErrorCategory.NETWORK:
    case ErrorCategory.SERVER:
    case ErrorCategory.RATE_LIMIT:
      logger.warn('Transient error occurred', logData);
      break;

    case ErrorCategory.AUTHENTICATION:
    case ErrorCategory.AUTHORIZATION:
      logger.warn('Security error occurred', logData);
      break;

    case ErrorCategory.VALIDATION:
      logger.info('Validation error occurred', logData);
      break;

    default:
      logger.error('Error occurred', logData);
      break;
  }
}

/**
 * Wraps a function with comprehensive error handling
 *
 * @param fn - The function to wrap
 * @param options - Error handling options
 * @returns Wrapped function with error handling
 *
 * @example
 * ```typescript
 * const safeApiCall = withErrorHandling(
 *   apiCall,
 *   {
 *     retry: true,
 *     logErrors: true,
 *     onError: (error) => console.error(error),
 *   }
 * );
 * ```
 */
export function withErrorHandling<TArgs extends any[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  options: {
    retry?: boolean | Partial<RetryConfig>;
    logErrors?: boolean;
    onError?: (error: CategorizedError) => void;
    defaultValue?: TReturn;
  } = {}
): (...args: TArgs) => Promise<TReturn> {
  return async (...args: TArgs): Promise<TReturn> => {
    try {
      // Execute with or without retry
      if (options.retry) {
        const retryConfig =
          typeof options.retry === 'object' ? options.retry : undefined;
        return await withRetry(() => fn(...args), retryConfig);
      } else {
        return await fn(...args);
      }
    } catch (error) {
      const categorized = categorizeError(error);

      // Log if requested
      if (options.logErrors !== false) {
        logCategorizedError(categorized);
      }

      // Call error callback if provided
      if (options.onError) {
        options.onError(categorized);
      }

      // Return default value if provided
      if (options.defaultValue !== undefined) {
        return options.defaultValue;
      }

      // Re-throw categorized error
      throw categorized;
    }
  };
}

/**
 * Creates an error handler for React components
 *
 * @param setError - setState function for error state
 * @param setLoading - setState function for loading state (optional)
 * @returns Error handler function
 *
 * @example
 * ```typescript
 * const [error, setError] = useState<string | null>(null);
 * const [loading, setLoading] = useState(false);
 * const handleError = createErrorHandler(setError, setLoading);
 *
 * try {
 *   const data = await fetchData();
 * } catch (err) {
 *   handleError(err);
 * }
 * ```
 */
export function createErrorHandler(
  setError: (message: string | null) => void,
  setLoading?: (loading: boolean) => void
) {
  return (error: unknown) => {
    const categorized = categorizeError(error);
    const message = getUserFriendlyMessage(categorized);

    setError(message);
    setLoading?.(false);

    logCategorizedError(categorized);
  };
}