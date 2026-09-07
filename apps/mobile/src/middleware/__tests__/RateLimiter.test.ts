import { checkRateLimit, getRemainingAttempts } from '../RateLimiter';

describe('mobile rate limiter', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('does not create a process-wide cleanup timer', () => {
    expect(jest.getTimerCount()).toBe(0);
  });

  it('purges expired buckets when the limiter is used again', () => {
    const identifier = `lazy-cleanup-${Date.now()}`;

    expect(checkRateLimit('auth_register', identifier)).toBe(true);
    expect(checkRateLimit('auth_register', identifier)).toBe(true);
    expect(checkRateLimit('auth_register', identifier)).toBe(true);
    expect(checkRateLimit('auth_register', identifier)).toBe(false);
    expect(getRemainingAttempts('auth_register', identifier)).toBe(0);

    jest.advanceTimersByTime(60_001);

    expect(getRemainingAttempts('auth_register', identifier)).toBe(3);
    expect(checkRateLimit('auth_register', identifier)).toBe(true);
    expect(jest.getTimerCount()).toBe(0);
  });
});
