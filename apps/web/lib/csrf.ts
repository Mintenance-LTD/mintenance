/**
 * CSRF (Cross-Site Request Forgery) Protection
 * 
 * Implements token-based CSRF protection for all state-changing operations.
 * Tokens are generated per-session and validated on POST/PUT/DELETE requests.
 */

import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { createHash, randomBytes } from 'crypto';
import { logger } from '@mintenance/shared';

const CSRF_TOKEN_COOKIE = 'csrf-token';
const CSRF_TOKEN_HEADER = 'x-csrf-token';
const CSRF_TOKEN_LENGTH = 32;
const CSRF_TOKEN_EXPIRY = 60 * 60 * 24; // 24 hours

/**
 * Generate a cryptographically secure CSRF token
 */
export function generateCSRFToken(): string {
  return randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
}

/**
 * Hash CSRF token for secure storage
 */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Set CSRF token in cookie
 */
export async function setCSRFToken(token: string): Promise<void> {
  const cookieStore = await cookies();
  const hashedToken = hashToken(token);
  
  cookieStore.set(CSRF_TOKEN_COOKIE, hashedToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: CSRF_TOKEN_EXPIRY,
    path: '/',
  });
}

/**
 * Get CSRF token from cookie
 */
export async function getCSRFTokenFromCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(CSRF_TOKEN_COOKIE);
  return token?.value || null;
}

/**
 * Validate CSRF token from request
 */
export async function validateCSRFToken(request: NextRequest): Promise<boolean> {
  try {
    // Get token from cookie (hashed)
    const cookieToken = await getCSRFTokenFromCookie();
    if (!cookieToken) {
      logger.warn('CSRF validation failed: No token in cookie', {
        service: 'csrf',
        path: request.nextUrl.pathname,
      });
      return false;
    }

    // Get token from header or body (plain text)
    let requestToken = request.headers.get(CSRF_TOKEN_HEADER);
    
    // If not in header, try to get from body
    if (!requestToken && request.headers.get('content-type')?.includes('application/json')) {
      try {
        const body = await request.json();
        requestToken = body._csrf;
        // Re-create the request with the body for downstream handlers
        // Note: This is a limitation - we consume the body here
      } catch (e) {
        // Body not JSON or already consumed
      }
    }

    if (!requestToken) {
      logger.warn('CSRF validation failed: No token in request', {
        service: 'csrf',
        path: request.nextUrl.pathname,
      });
      return false;
    }

    // Hash the request token and compare
    const hashedRequestToken = hashToken(requestToken);
    
    if (hashedRequestToken !== cookieToken) {
      logger.warn('CSRF validation failed: Token mismatch', {
        service: 'csrf',
        path: request.nextUrl.pathname,
      });
      return false;
    }

    return true;
  } catch (error) {
    logger.error('CSRF validation error', error, { service: 'csrf' });
    return false;
  }
}

/**
 * CSRF middleware for API routes
 * Add this to routes that need CSRF protection
 */
export async function requireCSRFToken(request: NextRequest): Promise<NextResponse | null> {
  // Only check CSRF for state-changing methods
  const method = request.method;
  if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    return null;
  }

  // Skip CSRF check for webhook endpoints (they use signature verification)
  const path = request.nextUrl.pathname;
  if (path.includes('/api/webhooks/')) {
    return null;
  }

  const isValid = await validateCSRFToken(request);
  
  if (!isValid) {
    logger.warn('CSRF protection blocked request', {
      service: 'csrf',
      method,
      path,
      ip: request.headers.get('x-forwarded-for') || 'unknown',
    });

    return NextResponse.json(
      { error: 'Invalid or missing CSRF token' },
      { status: 403 }
    );
  }

  return null; // Allow request to proceed
}

/**
 * Generate and return a new CSRF token for client use
 * Call this when rendering pages or from an API endpoint
 */
export async function getCSRFTokenForClient(): Promise<string> {
  const token = generateCSRFToken();
  await setCSRFToken(token);
  return token;
}

/**
 * CSRF token validation helper for use in API routes
 */
export async function validateRequestCSRF(request: NextRequest): Promise<void> {
  const response = await requireCSRFToken(request);
  if (response) {
    throw new Error('CSRF validation failed');
  }
}

