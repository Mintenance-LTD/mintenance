/**
 * Rate Limiting Test Suite
 * Tests the comprehensive rate limiting implementation
 */

// globals: true in vitest.config — do not import from 'vitest' directly (breaks in v4)
import { EnhancedRateLimiter } from '@/lib/rate-limiter-enhanced';
import { getRateLimitConfig, getUserTier, shouldBypassRateLimit } from '@/lib/constants/rate-limits';
import type { NextRequest } from 'next/server';

// Mock NextRequest
function createMockRequest(
  path: string,
  headers: Record<string, string> = {}
): NextRequest {
  const url = `http://localhost:3000${path}`;
  const request = new Request(url, {
    method: 'GET',
    headers: new Headers(headers),
  });
  return request as unknown as NextRequest;
}

describe('Rate Limiting Configuration', () => {
  it('should return correct config for login endpoint', () => {
    const config = getRateLimitConfig('/api/auth/login');
    expect(config.windowMs).toBe(15 * 60 * 1000); // 15 minutes
    expect(config.max.anonymous).toBe(5);
    expect(config.max.authenticated).toBe(10);
    expect(config.max.admin).toBe(20);
  });

  it('should return correct config for payment endpoints', () => {
    const config = getRateLimitConfig('/api/payments/create');
    expect(config.max.anonymous).toBe(0); // No anonymous payments
    expect(config.max.authenticated).toBe(10);
  });

  it('should return correct config for AI endpoints', () => {
    const config = getRateLimitConfig('/api/ai/search');
    expect(config.max.anonymous).toBe(5);
    expect(config.max.authenticated).toBe(20);
  });

  it('should match wildcard patterns', () => {
    const mfaConfig = getRateLimitConfig('/api/auth/mfa/verify');
    expect(mfaConfig.max.anonymous).toBe(5);

    const jobConfig = getRateLimitConfig('/api/jobs/123');
    expect(jobConfig.max.authenticated).toBe(100);
  });

  it('should return default config for unknown paths', () => {
    const config = getRateLimitConfig('/api/unknown/endpoint');
    expect(config.max.anonymous).toBe(20);
    expect(config.max.authenticated).toBe(100);
  });
});

describe('User Tier Detection', () => {
  it('should return anonymous for no user', () => {
    expect(getUserTier()).toBe('anonymous');
    expect(getUserTier(undefined)).toBe('anonymous');
  });

  it('should return admin for admin users', () => {
    expect(getUserTier({ role: 'admin' })).toBe('admin');
  });

  it('should return premium for premium users', () => {
    expect(getUserTier({ premium: true })).toBe('premium');
  });

  it('should return authenticated for regular users', () => {
    expect(getUserTier({ role: 'user' })).toBe('authenticated');
    expect(getUserTier({})).toBe('authenticated');
  });
});

describe('Rate Limit Bypass Rules', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should bypass for health check user agents', () => {
    const request = createMockRequest('/api/health', {
      'user-agent': 'UptimeRobot/2.0',
    });
    expect(shouldBypassRateLimit(request)).toBe(true);
  });

  it('should bypass for whitelisted IPs', async () => {
    process.env.RATE_LIMIT_WHITELIST_IPS = '192.168.1.1,10.0.0.1';
    vi.resetModules();

    // Dynamic import to pick up the new env vars at module evaluation time
    const { shouldBypassRateLimit: freshBypass } = await import('@/lib/constants/rate-limits');

    const request = createMockRequest('/api/test', {
      'x-forwarded-for': '192.168.1.1',
    });
    expect(freshBypass(request)).toBe(true);
  });

  it('should bypass for internal service tokens', async () => {
    process.env.INTERNAL_SERVICE_TOKENS = 'secret-token-1,secret-token-2';
    vi.resetModules();

    // Dynamic import to pick up the new env vars at module evaluation time
    const { shouldBypassRateLimit: freshBypass } = await import('@/lib/constants/rate-limits');

    const request = createMockRequest('/api/internal', {
      'x-service-token': 'secret-token-1',
    });
    expect(freshBypass(request)).toBe(true);
  });

  it('should not bypass for regular requests', () => {
    const request = createMockRequest('/api/test', {
      'user-agent': 'Mozilla/5.0',
      'x-forwarded-for': '1.2.3.4',
    });
    expect(shouldBypassRateLimit(request)).toBe(false);
  });
});

