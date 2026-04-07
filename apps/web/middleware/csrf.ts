import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@mintenance/shared';

export function getCsrfCookieName(isDevelopment: boolean): string {
  return isDevelopment ? 'csrf-token' : '__Host-csrf-token';
}

export function setCsrfCookie(
  response: NextResponse,
  request: NextRequest,
  isDevelopment: boolean
): void {
  const csrfName = getCsrfCookieName(isDevelopment);
  const csrfValue = request.cookies.get(csrfName)?.value || crypto.randomUUID();
  response.cookies.set(csrfName, csrfValue, {
    httpOnly: false, // SECURITY: Must be false for double-submit cookie pattern
    secure: !isDevelopment,
    sameSite: 'strict',
    path: '/',
    maxAge: 24 * 60 * 60, // 24 hours
  });
}

export function validateCsrf(
  request: NextRequest,
  isDevelopment: boolean,
  logContext: string
): NextResponse | null {
  if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
    return null;
  }

  const csrfCookieName = getCsrfCookieName(isDevelopment);
  const headerToken = request.headers.get('x-csrf-token');
  const cookieToken = request.cookies.get(csrfCookieName)?.value;

  if (!headerToken || !cookieToken || headerToken !== cookieToken) {
    logger.warn(`CSRF token validation failed (${logContext})`, {
      service: 'middleware',
      method: request.method,
      pathname: request.nextUrl.pathname,
      hasHeaderToken: !!headerToken,
      hasCookieToken: !!cookieToken,
      ...(logContext === 'JWT auth path' && {
        tokensMatch: headerToken === cookieToken,
      }),
    });
    return NextResponse.json({ error: 'CSRF token mismatch' }, { status: 403 });
  }

  return null;
}
