import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
/**
 * Middleware Security Tests
 * Tests critical security functionality in Next.js middleware
 */
import { NextRequest, NextResponse } from 'next/server';

// Mock dependencies BEFORE importing middleware
vi.mock('@mintenance/auth', () => ({
  verifyJWT: vi.fn(),
  ConfigManager: {
    getInstance: vi.fn(() => ({
      get: vi.fn(() => 'test-jwt-secret'),
      getRequired: vi.fn(() => 'test-jwt-secret'),
      isProduction: vi.fn(() => false),
    })),
  },
  SessionValidator: {
    validateSession: vi.fn(() => ({ isValid: true })),
    getTimeoutMessage: vi.fn(() => ''),
  },
}));

vi.mock('@mintenance/shared', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/lib/auth/token-blacklist', () => ({
  tokenBlacklist: {
    isTokenBlacklisted: vi.fn(() => Promise.resolve(false)),
    blacklistToken: vi.fn(() => Promise.resolve()),
  },
}));

vi.mock('@/lib/rate-limiter-enhanced', () => ({
  checkRateLimit: vi.fn(() => Promise.resolve({
    allowed: true,
    limit: 100,
    remaining: 99,
    tier: 'standard'
  })),
  createRateLimitHeaders: vi.fn(() => ({})),
}));

vi.mock('@/lib/cors', () => ({
  handlePreflightRequest: vi.fn(),
  addCorsHeaders: vi.fn((response) => response),
  shouldSkipCors: vi.fn(() => false),
}));

vi.mock('@/lib/security-monitor', () => ({
  securityMonitor: {
    logSuspiciousActivity: vi.fn(() => Promise.resolve()),
  },
}));

// Import middleware AFTER mocks are set up
import { middleware } from '../middleware';

describe('Middleware Security', () => {
  // Get the mocked functions after they've been set up
  let mockVerifyJWT: any;

  beforeEach(async () => {
    // Import the mocked module to get access to the mock functions
    const auth = await import('@mintenance/auth');
    mockVerifyJWT = auth.verifyJWT as any;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Authentication', () => {
    it('should allow authenticated requests with valid JWT', async () => {
      mockVerifyJWT.mockResolvedValue({
        sub: 'user-123',
        email: 'test@example.com',
        role: 'homeowner',
        exp: Date.now() / 1000 + 3600, // 1 hour from now
      });

      const request = new NextRequest('https://example.com/dashboard', {
        headers: {
          cookie: 'mintenance-auth=valid-jwt-token',  // Use development cookie name
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
      
      expect(response.status).toBe(302);
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
      
      expect(response.status).toBe(302);
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
      
      expect(response.status).toBe(302);
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
    it('should set security headers', async () => {
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
      
      expect(response.headers.get('x-frame-options')).toBe('DENY');
      expect(response.headers.get('x-content-type-options')).toBe('nosniff');
      expect(response.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin');
      expect(response.headers.get('x-request-id')).toBeDefined();
    });

    it('should set CSP headers', async () => {
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
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("script-src 'self' 'unsafe-eval'");
      expect(csp).toContain("style-src 'self' 'unsafe-inline'");
    });
  });

  describe('Rate Limiting', () => {
    it('should set rate limit headers', async () => {
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
      
      expect(response.headers.get('x-ratelimit-limit')).toBeDefined();
      expect(response.headers.get('x-ratelimit-remaining')).toBeDefined();
      expect(response.headers.get('x-ratelimit-reset')).toBeDefined();
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

      expect(response.status).toBe(302);
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

      const request = new NextRequest('https://example.com/contractor/dashboard', {
        headers: {
          cookie: 'mintenance-auth=valid-jwt-token',
        },
      });

      const response = await middleware(request);
      
      expect(response.status).toBe(200);
    });

    it('should redirect contractor from homeowner routes', async () => {
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
      
      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toContain('/contractor/dashboard');
    });
  });
});