describe('Enhanced Rate Limiter', () => {
  let rateLimiter: EnhancedRateLimiter;

  beforeEach(() => {
    rateLimiter = new EnhancedRateLimiter();
  });

  it('should allow requests within limit', async () => {
    const request = createMockRequest('/api/test');
    const result = await rateLimiter.checkLimit(request);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBeGreaterThan(0);
  });

  it('should block requests over limit', async () => {
    const request = createMockRequest('/api/auth/login');

    // Simulate multiple requests
    for (let i = 0; i < 5; i++) {
      await rateLimiter.checkLimit(request, { identifier: 'test-user' });
    }

    const result = await rateLimiter.checkLimit(request, { identifier: 'test-user' });
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfter).toBeGreaterThan(0);
  });

  it('should apply different limits for different tiers', async () => {
    const request = createMockRequest('/api/messages/send');

    // Anonymous user
    const anonResult = await rateLimiter.checkLimit(request, {
      tier: 'anonymous',
      identifier: 'anon-1',
    });
    expect(anonResult.limit).toBe(0); // No anonymous messaging

    // Authenticated user
    const authResult = await rateLimiter.checkLimit(request, {
      tier: 'authenticated',
      identifier: 'user-1',
    });
    expect(authResult.limit).toBe(30);

    // Admin user
    const adminResult = await rateLimiter.checkLimit(request, {
      tier: 'admin',
      identifier: 'admin-1',
    });
    expect(adminResult.limit).toBe(100);
  });

  it('should create proper rate limit headers', () => {
    const result = {
      allowed: true,
      limit: 100,
      remaining: 95,
      resetTime: Date.now() + 60000,
      tier: 'authenticated' as const,
    };

    const headers = rateLimiter.createHeaders(result);

    expect(headers['RateLimit-Limit']).toBe('100');
    expect(headers['RateLimit-Remaining']).toBe('95');
    expect(headers['X-RateLimit-Limit']).toBe('100'); // Legacy header
    expect(headers['X-RateLimit-Remaining']).toBe('95');
  });

  it('should include Retry-After header when rate limited', () => {
    const result = {
      allowed: false,
      limit: 100,
      remaining: 0,
      resetTime: Date.now() + 60000,
      retryAfter: 60,
      tier: 'authenticated' as const,
    };

    const headers = rateLimiter.createHeaders(result);

    expect(headers['Retry-After']).toBe('60');
  });
});

describe('Rate Limiting for Specific Endpoints', () => {
  let rateLimiter: EnhancedRateLimiter;

  beforeEach(() => {
    rateLimiter = new EnhancedRateLimiter();
  });

  it('should enforce strict limits on authentication endpoints', async () => {
    const loginRequest = createMockRequest('/api/auth/login');
    const config = getRateLimitConfig('/api/auth/login');

    // Check that config is strict
    expect(config.max.anonymous).toBeLessThanOrEqual(5);
    expect(config.handler).toBe('block');
  });

  it('should prevent anonymous access to payment endpoints', async () => {
    const paymentRequest = createMockRequest('/api/payments/create');
    const result = await rateLimiter.checkLimit(paymentRequest, {
      tier: 'anonymous',
    });

    expect(result.allowed).toBe(false);
    expect(result.limit).toBe(0);
  });

  it('should allow higher limits for read-only endpoints', async () => {
    const searchRequest = createMockRequest('/api/contractors');
    const config = getRateLimitConfig('/api/contractors');

    expect(config.max.anonymous).toBeGreaterThanOrEqual(30);
    expect(config.max.authenticated).toBeGreaterThanOrEqual(200);
  });

  it('should have special handling for webhooks', () => {
    const config = getRateLimitConfig('/api/webhooks/stripe');

    expect(config.skipFailedRequests).toBe(true); // Don't count validation failures
    expect(config.standardHeaders).toBe(false); // Webhooks don't need headers
  });

  it('should have relaxed limits for health checks', () => {
    const config = getRateLimitConfig('/api/health');

    expect(config.max.anonymous).toBeGreaterThanOrEqual(1000);
    expect(config.skipSuccessfulRequests).toBe(true);
  });
});

describe('Security Event Logging', () => {
  it('should log rate limit violations', async () => {
    const logSpy = vi.spyOn(console, 'warn');
    const rateLimiter = new EnhancedRateLimiter();
    const request = createMockRequest('/api/auth/login');

    // Exceed rate limit
    for (let i = 0; i < 10; i++) {
      await rateLimiter.checkLimit(request, {
        identifier: 'test-violator',
        tier: 'anonymous',
      });
    }

    // Check that violation was logged (logger formats as a single string)
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('Rate limit exceeded')
    );

    logSpy.mockRestore();
  });
});

describe('Rate Limiter Reset Functionality', () => {
  it('should reset rate limits for specific identifier', async () => {
    const rateLimiter = new EnhancedRateLimiter();
    const request = createMockRequest('/api/test');

    // Exceed limit
    for (let i = 0; i < 25; i++) {
      await rateLimiter.checkLimit(request, {
        identifier: 'reset-test',
        tier: 'anonymous',
      });
    }

    let result = await rateLimiter.checkLimit(request, {
      identifier: 'reset-test',
      tier: 'anonymous',
    });
    expect(result.allowed).toBe(false);

    // Reset the limit
    await rateLimiter.reset('reset-test', '/api/test');

    // Small delay so that expire(key, 0) entry is strictly in the past
    await new Promise(resolve => setTimeout(resolve, 2));

    // Should be allowed again
    result = await rateLimiter.checkLimit(request, {
      identifier: 'reset-test',
      tier: 'anonymous',
    });
    expect(result.allowed).toBe(true);
  });
});