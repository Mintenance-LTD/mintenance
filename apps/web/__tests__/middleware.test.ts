// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from 'vitest';
/**
 * Middleware Security Tests
 * Tests critical security functionality in Next.js middleware
 *
 * KEY DESIGN DECISIONS:
 * - ALL mock functions are created via vi.hoisted() so their identity is stable
 *   across vitest's mockReset/restoreMocks/clearMocks lifecycle
 * - configManager is initialized at module level in middleware.ts, so the mock
 *   functions returned by ConfigManager.getInstance() must have default values
 *   set in vi.hoisted() AND be re-setup in beforeEach (because mockReset clears them)
 * - NextResponse.redirect() returns status 307 (not 302)
 * - The middleware does NOT set x-frame-options, x-content-type-options, or referrer-policy
 * - The middleware does NOT implement role-based route restrictions (any valid JWT passes)
 */
import { NextRequest } from 'next/server';

// ALL mock functions MUST be created via vi.hoisted() so their identity is
// stable across vitest's mockReset/restoreMocks cycles. Functions created with
// vi.fn() inside vi.mock() factories get swapped out by restoreMocks: true,
// breaking the reference that middleware.ts captured at import time.
const {
  mockVerifyJWT,
  mockGetRequired,
  mockGet,
  mockIsProduction,
  mockValidateSession,
  mockGetTimeoutMessage,
  mockIsTokenBlacklisted,
  mockBlacklistToken,
  mockCheckRateLimit,
  mockCreateRateLimitHeaders,
  mockHandlePreflightRequest,
  mockAddCorsHeaders,
  mockShouldSkipCors,
  mockLogSuspiciousActivity,
  mockLoggerInfo,
  mockLoggerWarn,
  mockLoggerError,
} = vi.hoisted(() => ({
  mockVerifyJWT: vi.fn(),
  // Default return values MUST be set here because middleware.ts calls
  // configManager.get('JWT_SECRET') during module initialization.
  mockGetRequired: vi.fn().mockReturnValue('test-jwt-secret'),
  mockGet: vi.fn().mockReturnValue('test-jwt-secret'),
  mockIsProduction: vi.fn().mockReturnValue(false),
  mockValidateSession: vi.fn().mockReturnValue({ isValid: true }),
  mockGetTimeoutMessage: vi.fn().mockReturnValue(''),
  mockIsTokenBlacklisted: vi.fn().mockResolvedValue(false),
  mockBlacklistToken: vi.fn().mockResolvedValue(undefined),
  mockCheckRateLimit: vi.fn().mockResolvedValue({
    allowed: true,
    limit: 100,
    remaining: 99,
    tier: 'standard',
  }),
  mockCreateRateLimitHeaders: vi.fn().mockReturnValue({}),
  mockHandlePreflightRequest: vi.fn(),
  mockAddCorsHeaders: vi.fn().mockImplementation((response: unknown) => response),
  mockShouldSkipCors: vi.fn().mockReturnValue(false),
  mockLogSuspiciousActivity: vi.fn().mockResolvedValue(undefined),
  mockLoggerInfo: vi.fn(),
  mockLoggerWarn: vi.fn(),
  mockLoggerError: vi.fn(),
}));

// Mock dependencies BEFORE importing middleware.
// ALL functions use the hoisted references above.
vi.mock('@mintenance/auth', () => ({
  verifyJWT: mockVerifyJWT,
  ConfigManager: {
    getInstance: () => ({
      get: mockGet,
      getRequired: mockGetRequired,
      isProduction: mockIsProduction,
    }),
  },
  SessionValidator: {
    validateSession: mockValidateSession,
    getTimeoutMessage: mockGetTimeoutMessage,
  },
}));

vi.mock('@mintenance/shared', () => ({
  logger: {
    info: mockLoggerInfo,
    warn: mockLoggerWarn,
    error: mockLoggerError,
  },
}));

