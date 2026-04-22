// globals: true in vitest.config — do not import from 'vitest' directly (breaks in v4)
/**
 * CSRF middleware tests: covers timing-safe compare + Origin defense-in-depth.
 */

import { NextRequest } from 'next/server';
import { validateCsrf, setCsrfCookie } from '../csrf';

const CSRF_COOKIE_NAME = 'csrf-token'; // dev name (NODE_ENV=test)

/**
 * happy-dom strips "forbidden" fetch headers like `host`, `origin`, and
 * `referer` when constructing a `NextRequest`, so we cannot rely on the
 * native Headers bag in unit tests. Instead we spy on `headers.get` to
 * return exactly the values the test author specified — this is what
 * `validateCsrf` actually reads at runtime, and matches the pattern the
 * existing `lib/__tests__/csrf.test.ts` uses for the CSRF cookie.
 */
function makeReq(opts: {
  method: string;
  host?: string;
  origin?: string | null;
  referer?: string | null;
  xCsrfToken?: string;
  cookieToken?: string;
}): NextRequest {
  const url = `http://${opts.host || 'localhost:3000'}/api/jobs`;
  const req = new NextRequest(url, { method: opts.method });

  const headerValues: Record<string, string | null> = {
    host: opts.host ?? 'localhost:3000',
    origin: opts.origin === undefined ? null : opts.origin,
    referer: opts.referer === undefined ? null : opts.referer,
    'x-csrf-token': opts.xCsrfToken ?? null,
  };
  vi.spyOn(req.headers, 'get').mockImplementation((name: string) => {
    const key = name.toLowerCase();
    if (key in headerValues) return headerValues[key];
    return null;
  });

  if (opts.cookieToken !== undefined) {
    const cookieToken = opts.cookieToken;
    vi.spyOn(req.cookies, 'get').mockImplementation((name: string) => {
      if (name === CSRF_COOKIE_NAME) {
        return { name: CSRF_COOKIE_NAME, value: cookieToken };
      }
      return undefined;
    });
  }
  return req;
}

describe('validateCsrf — method gating', () => {
  it.each(['GET', 'HEAD', 'OPTIONS'])(
    '%s requests pass through regardless of token state',
    (method) => {
      const req = makeReq({ method, host: 'localhost:3000' });
      expect(validateCsrf(req, true, 'test')).toBeNull();
    }
  );
});

describe('validateCsrf — timing-safe token compare', () => {
  it('accepts matching same-length tokens', () => {
    const req = makeReq({
      method: 'POST',
      host: 'localhost:3000',
      origin: 'http://localhost:3000',
      xCsrfToken: 'a'.repeat(36),
      cookieToken: 'a'.repeat(36),
    });
    expect(validateCsrf(req, true, 'test')).toBeNull();
  });

  it('rejects tokens that differ in exactly one byte', () => {
    const req = makeReq({
      method: 'POST',
      host: 'localhost:3000',
      origin: 'http://localhost:3000',
      xCsrfToken: 'a'.repeat(35) + 'b',
      cookieToken: 'a'.repeat(36),
    });
    const res = validateCsrf(req, true, 'test');
    expect(res?.status).toBe(403);
  });

  it('short-circuits on length mismatch without throwing (timingSafeEqual-safe)', () => {
    const req = makeReq({
      method: 'POST',
      host: 'localhost:3000',
      origin: 'http://localhost:3000',
      xCsrfToken: 'a'.repeat(10),
      cookieToken: 'a'.repeat(36),
    });
    // Would throw in crypto.timingSafeEqual without length guard.
    expect(() => validateCsrf(req, true, 'test')).not.toThrow();
    expect(validateCsrf(req, true, 'test')?.status).toBe(403);
  });

  it('rejects when header token missing', () => {
    const req = makeReq({
      method: 'POST',
      host: 'localhost:3000',
      origin: 'http://localhost:3000',
      cookieToken: 'a'.repeat(36),
    });
    expect(validateCsrf(req, true, 'test')?.status).toBe(403);
  });

  it('rejects when cookie token missing', () => {
    const req = makeReq({
      method: 'POST',
      host: 'localhost:3000',
      origin: 'http://localhost:3000',
      xCsrfToken: 'a'.repeat(36),
    });
    expect(validateCsrf(req, true, 'test')?.status).toBe(403);
  });
});

