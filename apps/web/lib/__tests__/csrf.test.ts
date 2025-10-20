/**
 * CSRF Protection Tests
 * Tests CSRF token validation and generation
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { 
  validateCSRF, 
  requireCSRF, 
  generateCSRFToken, 
  setCSRFToken 
} from '../csrf';
import { NextRequest } from 'next/server';

// Mock crypto.getRandomValues
Object.defineProperty(global, 'crypto', {
  value: {
    getRandomValues: jest.fn((array) => {
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
      return array;
    })
  }
});

describe('CSRF Protection', () => {
  const validToken = 'valid-csrf-token-12345';
  const invalidToken = 'invalid-csrf-token-67890';

  describe('validateCSRF', () => {
    it('should validate CSRF token for POST requests', async () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          'x-csrf-token': validToken,
          'cookie': `__Host-csrf-token=${validToken}`
        }
      });

      const isValid = await validateCSRF(request);
      expect(isValid).toBe(true);
    });

    it('should validate CSRF token for PUT requests', async () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'PUT',
        headers: {
          'x-csrf-token': validToken,
          'cookie': `__Host-csrf-token=${validToken}`
        }
      });

      const isValid = await validateCSRF(request);
      expect(isValid).toBe(true);
    });

    it('should validate CSRF token for DELETE requests', async () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'DELETE',
        headers: {
          'x-csrf-token': validToken,
          'cookie': `__Host-csrf-token=${validToken}`
        }
      });

      const isValid = await validateCSRF(request);
      expect(isValid).toBe(true);
    });

    it('should validate CSRF token for PATCH requests', async () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'PATCH',
        headers: {
          'x-csrf-token': validToken,
          'cookie': `__Host-csrf-token=${validToken}`
        }
      });

      const isValid = await validateCSRF(request);
      expect(isValid).toBe(true);
    });

    it('should skip validation for GET requests', async () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'GET',
        headers: {
          'x-csrf-token': validToken,
          'cookie': `__Host-csrf-token=${validToken}`
        }
      });

      const isValid = await validateCSRF(request);
      expect(isValid).toBe(true);
    });

    it('should skip validation for HEAD requests', async () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'HEAD',
        headers: {
          'x-csrf-token': validToken,
          'cookie': `__Host-csrf-token=${validToken}`
        }
      });

      const isValid = await validateCSRF(request);
      expect(isValid).toBe(true);
    });

    it('should fail when header token is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          'cookie': `__Host-csrf-token=${validToken}`
        }
      });

      const isValid = await validateCSRF(request);
      expect(isValid).toBe(false);
    });

    it('should fail when cookie token is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          'x-csrf-token': validToken
        }
      });

      const isValid = await validateCSRF(request);
      expect(isValid).toBe(false);
    });

    it('should fail when tokens do not match', async () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          'x-csrf-token': validToken,
          'cookie': `__Host-csrf-token=${invalidToken}`
        }
      });

      const isValid = await validateCSRF(request);
      expect(isValid).toBe(false);
    });

    it('should fail when both tokens are missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {}
      });

      const isValid = await validateCSRF(request);
      expect(isValid).toBe(false);
    });

    it('should handle malformed cookie header', async () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          'x-csrf-token': validToken,
          'cookie': 'malformed-cookie-header'
        }
      });

      const isValid = await validateCSRF(request);
      expect(isValid).toBe(false);
    });

    it('should handle empty cookie header', async () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          'x-csrf-token': validToken,
          'cookie': ''
        }
      });

      const isValid = await validateCSRF(request);
      expect(isValid).toBe(false);
    });

    it('should handle multiple cookies', async () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          'x-csrf-token': validToken,
          'cookie': `session=abc123; __Host-csrf-token=${validToken}; other=value`
        }
      });

      const isValid = await validateCSRF(request);
      expect(isValid).toBe(true);
    });
  });

  describe('requireCSRF', () => {
    it('should not throw for valid CSRF token', async () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          'x-csrf-token': validToken,
          'cookie': `__Host-csrf-token=${validToken}`
        }
      });

      await expect(requireCSRF(request)).resolves.not.toThrow();
    });

    it('should throw for invalid CSRF token', async () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          'x-csrf-token': validToken,
          'cookie': `__Host-csrf-token=${invalidToken}`
        }
      });

      await expect(requireCSRF(request)).rejects.toThrow('CSRF validation failed');
    });

    it('should not throw for GET requests', async () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'GET',
        headers: {}
      });

      await expect(requireCSRF(request)).resolves.not.toThrow();
    });
  });

  describe('generateCSRFToken', () => {
    it('should generate a token', () => {
      const token = generateCSRFToken();
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBe(64); // 32 bytes = 64 hex chars
    });

    it('should generate unique tokens', () => {
      const token1 = generateCSRFToken();
      const token2 = generateCSRFToken();
      
      expect(token1).not.toBe(token2);
    });

    it('should generate tokens with valid hex characters', () => {
      const token = generateCSRFToken();
      const hexPattern = /^[0-9a-f]+$/;
      
      expect(hexPattern.test(token)).toBe(true);
    });
  });

  describe('setCSRFToken', () => {
    it('should set CSRF token in response headers', () => {
      const response = new Response('OK');
      const token = 'test-csrf-token';
      
      const result = setCSRFToken(response, token);
      
      const setCookieHeader = result.headers.get('Set-Cookie');
      expect(setCookieHeader).toContain(`__Host-csrf-token=${token}`);
      expect(setCookieHeader).toContain('HttpOnly');
      expect(setCookieHeader).toContain('Secure');
      expect(setCookieHeader).toContain('SameSite=Strict');
      expect(setCookieHeader).toContain('Path=/');
      expect(setCookieHeader).toContain('Max-Age=3600');
    });

    it('should preserve existing headers', () => {
      const response = new Response('OK', {
        headers: {
          'Content-Type': 'application/json',
          'X-Custom-Header': 'custom-value'
        }
      });
      const token = 'test-csrf-token';
      
      const result = setCSRFToken(response, token);
      
      expect(result.headers.get('Content-Type')).toBe('application/json');
      expect(result.headers.get('X-Custom-Header')).toBe('custom-value');
      expect(result.headers.get('Set-Cookie')).toContain(`__Host-csrf-token=${token}`);
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined headers', async () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST'
      });
      
      // Remove headers to simulate undefined
      Object.defineProperty(request, 'headers', {
        value: undefined,
        writable: true
      });

      const isValid = await validateCSRF(request);
      expect(isValid).toBe(false);
    });

    it('should handle null token values', async () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          'x-csrf-token': '',
          'cookie': '__Host-csrf-token='
        }
      });

      const isValid = await validateCSRF(request);
      expect(isValid).toBe(false);
    });

    it('should handle whitespace in tokens', async () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          'x-csrf-token': ` ${validToken} `,
          'cookie': `__Host-csrf-token=${validToken}`
        }
      });

      const isValid = await validateCSRF(request);
      expect(isValid).toBe(false);
    });
  });
});
