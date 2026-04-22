import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@mintenance/shared';
import { shouldSkipCors, addCorsHeaders } from '@/lib/cors';
import { securityMonitor } from '@/lib/security-monitor';
import { isPublicRoute } from './middleware/public-routes';
import { validateRequestBody } from './middleware/body-validation';
import {
  buildPublicCSP,
  buildAuthenticatedCSP,
  buildStrictReportOnlyCSP,
} from './middleware/csp';
import { is2025FeatureEnabled } from './middleware/feature-flags';
import {
  getClientIP,
  extractBearerToken,
  isValidJwtFormat,
  redirectToLogin,
} from './middleware/helpers';
import { getConfigManager, getConfigInitError } from './middleware/config';
import { validateCsrf, setCsrfCookie } from './middleware/csrf';
import { handleApiRateLimit } from './middleware/rate-limit';
import {
  handleSupabaseAuth,
  verifyJwtToken,
  checkTokenBlacklist,
  enforceSessionTimeouts,
} from './middleware/auth';

import type { JWTPayload } from '@mintenance/types';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // AUDIT FIX: Single isDevelopment declaration — was previously redefined 3 times
  const isDevelopment = process.env.NODE_ENV !== 'production';

  // Coming Soon mode: redirect all traffic to /coming-soon in production
  if (process.env.NEXT_PUBLIC_LAUNCH_MODE === 'coming-soon') {
    const allowed = ['/coming-soon', '/_next', '/favicon.ico', '/api/'];
    const isAllowed =
      allowed.some((p) => pathname.startsWith(p)) ||
      /\.(png|jpg|jpeg|svg|ico|css|js|woff2?)$/.test(pathname);
    if (!isAllowed) {
      return NextResponse.redirect(new URL('/coming-soon', request.url));
    }
    return NextResponse.next();
  }

  // Check if IP is auto-blocked by security monitor (DDoS / attack mitigation)
  const clientIP = getClientIP(request);
  if (securityMonitor.isIPBlocked(clientIP)) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  // Public route check MUST happen before ConfigManager so that login,
  // CSRF, session-status, and diag routes work even if config fails.
  if (isPublicRoute(pathname)) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-pathname', pathname);

    // SECURITY: Generate nonce for public routes too
    const publicNonce = crypto.randomUUID().replace(/-/g, '');
    requestHeaders.set('x-csp-nonce', publicNonce);

    const response = NextResponse.next({
      request: { headers: requestHeaders },
    });

    // Generate or refresh CSRF token
    const csrfCookieName = isDevelopment ? 'csrf-token' : '__Host-csrf-token';
    const existingCsrf = request.cookies.get(csrfCookieName)?.value;
    const csrfToken = existingCsrf || crypto.randomUUID();
    response.cookies.set(csrfCookieName, csrfToken, {
      httpOnly: false, // SECURITY: Must be false for double-submit cookie pattern
      secure: !isDevelopment,
      sameSite: 'strict',
      path: '/',
      maxAge: 24 * 60 * 60,
    });

    if (!isDevelopment) {
      // Nonce consumed only when ENABLE_CSP_NONCE=true (see middleware/csp.ts).
      // Default behavior preserves 'unsafe-inline' without a nonce so
      // framework-injected hydration scripts keep working.
      response.headers.set(
        'Content-Security-Policy',
        buildPublicCSP(publicNonce)
      );
    }

    return response;
  }

  // SECURITY: Validate request body size and content type for POST/PUT/PATCH requests
  const bodyValidationResponse = validateRequestBody(request);
  if (bodyValidationResponse) return bodyValidationResponse;

  // If configuration failed to load, fail closed for security (non-public routes only)
  const cfg = getConfigManager();
  if (!cfg) {
    logger.error(
      'Middleware: Configuration unavailable - rejecting request',
      undefined,
      { service: 'middleware', pathname, configError: getConfigInitError() }
    );
    return new NextResponse('Service Unavailable', { status: 503 });
  }

  // Skip middleware for static files only
  const isStaticFile =
    /\.(svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|eot)$/i.test(
      pathname
    );
  if (pathname.startsWith('/_next') || isStaticFile) {
    return NextResponse.next();
  }

  // ============================================================================
  // CORS + RATE LIMITING FOR ALL API ROUTES (VULN-007 Security Fix)
  // ============================================================================
  if (pathname.startsWith('/api/')) {
    const rateLimitResult = await handleApiRateLimit(request, pathname);
    if (rateLimitResult.response) return rateLimitResult.response;
  }

  // Mobile clients send Bearer token in Authorization header instead of cookies.
  const bearerToken = extractBearerToken(request);
  if (pathname.startsWith('/api/') && isValidJwtFormat(bearerToken)) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-pathname', pathname);
    const requestId = crypto.randomUUID();
    requestHeaders.set('x-request-id', requestId);
    const response = NextResponse.next({
      request: { headers: requestHeaders },
    });
    if (!shouldSkipCors(pathname)) {
      return addCorsHeaders(response, request);
    }
    return response;
  }

  try {
    // Get JWT token from cookies
    const authCookieName = isDevelopment
      ? 'mintenance-auth'
      : '__Host-mintenance-auth';
    const token = request.cookies.get(authCookieName)?.value;

    // Also check for Supabase auth token (for E2E tests and Supabase-only auth)
    const supabaseRef =
      process.env.NEXT_PUBLIC_SUPABASE_URL?.match(
        /https:\/\/([^.]+)\.supabase\.co/
      )?.[1] || '';
    const supabaseAuthCookie = request.cookies.get(
      `sb-${supabaseRef}-auth-token`
    )?.value;

    if (!token && !supabaseAuthCookie) {
      return redirectToLogin(request);
    }

    // If only Supabase token exists, validate it using @supabase/ssr
    if (!token && supabaseAuthCookie) {
      return handleSupabaseAuth(request, pathname, isDevelopment);
    }

    // Verify the JWT token using shared auth package
    if (!token) {
      return redirectToLogin(request);
    }

    const jwtPayload = await verifyJwtToken(token, cfg, request, pathname);
    if (!jwtPayload) {
      return redirectToLogin(request);
    }

    // SECURITY: Check if token is blacklisted (e.g., after logout)
    const isBlacklisted = await checkTokenBlacklist(
      token,
      pathname,
      jwtPayload.sub
    );
    if (isBlacklisted) {
      return redirectToLogin(request);
    }

    // Check if token is expired (additional check)
    const now = Math.floor(Date.now() / 1000);
    if (jwtPayload.exp && jwtPayload.exp < now) {
      return redirectToLogin(request);
    }

    // VULN-009: Check session timeouts (Phase 3: hard enforcement mode)
    const timeoutResponse = await enforceSessionTimeouts(
      jwtPayload,
      token,
      request,
      pathname
    );
    if (timeoutResponse) return timeoutResponse;

    // Validate CSRF token for state-changing requests
    const csrfResponse = validateCsrf(request, isDevelopment, 'JWT auth path');
    if (csrfResponse) return csrfResponse;

    // Token is valid, add user info to the request headers
    const requestHeaders = new Headers(request.headers);
    if (jwtPayload.sub) requestHeaders.set('x-user-id', jwtPayload.sub);
    if (jwtPayload.email) requestHeaders.set('x-user-email', jwtPayload.email);
    if (jwtPayload.role) requestHeaders.set('x-user-role', jwtPayload.role);

    const requestId = crypto.randomUUID();
    requestHeaders.set('x-request-id', requestId);
    requestHeaders.set('x-pathname', pathname);

    // Generate CSP nonce for script security
    const nonce = crypto.randomUUID().replace(/-/g, '');
    requestHeaders.set('x-csp-nonce', nonce);

    // 2025 UI Feature Flag Logic
    const is2025Enabled = is2025FeatureEnabled(request);
    requestHeaders.set('x-ui-version', is2025Enabled ? '2025' : 'current');

    const response = NextResponse.next({
      request: { headers: requestHeaders },
    });

    setCsrfCookie(response, request, isDevelopment);

    // `nonce` is generated above (line ~211) and attached to
    // `x-csp-nonce` on the request headers — the root layout reads that
    // header to forward to inline scripts. The CSP builders wire the
    // same nonce into `script-src 'nonce-...'` only when
    // `ENABLE_CSP_NONCE=true`; otherwise legacy `'unsafe-inline'`-only
    // behavior is preserved (see middleware/csp.ts).
    response.headers.set(
      'Content-Security-Policy',
      buildAuthenticatedCSP(isDevelopment, nonce)
    );
    response.headers.set(
      'Content-Security-Policy-Report-Only',
      buildStrictReportOnlyCSP(isDevelopment, nonce)
    );

    // API versioning header for all /api/ routes
    if (pathname.startsWith('/api/')) {
      response.headers.set(
        'X-API-Version',
        process.env.API_VERSION || '2026-02-09'
      );
      response.headers.set('X-API-Deprecation', 'false');
    }

    return response;
  } catch (error) {
    logger.error('JWT verification failed', error, {
      service: 'middleware',
      pathname: request.nextUrl.pathname,
    });
    return redirectToLogin(request);
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     *
     * NOTE: API routes are NOT excluded - middleware handles rate limiting and CORS for /api/*
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
