// Mock logger first before any imports
jest.mock('../../utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

// Mock sentry config module
jest.mock('../../config/sentry', () => ({
  setUserContext: jest.fn(),
  trackUserAction: jest.fn(),
  addBreadcrumb: jest.fn(),
  measureAsyncPerformance: jest.fn((fn) => fn)
}));

describe('sentryUtils', () => {
  let sentryUtils: any;
  let mockSentry: any;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset module registry to allow fresh imports
    jest.resetModules();
  });

  describe('Exported Functions', () => {
    it('should export all expected Sentry wrapper functions', () => {
      sentryUtils = require('../../utils/sentryUtils');

      expect(sentryUtils.setUserContext).toBeDefined();
      expect(typeof sentryUtils.setUserContext).toBe('function');

      expect(sentryUtils.trackUserAction).toBeDefined();
      expect(typeof sentryUtils.trackUserAction).toBe('function');

      expect(sentryUtils.addBreadcrumb).toBeDefined();
      expect(typeof sentryUtils.addBreadcrumb).toBe('function');

      expect(sentryUtils.measureAsyncPerformance).toBeDefined();
      expect(typeof sentryUtils.measureAsyncPerformance).toBe('function');
    });
  });

  describe('When Sentry is available', () => {
    beforeEach(() => {
      mockSentry = require('../../config/sentry');
      sentryUtils = require('../../utils/sentryUtils');
    });

    describe('setUserContext', () => {
      it('should call Sentry setUserContext with user data', () => {
        const userData = {
          id: 'user123',
          email: 'user@example.com',
          username: 'testuser'
        };

        sentryUtils.setUserContext(userData);

        expect(mockSentry.setUserContext).toHaveBeenCalledWith(userData);
      });

      it('should handle null user context', () => {
        sentryUtils.setUserContext(null);

        expect(mockSentry.setUserContext).toHaveBeenCalledWith(null);
      });

      it('should handle partial user data', () => {
        const partialData = { id: 'user456' };

        sentryUtils.setUserContext(partialData);

        expect(mockSentry.setUserContext).toHaveBeenCalledWith(partialData);
      });
    });

    describe('trackUserAction', () => {
      it('should track user action with category and data', () => {
        const action = 'button_click';
        const category = 'navigation';
        const data = { buttonId: 'submit', timestamp: Date.now() };

        sentryUtils.trackUserAction(action, category, data);

        expect(mockSentry.trackUserAction).toHaveBeenCalledWith(action, category, data);
      });

      it('should track action without additional data', () => {
        sentryUtils.trackUserAction('page_view', 'analytics');

        expect(mockSentry.trackUserAction).toHaveBeenCalledWith('page_view', 'analytics', undefined);
      });

      it('should handle complex action data', () => {
        const complexData = {
          items: [1, 2, 3],
          nested: { deep: { value: 'test' } },
          timestamp: Date.now()
        };

        sentryUtils.trackUserAction('form_submit', 'forms', complexData);

        expect(mockSentry.trackUserAction).toHaveBeenCalledWith('form_submit', 'forms', complexData);
      });
    });

    describe('addBreadcrumb', () => {
      it('should add breadcrumb with message and category', () => {
        sentryUtils.addBreadcrumb('User navigated to profile', 'navigation');

        expect(mockSentry.addBreadcrumb).toHaveBeenCalledWith('User navigated to profile', 'navigation', undefined, undefined);
      });

      it('should add simple breadcrumb with just message', () => {
        sentryUtils.addBreadcrumb('Simple breadcrumb');

        expect(mockSentry.addBreadcrumb).toHaveBeenCalledWith('Simple breadcrumb', undefined, undefined, undefined);
      });

      it('should handle breadcrumb with data', () => {
        const breadcrumbData = { userId: '123', action: 'update' };

        sentryUtils.addBreadcrumb('Data update', 'database', 'info', breadcrumbData);

        expect(mockSentry.addBreadcrumb).toHaveBeenCalledWith('Data update', 'database', 'info', breadcrumbData);
      });

      it('should handle different breadcrumb levels', () => {
        sentryUtils.addBreadcrumb('Debug message', 'debug', 'debug');
        sentryUtils.addBreadcrumb('Info message', 'info', 'info');
        sentryUtils.addBreadcrumb('Warning message', 'warning', 'warning');
        sentryUtils.addBreadcrumb('Error message', 'error', 'error');

        expect(mockSentry.addBreadcrumb).toHaveBeenCalledTimes(4);
      });
    });

    describe('measureAsyncPerformance', () => {
      it('should measure async function performance', async () => {
        const asyncFn = jest.fn(async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
          return 'async result';
        });

        mockSentry.measureAsyncPerformance.mockImplementation((fn: any) => fn());

        const result = await sentryUtils.measureAsyncPerformance(asyncFn);

        expect(result).toBe('async result');
        expect(mockSentry.measureAsyncPerformance).toHaveBeenCalledWith(asyncFn);
        expect(asyncFn).toHaveBeenCalled();
      });

      it('should handle synchronous functions', () => {
        const syncFn = jest.fn(() => 'sync result');

        mockSentry.measureAsyncPerformance.mockImplementation((fn: any) => fn());

        const result = sentryUtils.measureAsyncPerformance(syncFn);

        expect(result).toBe('sync result');
        expect(mockSentry.measureAsyncPerformance).toHaveBeenCalledWith(syncFn);
        expect(syncFn).toHaveBeenCalled();
      });

      it('should pass through function arguments', () => {
        const fnWithArgs = jest.fn((a: number, b: string) => `${a}-${b}`);

        mockSentry.measureAsyncPerformance.mockImplementation((fn: any) => (...args: any[]) => fn(...args));

        const wrappedFn = sentryUtils.measureAsyncPerformance(fnWithArgs);
        const result = wrappedFn(42, 'test');

        expect(result).toBe('42-test');
        expect(fnWithArgs).toHaveBeenCalledWith(42, 'test');
      });

      it('should handle function errors', async () => {
        const errorFn = jest.fn(async () => {
          throw new Error('Test error');
        });

        mockSentry.measureAsyncPerformance.mockImplementation((fn: any) => fn());

        await expect(sentryUtils.measureAsyncPerformance(errorFn)).rejects.toThrow('Test error');
        expect(mockSentry.measureAsyncPerformance).toHaveBeenCalledWith(errorFn);
      });
    });
  });

  describe('When Sentry is not available', () => {
    beforeEach(() => {
      // Mock require to throw error
      jest.doMock('../../config/sentry', () => {
        throw new Error('Module not found');
      });
    });

    afterEach(() => {
      jest.dontMock('../../config/sentry');
    });

    it('should use no-op functions when Sentry cannot be imported', () => {
      const { logger } = require('../../utils/logger');
      sentryUtils = require('../../utils/sentryUtils');

      // Functions should be no-ops but still callable
      expect(() => sentryUtils.setUserContext({ id: '123' })).not.toThrow();
      expect(() => sentryUtils.trackUserAction('test')).not.toThrow();
      expect(() => sentryUtils.addBreadcrumb('test')).not.toThrow();

      const testFn = jest.fn(() => 'result');
      const result = sentryUtils.measureAsyncPerformance(testFn);
      expect(result).toBe('result');
      expect(testFn).toHaveBeenCalled();
    });

    it('should log debug message when Sentry is not available', () => {
      const { logger } = require('../../utils/logger');
      jest.clearAllMocks();

      require('../../utils/sentryUtils');

      expect(logger.debug).toHaveBeenCalledWith('Sentry not available, using no-op functions');
    });
  });

  describe('When Sentry config has missing functions', () => {
    beforeEach(() => {
      // Mock sentry with partial implementation
      jest.doMock('../../config/sentry', () => ({
        setUserContext: jest.fn(),
        // trackUserAction is missing
        // addBreadcrumb is missing
        // measureAsyncPerformance is missing
      }));
    });

    afterEach(() => {
      jest.dontMock('../../config/sentry');
    });

    it('should use no-op for missing functions', () => {
      sentryUtils = require('../../utils/sentryUtils');
      const partialSentry = require('../../config/sentry');

      // setUserContext should work
      sentryUtils.setUserContext({ id: 'user123' });
      expect(partialSentry.setUserContext).toHaveBeenCalledWith({ id: 'user123' });

      // Missing functions should be no-ops
      expect(() => sentryUtils.trackUserAction('action')).not.toThrow();
      expect(() => sentryUtils.addBreadcrumb('breadcrumb')).not.toThrow();

      const testFn = jest.fn(() => 'test');
      const result = sentryUtils.measureAsyncPerformance(testFn);
      expect(result).toBe('test');
      expect(testFn).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle when require throws non-standard error', () => {
      jest.doMock('../../config/sentry', () => {
        throw 'String error'; // Non-Error object
      });

      expect(() => require('../../utils/sentryUtils')).not.toThrow();

      const sentryUtils = require('../../utils/sentryUtils');
      expect(sentryUtils.setUserContext).toBeDefined();
      expect(sentryUtils.trackUserAction).toBeDefined();

      jest.dontMock('../../config/sentry');
    });

    it('should handle when sentry config returns non-object', () => {
      jest.doMock('../../config/sentry', () => null);

      expect(() => require('../../utils/sentryUtils')).not.toThrow();

      const sentryUtils = require('../../utils/sentryUtils');
      // Should fallback to no-ops
      expect(() => sentryUtils.setUserContext({})).not.toThrow();
      expect(() => sentryUtils.trackUserAction('test')).not.toThrow();

      jest.dontMock('../../config/sentry');
    });
  });

  describe('Integration Scenarios', () => {
    beforeEach(() => {
      // Reset to default mock
      jest.dontMock('../../config/sentry');
      jest.doMock('../../config/sentry', () => ({
        setUserContext: jest.fn(),
        trackUserAction: jest.fn(),
        addBreadcrumb: jest.fn(),
        measureAsyncPerformance: jest.fn((fn) => fn)
      }));
    });

    it('should work in production-like scenario with all functions', async () => {
      sentryUtils = require('../../utils/sentryUtils');
      mockSentry = require('../../config/sentry');

      // Simulate user login flow
      const user = { id: 'prod_user_123', email: 'user@prod.com' };
      sentryUtils.setUserContext(user);
      sentryUtils.addBreadcrumb('User logged in', 'auth', 'info', { userId: user.id });
      sentryUtils.trackUserAction('login_success', 'authentication', { timestamp: Date.now() });

      // Simulate async operation
      const apiCall = jest.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 5));
        return { data: 'api response' };
      });

      mockSentry.measureAsyncPerformance.mockImplementation((fn: any) => fn());

      const result = await sentryUtils.measureAsyncPerformance(apiCall);

      expect(result).toEqual({ data: 'api response' });
      expect(mockSentry.setUserContext).toHaveBeenCalledWith(user);
      expect(mockSentry.addBreadcrumb).toHaveBeenCalled();
      expect(mockSentry.trackUserAction).toHaveBeenCalled();
      expect(mockSentry.measureAsyncPerformance).toHaveBeenCalledWith(apiCall);
    });

    it('should handle performance monitoring for async operations', async () => {
      sentryUtils = require('../../utils/sentryUtils');
      mockSentry = require('../../config/sentry');

      const operations = [
        jest.fn(async () => 'op1'),
        jest.fn(async () => 'op2'),
        jest.fn(async () => 'op3')
      ];

      mockSentry.measureAsyncPerformance.mockImplementation((fn: any) => fn());

      const results = await Promise.all(
        operations.map(op => sentryUtils.measureAsyncPerformance(op))
      );

      expect(results).toEqual(['op1', 'op2', 'op3']);
      expect(mockSentry.measureAsyncPerformance).toHaveBeenCalledTimes(3);
      operations.forEach(op => expect(op).toHaveBeenCalled());
    });

    it('should gracefully degrade when Sentry is unavailable', () => {
      jest.doMock('../../config/sentry', () => {
        throw new Error('Sentry not configured');
      });

      sentryUtils = require('../../utils/sentryUtils');

      // All functions should work as no-ops
      expect(() => {
        sentryUtils.setUserContext({ id: 'fallback_user' });
        sentryUtils.trackUserAction('fallback_action');
        sentryUtils.addBreadcrumb('fallback_breadcrumb');

        const fn = () => 'fallback_result';
        const result = sentryUtils.measureAsyncPerformance(fn);
        expect(result).toBe('fallback_result');
      }).not.toThrow();

      jest.dontMock('../../config/sentry');
    });
  });
});