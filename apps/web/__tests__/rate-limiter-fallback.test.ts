/**
 * Rate limiter degraded-mode (Redis down) behaviour.
 *
 * Audit 2026-07-27: the in-memory fallback must NEVER be silently generous.
 *  - criticality-tagged configs fail closed in production (pre-existing)
 *  - untagged configs now get a conservative shared-budget per-instance
 *    limit in production instead of the old 25%/cap-10 allowance
 *  - withApiHandler derives criticality from the route path for mutations
 */

// @vitest-environment node
// (with-api-handler transitively imports server-only modules that throw when
// `window` exists — run under node, these are server primitives anyway)

// globals: true in vitest.config — do not import from 'vitest' directly (breaks in v4)
import { RedisRateLimiter } from '@/lib/rate-limiter';
import {
  buildRateLimitIdentifier,
  resolveRateLimitCriticality,
} from '@/lib/api/with-api-handler';

function freshLimiter(): RedisRateLimiter {
  // Empty Upstash env → constructor takes the in-memory fallback path.
  vi.stubEnv('UPSTASH_REDIS_REST_URL', '');
  vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '');
  return new RedisRateLimiter();
}

describe('RedisRateLimiter degraded fallback', () => {
  beforeEach(() => {
    globalThis.rateLimitFallback = undefined;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    globalThis.rateLimitFallback = undefined;
  });

  it('fails CLOSED in production for criticality-tagged configs (unchanged path)', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const limiter = freshLimiter();

    const result = await limiter.checkRateLimit({
      windowMs: 60_000,
      maxRequests: 30,
      identifier: 'tagged-auth-test',
      criticality: 'auth',
    });

    // Rejected on the very FIRST request — no in-memory allowance at all.
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfter).toBeGreaterThan(0);
  });

  it('applies a conservative shared-budget limit to UNTAGGED configs in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const limiter = freshLimiter();

    const config = {
      windowMs: 60_000,
      maxRequests: 30,
      identifier: 'untagged-prod-test',
    };

    // floor(30 / 8 assumed instances) = 3 requests allowed per instance
    const first = await limiter.checkRateLimit(config);
    const second = await limiter.checkRateLimit(config);
    const third = await limiter.checkRateLimit(config);
    const fourth = await limiter.checkRateLimit(config);

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
    expect(third.allowed).toBe(true);
    expect(fourth.allowed).toBe(false); // over the divided budget → rejected
  });

  it('hard-caps the untagged production fallback even for large limits', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const limiter = freshLimiter();

    const config = {
      windowMs: 60_000,
      maxRequests: 1000, // floor(1000/8)=125, but hard cap is 5
      identifier: 'untagged-prod-large-test',
    };

    let allowedCount = 0;
    for (let i = 0; i < 10; i++) {
      const result = await limiter.checkRateLimit(config);
      if (result.allowed) allowedCount++;
    }
    expect(allowedCount).toBe(5);
  });

  it('never fully zeroes out an untagged route (min 1 request per window)', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const limiter = freshLimiter();

    const result = await limiter.checkRateLimit({
      windowMs: 60_000,
      maxRequests: 3, // floor(3/8)=0 → clamped to 1
      identifier: 'untagged-prod-tiny-test',
    });
    expect(result.allowed).toBe(true);
  });

  it('keeps the generous 75% fallback outside production (dev/test unchanged)', async () => {
    // NODE_ENV is 'test' under vitest — the non-production branch.
    const limiter = freshLimiter();

    const config = {
      windowMs: 60_000,
      maxRequests: 20, // ceil(20*0.75)=15 allowed
      identifier: 'untagged-dev-test',
    };

    let allowedCount = 0;
    for (let i = 0; i < 20; i++) {
      const result = await limiter.checkRateLimit(config);
      if (result.allowed) allowedCount++;
    }
    expect(allowedCount).toBe(15);
  });
});

describe('resolveRateLimitCriticality (withApiHandler defaults)', () => {
  it('explicit config always wins', () => {
    expect(
      resolveRateLimitCriticality('payment', '/api/auth/login', 'POST')
    ).toBe('payment');
  });

  it('tags mutating /api/auth/* routes as auth', () => {
    expect(
      resolveRateLimitCriticality(undefined, '/api/auth/register', 'POST')
    ).toBe('auth');
  });

  it('tags mutating /api/payments/* and /api/webhooks/* routes as payment', () => {
    expect(
      resolveRateLimitCriticality(undefined, '/api/payments/refund', 'POST')
    ).toBe('payment');
    expect(
      resolveRateLimitCriticality(undefined, '/api/webhooks/stripe', 'POST')
    ).toBe('payment');
  });

  it('tags mutating admin-only routes as admin', () => {
    expect(
      resolveRateLimitCriticality(undefined, '/api/admin/users/1', 'DELETE', [
        'admin',
      ])
    ).toBe('admin');
  });

  it('does NOT escalate reads — GET degrades to the conservative fallback instead', () => {
    expect(
      resolveRateLimitCriticality(undefined, '/api/auth/session', 'GET')
    ).toBeUndefined();
    expect(
      resolveRateLimitCriticality(undefined, '/api/payments/history', 'GET')
    ).toBeUndefined();
  });

  it('does not escalate multi-role or unrelated routes', () => {
    expect(
      resolveRateLimitCriticality(undefined, '/api/jobs/1', 'POST', [
        'admin',
        'contractor',
      ])
    ).toBeUndefined();
    expect(
      resolveRateLimitCriticality(undefined, '/api/jobs', 'POST')
    ).toBeUndefined();
  });
});

describe('buildRateLimitIdentifier', () => {
  it('uses only the pathname so query strings cannot evade the limit', () => {
    const first = buildRateLimitIdentifier(
      '203.0.113.4',
      'https://example.com/api/email/unsubscribe?token=first-secret'
    );
    const second = buildRateLimitIdentifier(
      '203.0.113.4',
      'https://example.com/api/email/unsubscribe?token=second-secret'
    );

    expect(first).toBe('203.0.113.4:/api/email/unsubscribe');
    expect(second).toBe(first);
    expect(first).not.toContain('secret');
  });

  it('uses a stable fallback for malformed URLs', () => {
    expect(buildRateLimitIdentifier('203.0.113.4', 'not a URL')).toBe(
      '203.0.113.4:unknown'
    );
  });
});
