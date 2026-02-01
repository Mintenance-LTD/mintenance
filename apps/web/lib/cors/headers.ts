/**
 * CORS Headers Utility for Next.js API Routes
 *
 * SECURITY FEATURES:
 * - Whitelist-based origin validation
 * - No wildcard origins
 * - No credentials support (prevents CSRF)
 * - Strict allowed methods
 * - 24-hour preflight cache
 * - Security event logging for rejected origins
 *
 * @see VULN-007 in security audit
 */

import { NextRequest, NextResponse } from 'next/server';
import { isOriginAllowed, isCorsEnabled } from './config';
import { securityMonitor } from '@/lib/security-monitor';
import { logger } from '@mintenance/shared';

/**
 * Get CORS headers for API response
 *
 * SECURITY IMPLEMENTATION:
 * - Only sets Access-Control-Allow-Origin if origin is whitelisted
 * - NEVER sets Access-Control-Allow-Credentials (CSRF protection)
 * - Logs rejected origins for security monitoring
 * - Includes Vary: Origin for correct caching behavior
 *
 * @param request - Next.js request object
 * @returns Record of CORS headers to add to response
 */
export function getCorsHeaders(request: NextRequest): Record<string, string> {
  const origin = request.headers.get('origin');

  // Base CORS headers (always included)
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
    'Access-Control-Allow-Headers':
      'Content-Type, Authorization, X-CSRF-Token, X-Request-ID, X-Client-Info, ApiKey',
    'Access-Control-Max-Age': '86400', // 24 hours (reduce preflight overhead)
    'Vary': 'Origin', // Important for CDN/browser caching
  };

  // Only set Access-Control-Allow-Origin if origin is whitelisted
  if (origin && isOriginAllowed(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;

    // Log allowed origin (debug level)
    logger.debug('[CORS] Allowed origin', {
      service: 'cors',
      origin,
      path: request.nextUrl.pathname,
    });
  } else if (origin) {
    // SECURITY: Log rejected origin attempt for monitoring
    logger.warn('[SECURITY] CORS rejected origin', {
      service: 'cors',
      origin,
      path: request.nextUrl.pathname,
      method: request.method,
      userAgent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for') || 'unknown',
    });

    // Log to security monitoring system
    securityMonitor.logSuspiciousActivity(
      request,
      `CORS rejected origin: ${origin}`,
      undefined,
      {
        rejectedOrigin: origin,
        requestPath: request.nextUrl.pathname,
        requestMethod: request.method,
      }
    );
  }

  // SECURITY: NEVER set Access-Control-Allow-Credentials
  // This would bypass SameSite cookie protections and enable CSRF attacks

  return headers;
}

/**
 * Handle CORS preflight OPTIONS request
 *
 * Browsers send OPTIONS requests before actual requests to check CORS permissions.
 * This returns a 204 No Content with appropriate CORS headers.
 *
 * @param request - Next.js request object
 * @returns NextResponse with CORS headers and 204 status
 */
export function handlePreflightRequest(request: NextRequest): NextResponse {
  const corsHeaders = getCorsHeaders(request);

  logger.debug('[CORS] Handling preflight request', {
    service: 'cors',
    origin: request.headers.get('origin'),
    path: request.nextUrl.pathname,
    method: request.headers.get('access-control-request-method'),
  });

  return new NextResponse(null, {
    status: 204, // No Content (standard for OPTIONS)
    headers: corsHeaders,
  });
}

/**
 * Add CORS headers to an existing NextResponse
 *
 * Use this to add CORS headers to API route responses.
 *
 * @param response - The response to modify
 * @param request - The request (needed to get origin)
 * @returns The response with CORS headers added
 */
export function addCorsHeaders(
  response: NextResponse,
  request: NextRequest
): NextResponse {
  if (!isCorsEnabled()) {
    return response; // Skip CORS if disabled via feature flag
  }

  const corsHeaders = getCorsHeaders(request);
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

/**
 * Create a new NextResponse with CORS headers
 *
 * Convenience function for creating API responses with CORS.
 *
 * @param body - Response body (will be JSON stringified)
 * @param request - Request object (for origin validation)
 * @param init - Response init options (status, headers, etc.)
 * @returns NextResponse with CORS headers
 */
export function createCorsResponse(
  body: unknown,
  request: NextRequest,
  init?: ResponseInit
): NextResponse {
  const corsHeaders = getCorsHeaders(request);

  return NextResponse.json(body, {
    ...init,
    headers: {
      ...init?.headers,
      ...corsHeaders,
    },
  });
}

/**
 * Check if a request should be excluded from CORS validation
 *
 * Some endpoints don't need CORS:
 * - Webhooks (server-to-server)
 * - Health checks (public endpoints)
 * - OAuth callbacks (browser redirects, not XHR)
 *
 * @param pathname - Request pathname
 * @returns true if CORS should be skipped
 */
export function shouldSkipCors(pathname: string): boolean {
  const skipPatterns = [
    '/api/webhooks/', // Server-to-server webhooks
    '/api/health',     // Public health check
    '/api/oauth/',     // OAuth callbacks (redirects)
  ];

  return skipPatterns.some(pattern => pathname.startsWith(pattern));
}
