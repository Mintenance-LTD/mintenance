import { SanitizationRateLimiter } from '../core/RateLimiter';

describe('SanitizationRateLimiter', () => {
  let limiter: SanitizationRateLimiter;

  beforeEach(() => {
    limiter = new SanitizationRateLimiter({
      maxAttempts: 5,
      windowMs: 1000,
      keyPrefix: 'test',
    });
  });

  afterEach(() => {
    limiter.destroy();
  });

  it('should allow requests under the limit', () => {
    const result = limiter.isAllowed('user-1');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it('should decrement remaining count on each request', () => {
    limiter.isAllowed('user-1');
    limiter.isAllowed('user-1');
    const result = limiter.isAllowed('user-1');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
    expect(result.totalAttempts).toBe(3);
  });

  it('should block requests over the limit', () => {
    for (let i = 0; i < 5; i++) {
      limiter.isAllowed('user-2');
    }
    const result = limiter.isAllowed('user-2');
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('should track different keys independently', () => {
    for (let i = 0; i < 5; i++) {
      limiter.isAllowed('user-a');
    }
    const resultA = limiter.isAllowed('user-a');
    const resultB = limiter.isAllowed('user-b');
    expect(resultA.allowed).toBe(false);
    expect(resultB.allowed).toBe(true);
  });

  it('should include resetTime in the result', () => {
    const before = Date.now();
    const result = limiter.isAllowed('user-3');
    expect(result.resetTime).toBeGreaterThanOrEqual(before + 1000);
  });
});
