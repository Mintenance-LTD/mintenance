/**
 * Standardized API Error Response System
 *
 * Provides consistent error formatting across all API routes
 * with proper status codes, error codes, and optional debug info
 *
 * SECURITY (VULN-007): All error responses include CORS headers
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@mintenance/shared';
import { getCorsHeaders } from '@/lib/cors';

/**
 * Standard error response format
 */
export interface ErrorResponse {
  error: {
    code: string; // Machine-readable error code (e.g., "UNAUTHORIZED", "VALIDATION_FAILED")
    message: string; // Human-readable error message
    details?: unknown; // Optional additional context (field errors, etc.)
    field?: string; // For validation errors - which field failed
  };
  timestamp: string; // ISO timestamp
  requestId?: string; // For tracing
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
        ...(this.details ? { details: this.details } : {}),
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
  constructor(message: string = 'Resource not found') {
    super('NOT_FOUND', message, 404);
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
 * SECURITY (VULN-007): Includes CORS headers in error responses
 *
 * @param error - The error to handle
 * @param requestId - Optional request ID for tracing
 * @param context - Optional context for logging
 * @param request - Optional request object for CORS header generation
 * @returns NextResponse with standardized error format and CORS headers
 */
export function handleAPIError(
  error: unknown,
  requestId?: string,
  context?: Record<string, unknown>,
  request?: NextRequest
): NextResponse {
  // Helper to get headers with CORS support
  const getResponseHeaders = (
    baseHeaders: Record<string, string> = {}
  ): Record<string, string> => {
    const corsHeaders = request ? getCorsHeaders(request) : {};
    return {
      ...baseHeaders,
      ...corsHeaders,
    };
  };

  // If it's already an APIError, use it directly
  if (error instanceof APIError) {
    logger.warn('API Error', {
      code: error.code,
      message: error.userMessage,
      statusCode: error.statusCode,
      requestId,
      ...context,
    });

    return NextResponse.json(error.toResponse(requestId), {
      status: error.statusCode,
      headers: getResponseHeaders({
        'Content-Type': 'application/json',
        ...(error instanceof RateLimitError &&
        (error.details as { retryAfter?: number })?.retryAfter
          ? {
              'Retry-After': String(
                (error.details as { retryAfter: number }).retryAfter
              ),
            }
          : {}),
      }),
    });
  }

  // Payment-provider errors. Logged with their Stripe identifiers so the
  // cause is findable, and answered with a payment-shaped message — these
  // used to fall through to the database branch ("Database operation
  // failed") or the generic one ("An unexpected error occurred"), both of
  // which pointed debugging at the wrong subsystem entirely.
  if (
    typeof error === 'object' &&
    error !== null &&
    isStripeShapedError(error)
  ) {
    const e = error as {
      type?: string;
      rawType?: string;
      code?: string;
      statusCode?: number;
      requestId?: string;
      message?: string;
    };
    logger.error('Payment provider error', {
      stripeType: e.type,
      stripeRawType: e.rawType,
      stripeCode: e.code,
      stripeStatusCode: e.statusCode,
      stripeRequestId: e.requestId,
      message: e.message,
      requestId,
      ...context,
    });

    return NextResponse.json(
      {
        error: {
          code: 'PAYMENT_PROVIDER_ERROR',
          message:
            'Payment service is temporarily unavailable. Your card was not charged.',
        },
        timestamp: new Date().toISOString(),
        ...(requestId && { requestId }),
      },
      {
        status: 502,
        headers: getResponseHeaders({ 'Content-Type': 'application/json' }),
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
    // SECURITY: Always log full details internally (for debugging)
    // NEVER expose stack traces or detailed error messages to client
    logger.error('Unexpected Error', {
      name: error.name,
      message: error.message,
      stack: error.stack, // Always log full stack internally
      requestId,
      ...context,
    });

    // Always return generic message to client (no conditional development exposure)
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred', // Generic message always
        },
        timestamp: new Date().toISOString(),
        ...(requestId && { requestId }), // Include request ID for support correlation
      },
      {
        status: 500,
        headers: getResponseHeaders({ 'Content-Type': 'application/json' }),
      }
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
    {
      status: 500,
      headers: getResponseHeaders({ 'Content-Type': 'application/json' }),
    }
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

/**
 * Stripe errors also carry a string `code` (`resource_missing`,
 * `card_declined`, …), so a bare "has a string code" check swallowed them
 * into the database branch below and reported "Database operation failed"
 * for what was actually a payment failure — sending anyone debugging it
 * (including us, repeatedly) after the wrong subsystem. Identified by
 * stripe-node's own markers: every StripeError has `type` beginning
 * "Stripe" plus a `rawType` echoing the API error type.
 */
function isStripeShapedError(error: object): boolean {
  const e = error as { type?: unknown; rawType?: unknown };
  return (
    typeof e.rawType === 'string' ||
    (typeof e.type === 'string' && e.type.startsWith('Stripe'))
  );
}

function isDatabaseError(error: unknown): error is DatabaseError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as { code?: unknown }).code === 'string' &&
    !isStripeShapedError(error)
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
