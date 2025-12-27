/**
 * Standardized API Error Response System
 *
 * Provides consistent error formatting across all API routes
 * with proper status codes, error codes, and optional debug info
 */

import { NextResponse } from 'next/server';
import { logger } from '@mintenance/shared';

/**
 * Standard error response format
 */
export interface ErrorResponse {
  error: {
    code: string;           // Machine-readable error code (e.g., "UNAUTHORIZED", "VALIDATION_FAILED")
    message: string;        // Human-readable error message
    details?: unknown;      // Optional additional context (field errors, etc.)
    field?: string;         // For validation errors - which field failed
  };
  timestamp: string;        // ISO timestamp
  requestId?: string;       // For tracing
}

/**
 * API Error class with automatic status code mapping
 */
export class APIError extends Error {
  constructor(
    public code: string,
    public userMessage: string,
    public statusCode: number = 500,
    public details?: unknown,
    public field?: string
  ) {
    super(userMessage);
    this.name = 'APIError';
  }

  /**
   * Convert to standardized error response
   */
  toResponse(requestId?: string): ErrorResponse {
    return {
      error: {
        code: this.code,
        message: this.userMessage,
        ...(this.details && { details: this.details }),
        ...(this.field && { field: this.field }),
      },
      timestamp: new Date().toISOString(),
      ...(requestId && { requestId }),
    };
  }
}

/**
 * Common API errors with pre-defined codes and status codes
 */
export class UnauthorizedError extends APIError {
  constructor(message: string = 'Unauthorized') {
    super('UNAUTHORIZED', message, 401);
  }
}

export class ForbiddenError extends APIError {
  constructor(message: string = 'Forbidden') {
    super('FORBIDDEN', message, 403);
  }
}

export class NotFoundError extends APIError {
  constructor(resource: string = 'Resource') {
    super('NOT_FOUND', `${resource} not found`, 404);
  }
}

export class BadRequestError extends APIError {
  constructor(message: string = 'Bad Request', details?: unknown) {
    super('BAD_REQUEST', message, 400, details);
  }
}

export class ValidationError extends APIError {
  constructor(message: string, details?: unknown, field?: string) {
    super('VALIDATION_FAILED', message, 400, details, field);
  }
}

export class ConflictError extends APIError {
  constructor(message: string, details?: unknown) {
    super('CONFLICT', message, 409, details);
  }
}

export class RateLimitError extends APIError {
  constructor(retryAfter?: number) {
    super(
      'RATE_LIMIT_EXCEEDED',
      'Too many requests. Please try again later.',
      429,
      retryAfter ? { retryAfter } : undefined
    );
  }
}

export class ServiceUnavailableError extends APIError {
  constructor(service: string = 'External service') {
    super('SERVICE_UNAVAILABLE', `${service} is temporarily unavailable`, 503);
  }
}

export class InternalServerError extends APIError {
  constructor(message: string = 'An unexpected error occurred') {
    super('INTERNAL_SERVER_ERROR', message, 500);
  }
}

/**
 * Handle any error and convert to standardized API response
 *
 * @param error - The error to handle
 * @param requestId - Optional request ID for tracing
 * @param context - Optional context for logging
 * @returns NextResponse with standardized error format
 */
export function handleAPIError(
  error: unknown,
  requestId?: string,
  context?: Record<string, unknown>
): NextResponse {
  // If it's already an APIError, use it directly
  if (error instanceof APIError) {
    logger.warn('API Error', {
      code: error.code,
      message: error.userMessage,
      statusCode: error.statusCode,
      requestId,
      ...context,
    });

    return NextResponse.json(
      error.toResponse(requestId),
      {
        status: error.statusCode,
        headers: {
          'Content-Type': 'application/json',
          ...(error instanceof RateLimitError && error.details?.retryAfter
            ? { 'Retry-After': String(error.details.retryAfter) }
            : {}),
        },
      }
    );
  }

  // Handle database errors
  if (isDatabaseError(error)) {
    const dbError = error as DatabaseError;
    logger.error('Database Error', {
      code: dbError.code,
      message: dbError.message,
      requestId,
      ...context,
    });

    // Map common database errors
    if (dbError.code === '23505') {
      // Unique constraint violation
      return handleAPIError(
        new ConflictError('A record with this information already exists'),
        requestId,
        context
      );
    }

    if (dbError.code === '23503') {
      // Foreign key violation
      return handleAPIError(
        new ValidationError('Referenced record does not exist'),
        requestId,
        context
      );
    }

    // Generic database error
    return handleAPIError(
      new InternalServerError('Database operation failed'),
      requestId,
      context
    );
  }

  // Handle standard Error objects
  if (error instanceof Error) {
    logger.error('Unexpected Error', {
      name: error.name,
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      requestId,
      ...context,
    });

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message:
            process.env.NODE_ENV === 'development'
              ? error.message
              : 'An unexpected error occurred',
          ...(process.env.NODE_ENV === 'development' && {
            details: { stack: error.stack },
          }),
        },
        timestamp: new Date().toISOString(),
        ...(requestId && { requestId }),
      },
      { status: 500 }
    );
  }

  // Unknown error type
  logger.error('Unknown Error Type', {
    error: String(error),
    requestId,
    ...context,
  });

  return NextResponse.json(
    {
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
      timestamp: new Date().toISOString(),
      ...(requestId && { requestId }),
    },
    { status: 500 }
  );
}

/**
 * Type guard for database errors
 */
interface DatabaseError {
  code: string;
  message: string;
  details?: string;
}

function isDatabaseError(error: unknown): error is DatabaseError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as any).code === 'string'
  );
}

/**
 * Create success response with consistent format
 */
export function successResponse<T>(
  data: T,
  message?: string,
  status: number = 200
): NextResponse {
  return NextResponse.json(
    {
      success: true,
      ...(message && { message }),
      data,
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}
