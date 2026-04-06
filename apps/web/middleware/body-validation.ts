/**
 * Request body size + content-type validation for middleware.
 * Extracted from middleware.ts.
 */
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@mintenance/shared';

const MAX_BODY_SIZE = 10 * 1024 * 1024; // 10MB
const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH']);

/**
 * Validate the request body for state-changing methods.
 * Returns a NextResponse to short-circuit the request when invalid,
 * or null when the request passes validation.
 */
export function validateRequestBody(request: NextRequest): NextResponse | null {
  if (!STATE_CHANGING_METHODS.has(request.method)) return null;

  const contentType = request.headers.get('content-type') || '';
  const contentLength = request.headers.get('content-length');
  const pathname = request.nextUrl.pathname;

  // Content-type required on state-changing requests (GET excluded above)
  if (!contentType) {
    logger.warn('Request missing content-type header', {
      service: 'middleware',
      pathname,
      method: request.method,
    });
    return new NextResponse(
      JSON.stringify({ error: 'Content-Type header required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // Body size cap
  if (contentLength && parseInt(contentLength, 10) > MAX_BODY_SIZE) {
    logger.warn('Request body size exceeds limit', {
      service: 'middleware',
      pathname,
      contentLength,
      maxSize: MAX_BODY_SIZE,
    });
    return new NextResponse(
      JSON.stringify({ error: 'Request body too large' }),
      { status: 413, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // Unknown content-type is logged but not rejected (compatibility)
  if (
    contentType &&
    !contentType.includes('application/json') &&
    !contentType.includes('multipart/form-data') &&
    !contentType.includes('application/x-www-form-urlencoded') &&
    !contentType.includes('text/')
  ) {
    logger.warn('Invalid content-type for request', {
      service: 'middleware',
      pathname,
      contentType,
    });
  }

  return null;
}
