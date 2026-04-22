import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@mintenance/shared';
import { timingSafeEqual } from 'crypto';

function getCsrfCookieName(isDevelopment: boolean): string {
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

/**
 * Parse the comma-separated ALLOWED_ORIGINS env var into a normalized list.
 * Empty / missing env var returns an empty list; callers treat an empty
 * allowlist as "same-origin only".
 */
function getAllowedOrigins(): string[] {
  return (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Defense-in-depth Origin/Referer check for CSRF. Runs BEFORE the token
 * compare so a mismatched origin is rejected without exposing token
 * state. Required by OWASP when the cookie could ever be set from a
 * subdomain / subresource — `__Host-` prefix helps, but is not a
 * substitute for an explicit origin check.
 *
 * Returns null on pass, a 403 NextResponse on fail.
 */
function validateOrigin(request: NextRequest): NextResponse | null {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  const host = request.headers.get('host');

  // Determine source origin (prefer Origin; fall back to Referer URL origin).
  let sourceOrigin: string | null = origin;
  if (!sourceOrigin && referer) {
    try {
      sourceOrigin = new URL(referer).origin;
    } catch {
      sourceOrigin = null;
    }
  }

  // If neither Origin nor Referer is present, fall through to the token
  // compare. Browsers always send Origin on cross-origin POSTs and on
  // same-origin POSTs from modern browsers, but some same-origin fetches
  // (especially Safari) omit it. The token check remains the primary gate.
  if (!sourceOrigin) return null;

  let sourceHost: string;
  try {
    sourceHost = new URL(sourceOrigin).host;
  } catch {
    logger.warn('CSRF origin parse failed', {
      service: 'middleware',
      origin: sourceOrigin,
    });
    return NextResponse.json(
      { error: 'Invalid Origin header' },
      { status: 403 }
    );
  }

  if (sourceHost === host) return null;

  const allowed = getAllowedOrigins();
  if (
    allowed.some(
      (a) => sourceOrigin === a || sourceOrigin.endsWith(`.${a}`) || a === '*'
    )
  ) {
    return null;
  }

  logger.warn('CSRF cross-origin request blocked', {
    service: 'middleware',
    method: request.method,
    pathname: request.nextUrl.pathname,
    sourceOrigin,
    host,
  });
  return NextResponse.json(
    { error: 'Cross-origin request blocked' },
    { status: 403 }
  );
}

export function validateCsrf(
  request: NextRequest,
  isDevelopment: boolean,
  logContext: string
): NextResponse | null {
  if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
    return null;
  }

  // Defense-in-depth: reject obvious cross-origin before the token check.
  const originBlock = validateOrigin(request);
  if (originBlock) return originBlock;

  const csrfCookieName = getCsrfCookieName(isDevelopment);
  const headerToken = request.headers.get('x-csrf-token');
  const cookieToken = request.cookies.get(csrfCookieName)?.value;

  // SECURITY: constant-time compare (OWASP ASVS 2.1.11). `===` leaks
  // token length/prefix via timing side channel. Length mismatch is
  // checked first because timingSafeEqual throws on unequal buffers.
  const tokensMatch = (() => {
    if (!headerToken || !cookieToken) return false;
    if (headerToken.length !== cookieToken.length) return false;
    return timingSafeEqual(Buffer.from(headerToken), Buffer.from(cookieToken));
  })();

  if (!tokensMatch) {
    logger.warn(`CSRF token validation failed (${logContext})`, {
      service: 'middleware',
      method: request.method,
      pathname: request.nextUrl.pathname,
      hasHeaderToken: !!headerToken,
      hasCookieToken: !!cookieToken,
    });
    return NextResponse.json({ error: 'CSRF token mismatch' }, { status: 403 });
  }

  return null;
}
