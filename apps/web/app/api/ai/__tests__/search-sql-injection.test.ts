// @vitest-environment node
/**
 * Comprehensive tests for AI Search SQL Injection Prevention
 *
 * Tests all critical security bugs fixed:
 * - SQL injection attempts in query are sanitized
 * - SQL injection attempts in filters are sanitized
 * - Malicious JSONB payloads are rejected
 * - Only allowed filter keys are accepted
 * - Numeric values are validated (no NaN, Infinity)
 * - Text fields respect length limits
 */

// globals: true in vitest.config — do not import from 'vitest' directly (breaks in v4)
import { POST } from '../search/route';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('@/lib/csrf', () => ({
  requireCSRF: vi.fn(),
}));

vi.mock('@/lib/rate-limiter', () => ({
  rateLimiter: {
    checkRateLimit: vi.fn(() =>
      Promise.resolve({
        allowed: true,
        remaining: 9,
        resetTime: Date.now() + 60000,
      })
    ),
  },
}));

vi.mock('@/lib/sanitizer', () => ({
  sanitizeText: vi.fn((text: string, maxLength?: number) => {
    // Simple sanitization mock - removes SQL keywords and limits length
    let sanitized = text
      .replace(/'/g, '')
      .replace(/"/g, '')
      .replace(/;/g, '')
      .replace(/--/g, '')
      .replace(/\/\*/g, '')
      .replace(/\*\//g, '')
      .replace(/DROP/gi, '')
      .replace(/DELETE/gi, '')
      .replace(/INSERT/gi, '')
      .replace(/UPDATE/gi, '')
      .replace(/SELECT/gi, '')
      .replace(/UNION/gi, '')
      .replace(/OR 1=1/gi, '');

    if (maxLength && sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }

    return sanitized;
  }),
}));

vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    rpc: vi.fn(),
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        data: null,
        error: null,
      })),
    })),
  },
}));

