/**
 * Standardized API Response Utilities
 * Implements consistent response format across all API endpoints
 *
 * Part of SECURITY_REMEDIATION_PLAN Action #8
 *
 * Features:
 * - Consistent response structure
 * - Type-safe response builders
 * - Standardized error codes
 * - Metadata support (pagination, timestamps, etc.)
 * - HTTP status code helpers
 */

import { NextResponse } from 'next/server';
import { logger } from '@mintenance/shared';

/**
 * Standard API Response Structure
 */
export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
    field?: string; // For validation errors
  };
  meta?: {
    page?: number;
    pageSize?: number;
    total?: number;
    totalPages?: number;
    timestamp: string;
    requestId?: string;
    version?: string;
  };
}

/**
 * Standard error codes for consistent error handling
 */
export const ERROR_CODES = {
  // Client Errors (4xx)
  BAD_REQUEST: 'BAD_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  PAYLOAD_TOO_LARGE: 'PAYLOAD_TOO_LARGE',

  // Server Errors (5xx)
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_API_ERROR: 'EXTERNAL_API_ERROR',

  // Business Logic Errors
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  RESOURCE_LOCKED: 'RESOURCE_LOCKED',
  OPERATION_FAILED: 'OPERATION_FAILED',
  DUPLICATE_RESOURCE: 'DUPLICATE_RESOURCE',
} as const;

/**
 * Success response builder
 */
export function apiSuccess<T>(
  data: T,
  meta?: Omit<APIResponse<T>['meta'], 'timestamp'>,
  status: number = 200
): NextResponse<APIResponse<T>> {
  const response: APIResponse<T> = {
    success: true,
    data,
    meta: {
      ...meta,
      timestamp: new Date().toISOString(),
      version: 'v1',
    },
  };

  return NextResponse.json(response, { status });
}

/**
 * Error response builder
 */
export function apiError(
  code: keyof typeof ERROR_CODES | string,
  message: string,
  details?: unknown,
  status: number = 400
): NextResponse<APIResponse> {
  const response: APIResponse = {
    success: false,
    error: {
      code,
      message,
      details,
    },
    meta: {
      timestamp: new Date().toISOString(),
      version: 'v1',
    },
  };

  // Log error for monitoring
  logger.error('API Error Response', {
    service: 'api-response',
    code,
    message,
    status,
    details,
  });

  return NextResponse.json(response, { status });
}

/**
 * Paginated response builder
 */
export function apiPaginated<T>(
  data: T[],
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  },
  status: number = 200
): NextResponse<APIResponse<T[]>> {
  const { page, pageSize, total } = pagination;
  const totalPages = Math.ceil(total / pageSize);

  return apiSuccess(
    data,
    {
      page,
      pageSize,
      total,
      totalPages,
    },
    status
  );
}

/**
 * Validation error response builder
 */
export function apiValidationError(
  field: string,
  message: string,
  details?: unknown
): NextResponse<APIResponse> {
  const response: APIResponse = {
    success: false,
    error: {
      code: ERROR_CODES.VALIDATION_ERROR,
      message: `Validation failed: ${message}`,
      field,
      details,
    },
    meta: {
      timestamp: new Date().toISOString(),
      version: 'v1',
    },
  };

  return NextResponse.json(response, { status: 400 });
}

// ============================================
// HTTP Status Code Helpers
// ============================================

/**
 * 200 OK - Request succeeded
 */
export function apiOk<T>(data: T): NextResponse<APIResponse<T>> {
  return apiSuccess(data, undefined, 200);
}

/**
 * 201 Created - Resource created successfully
 */
export function apiCreated<T>(data: T): NextResponse<APIResponse<T>> {
  return apiSuccess(data, undefined, 201);
}

/**
 * 204 No Content - Request succeeded but no content to return
 */
