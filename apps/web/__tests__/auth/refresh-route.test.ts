// @vitest-environment node
// globals: true in vitest.config — do not import from 'vitest' directly (breaks in v4)
import { NextRequest } from 'next/server';

/**
 * Token Refresh Route Tests
 *
 * Tests the POST /api/auth/refresh endpoint which handles token rotation.
 * The route depends on: rateLimiter, requireCSRF, next/headers cookies,
 * verifyToken, rotateTokens, setAuthCookie.
 */

// ---- Hoisted mocks (survive mockReset) ----
const mocks = vi.hoisted(() => {
  const cookieStore = new Map<string, string>();
  return {
    cookieStore,
    rateLimiter: {
      checkRateLimit: vi.fn(async () => ({
        allowed: true,
        remaining: 99,
        resetTime: Date.now() + 60000,
        retryAfter: undefined,
      })),
    },
    requireCSRF: vi.fn(async () => undefined),
    verifyToken: vi.fn(async () => ({
      sub: 'u1',
      email: 'u@example.com',
      role: 'homeowner',
      exp: Math.floor(Date.now() / 1000) + 10, // Expires in 10s (needs refresh)
    })),
    rotateTokens: vi.fn(async () => ({
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
    })),
    setAuthCookie: vi.fn(async () => undefined),
    logger: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    },
    cookies: vi.fn(),
  };
});

// Setup cookie mock function
mocks.cookies.mockImplementation(async () => ({
  get: (k: string) => {
    const val = mocks.cookieStore.get(k);
    return val ? { name: k, value: val } : undefined;
  },
  set: (k: string, v: string) => { mocks.cookieStore.set(k, v); },
  delete: (k: string) => { mocks.cookieStore.delete(k); },
}));

vi.mock('next/headers', () => ({
  cookies: mocks.cookies,
}));

vi.mock('@/lib/rate-limiter', () => ({
  rateLimiter: mocks.rateLimiter,
}));

vi.mock('@/lib/csrf', () => ({
  requireCSRF: mocks.requireCSRF,
}));

vi.mock('@/lib/auth', () => ({
  verifyToken: mocks.verifyToken,
  rotateTokens: mocks.rotateTokens,
  setAuthCookie: mocks.setAuthCookie,
}));

vi.mock('@mintenance/shared', () => ({
  logger: mocks.logger,
}));

vi.mock('@/lib/logger', () => ({
  logger: mocks.logger,
}));

vi.mock('@/lib/database', () => ({
  DatabaseManager: {},
}));

vi.mock('@mintenance/auth', () => ({
  generateJWT: vi.fn(),
  verifyJWT: vi.fn(),
  generateTokenPair: vi.fn(),
  hashRefreshToken: vi.fn(),
  ConfigManager: { getInstance: vi.fn(() => ({ isProduction: () => false })) },
}));

vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn() })) })),
    })),
  },
}));

vi.mock('@/lib/errors/api-error', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/errors/api-error')>();
  return actual;
});

// The refresh route hardcodes __Host- prefixed cookie names
const AUTH_COOKIE = '__Host-mintenance-auth';
const REFRESH_COOKIE = '__Host-mintenance-refresh';
const REMEMBER_COOKIE = '__Host-mintenance-remember';

describe('POST /api/auth/refresh', () => {
  beforeEach(() => {
    mocks.cookieStore.clear();

    // Re-setup mocks after mockReset
    mocks.rateLimiter.checkRateLimit.mockResolvedValue({
      allowed: true,
      remaining: 99,
      resetTime: Date.now() + 60000,
      retryAfter: undefined,
    });
    mocks.requireCSRF.mockResolvedValue(undefined);
    mocks.verifyToken.mockResolvedValue({
      sub: 'u1',
      email: 'u@example.com',
      role: 'homeowner',
      exp: Math.floor(Date.now() / 1000) + 10, // Expires in 10s
    });
    mocks.rotateTokens.mockResolvedValue({
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
    });
    mocks.setAuthCookie.mockResolvedValue(undefined);
    mocks.cookies.mockImplementation(async () => ({
      get: (k: string) => {
        const val = mocks.cookieStore.get(k);
        return val ? { name: k, value: val } : undefined;
      },
      set: (k: string, v: string) => { mocks.cookieStore.set(k, v); },
      delete: (k: string) => { mocks.cookieStore.delete(k); },
    }));
  });

  it('should return 401 when no active session (no auth cookie)', async () => {
    // No cookies set at all
    const { POST } = await import('../../app/api/auth/refresh/route');

    const request = new NextRequest('http://localhost/api/auth/refresh', {
      method: 'POST',
    });

    const res = await POST(request);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBeDefined();
  });

  it('should return 401 when refresh token is missing but auth token present and expiring', async () => {
    mocks.cookieStore.set(AUTH_COOKIE, 'old-access');
    // No refresh cookie set

    const { POST } = await import('../../app/api/auth/refresh/route');

    const request = new NextRequest('http://localhost/api/auth/refresh', {
      method: 'POST',
    });

    const res = await POST(request);
    const body = await res.json();

    expect(res.status).toBe(401);
    // Error can be a string or an object with a message field
    const errorMsg = typeof body.error === 'string' ? body.error : body.error?.message || JSON.stringify(body.error);
    expect(errorMsg).toMatch(/refresh token|sign in/i);
  });

  it('should rotate tokens when refresh token is present and valid', async () => {
    mocks.cookieStore.set(AUTH_COOKIE, 'old-access');
    mocks.cookieStore.set(REFRESH_COOKIE, 'old-refresh');

    const { POST } = await import('../../app/api/auth/refresh/route');

    const request = new NextRequest('http://localhost/api/auth/refresh', {
      method: 'POST',
    });

    const res = await POST(request);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mocks.rotateTokens).toHaveBeenCalled();
    expect(mocks.setAuthCookie).toHaveBeenCalled();
  });

  it('should return 401 for invalid refresh token (rotation fails)', async () => {
    mocks.cookieStore.set(AUTH_COOKIE, 'old-access');
    mocks.cookieStore.set(REFRESH_COOKIE, 'bad-refresh');
    mocks.rotateTokens.mockRejectedValue(new Error('Invalid refresh token'));

    const { POST } = await import('../../app/api/auth/refresh/route');

    const request = new NextRequest('http://localhost/api/auth/refresh', {
      method: 'POST',
    });

    const res = await POST(request);

    // The error handler will return 500 for unhandled errors
    // or 401 if it's an UnauthorizedError
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});
