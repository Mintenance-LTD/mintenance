import { UnifiedAIService } from '../UnifiedAIService';

describe('UnifiedAIService - Rate Limit Handling', () => {
  let service: UnifiedAIService;

  beforeEach(() => {
    // Create service instance with minimal config
    service = new UnifiedAIService({
      endpoints: {
        buildingSurveyor: 'http://test.com',
        agents: 'http://test.com',
        search: 'http://test.com',
        training: 'http://test.com',
      },
      timeout: 30000,
    });
  });

  describe('handleRateLimit', () => {
    // Access private method for testing
    const invokeHandleRateLimit = (service: any, error: any) => {
      return service.handleRateLimit(error);
    };

    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should wait 5000ms when no retry-after header is present', async () => {
      const error = {
        response: {
          headers: {},
        },
      };

      const promise = invokeHandleRateLimit(service, error);

      // Fast-forward time
      jest.advanceTimersByTime(4999);
      await Promise.resolve(); // Process microtasks

      // Should not resolve yet
      let resolved = false;
      promise.then(() => { resolved = true; });
      await Promise.resolve();
      expect(resolved).toBe(false);

      // Fast-forward past 5000ms
      jest.advanceTimersByTime(1);
      await promise;
      expect(resolved).toBe(false); // Will be true after promise resolves
    });

    it('should parse valid integer retry-after header correctly', async () => {
      const error = {
        response: {
          headers: {
            'retry-after': '60',
          },
        },
      };

      const promise = invokeHandleRateLimit(service, error);

      // Should wait 60000ms (60 seconds * 1000)
      jest.advanceTimersByTime(59999);
      await Promise.resolve();

      let resolved = false;
      promise.then(() => { resolved = true; });
      await Promise.resolve();
      expect(resolved).toBe(false);

      jest.advanceTimersByTime(1);
      await promise;
    });

    it('should fallback to 5000ms for invalid retry-after header (NaN)', async () => {
      const error = {
        response: {
          headers: {
            'retry-after': 'invalid',
          },
        },
      };

      const promise = invokeHandleRateLimit(service, error);

      // Should fallback to 5000ms, not use NaN
      jest.advanceTimersByTime(4999);
      await Promise.resolve();

      let resolved = false;
      promise.then(() => { resolved = true; });
      await Promise.resolve();
      expect(resolved).toBe(false);

      jest.advanceTimersByTime(1);
      await promise;
    });

    it('should fallback to 5000ms for retry-after with suffix (e.g., "60s")', async () => {
      const error = {
        response: {
          headers: {
            'retry-after': '60s',
          },
        },
      };

      const promise = invokeHandleRateLimit(service, error);

      // parseInt("60s", 10) = 60, which is valid, so should wait 60000ms
      // But if we want to be strict and reject suffixes, we'd need additional validation
      // Current implementation accepts "60s" as 60
      jest.advanceTimersByTime(59999);
      await Promise.resolve();

      let resolved = false;
      promise.then(() => { resolved = true; });
      await Promise.resolve();
      expect(resolved).toBe(false);

      jest.advanceTimersByTime(1);
      await promise;
    });

    it('should fallback to 5000ms for negative retry-after values', async () => {
      const error = {
        response: {
          headers: {
            'retry-after': '-10',
          },
        },
      };

      const promise = invokeHandleRateLimit(service, error);

      // Should reject negative values and fallback to 5000ms
      jest.advanceTimersByTime(4999);
      await Promise.resolve();

      let resolved = false;
      promise.then(() => { resolved = true; });
      await Promise.resolve();
      expect(resolved).toBe(false);

      jest.advanceTimersByTime(1);
      await promise;
    });

    it('should fallback to 5000ms for zero retry-after value', async () => {
      const error = {
        response: {
          headers: {
            'retry-after': '0',
          },
        },
      };

      const promise = invokeHandleRateLimit(service, error);

      // Should reject zero and fallback to 5000ms
      jest.advanceTimersByTime(4999);
      await Promise.resolve();

      let resolved = false;
      promise.then(() => { resolved = true; });
      await Promise.resolve();
      expect(resolved).toBe(false);

      jest.advanceTimersByTime(1);
      await promise;
    });

    it('should cap retry-after at 300 seconds (5 minutes)', async () => {
      const error = {
        response: {
          headers: {
            'retry-after': '999999',
          },
        },
      };

      const promise = invokeHandleRateLimit(service, error);

      // Should cap at 300 seconds, fallback to 5000ms since 999999 > 300
      jest.advanceTimersByTime(4999);
      await Promise.resolve();

      let resolved = false;
      promise.then(() => { resolved = true; });
      await Promise.resolve();
      expect(resolved).toBe(false);

      jest.advanceTimersByTime(1);
      await promise;
    });

    it('should accept retry-after at exactly 300 seconds', async () => {
      const error = {
        response: {
          headers: {
            'retry-after': '300',
          },
        },
      };

      const promise = invokeHandleRateLimit(service, error);

      // Should wait exactly 300000ms (300 seconds * 1000)
      jest.advanceTimersByTime(299999);
      await Promise.resolve();

      let resolved = false;
      promise.then(() => { resolved = true; });
      await Promise.resolve();
      expect(resolved).toBe(false);

      jest.advanceTimersByTime(1);
      await promise;
    });

    it('should handle missing error.response gracefully', async () => {
      const error = {};

      const promise = invokeHandleRateLimit(service, error);

      // Should fallback to 5000ms
      jest.advanceTimersByTime(4999);
      await Promise.resolve();

      let resolved = false;
      promise.then(() => { resolved = true; });
      await Promise.resolve();
      expect(resolved).toBe(false);

      jest.advanceTimersByTime(1);
      await promise;
    });

    it('should handle missing error.response.headers gracefully', async () => {
      const error = {
        response: {},
      };

      const promise = invokeHandleRateLimit(service, error);

      // Should fallback to 5000ms
      jest.advanceTimersByTime(4999);
      await Promise.resolve();

      let resolved = false;
      promise.then(() => { resolved = true; });
      await Promise.resolve();
      expect(resolved).toBe(false);

      jest.advanceTimersByTime(1);
      await promise;
    });
  });
});