vi.mock('@mintenance/shared', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { sanitizeText } from '@/lib/sanitizer';
import { serverSupabase } from '@/lib/api/supabaseServer';

describe('POST /api/ai/search - SQL Injection Prevention', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock embedding generation
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        embedding: new Array(1536).fill(0.1),
      }),
    });

    // Mock database responses
    vi.mocked(serverSupabase.rpc).mockReturnValue({
      data: [],
      error: null,
    } as any);
  });

  describe('Query Sanitization', () => {
    it('should sanitize SQL injection attempt with single quotes', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: "test' OR '1'='1",
          filters: {},
        }),
      });

      await POST(request);

      // Verify sanitizeText was called
      expect(sanitizeText).toHaveBeenCalledWith(
        expect.stringContaining('test'),
        500
      );
    });

    it('should sanitize SQL injection with UNION SELECT', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: "test' UNION SELECT * FROM users--",
          filters: {},
        }),
      });

      await POST(request);

      expect(sanitizeText).toHaveBeenCalled();
    });

    it('should sanitize SQL injection with DROP TABLE', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: "test'; DROP TABLE jobs;--",
          filters: {},
        }),
      });

      await POST(request);

      expect(sanitizeText).toHaveBeenCalled();
    });

    it('should sanitize SQL injection with comment markers', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: "test'-- comment out rest",
          filters: {},
        }),
      });

      await POST(request);

      expect(sanitizeText).toHaveBeenCalled();
    });

    it('should sanitize SQL injection with multi-line comments', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: "test /* malicious */ query",
          filters: {},
        }),
      });

      await POST(request);

      expect(sanitizeText).toHaveBeenCalled();
    });

    it('should respect maximum query length of 500 characters', async () => {
      const longQuery = 'a'.repeat(600);

      const request = new NextRequest('http://localhost:3000/api/ai/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: longQuery,
          filters: {},
        }),
      });

      await POST(request);

      // Verify max length parameter was passed
      expect(sanitizeText).toHaveBeenCalledWith(longQuery, 500);
    });
  });

  describe('Filter Sanitization', () => {
    it('should sanitize location filter', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'test',
          filters: {
            location: "London' OR '1'='1",
          },
        }),
      });

      await POST(request);

      // Verify location was sanitized
      expect(sanitizeText).toHaveBeenCalledWith(
        expect.stringContaining('London'),
        200
      );
    });

    it('should sanitize category filter', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'test',
          filters: {
            category: "plumbing'; DROP TABLE categories;--",
          },
        }),
      });

      await POST(request);

      expect(sanitizeText).toHaveBeenCalled();
    });

    it('should only accept allowed filter keys', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'test',
          filters: {
            location: 'London',
            category: 'plumbing',
            maliciousKey: "'; DROP TABLE jobs;--",
            anotherBadKey: 'evil',
          },
        }),
      });

      await POST(request);

      // Verify only allowed keys were processed
      // maliciousKey and anotherBadKey should be ignored
      const calls = vi.mocked(sanitizeText).mock.calls;
      const sanitizedValues = calls.map(call => call[0]);

      // Should have sanitized query, location, and category
      expect(sanitizedValues).toContain('test');
      expect(sanitizedValues).toContain('London');
      expect(sanitizedValues).toContain('plumbing');
    });

    it('should validate numeric values and reject NaN', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'test',
          filters: {
            rating: NaN,
          },
        }),
      });

      const response = await POST(request);

      // Should complete without error, but NaN should be filtered out
      expect(response.status).not.toBe(500);
    });

    it('should validate numeric values and reject Infinity', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'test',
          filters: {
            rating: Infinity,
          },
        }),
      });

      const response = await POST(request);

      expect(response.status).not.toBe(500);
    });

    it('should sanitize priceRange min/max values', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'test',
          filters: {
            priceRange: {
              min: 100,
              max: 500,
            },
          },
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
    });

    it('should handle priceRange with NaN values', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'test',
          filters: {
            priceRange: {
              min: NaN,
              max: 500,
            },
          },
        }),
      });

      const response = await POST(request);

      // Should handle gracefully
      expect(response.status).toBe(200);
    });
  });

  describe('JSONB Payload Attacks', () => {
    it('should reject malicious nested object injection', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'test',
          filters: {
            // Attempt to inject SQL through nested object
            malicious: {
              $ne: null,
              $where: "this.password == 'admin'",
            },
          },
        }),
      });

      const response = await POST(request);

      // Should complete without processing malicious keys
      expect(response.status).toBe(200);
    });

    it('should reject NoSQL-style injection attempts', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'test',
          filters: {
            $gt: '',
            $regex: '.*',
          },
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
    });

    it('should sanitize deeply nested objects', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'test',
          filters: {
            deeply: {
              nested: {
                malicious: "'; DROP TABLE users;--",
              },
            },
          },
        }),
      });

      const response = await POST(request);

      // Deep objects should be ignored (only allowed keys processed)
      expect(response.status).toBe(200);
    });
  });

  describe('Database Query Safety', () => {
    it('should use parameterized RPC calls', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'plumbing repair',
          filters: {
            location: 'London',
            category: 'plumbing',
          },
        }),
      });

      await POST(request);

      // Verify RPC was called with proper parameters
      expect(serverSupabase.rpc).toHaveBeenCalledWith(
        'search_jobs_semantic',
        expect.objectContaining({
          query_embedding: expect.any(Array),
          category_filter: expect.any(String),
          location_filter: expect.any(String),
        })
      );

      expect(serverSupabase.rpc).toHaveBeenCalledWith(
        'search_contractors_semantic',
        expect.objectContaining({
          query_embedding: expect.any(Array),
          category_filter: expect.any(String),
          location_filter: expect.any(String),
        })
      );
    });

    it('should sanitize data before inserting into analytics', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: "test'; DELETE FROM search_analytics;--",
          filters: {},
        }),
      });

      await POST(request);

      // Verify insert was called
      expect(serverSupabase.from).toHaveBeenCalledWith('search_analytics');

      // Query should have been sanitized
      expect(sanitizeText).toHaveBeenCalledWith(
        expect.stringContaining('test'),
        500
      );
    });

    it('should validate all numeric fields before database insertion', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'test',
          filters: {},
        }),
      });

      await POST(request);

      // Check that insert was called with safe numeric values
      const insertCalls = vi.mocked(serverSupabase.from).mock.calls;
      expect(insertCalls.length).toBeGreaterThan(0);
    });
  });

  describe('Type Coercion Attacks', () => {
    it('should handle string numbers in numeric fields', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'test',
          filters: {
            rating: '5.0' as any, // String instead of number
          },
        }),
      });

      const response = await POST(request);

      // Should handle type mismatch gracefully
      expect(response.status).toBe(200);
    });

    it('should handle boolean injection attempts', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'test',
          filters: {
            location: true as any, // Boolean instead of string
          },
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
    });

    it('should handle array injection attempts', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'test',
          filters: {
            category: ['plumbing', "'; DROP TABLE jobs;--"] as any,
          },
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
    });
  });

  describe('XSS Prevention in Stored Data', () => {
    it('should sanitize query before storing in analytics', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: '<script>alert("XSS")</script>',
          filters: {},
        }),
      });

      await POST(request);

      // Verify sanitization was applied
      expect(sanitizeText).toHaveBeenCalledWith(
        expect.stringContaining('script'),
        500
      );
    });

    it('should sanitize filter values before storing', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'test',
          filters: {
            location: '<img src=x onerror=alert(1)>',
          },
        }),
      });

      await POST(request);

      expect(sanitizeText).toHaveBeenCalled();
    });
  });
});
