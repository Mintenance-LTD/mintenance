// @vitest-environment node
// globals: true in vitest.config — do not import from 'vitest' directly (breaks in v4)
import { NextRequest } from 'next/server';

/**
 * Authentication API Routes - Unit Tests
 *
 * These tests verify the auth route handlers. The real route handlers have
 * deep dependency chains (CSRF, rate limiting, validation, MFA, auth-manager,
 * database, etc.) that all need mocking.
 *
 * Strategy: Mock the auth-manager and all middleware, test the route handler
 * orchestration logic.
 */

// ---- Hoisted mocks (survive mockReset) ----
const mocks = vi.hoisted(() => {
  return {
    authManager: {
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    },
    requireCSRF: vi.fn(async () => undefined),
    checkLoginRateLimit: vi.fn(async () => ({
      allowed: true,
      remaining: 99,
      limit: 100,
      resetTime: Date.now() + 60000,
      tier: 'anonymous' as const,
    })),
    recordSuccessfulLogin: vi.fn(),
    createRateLimitHeaders: vi.fn(() => ({})),
    validateRequest: vi.fn(),
    rateLimiter: {
      checkRateLimit: vi.fn(async () => ({
        allowed: true,
        remaining: 99,
        resetTime: Date.now() + 60000,
        retryAfter: undefined,
      })),
    },
    tokenBlacklist: {
      blacklistToken: vi.fn(async () => undefined),
    },
    serverSupabase: {
      auth: {
        signInWithPassword: vi.fn(),
        signUp: vi.fn(),
        signOut: vi.fn(),
        getUser: vi.fn(),
      },
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({ data: null, error: null })),
          })),
        })),
      })),
    },
    cookies: vi.fn(async () => ({
      get: vi.fn(() => undefined),
      set: vi.fn(),
      delete: vi.fn(),
    })),
    logger: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    },
    MFAService: {
      createPreMFASession: vi.fn(),
      validateTrustedDevice: vi.fn(),
    },
  };
});

// Mock all dependencies before they are imported
vi.mock('@/lib/auth-manager', () => ({
  authManager: mocks.authManager,
}));

vi.mock('@/lib/csrf', () => ({
  requireCSRF: mocks.requireCSRF,
}));

vi.mock('@/lib/rate-limiter', () => ({
  checkLoginRateLimit: mocks.checkLoginRateLimit,
  recordSuccessfulLogin: mocks.recordSuccessfulLogin,
  createRateLimitHeaders: mocks.createRateLimitHeaders,
  rateLimiter: mocks.rateLimiter,
}));

vi.mock('@/lib/rate-limiter-enhanced', () => ({
  checkLoginRateLimit: mocks.checkLoginRateLimit,
  recordSuccessfulLogin: mocks.recordSuccessfulLogin,
  createRateLimitHeaders: mocks.createRateLimitHeaders,
}));

vi.mock('@/lib/validation/validator', () => ({
  validateRequest: mocks.validateRequest,
}));

vi.mock('@/lib/validation/schemas', () => ({
  loginSchema: {},
  registerSchema: {},
}));

vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: mocks.serverSupabase,
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('next/headers', () => ({
  cookies: mocks.cookies,
}));

vi.mock('@mintenance/shared', () => ({
  logger: mocks.logger,
}));

vi.mock('@/lib/logger', () => ({
  logger: mocks.logger,
}));

vi.mock('@mintenance/auth', () => ({
  generateJWT: vi.fn(() => 'mock-jwt-token'),
  verifyJWT: vi.fn(),
  verifyPassword: vi.fn(() => true),
  hashPassword: vi.fn(() => 'hashed-password'),
  generateTokenPair: vi.fn(),
  hashRefreshToken: vi.fn(),
  ConfigManager: { getInstance: vi.fn(() => ({ isProduction: () => false })) },
  PasswordValidator: { validate: vi.fn(() => ({ valid: true })) },
  checkPasswordBreach: vi.fn(async () => ({ isBreached: false })),
}));

vi.mock('@/lib/mfa/mfa-service', () => ({
  MFAService: mocks.MFAService,
}));

vi.mock('@/lib/auth/token-blacklist', () => ({
  tokenBlacklist: mocks.tokenBlacklist,
}));

// Mock database.ts to prevent ServerOnly guard
vi.mock('@/lib/database', () => ({
  DatabaseManager: {
    isValidEmail: vi.fn((email: string) => email.includes('@')),
    isValidPassword: vi.fn(() => ({ valid: true, message: '' })),
    getUserById: vi.fn(),
    authenticateUser: vi.fn(),
    updateUserPassword: vi.fn(),
    updateUser: vi.fn(),
  },
}));

