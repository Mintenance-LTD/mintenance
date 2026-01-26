import * as crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@mintenance/shared';
/**
 * Enhanced CSRF Protection implementing both Double Submit Cookie and Synchronizer Token patterns
 * Follows OWASP CSRF Prevention Cheat Sheet
 */
// Configuration
const CSRF_COOKIE_NAME = 'csrf-token';
const CSRF_HEADER_NAME = 'X-CSRF-Token';
const CSRF_SECRET_KEY = process.env.CSRF_SECRET || crypto.randomBytes(32).toString('base64');
const TOKEN_LENGTH = 32;
const TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours
// Methods that require CSRF protection
const PROTECTED_METHODS = ['POST', 'PUT', 'DELETE', 'PATCH'];
// Paths that should be excluded from CSRF (webhooks, etc)
const EXCLUDED_PATHS = [
  '/api/webhooks/stripe',
  '/api/webhooks/github',
  '/api/health',
  '/api/public',
];
/**
 * Generate a cryptographically secure CSRF token
 */
export function generateCSRFToken(): string {
  const token = crypto.randomBytes(TOKEN_LENGTH).toString('base64url');
  const timestamp = Date.now().toString();
  const signature = crypto
    .createHmac('sha256', CSRF_SECRET_KEY)
    .update(`${token}.${timestamp}`)
    .digest('base64url');
  return `${token}.${timestamp}.${signature}`;
}
/**
 * Validate a CSRF token
 */
export function validateCSRFToken(token: string): {
  isValid: boolean;
  reason?: string;
} {
  if (!token) {
    return { isValid: false, reason: 'Token is missing' };
  }
  const parts = token.split('.');
  if (parts.length !== 3) {
    return { isValid: false, reason: 'Invalid token format' };
  }
  const [tokenPart, timestamp, signature] = parts;
  // Verify signature
  const expectedSignature = crypto
    .createHmac('sha256', CSRF_SECRET_KEY)
    .update(`${tokenPart}.${timestamp}`)
    .digest('base64url');
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    return { isValid: false, reason: 'Invalid signature' };
  }
  // Check token expiry
  const tokenAge = Date.now() - parseInt(timestamp, 10);
  if (tokenAge > TOKEN_EXPIRY) {
    return { isValid: false, reason: 'Token expired' };
  }
  return { isValid: true };
}
/**
 * CSRF middleware for API routes
 */
export async function csrfMiddleware(
  request: NextRequest,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  const method = request.method;
  const pathname = request.nextUrl.pathname;
  // Skip CSRF for safe methods
  if (!PROTECTED_METHODS.includes(method)) {
    return handler();
  }
  // Skip CSRF for excluded paths
  if (EXCLUDED_PATHS.some(path => pathname.startsWith(path))) {
    return handler();
  }
  // Get token from cookie
  const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;
  // Get token from header or body
  const headerToken = request.headers.get(CSRF_HEADER_NAME);
  // For form submissions, also check body
  let bodyToken: string | undefined;
  if (request.headers.get('content-type')?.includes('application/json')) {
    try {
      const body = await request.clone().json();
      bodyToken = body._csrf;
    } catch {
      // Body parsing failed, continue with header token
    }
  }
  const submittedToken = headerToken || bodyToken;
  // Validate tokens
  if (!cookieToken || !submittedToken) {
    logger.warn('CSRF token missing', {
      hasCookie: !!cookieToken,
      hasSubmitted: !!submittedToken,
      path: pathname,
      method,
    });
    return NextResponse.json(
      { error: 'CSRF token missing' },
      { status: 403 }
    );
  }
  // Tokens must match (double submit cookie pattern)
  if (cookieToken !== submittedToken) {
    logger.warn('CSRF token mismatch', {
      path: pathname,
      method,
    });
    return NextResponse.json(
      { error: 'CSRF token mismatch' },
      { status: 403 }
    );
  }
  // Validate token integrity and expiry
  const validation = validateCSRFToken(cookieToken);
  if (!validation.isValid) {
    logger.warn('CSRF token validation failed', {
      reason: validation.reason,
      path: pathname,
      method,
    });
    return NextResponse.json(
      { error: `CSRF validation failed: ${validation.reason}` },
      { status: 403 }
    );
  }
  // Token is valid, proceed with request
  return handler();
}
/**
 * Set CSRF cookie on response
 */
