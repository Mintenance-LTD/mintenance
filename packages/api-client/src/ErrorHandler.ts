/**
 * Unified Error Handler
 * 
 * Standardizes error types and messages across web and mobile platforms.
 */

export enum ErrorType {
  NETWORK = 'NETWORK',
  API = 'API',
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  NOT_FOUND = 'NOT_FOUND',
  SERVER = 'SERVER',
  UNKNOWN = 'UNKNOWN',
}

export interface ApiError {
  type: ErrorType;
  message: string;
  code: string;
  statusCode: number;
  details?: unknown;
  originalError?: unknown;
}

export class NetworkError extends Error implements ApiError {
  type = ErrorType.NETWORK;
  code = 'NETWORK_ERROR';
  statusCode = 0;
  details?: unknown;
  originalError?: unknown;

  constructor(message: string, originalError?: unknown) {
    super(message);
    this.name = 'NetworkError';
    this.originalError = originalError;
  }
}

export class ApiError extends Error implements ApiError {
  type: ErrorType;
  code: string;
  statusCode: number;
  details?: unknown;
  originalError?: unknown;

  constructor(
    message: string,
    type: ErrorType,
    code: string,
    statusCode: number,
    details?: unknown,
    originalError?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
    this.type = type;
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.originalError = originalError;
  }
}

export class ValidationError extends Error implements ApiError {
  type = ErrorType.VALIDATION;
  code = 'VALIDATION_ERROR';
  statusCode = 400;
  details?: unknown;
  originalError?: unknown;

  constructor(message: string, details?: unknown, originalError?: unknown) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
    this.originalError = originalError;
  }
}

export class AuthenticationError extends Error implements ApiError {
  type = ErrorType.AUTHENTICATION;
  code = 'AUTHENTICATION_ERROR';
  statusCode = 401;
  details?: unknown;
  originalError?: unknown;

  constructor(message: string, details?: unknown, originalError?: unknown) {
    super(message);
    this.name = 'AuthenticationError';
    this.details = details;
    this.originalError = originalError;
  }
}

export class AuthorizationError extends Error implements ApiError {
  type = ErrorType.AUTHORIZATION;
  code = 'AUTHORIZATION_ERROR';
  statusCode = 403;
  details?: unknown;
  originalError?: unknown;

  constructor(message: string, details?: unknown, originalError?: unknown) {
    super(message);
    this.name = 'AuthorizationError';
    this.details = details;
    this.originalError = originalError;
  }
}

export class NotFoundError extends Error implements ApiError {
  type = ErrorType.NOT_FOUND;
  code = 'NOT_FOUND';
  statusCode = 404;
  details?: unknown;
  originalError?: unknown;

  constructor(message: string, details?: unknown, originalError?: unknown) {
    super(message);
    this.name = 'NotFoundError';
    this.details = details;
    this.originalError = originalError;
  }
}

export class ServerError extends Error implements ApiError {
  type = ErrorType.SERVER;
  code = 'SERVER_ERROR';
  statusCode = 500;
  details?: unknown;
  originalError?: unknown;

  constructor(message: string, details?: unknown, originalError?: unknown) {
    super(message);
    this.name = 'ServerError';
    this.details = details;
    this.originalError = originalError;
  }
}

/**
 * User-friendly error messages
 */
const USER_FRIENDLY_MESSAGES: Record<ErrorType, string> = {
  [ErrorType.NETWORK]: 'Network error. Please check your connection and try again.',
  [ErrorType.API]: 'An error occurred. Please try again.',
  [ErrorType.VALIDATION]: 'Please check your input and try again.',
  [ErrorType.AUTHENTICATION]: 'Please sign in to continue.',
  [ErrorType.AUTHORIZATION]: 'You do not have permission to perform this action.',
  [ErrorType.NOT_FOUND]: 'The requested resource was not found.',
  [ErrorType.SERVER]: 'Server error. Please try again later.',
  [ErrorType.UNKNOWN]: 'An unexpected error occurred. Please try again.',
};

/**
 * Convert error to user-friendly message
 */
export function getUserFriendlyMessage(error: ApiError): string {
  return USER_FRIENDLY_MESSAGES[error.type] || USER_FRIENDLY_MESSAGES[ErrorType.UNKNOWN];
}

/**
 * Parse error from various sources
 */
export function parseError(error: unknown): ApiError {
  // Already an ApiError
  if (error instanceof ApiError || error instanceof NetworkError || 
      error instanceof ValidationError || error instanceof AuthenticationError ||
      error instanceof AuthorizationError || error instanceof NotFoundError ||
      error instanceof ServerError) {
    return error;
  }

  // Supabase error
  if (error && typeof error === 'object' && 'message' in error) {
    const supabaseError = error as { message: string; code?: string; statusCode?: number };
    
    if (supabaseError.statusCode === 401) {
      return new AuthenticationError(supabaseError.message, error);
    }
    if (supabaseError.statusCode === 403) {
      return new AuthorizationError(supabaseError.message, error);
    }
    if (supabaseError.statusCode === 404) {
      return new NotFoundError(supabaseError.message, error);
    }
    if (supabaseError.statusCode && supabaseError.statusCode >= 500) {
      return new ServerError(supabaseError.message, error);
    }
    if (supabaseError.statusCode && supabaseError.statusCode >= 400) {
      return new ValidationError(supabaseError.message, error);
    }
    
    return new ApiError(
      supabaseError.message,
      ErrorType.API,
      supabaseError.code || 'API_ERROR',
      supabaseError.statusCode || 500,
      error
    );
  }

  // Fetch/Network error
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return new NetworkError('Network request failed', error);
  }

  // Generic Error
  if (error instanceof Error) {
    return new ApiError(
      error.message,
      ErrorType.UNKNOWN,
      'UNKNOWN_ERROR',
      500,
      error
    );
  }

  // Unknown error
  return new ApiError(
    'An unexpected error occurred',
    ErrorType.UNKNOWN,
    'UNKNOWN_ERROR',
    500,
    error
  );
}

/**
 * Log error for debugging
 */
export function logError(error: ApiError, context?: string): void {
  const logger = require('@mintenance/shared').logger;
  
  logger.error({
    type: error.type,
    code: error.code,
    message: error.message,
    statusCode: error.statusCode,
    details: error.details,
    context,
  }, 'API Error');
}

