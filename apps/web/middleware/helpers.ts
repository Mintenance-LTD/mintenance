/**
 * Small per-request helpers used by middleware.
 * Extracted from middleware.ts.
 */
import { NextRequest, NextResponse } from 'next/server';

const JWT_FORMAT_RE = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

/**
 * Extract the client IP from standard proxy headers, falling back to 'unknown'.
 */
export function getClientIP(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
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
 * Redirect unauthenticated requests to the appropriate login page.
 * Preserves the original pathname via the `redirect` query parameter.
 */
export function redirectToLogin(request: NextRequest): NextResponse {
  const pathname = request.nextUrl.pathname;
  const isAdminRoute = pathname.startsWith('/admin');
  const loginPath = isAdminRoute ? '/admin/login' : '/login';
  const loginUrl = new URL(loginPath, request.url);
  loginUrl.searchParams.set('redirect', pathname);

  const response = NextResponse.redirect(loginUrl);

  // CRITICAL: Clear old auth cookies to prevent blacklisted token from blocking re-login.
  // Without this, session timeout blacklists the token but the cookie persists,
  // causing a loop where every request reads the old blacklisted token.
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const authCookie = isDevelopment
    ? 'mintenance-auth'
    : '__Host-mintenance-auth';
  const refreshCookie = isDevelopment
    ? 'mintenance-refresh'
    : '__Host-mintenance-refresh';
  response.cookies.delete(authCookie);
  response.cookies.delete(refreshCookie);

  return response;
}
