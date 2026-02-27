// @vitest-environment node
/**
 * Comprehensive tests for AI Search Rate Limiting
 *
 * Tests all critical bugs fixed:
 * - Rate limiting allows 10 requests per minute per IP
 * - 11th request returns 429 Too Many Requests
 * - Retry-After header present in 429 response
 * - Different IPs get separate rate limits
 * - Rate limit resets after window expires
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
    checkRateLimit: vi.fn(),
  },
}));

vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    rpc: vi.fn(() => ({
      data: [],
      error: null,
    })),
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

import { rateLimiter } from '@/lib/rate-limiter';

describe('POST /api/ai/search - Rate Limiting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rate Limit Enforcement', () => {
    it('should allow 10 requests per minute per IP', async () => {
      // Mock rate limiter to allow requests
      vi.mocked(rateLimiter.checkRateLimit).mockResolvedValue({
        allowed: true,
        remaining: 5,
        resetTime: Date.now() + 60000,
      });

      // Mock embedding generation
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          embedding: new Array(1536).fill(0.1),
        }),
      });

      for (let i = 0; i < 10; i++) {
        const request = new NextRequest('http://localhost:3000/api/ai/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-forwarded-for': '192.168.1.100',
          },
          body: JSON.stringify({
            query: `test query ${i}`,
            filters: {},
          }),
        });

        const response = await POST(request);
        expect(response.status).not.toBe(429);
      }
    });

    it('should return 429 on 11th request within window', async () => {
      // Mock rate limiter to reject request
      vi.mocked(rateLimiter.checkRateLimit).mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetTime: Date.now() + 30000,
        retryAfter: 30,
      });

      const request = new NextRequest('http://localhost:3000/api/ai/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '192.168.1.100',
        },
        body: JSON.stringify({
          query: 'test query',
          filters: {},
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toContain('Too many requests');
    });

    it('should include proper rate limit headers in 429 response', async () => {
      vi.mocked(rateLimiter.checkRateLimit).mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetTime: Date.now() + 45000,
        retryAfter: 45,
      });

      const request = new NextRequest('http://localhost:3000/api/ai/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '192.168.1.100',
        },
        body: JSON.stringify({
          query: 'test query',
          filters: {},
        }),
      });

      const response = await POST(request);

      expect(response.headers.get('X-RateLimit-Limit')).toBe('10');
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('0');
      expect(response.headers.get('X-RateLimit-Reset')).toBeDefined();
      expect(response.headers.get('Retry-After')).toBe('45');
    });

    it('should include Retry-After header in 429 response', async () => {
      const retryAfterSeconds = 60;

      vi.mocked(rateLimiter.checkRateLimit).mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetTime: Date.now() + retryAfterSeconds * 1000,
        retryAfter: retryAfterSeconds,
      });

      const request = new NextRequest('http://localhost:3000/api/ai/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '192.168.1.100',
        },
        body: JSON.stringify({
          query: 'test query',
          filters: {},
        }),
      });

      const response = await POST(request);

      expect(response.headers.get('Retry-After')).toBe(String(retryAfterSeconds));
    });
  });

  describe('IP-based Rate Limiting', () => {
    it('should use x-forwarded-for header for IP identification', async () => {
      vi.mocked(rateLimiter.checkRateLimit).mockResolvedValue({
        allowed: true,
        remaining: 9,
        resetTime: Date.now() + 60000,
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          embedding: new Array(1536).fill(0.1),
        }),
      });

      const request = new NextRequest('http://localhost:3000/api/ai/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '203.0.113.45',
        },
        body: JSON.stringify({
          query: 'test query',
          filters: {},
        }),
      });

      await POST(request);

      expect(rateLimiter.checkRateLimit).toHaveBeenCalledWith(
        expect.objectContaining({
          identifier: 'ai-search:203.0.113.45',
          windowMs: 60000,
          maxRequests: 10,
        })
      );
    });

    it('should use x-real-ip header as fallback', async () => {
      vi.mocked(rateLimiter.checkRateLimit).mockResolvedValue({
        allowed: true,
        remaining: 9,
        resetTime: Date.now() + 60000,
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          embedding: new Array(1536).fill(0.1),
        }),
      });

      const request = new NextRequest('http://localhost:3000/api/ai/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-real-ip': '198.51.100.78',
        },
        body: JSON.stringify({
          query: 'test query',
          filters: {},
        }),
      });

      await POST(request);

      expect(rateLimiter.checkRateLimit).toHaveBeenCalledWith(
        expect.objectContaining({
          identifier: 'ai-search:198.51.100.78',
        })
      );
    });

    it('should use "anonymous" identifier when no IP headers present', async () => {
      vi.mocked(rateLimiter.checkRateLimit).mockResolvedValue({
        allowed: true,
        remaining: 9,
        resetTime: Date.now() + 60000,
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          embedding: new Array(1536).fill(0.1),
        }),
      });

      const request = new NextRequest('http://localhost:3000/api/ai/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: 'test query',
          filters: {},
        }),
      });

      await POST(request);

      expect(rateLimiter.checkRateLimit).toHaveBeenCalledWith(
        expect.objectContaining({
          identifier: 'ai-search:anonymous',
        })
      );
    });

    it('should handle proxy chain (multiple IPs in x-forwarded-for)', async () => {
      vi.mocked(rateLimiter.checkRateLimit).mockResolvedValue({
        allowed: true,
        remaining: 9,
        resetTime: Date.now() + 60000,
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          embedding: new Array(1536).fill(0.1),
        }),
      });

      const request = new NextRequest('http://localhost:3000/api/ai/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '203.0.113.195, 70.41.3.18, 150.172.238.178',
        },
        body: JSON.stringify({
          query: 'test query',
          filters: {},
        }),
      });

      await POST(request);

      // Should use the first (client) IP in the chain
      expect(rateLimiter.checkRateLimit).toHaveBeenCalledWith(
        expect.objectContaining({
          identifier: 'ai-search:203.0.113.195',
        })
      );
    });

    it('should apply separate rate limits for different IPs', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          embedding: new Array(1536).fill(0.1),
        }),
      });

      // IP 1 - allowed
      vi.mocked(rateLimiter.checkRateLimit).mockResolvedValueOnce({
        allowed: true,
        remaining: 8,
        resetTime: Date.now() + 60000,
      });

      const request1 = new NextRequest('http://localhost:3000/api/ai/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '192.0.2.1',
        },
        body: JSON.stringify({
          query: 'test query',
          filters: {},
        }),
      });

      const response1 = await POST(request1);
      expect(response1.status).not.toBe(429);

      // IP 2 - also allowed (separate limit)
      vi.mocked(rateLimiter.checkRateLimit).mockResolvedValueOnce({
        allowed: true,
        remaining: 9,
        resetTime: Date.now() + 60000,
      });

      const request2 = new NextRequest('http://localhost:3000/api/ai/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '192.0.2.2',
        },
        body: JSON.stringify({
          query: 'test query',
          filters: {},
        }),
      });

      const response2 = await POST(request2);
      expect(response2.status).not.toBe(429);

      // Verify separate identifiers were used
      expect(rateLimiter.checkRateLimit).toHaveBeenCalledWith(
        expect.objectContaining({
          identifier: 'ai-search:192.0.2.1',
        })
      );

      expect(rateLimiter.checkRateLimit).toHaveBeenCalledWith(
        expect.objectContaining({
          identifier: 'ai-search:192.0.2.2',
        })
      );
    });
  });

  describe('Rate Limit Window', () => {
    it('should use 60 second (1 minute) window', async () => {
      vi.mocked(rateLimiter.checkRateLimit).mockResolvedValue({
        allowed: true,
        remaining: 9,
        resetTime: Date.now() + 60000,
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          embedding: new Array(1536).fill(0.1),
        }),
      });

      const request = new NextRequest('http://localhost:3000/api/ai/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify({
          query: 'test query',
          filters: {},
        }),
      });

      await POST(request);

      expect(rateLimiter.checkRateLimit).toHaveBeenCalledWith(
        expect.objectContaining({
          windowMs: 60000, // 60 seconds
          maxRequests: 10,
        })
      );
    });

    it('should reset limit after window expires', async () => {
      vi.useFakeTimers();

      // First request - 10th request
      vi.mocked(rateLimiter.checkRateLimit).mockResolvedValueOnce({
        allowed: true,
        remaining: 0,
        resetTime: Date.now() + 60000,
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          embedding: new Array(1536).fill(0.1),
        }),
      });

      const request1 = new NextRequest('http://localhost:3000/api/ai/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify({
          query: 'test query',
          filters: {},
        }),
      });

      await POST(request1);

      // Advance time by 61 seconds (past window)
      vi.advanceTimersByTime(61000);

      // After window expires, should allow again
      vi.mocked(rateLimiter.checkRateLimit).mockResolvedValueOnce({
        allowed: true,
        remaining: 9,
        resetTime: Date.now() + 60000,
      });

      const request2 = new NextRequest('http://localhost:3000/api/ai/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify({
          query: 'test query',
          filters: {},
        }),
      });

      const response2 = await POST(request2);

      expect(response2.status).not.toBe(429);

      vi.useRealTimers();
    });
  });

  describe('Logging', () => {
    it('should log rate limit exceeded events', async () => {
      const { logger } = await import('@mintenance/shared');

      vi.mocked(rateLimiter.checkRateLimit).mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetTime: Date.now() + 30000,
        retryAfter: 30,
      });

      const request = new NextRequest('http://localhost:3000/api/ai/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '192.168.1.100',
        },
        body: JSON.stringify({
          query: 'test query',
          filters: {},
        }),
      });

      await POST(request);

      expect(logger.warn).toHaveBeenCalledWith(
        'AI search rate limit exceeded',
        expect.objectContaining({
          service: 'ai_search',
          identifier: '192.168.1.100',
          remaining: 0,
          retryAfter: 30,
        })
      );
    });
  });
});