vi.mock('@/lib/auth/token-blacklist', () => ({
  tokenBlacklist: {
    isTokenBlacklisted: mockIsTokenBlacklisted,
    blacklistToken: mockBlacklistToken,
  },
}));

vi.mock('@/lib/rate-limiter-enhanced', () => ({
  checkRateLimit: mockCheckRateLimit,
  createRateLimitHeaders: mockCreateRateLimitHeaders,
}));

vi.mock('@/lib/cors', () => ({
  handlePreflightRequest: mockHandlePreflightRequest,
  addCorsHeaders: mockAddCorsHeaders,
  shouldSkipCors: mockShouldSkipCors,
}));

vi.mock('@/lib/security-monitor', () => ({
  securityMonitor: {
    logSuspiciousActivity: mockLogSuspiciousActivity,
  },
}));

// Import middleware AFTER mocks are set up
import { middleware } from '../middleware';

describe('Middleware Security', () => {
  beforeEach(() => {
    // Re-setup all mock implementations after mockReset clears them.
    // mockReset: true in vitest.config.ts calls .mockReset() on every vi.fn()
    // between tests, which clears call history AND implementations.
    mockVerifyJWT.mockReset();
    mockGet.mockReturnValue('test-jwt-secret');
    mockGetRequired.mockReturnValue('test-jwt-secret');
    mockIsProduction.mockReturnValue(false);
    mockValidateSession.mockReturnValue({ isValid: true });
    mockGetTimeoutMessage.mockReturnValue('');
    mockIsTokenBlacklisted.mockResolvedValue(false);
    mockBlacklistToken.mockResolvedValue(undefined);
    mockCheckRateLimit.mockResolvedValue({
      allowed: true,
      limit: 100,
      remaining: 99,
      tier: 'standard',
    });
    mockCreateRateLimitHeaders.mockReturnValue({});
    mockAddCorsHeaders.mockImplementation((response: unknown) => response);
    mockShouldSkipCors.mockReturnValue(false);
    mockLogSuspiciousActivity.mockResolvedValue(undefined);
    mockLoggerInfo.mockReturnValue(undefined);
    mockLoggerWarn.mockReturnValue(undefined);
    mockLoggerError.mockReturnValue(undefined);
  });

  describe('Authentication', () => {
    it('should allow authenticated requests with valid JWT', async () => {
      mockVerifyJWT.mockResolvedValue({
        sub: 'user-123',
        email: 'test@example.com',
        role: 'homeowner',
        exp: Date.now() / 1000 + 3600,
      });

      const request = new NextRequest('https://example.com/dashboard', {
        headers: {
          cookie: 'mintenance-auth=valid-jwt-token',
        },
      });

      const response = await middleware(request);

      expect(response.status).toBe(200);
      expect(mockVerifyJWT).toHaveBeenCalledWith('valid-jwt-token', 'test-jwt-secret');
    });

    it('should redirect unauthenticated requests to login', async () => {
      const request = new NextRequest('https://example.com/dashboard', {
        headers: {},
      });

      const response = await middleware(request);

      // NextResponse.redirect() returns 307
      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toContain('/login');
    });

    it('should reject requests with invalid JWT', async () => {
      mockVerifyJWT.mockResolvedValue(null);

      const request = new NextRequest('https://example.com/dashboard', {
        headers: {
          cookie: 'mintenance-auth=invalid-jwt-token',
        },
      });

      const response = await middleware(request);

      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toContain('/login');
    });

    it('should reject requests with expired JWT', async () => {
      mockVerifyJWT.mockResolvedValue({
        sub: 'user-123',
        email: 'test@example.com',
        role: 'homeowner',
        exp: Date.now() / 1000 - 3600, // 1 hour ago
      });

      const request = new NextRequest('https://example.com/dashboard', {
        headers: {
          cookie: 'mintenance-auth=expired-jwt-token',
        },
      });

      const response = await middleware(request);

      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toContain('/login');
    });
  });

  describe('CSRF Protection', () => {
    it('should validate CSRF tokens for POST requests', async () => {
      mockVerifyJWT.mockResolvedValue({
        sub: 'user-123',
        email: 'test@example.com',
        role: 'homeowner',
        exp: Date.now() / 1000 + 3600,
      });

      const request = new NextRequest('https://example.com/api/jobs', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie: 'mintenance-auth=valid-jwt-token; csrf-token=csrf-token-123',
          'x-csrf-token': 'csrf-token-123',
        },
      });

      const response = await middleware(request);

      expect(response.status).toBe(200);
    });

    it('should reject POST requests with missing CSRF token', async () => {
      mockVerifyJWT.mockResolvedValue({
        sub: 'user-123',
        email: 'test@example.com',
        role: 'homeowner',
        exp: Date.now() / 1000 + 3600,
      });

      const request = new NextRequest('https://example.com/api/jobs', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie: 'mintenance-auth=valid-jwt-token',
        },
      });

      const response = await middleware(request);

      expect(response.status).toBe(403);
    });

    it('should reject POST requests with mismatched CSRF tokens', async () => {
      mockVerifyJWT.mockResolvedValue({
        sub: 'user-123',
        email: 'test@example.com',
        role: 'homeowner',
        exp: Date.now() / 1000 + 3600,
      });

      const request = new NextRequest('https://example.com/api/jobs', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie: 'mintenance-auth=valid-jwt-token; csrf-token=csrf-token-123',
          'x-csrf-token': 'different-csrf-token',
        },
      });

      const response = await middleware(request);

      expect(response.status).toBe(403);
    });

    it('should allow GET requests without CSRF validation', async () => {
      mockVerifyJWT.mockResolvedValue({
        sub: 'user-123',
        email: 'test@example.com',
        role: 'homeowner',
        exp: Date.now() / 1000 + 3600,
      });

      const request = new NextRequest('https://example.com/api/jobs', {
        method: 'GET',
        headers: {
          cookie: 'mintenance-auth=valid-jwt-token',
        },
      });

      const response = await middleware(request);

      expect(response.status).toBe(200);
    });
  });

  describe('Public Routes', () => {
    it('should allow access to public routes without authentication', async () => {
      const publicRoutes = [
        '/',
        '/login',
        '/register',
        '/about',
        '/contact',
        '/try-mint-ai',
        '/api/auth/login',
        '/api/auth/register',
      ];

      for (const route of publicRoutes) {
        const request = new NextRequest(`https://example.com${route}`, {
          headers: {},
        });

        const response = await middleware(request);

        expect(response.status).toBe(200);
      }
    });

    it('should allow access to static files', async () => {
      const staticFiles = [
        '/favicon.ico',
        '/_next/static/chunks/main.js',
        '/images/logo.png',
        '/css/styles.css',
      ];

      for (const file of staticFiles) {
        const request = new NextRequest(`https://example.com${file}`, {
          headers: {},
        });

        const response = await middleware(request);

        expect(response.status).toBe(200);
      }
    });
  });

  describe('Security Headers', () => {
    it('should set security headers on authenticated responses', async () => {
      mockVerifyJWT.mockResolvedValue({
        sub: 'user-123',
        email: 'test@example.com',
        role: 'homeowner',
        exp: Date.now() / 1000 + 3600,
      });

      const request = new NextRequest('https://example.com/dashboard', {
        headers: {
          cookie: 'mintenance-auth=valid-jwt-token',
        },
      });

      const response = await middleware(request);

      // The middleware sets Content-Security-Policy and x-request-id
      // It does NOT set x-frame-options, x-content-type-options, or referrer-policy
      expect(response.headers.get('content-security-policy')).toBeTruthy();
      expect(response.headers.get('content-security-policy')).toContain("default-src 'self'");
    });

    it('should set CSP headers with nonce-based script-src', async () => {
      mockVerifyJWT.mockResolvedValue({
        sub: 'user-123',
        email: 'test@example.com',
        role: 'homeowner',
        exp: Date.now() / 1000 + 3600,
      });

      const request = new NextRequest('https://example.com/dashboard', {
        headers: {
          cookie: 'mintenance-auth=valid-jwt-token',
        },
      });

      const response = await middleware(request);

      const csp = response.headers.get('content-security-policy');
      expect(csp).toBeTruthy();
      expect(csp).toContain("default-src 'self'");
      // CSP uses nonce-based script-src, not unsafe-eval
      expect(csp).toContain("script-src 'self'");
      expect(csp).toContain("style-src 'self' 'unsafe-inline'");
      expect(csp).toContain("frame-ancestors 'none'");
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting to API routes', async () => {
      mockVerifyJWT.mockResolvedValue({
        sub: 'user-123',
        email: 'test@example.com',
        role: 'homeowner',
        exp: Date.now() / 1000 + 3600,
      });

      const request = new NextRequest('https://example.com/api/jobs', {
        method: 'GET',
        headers: {
          cookie: 'mintenance-auth=valid-jwt-token',
        },
      });

      const response = await middleware(request);

      expect(response.status).toBe(200);
      // checkRateLimit should have been called for API routes
      expect(mockCheckRateLimit).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle JWT verification errors gracefully', async () => {
      mockVerifyJWT.mockRejectedValue(new Error('JWT verification failed'));

      const request = new NextRequest('https://example.com/dashboard', {
        headers: {
          cookie: 'mintenance-auth=invalid-jwt-token',
        },
      });

      const response = await middleware(request);

      // NextResponse.redirect() returns 307
      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toContain('/login');
    });

    // Note: Configuration error testing skipped because ConfigManager is initialized at module level
    // Testing this scenario would require reloading the entire middleware module
  });

  describe('Role-Based Access', () => {
    it('should allow homeowner access to homeowner routes', async () => {
      mockVerifyJWT.mockResolvedValue({
        sub: 'user-123',
        email: 'test@example.com',
        role: 'homeowner',
        exp: Date.now() / 1000 + 3600,
      });

      const request = new NextRequest('https://example.com/homeowner/dashboard', {
        headers: {
          cookie: 'mintenance-auth=valid-jwt-token',
        },
      });

      const response = await middleware(request);

      expect(response.status).toBe(200);
    });

    it('should allow contractor access to contractor routes', async () => {
      mockVerifyJWT.mockResolvedValue({
        sub: 'user-456',
        email: 'contractor@example.com',
        role: 'contractor',
        exp: Date.now() / 1000 + 3600,
      });

      // Note: /contractor/dashboard matches the public contractor profile pattern
      // /^\/contractor\/[^\/]+$/ so it is treated as a public route.
      // Use a nested route that requires auth to test actual JWT validation.
      const request = new NextRequest('https://example.com/contractor/dashboard/settings', {
        headers: {
          cookie: 'mintenance-auth=valid-jwt-token',
        },
      });

      const response = await middleware(request);

      expect(response.status).toBe(200);
    });

    it('should allow any authenticated user through regardless of role', async () => {
      // The middleware does NOT implement role-based route restrictions.
      // Any valid JWT gets through to any protected route.
      // Role-based access control is handled by individual route handlers.
      mockVerifyJWT.mockResolvedValue({
        sub: 'user-456',
        email: 'contractor@example.com',
        role: 'contractor',
        exp: Date.now() / 1000 + 3600,
      });

      const request = new NextRequest('https://example.com/homeowner/dashboard', {
        headers: {
          cookie: 'mintenance-auth=valid-jwt-token',
        },
      });

      const response = await middleware(request);

      // Contractors can access homeowner routes at the middleware level
      // because the middleware only checks for a valid JWT, not role-based access
      expect(response.status).toBe(200);
    });
  });
});