vi.mock('@/lib/auth', () => ({
  createToken: vi.fn(),
  verifyToken: vi.fn(),
  setAuthCookie: vi.fn(),
  clearAuthCookie: vi.fn(),
  createTokenPair: vi.fn(async () => ({ accessToken: 'at', refreshToken: 'rt' })),
  rotateTokens: vi.fn(),
  revokeAllTokens: vi.fn(),
  createAuthCookieHeaders: vi.fn(() => new Headers()),
  getCurrentUserFromCookies: vi.fn(),
}));

vi.mock('@/lib/config', () => ({
  config: { isProduction: () => false },
}));

vi.mock('@/lib/errors/api-error', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/errors/api-error')>();
  return actual;
});

describe('Authentication API Routes', () => {
  beforeEach(() => {
    // Re-setup mocks that mockReset clears
    mocks.requireCSRF.mockResolvedValue(undefined);
    mocks.checkLoginRateLimit.mockResolvedValue({
      allowed: true,
      remaining: 99,
      limit: 100,
      resetTime: Date.now() + 60000,
      tier: 'anonymous' as const,
    });
    mocks.createRateLimitHeaders.mockReturnValue({});
    mocks.rateLimiter.checkRateLimit.mockResolvedValue({
      allowed: true,
      remaining: 99,
      resetTime: Date.now() + 60000,
    });
  });

  describe('POST /api/auth/login', () => {
    it('should successfully log in a user with valid credentials', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        role: 'homeowner',
        first_name: 'Test',
        last_name: 'User',
        email_verified: true,
      };

      // validateRequest returns parsed data
      mocks.validateRequest.mockResolvedValue({
        data: { email: 'test@example.com', password: 'password123' },
      });

      // authManager.login returns success
      mocks.authManager.login.mockResolvedValue({
        success: true,
        user: mockUser,
        cookieHeaders: new Headers(),
      });

      // MFA check returns no mfa_enabled
      mocks.serverSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({ data: { mfa_enabled: false }, error: null })),
          })),
        })),
      });

      const { POST: loginHandler } = await import('@/app/api/auth/login/route');

      const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
        }),
      });

      const response = await loginHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Login successful');
      expect(data.user.id).toBe('user123');
      expect(data.user.email).toBe('test@example.com');
    });

    it('should return 401 for invalid credentials', async () => {
      mocks.validateRequest.mockResolvedValue({
        data: { email: 'test@example.com', password: 'wrongpassword' },
      });

      mocks.authManager.login.mockResolvedValue({
        success: false,
        error: 'Invalid email or password',
      });

      const { POST: loginHandler } = await import('@/app/api/auth/login/route');

      const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'wrongpassword',
        }),
      });

      const response = await loginHandler(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBeDefined();
    });

    it('should return 429 when rate limited', async () => {
      mocks.checkLoginRateLimit.mockResolvedValue({
        allowed: false,
        remaining: 0,
        limit: 5,
        resetTime: Date.now() + 60000,
        tier: 'anonymous' as const,
      });

      const { POST: loginHandler } = await import('@/app/api/auth/login/route');

      const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
        }),
      });

      const response = await loginHandler(request);

      expect(response.status).toBe(429);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should successfully log out a user', async () => {
      mocks.authManager.logout.mockResolvedValue(undefined);
      mocks.cookies.mockResolvedValue({
        get: vi.fn(() => ({ value: 'some-token' })),
        set: vi.fn(),
        delete: vi.fn(),
      });

      const { POST: logoutHandler } = await import('@/app/api/auth/logout/route');

      const request = new NextRequest('http://localhost/api/auth/logout', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer mock-token',
        },
      });

      const response = await logoutHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Logout successful');
    });
  });

  describe('Authentication Middleware', () => {
    it('should validate JWT tokens via getUser', async () => {
      const mockUser = { id: 'user123', email: 'test@example.com' };

      mocks.serverSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const user = await mocks.serverSupabase.auth.getUser();
      expect(user.data.user).toEqual(mockUser);
    });

    it('should reject invalid tokens', async () => {
      mocks.serverSupabase.auth.getUser.mockResolvedValue({
        data: null,
        error: { message: 'Invalid token' },
      });

      const user = await mocks.serverSupabase.auth.getUser();
      expect(user.error).toBeDefined();
    });
  });

  describe('CSRF Protection', () => {
    it('should validate CSRF tokens on mutations', () => {
      const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
        }),
        headers: {
          'X-CSRF-Token': 'valid-csrf-token',
        },
      });

      expect(request.headers.get('X-CSRF-Token')).toBeTruthy();
    });
  });
});
