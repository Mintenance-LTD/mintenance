/**
 * CSRF Validation Utility
 * Provides reusable CSRF token validation for API routes
 */

import { NextRequest } from 'next/server';
import { logger } from '@mintenance/shared';

export interface CSRFValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates CSRF token from request headers and cookies
 * @param request - NextRequest object
 * @returns CSRFValidationResult
 */
export async function validateCSRF(request: NextRequest): Promise<CSRFValidationResult> {
  try {
    const headerToken = request.headers.get('x-csrf-token');
    const cookieToken = request.cookies.get('__Host-csrf-token')?.value;

    // Both tokens must be present
    if (!headerToken || !cookieToken) {
      logger.warn('CSRF validation failed: Missing tokens', {
        service: 'csrf-validator',
        hasHeaderToken: !!headerToken,
        hasCookieToken: !!cookieToken,
        path: request.nextUrl.pathname
      });
      return {
        valid: false,
        error: 'CSRF token missing'
      };
    }

    // Tokens must match exactly
    if (headerToken !== cookieToken) {
      logger.warn('CSRF validation failed: Token mismatch', {
        service: 'csrf-validator',
        path: request.nextUrl.pathname,
        headerTokenLength: headerToken.length,
        cookieTokenLength: cookieToken.length
      });
      return {
        valid: false,
        error: 'CSRF token mismatch'
      };
    }

    // Validate token format (should be a UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(headerToken)) {
      logger.warn('CSRF validation failed: Invalid token format', {
        service: 'csrf-validator',
        path: request.nextUrl.pathname,
        tokenLength: headerToken.length
      });
      return {
        valid: false,
        error: 'Invalid CSRF token format'
      };
    }

    logger.debug('CSRF validation successful', {
      service: 'csrf-validator',
      path: request.nextUrl.pathname
    });

    return { valid: true };

  } catch (error) {
    logger.error('CSRF validation error', error, {
      service: 'csrf-validator',
      path: request.nextUrl.pathname
    });
    return {
      valid: false,
      error: 'CSRF validation failed'
    };
  }
}

/**
 * Middleware helper to validate CSRF for state-changing requests
 * @param request - NextRequest object
 * @returns boolean indicating if CSRF validation passed
 */
export async function requireCSRF(request: NextRequest): Promise<boolean> {
  const stateChangingMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];
  
  // Only validate CSRF for state-changing requests
  if (!stateChangingMethods.includes(request.method)) {
    return true;
  }

  const result = await validateCSRF(request);
  return result.valid;
}

/**
 * Generate a new CSRF token
 * @returns string - New CSRF token
 */
export function generateCSRFToken(): string {
  return crypto.randomUUID();
}