export function apiNoContent(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

/**
 * 400 Bad Request - Invalid request
 */
export function apiBadRequest(
  message: string = 'Bad request',
  details?: unknown
): NextResponse<APIResponse> {
  return apiError(ERROR_CODES.BAD_REQUEST, message, details, 400);
}

/**
 * 401 Unauthorized - Authentication required
 */
export function apiUnauthorized(
  message: string = 'Authentication required'
): NextResponse<APIResponse> {
  return apiError(ERROR_CODES.UNAUTHORIZED, message, undefined, 401);
}

/**
 * 403 Forbidden - Insufficient permissions
 */
export function apiForbidden(
  message: string = 'Insufficient permissions'
): NextResponse<APIResponse> {
  return apiError(ERROR_CODES.FORBIDDEN, message, undefined, 403);
}

/**
 * 404 Not Found - Resource not found
 */
export function apiNotFound(
  resource: string = 'Resource',
  details?: unknown
): NextResponse<APIResponse> {
  return apiError(
    ERROR_CODES.NOT_FOUND,
    `${resource} not found`,
    details,
    404
  );
}

/**
 * 409 Conflict - Resource conflict
 */
export function apiConflict(
  message: string = 'Resource already exists',
  details?: unknown
): NextResponse<APIResponse> {
  return apiError(ERROR_CODES.CONFLICT, message, details, 409);
}

/**
 * 413 Payload Too Large - Request body too large
 */
export function apiPayloadTooLarge(
  maxSize: string = '10MB'
): NextResponse<APIResponse> {
  return apiError(
    ERROR_CODES.PAYLOAD_TOO_LARGE,
    `Request payload exceeds maximum size (${maxSize})`,
    undefined,
    413
  );
}

/**
 * 429 Too Many Requests - Rate limit exceeded
 */
export function apiRateLimitExceeded(
  retryAfter?: number
): NextResponse<APIResponse> {
  const response = apiError(
    ERROR_CODES.RATE_LIMIT_EXCEEDED,
    'Rate limit exceeded. Please try again later.',
    undefined,
    429
  );

  if (retryAfter) {
    response.headers.set('Retry-After', retryAfter.toString());
  }

  return response;
}

/**
 * 500 Internal Server Error - Generic server error
 */
export function apiInternalError(
  message: string = 'Internal server error',
  details?: unknown
): NextResponse<APIResponse> {
  return apiError(ERROR_CODES.INTERNAL_ERROR, message, details, 500);
}

/**
 * 503 Service Unavailable - Service temporarily unavailable
 */
export function apiServiceUnavailable(
  service: string = 'Service'
): NextResponse<APIResponse> {
  return apiError(
    ERROR_CODES.SERVICE_UNAVAILABLE,
    `${service} temporarily unavailable`,
    undefined,
    503
  );
}

// ============================================
// Error Handling Helpers
// ============================================

/**
 * Handle database errors
 */
export function apiDatabaseError(error: unknown): NextResponse<APIResponse> {
  logger.error('Database error', error, {
    service: 'api-response',
  });

  return apiError(
    ERROR_CODES.DATABASE_ERROR,
    'Database operation failed',
    process.env.NODE_ENV === 'development' ? error : undefined,
    500
  );
}

/**
 * Handle external API errors
 */
export function apiExternalError(
  serviceName: string,
  error: unknown
): NextResponse<APIResponse> {
  logger.error(`External API error: ${serviceName}`, error, {
    service: 'api-response',
  });

  return apiError(
    ERROR_CODES.EXTERNAL_API_ERROR,
    `External service (${serviceName}) error`,
    process.env.NODE_ENV === 'development' ? error : undefined,
    502
  );
}

/**
 * Handle unknown errors
 */
export function apiUnknownError(error: unknown): NextResponse<APIResponse> {
  logger.error('Unknown error', error, {
    service: 'api-response',
  });

  const message =
    error instanceof Error ? error.message : 'An unexpected error occurred';

  return apiInternalError(
    message,
    process.env.NODE_ENV === 'development' ? error : undefined
  );
}

// ============================================
// Middleware Helpers
// ============================================

/**
 * Wrap API handler with standardized error handling
 */
export async function withErrorHandling<T>(
  handler: () => Promise<NextResponse<APIResponse<T>>>
): Promise<NextResponse<APIResponse<T>>> {
  try {
    return await handler();
  } catch (error) {
    return apiUnknownError(error) as NextResponse<APIResponse<T>>;
  }
}

/**
 * Extract pagination params from request
 */
export function getPaginationParams(
  searchParams: URLSearchParams
): {
  page: number;
  pageSize: number;
  offset: number;
} {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get('pageSize') || '20'))
  );
  const offset = (page - 1) * pageSize;

  return { page, pageSize, offset };
}

/**
 * Validate required fields
 */
export function validateRequired(
  data: Record<string, unknown>,
  requiredFields: string[]
): { valid: boolean; missing?: string[] } {
  const missing = requiredFields.filter(
    field => data[field] === undefined || data[field] === null || data[field] === ''
  );

  return {
    valid: missing.length === 0,
    missing: missing.length > 0 ? missing : undefined,
  };
}