export function setCSRFCookie(response: NextResponse, token?: string): NextResponse {
  const csrfToken = token || generateCSRFToken();
  response.cookies.set({
    name: CSRF_COOKIE_NAME,
    value: csrfToken,
    httpOnly: false, // Must be false for JavaScript to read it
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: TOKEN_EXPIRY / 1000, // Convert to seconds
  });
  return response;
}
/**
 * Get CSRF token from request
 */
export function getCSRFToken(request: NextRequest): string | undefined {
  return request.cookies.get(CSRF_COOKIE_NAME)?.value;
}
/**
 * React hook for CSRF protection (client-side)
 */
export function useCSRFToken(): {
  token: string | null;
  getHeaders: () => HeadersInit;
} {
  if (typeof window === 'undefined') {
    return {
      token: null,
      getHeaders: () => ({}),
    };
  }
  // Get token from cookie
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith(`${CSRF_COOKIE_NAME}=`))
    ?.split('=')[1] || null;
  // Helper to add CSRF header to fetch requests
  const getHeaders = (): HeadersInit => ({
    [CSRF_HEADER_NAME]: token || '',
  });
  return { token, getHeaders };
}
/**
 * Higher-order function to wrap API route handlers with CSRF protection
 */
export function withCSRF<T extends NextRequest>(
  handler: (request: T) => Promise<NextResponse>
) {
  return async (request: T): Promise<NextResponse> => {
    return csrfMiddleware(request, () => handler(request));
  };
}
/**
 * Verify origin header for additional protection
 */
export function verifyOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  // In production, always require origin or referer
  if (process.env.NODE_ENV === 'production') {
    if (!origin && !referer) {
      logger.warn('Request missing origin and referer', {
        path: request.nextUrl.pathname,
      });
      return false;
    }
    // Verify against allowed origins
    const allowedOrigins = [
      process.env.NEXT_PUBLIC_APP_URL,
      'https://mintenance.com',
      'https://www.mintenance.com',
    ].filter(Boolean);
    const requestOrigin = origin || new URL(referer!).origin;
    if (!allowedOrigins.some(allowed => requestOrigin.startsWith(allowed!))) {
      logger.warn('Request from unauthorized origin', {
        origin: requestOrigin,
        allowed: allowedOrigins,
      });
      return false;
    }
  }
  return true;
}
/**
 * Enhanced CSRF protection with origin verification
 */
export function withEnhancedCSRF<T extends NextRequest>(
  handler: (request: T) => Promise<NextResponse>
) {
  return async (request: T): Promise<NextResponse> => {
    // Verify origin first
    if (!verifyOrigin(request)) {
      return NextResponse.json(
        { error: 'Invalid origin' },
        { status: 403 }
      );
    }
    // Then verify CSRF token
    return csrfMiddleware(request, () => handler(request));
  };
}
/**
 * Generate and inject CSRF meta tag for SSR pages
 */
export function generateCSRFMeta(): string {
  const token = generateCSRFToken();
  return `<meta name="csrf-token" content="${token}" />`;
}
/**
 * Client-side helper to get CSRF token from meta tag or cookie
 */
export function getClientCSRFToken(): string | null {
  if (typeof window === 'undefined') return null;
  // Try meta tag first
  const meta = document.querySelector('meta[name="csrf-token"]');
  if (meta) {
    return meta.getAttribute('content');
  }
  // Fall back to cookie
  const cookie = document.cookie
    .split('; ')
    .find(row => row.startsWith(`${CSRF_COOKIE_NAME}=`));
  return cookie ? cookie.split('=')[1] : null;
}
/**
 * Axios interceptor for automatic CSRF token injection
 */
export function setupAxiosCSRF(axios: unknown): void {
  axios.interceptors.request.use((config: Record<string, unknown>) => {
    const token = getClientCSRFToken();
    if (token && PROTECTED_METHODS.includes(config.method?.toUpperCase())) {
      config.headers[CSRF_HEADER_NAME] = token;
    }
    return config;
  });
}
// Export a singleton token manager
class CSRFTokenManager {
  private token: string | null = null;
  private tokenExpiry: number = 0;
  getToken(): string {
    if (!this.token || Date.now() > this.tokenExpiry) {
      this.token = generateCSRFToken();
      this.tokenExpiry = Date.now() + TOKEN_EXPIRY;
    }
    return this.token;
  }
  invalidate(): void {
    this.token = null;
    this.tokenExpiry = 0;
  }
}
export const csrfManager = new CSRFTokenManager();