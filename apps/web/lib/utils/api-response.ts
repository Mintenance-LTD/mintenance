import { NextResponse } from 'next/server';
import { logger } from '@mintenance/shared';

export interface StandardErrorResponse {
    error: {
        message: string;
        code: string;
        details?: Record<string, unknown>;
        timestamp: string;
        requestId?: string;
    };
}

export interface StandardSuccessResponse<T> {
    data: T;
    timestamp: string;
    requestId?: string;
}

/**
 * Create a standardized error response
 */
export function errorResponse(
    message: string,
    code: string,
    status: number = 500,
    details?: Record<string, unknown>,
    requestId?: string
): NextResponse<StandardErrorResponse> {
    const response: StandardErrorResponse = {
        error: {
            message,
            code,
            details,
            timestamp: new Date().toISOString(),
            requestId,
        },
    };

    logger.error('API Error', { message, code, status, details, requestId });

    return NextResponse.json(response, { status });
}

/**
 * Create a standardized success response
 */
export function successResponse<T>(
    data: T,
    status: number = 200,
    requestId?: string
): NextResponse<StandardSuccessResponse<T>> {
    const response: StandardSuccessResponse<T> = {
        data,
        timestamp: new Date().toISOString(),
        requestId,
    };

    return NextResponse.json(response, { status });
}

/**
 * Common error codes
 */
export const ErrorCodes = {
    // Authentication
    INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
    TOKEN_EXPIRED: 'TOKEN_EXPIRED',
    UNAUTHORIZED: 'UNAUTHORIZED',
    FORBIDDEN: 'FORBIDDEN',

    // Validation
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    MISSING_PARAMETER: 'MISSING_PARAMETER',
    INVALID_PARAMETER: 'INVALID_PARAMETER',

    // Resources
    NOT_FOUND: 'NOT_FOUND',
    ALREADY_EXISTS: 'ALREADY_EXISTS',
    CONFLICT: 'CONFLICT',

    // Processing
    PROCESSING_ERROR: 'PROCESSING_ERROR',
    TIMEOUT: 'TIMEOUT',
    SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',

    // AI Services
    AI_SERVICE_ERROR: 'AI_SERVICE_ERROR',
    AI_NOT_CONFIGURED: 'AI_NOT_CONFIGURED',

    // External Services
    EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
    PAYMENT_ERROR: 'PAYMENT_ERROR',

    // Rate Limiting
    RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',

    // Generic
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    BAD_REQUEST: 'BAD_REQUEST',
} as const;
