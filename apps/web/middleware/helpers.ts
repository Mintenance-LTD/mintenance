/**
 * Small per-request helpers used by middleware.
 * Extracted from middleware.ts.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getClientIp } from '@/lib/request-ip';

const JWT_FORMAT_RE = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

/**
 * Extract the trusted client IP from standard proxy headers.
 * Delegates to the canonical `getClientIp` helper which refuses the
 * client-controllable first XFF entry and prefers `x-vercel-forwarded-for`.
 */
export function getClientIP(request: NextRequest): string {
  return getClientIp(request);
}

/**
 * Extract a Bearer token from the Authorization header, or return null.
 */
export function extractBearerToken(request: NextRequest): string | null {
  const header = request.headers.get('authorization');
  if (!header) return null;
  return header.replace('Bearer ', '') || null;
}

/**
 * Return true when the token looks like a well-formed JWT (3 base64url parts).
 * NOTE: this does NOT verify the signature — it is a format gate only,
 * used to decide whether Bearer-token CSRF bypass applies.
 */
export function isValidJwtFormat(token: string | null | undefined): boolean {
  return !!token && JWT_FORMAT_RE.test(token);
}

/**
 * Redirect unauthenticated requests to the appropriate login page
 * (for browser navigation), OR return a 401 JSON response (for API routes).
 *
 * API callers (mobile app, server-to-server, fetch()) expect JSON error
 * bodies, not 302 redirects to HTML login pages. Redirecting a POST
 * /api/* produces a 405 dead-end when the client follows the redirect
 * to /login (GET-only). This function disambiguates:
 *   - /api/* and fetch/XHR requests → 401 JSON
 *   - Everything else (page navigations) → 302 to /login
 *
 * Preserves the original pathname via the `redirect` query parameter for
 * the redirect case so the user lands on where they were after login.
 */
export function redirectToLogin(request: NextRequest): NextResponse {
  const pathname = request.nextUrl.pathname;
  const isApiRoute = pathname.startsWith('/api/');

  // Clear old auth cookies regardless of response type, to prevent
  // blacklisted tokens blocking re-login.
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const authCookie = isDevelopment
    ? 'mintenance-auth'
    : '__Host-mintenance-auth';
  const refreshCookie = isDevelopment
    ? 'mintenance-refresh'
    : '__Host-mintenance-refresh';

  // API routes: return 401 JSON so clients can handle auth-expired cleanly.
  if (isApiRoute) {
    const response = NextResponse.json(
      {
        error: 'unauthorized',
        message: 'Authentication required. Please log in again.',
        code: 'AUTH_REQUIRED',
      },
      { status: 401 }
    );
    response.cookies.delete(authCookie);
    response.cookies.delete(refreshCookie);
    return response;
  }

  // Browser navigation: redirect to login page with return URL.
  const isAdminRoute = pathname.startsWith('/admin');
  const loginPath = isAdminRoute ? '/admin/login' : '/login';
  const loginUrl = new URL(loginPath, request.url);
  loginUrl.searchParams.set('redirect', pathname);

  const response = NextResponse.redirect(loginUrl);
  response.cookies.delete(authCookie);
  response.cookies.delete(refreshCookie);

  return response;
}
