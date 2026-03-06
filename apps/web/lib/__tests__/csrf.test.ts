// globals: true in vitest.config — do not import from 'vitest' directly (breaks in v4)
/**
 * CSRF Protection Tests
 * Tests CSRF token validation and generation
 */

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
    getRandomValues: vi.fn((array) => {
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
      return array;
    })
  }
});

// In non-production (NODE_ENV=test), the CSRF cookie name is 'csrf-token'
const CSRF_COOKIE_NAME = 'csrf-token';

/**
 * Helper to create a NextRequest with CSRF cookie properly set.
 * happy-dom strips cookie headers, so we spy on request.cookies.get
 * to match how validateCSRF actually reads cookies.
 */
function createRequestWithCookies(
  url: string,
  options: { method: string; headers?: Record<string, string> }
): NextRequest {
  const { headers = {} } = options;
  const cookieValue = headers['cookie'];
  // Remove cookie from headers passed to NextRequest (happy-dom strips it anyway)
  const { cookie: _cookie, ...otherHeaders } = headers;

  const request = new NextRequest(url, {
    method: options.method,
    headers: otherHeaders,
  });

  // Spy on request.cookies.get to return the CSRF token value
  // This matches how validateCSRF reads cookies (via request.cookies API)
  if (cookieValue !== undefined) {
    const cookies = parseCookieString(cookieValue);
    const originalGet = request.cookies.get.bind(request.cookies);
    vi.spyOn(request.cookies, 'get').mockImplementation((name: string) => {
      if (cookies[name] !== undefined) {
        return { name, value: cookies[name] };
      }
      return originalGet(name);
    });
  }

  return request;
}

/** Parse a cookie string into key-value pairs */
function parseCookieString(str: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!str) return result;
  str.split(';').forEach(part => {
    const [name, ...rest] = part.trim().split('=');
    if (name) result[name] = rest.join('=');
  });
  return result;
}

describe('CSRF Protection', () => {
  const validToken = 'valid-csrf-token-12345';
  const invalidToken = 'invalid-csrf-token-67890';

  describe('validateCSRF', () => {
    it('should validate CSRF token for POST requests', async () => {
      const request = createRequestWithCookies('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          'x-csrf-token': validToken,
          'cookie': `${CSRF_COOKIE_NAME}=${validToken}`
        }
      });

      const isValid = await validateCSRF(request);
      expect(isValid).toBe(true);
    });

    it('should validate CSRF token for PUT requests', async () => {
      const request = createRequestWithCookies('http://localhost:3000/api/test', {
        method: 'PUT',
        headers: {
          'x-csrf-token': validToken,
          'cookie': `${CSRF_COOKIE_NAME}=${validToken}`
        }
      });

      const isValid = await validateCSRF(request);
      expect(isValid).toBe(true);
    });

    it('should validate CSRF token for DELETE requests', async () => {
      const request = createRequestWithCookies('http://localhost:3000/api/test', {
        method: 'DELETE',
        headers: {
          'x-csrf-token': validToken,
          'cookie': `${CSRF_COOKIE_NAME}=${validToken}`
        }
      });

      const isValid = await validateCSRF(request);
      expect(isValid).toBe(true);
    });

    it('should validate CSRF token for PATCH requests', async () => {
      const request = createRequestWithCookies('http://localhost:3000/api/test', {
        method: 'PATCH',
        headers: {
          'x-csrf-token': validToken,
          'cookie': `${CSRF_COOKIE_NAME}=${validToken}`
        }
      });

      const isValid = await validateCSRF(request);
      expect(isValid).toBe(true);
    });

    it('should skip validation for GET requests', async () => {
      const request = createRequestWithCookies('http://localhost:3000/api/test', {
        method: 'GET',
        headers: {
          'x-csrf-token': validToken,
          'cookie': `${CSRF_COOKIE_NAME}=${validToken}`
        }
      });

      const isValid = await validateCSRF(request);
      expect(isValid).toBe(true);
    });

    it('should skip validation for HEAD requests', async () => {
      const request = createRequestWithCookies('http://localhost:3000/api/test', {
        method: 'HEAD',
        headers: {
          'x-csrf-token': validToken,
          'cookie': `${CSRF_COOKIE_NAME}=${validToken}`
        }
      });

      const isValid = await validateCSRF(request);
      expect(isValid).toBe(true);
    });

    it('should fail when header token is missing', async () => {
      const request = createRequestWithCookies('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          'cookie': `${CSRF_COOKIE_NAME}=${validToken}`
        }
      });

      const isValid = await validateCSRF(request);
      expect(isValid).toBe(false);
    });

    it('should fail when cookie token is missing', async () => {
      const request = createRequestWithCookies('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          'x-csrf-token': validToken
        }
      });

      const isValid = await validateCSRF(request);
      expect(isValid).toBe(false);
    });

    it('should fail when tokens do not match', async () => {
      const request = createRequestWithCookies('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          'x-csrf-token': validToken,
          'cookie': `${CSRF_COOKIE_NAME}=${invalidToken}`
        }
      });

      const isValid = await validateCSRF(request);
      expect(isValid).toBe(false);
    });

    it('should fail when both tokens are missing', async () => {
      const request = createRequestWithCookies('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {}
      });

      const isValid = await validateCSRF(request);
      expect(isValid).toBe(false);
    });

    it('should handle malformed cookie header', async () => {
      const request = createRequestWithCookies('http://localhost:3000/api/test', {
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
      const request = createRequestWithCookies('http://localhost:3000/api/test', {
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
      const request = createRequestWithCookies('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          'x-csrf-token': validToken,
          'cookie': `session=abc123; ${CSRF_COOKIE_NAME}=${validToken}; other=value`
        }
      });

      const isValid = await validateCSRF(request);
      expect(isValid).toBe(true);
    });
  });

  describe('requireCSRF', () => {
    it('should not throw for valid CSRF token', async () => {
      const request = createRequestWithCookies('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          'x-csrf-token': validToken,
          'cookie': `${CSRF_COOKIE_NAME}=${validToken}`
        }
      });

      await expect(requireCSRF(request)).resolves.not.toThrow();
    });

    it('should throw for invalid CSRF token', async () => {
      const request = createRequestWithCookies('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          'x-csrf-token': validToken,
          'cookie': `${CSRF_COOKIE_NAME}=${invalidToken}`
        }
      });

      await expect(requireCSRF(request)).rejects.toThrow('CSRF validation failed');
    });

    it('should not throw for GET requests', async () => {
      const request = createRequestWithCookies('http://localhost:3000/api/test', {
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
      expect(setCookieHeader).toContain(`${CSRF_COOKIE_NAME}=${token}`);
      expect(setCookieHeader).toContain('HttpOnly');
      // In test env (NODE_ENV=test), Secure flag is not set (only in production)
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
      expect(result.headers.get('Set-Cookie')).toContain(`${CSRF_COOKIE_NAME}=${token}`);
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
      const request = createRequestWithCookies('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          'x-csrf-token': '',
          'cookie': `${CSRF_COOKIE_NAME}=`
        }
      });

      const isValid = await validateCSRF(request);
      expect(isValid).toBe(false);
    });

    it('should handle whitespace in tokens', async () => {
      const request = createRequestWithCookies('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          'x-csrf-token': ` ${validToken} `,
          'cookie': `${CSRF_COOKIE_NAME}=${validToken}`
        }
      });

      const isValid = await validateCSRF(request);
      expect(isValid).toBe(false);
    });
  });
});
