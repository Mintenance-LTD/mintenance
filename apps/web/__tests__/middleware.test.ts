/**
 * Middleware Security Tests
 * Tests critical security functionality in Next.js middleware
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { NextRequest, NextResponse } from 'next/server';
import { middleware } from '../middleware';

// Mock dependencies
jest.mock('@mintenance/auth', () => ({
  verifyJWT: jest.fn(),
  ConfigManager: jest.fn(() => ({
    getRequired: jest.fn(() => 'test-jwt-secret'),
    isProduction: jest.fn(() => false),
  })),
}));

jest.mock('@mintenance/shared', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('Middleware Security', () => {
  const mockVerifyJWT = require('@mintenance/auth').verifyJWT;
  const mockLogger = require('@mintenance/shared').logger;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
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
          cookie: '__Host-mintenance-auth=valid-jwt-token',
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
          cookie: '__Host-mintenance-auth=invalid-jwt-token',
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
          cookie: '__Host-mintenance-auth=expired-jwt-token',
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
          cookie: '__Host-mintenance-auth=valid-jwt-token; __Host-csrf-token=csrf-token-123',
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
          cookie: '__Host-mintenance-auth=valid-jwt-token',
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
          cookie: '__Host-mintenance-auth=valid-jwt-token; __Host-csrf-token=csrf-token-123',
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
          cookie: '__Host-mintenance-auth=valid-jwt-token',
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
          cookie: '__Host-mintenance-auth=valid-jwt-token',
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
          cookie: '__Host-mintenance-auth=valid-jwt-token',
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
          cookie: '__Host-mintenance-auth=valid-jwt-token',
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
          cookie: '__Host-mintenance-auth=invalid-jwt-token',
        },
      });

      const response = await middleware(request);
      
      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toContain('/login');
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle missing configuration gracefully', async () => {
      const ConfigManager = require('@mintenance/auth').ConfigManager;
      ConfigManager.mockImplementation(() => ({
        getRequired: jest.fn(() => {
          throw new Error('Missing JWT_SECRET');
        }),
        isProduction: jest.fn(() => false),
      }));

      const request = new NextRequest('https://example.com/dashboard', {
        headers: {
          cookie: '__Host-mintenance-auth=valid-jwt-token',
        },
      });

      const response = await middleware(request);
      
      expect(response.status).toBe(503);
    });
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
          cookie: '__Host-mintenance-auth=valid-jwt-token',
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
          cookie: '__Host-mintenance-auth=valid-jwt-token',
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
          cookie: '__Host-mintenance-auth=valid-jwt-token',
        },
      });

      const response = await middleware(request);
      
      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toContain('/contractor/dashboard');
    });
  });
});