describe('validateCsrf — Origin defense-in-depth', () => {
  it('accepts same-origin requests', () => {
    const req = makeReq({
      method: 'POST',
      host: 'localhost:3000',
      origin: 'http://localhost:3000',
      xCsrfToken: 'a'.repeat(36),
      cookieToken: 'a'.repeat(36),
    });
    expect(validateCsrf(req, true, 'test')).toBeNull();
  });

  it('rejects cross-origin requests even with a matching token', () => {
    const req = makeReq({
      method: 'POST',
      host: 'localhost:3000',
      origin: 'http://evil.example.com',
      xCsrfToken: 'a'.repeat(36),
      cookieToken: 'a'.repeat(36),
    });
    const res = validateCsrf(req, true, 'test');
    expect(res?.status).toBe(403);
  });

  it('falls back to Referer when Origin is missing', () => {
    const req = makeReq({
      method: 'POST',
      host: 'localhost:3000',
      origin: null,
      referer: 'http://evil.example.com/page',
      xCsrfToken: 'a'.repeat(36),
      cookieToken: 'a'.repeat(36),
    });
    const res = validateCsrf(req, true, 'test');
    expect(res?.status).toBe(403);
  });

  it('passes origin check when neither Origin nor Referer is present (some browsers drop them on same-origin)', () => {
    // Pure token check is primary gate in this case.
    const req = makeReq({
      method: 'POST',
      host: 'localhost:3000',
      origin: null,
      referer: null,
      xCsrfToken: 'a'.repeat(36),
      cookieToken: 'a'.repeat(36),
    });
    expect(validateCsrf(req, true, 'test')).toBeNull();
  });

  it('rejects requests with an unparseable Origin', () => {
    const req = makeReq({
      method: 'POST',
      host: 'localhost:3000',
      origin: 'not a url',
      xCsrfToken: 'a'.repeat(36),
      cookieToken: 'a'.repeat(36),
    });
    const res = validateCsrf(req, true, 'test');
    expect(res?.status).toBe(403);
  });

  it('accepts a subdomain of an ALLOWED_ORIGINS entry', () => {
    const prev = process.env.ALLOWED_ORIGINS;
    process.env.ALLOWED_ORIGINS = 'mintenance.co.uk';
    try {
      const req = makeReq({
        method: 'POST',
        host: 'mintenance.co.uk',
        origin: 'https://app.mintenance.co.uk',
        xCsrfToken: 'a'.repeat(36),
        cookieToken: 'a'.repeat(36),
      });
      // Use isDevelopment=true so the spy's `csrf-token` cookie name
      // matches what validateCsrf reads. The Origin allowlist check is
      // orthogonal to the dev/prod cookie-name split.
      expect(validateCsrf(req, true, 'test')).toBeNull();
    } finally {
      process.env.ALLOWED_ORIGINS = prev;
    }
  });
});

describe('setCsrfCookie', () => {
  it('preserves an existing cookie value on re-issue', () => {
    const { NextResponse } = require('next/server');
    const res = NextResponse.next();
    const req = makeReq({ method: 'GET', host: 'localhost:3000' });
    vi.spyOn(req.cookies, 'get').mockImplementation((name: string) => {
      if (name === CSRF_COOKIE_NAME) return { name, value: 'existing-abc' };
      return undefined;
    });
    setCsrfCookie(res, req, true);
    const cookie = res.cookies.get(CSRF_COOKIE_NAME);
    expect(cookie?.value).toBe('existing-abc');
  });
});
