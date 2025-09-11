// Arrange mocks BEFORE importing the module under test
const mockErrorUtils = { setGlobalHandler: jest.fn() };
jest.mock('react-native', () => ({
  ErrorUtils: mockErrorUtils,
  Platform: { OS: 'ios' },
}));

const mockLogger = { error: jest.fn(), warn: jest.fn(), debug: jest.fn() };
jest.mock('../../utils/logger', () => ({ logger: mockLogger }));

const mockSentry = { captureException: jest.fn(), addBreadcrumb: jest.fn() };
jest.mock('@sentry/react-native', () => mockSentry);

const mockExceptionsManager = { unstable_setGlobalHandler: jest.fn() };
jest.mock(
  'react-native/Libraries/Core/ExceptionsManager',
  () => mockExceptionsManager
);

let setupGlobalErrorHandler: any, logError: any, trackPerformance: any;

// Mock global __DEV__
// eslint-disable-next-line no-undef
// @ts-ignore
global.__DEV__ = false;

describe('GlobalErrorHandler', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    // eslint-disable-next-line no-undef
    // @ts-ignore
    global.__DEV__ = false;
    ({
      setupGlobalErrorHandler,
      logError,
      trackPerformance,
    } = require('../../utils/globalErrorHandler'));
  });

  describe('setupGlobalErrorHandler', () => {
    it('should set up global error handler', () => {
      setupGlobalErrorHandler();

      expect(mockErrorUtils.setGlobalHandler).toHaveBeenCalled();
      expect(
        mockExceptionsManager.unstable_setGlobalHandler
      ).toHaveBeenCalled();
    });

    it('should handle JS errors and log them', () => {
      setupGlobalErrorHandler();

      // Get the handler that was set
      const errorHandler = mockErrorUtils.setGlobalHandler.mock.calls[0][0];
      const testError = new Error('Test JS error');

      errorHandler(testError, false);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Global JS Error:',
        testError
      );
    });

    it('should handle fatal JS errors', () => {
      setupGlobalErrorHandler();

      const errorHandler = mockErrorUtils.setGlobalHandler.mock.calls[0][0];
      const testError = new Error('Fatal JS error');

      errorHandler(testError, true);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Global JS Error:',
        testError
      );
    });

    it('should handle non-fatal errors in development mode', () => {
      global.__DEV__ = true;
      setupGlobalErrorHandler();

      const errorHandler = mockErrorUtils.setGlobalHandler.mock.calls[0][0];
      const testError = new Error('Non-fatal dev error');

      errorHandler(testError, false);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Global JS Error:',
        testError
      );
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Non-fatal error handled globally:',
        { data: testError }
      );
    });

    it('should not warn for fatal errors in development mode', () => {
      global.__DEV__ = true;
      setupGlobalErrorHandler();

      const errorHandler = mockErrorUtils.setGlobalHandler.mock.calls[0][0];
      const testError = new Error('Fatal dev error');

      errorHandler(testError, true);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Global JS Error:',
        testError
      );
      expect(mockLogger.warn).not.toHaveBeenCalledWith(
        'Non-fatal error handled globally:',
        expect.anything()
      );
    });

    it('should handle promise rejections when ExceptionsManager is available', () => {
      setupGlobalErrorHandler();

      expect(
        mockExceptionsManager.unstable_setGlobalHandler
      ).toHaveBeenCalled();

      // Get the promise rejection handler
      const promiseHandler =
        mockExceptionsManager.unstable_setGlobalHandler.mock.calls[0][0];
      const testError = 'Unhandled promise rejection';

      promiseHandler(testError, false);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Unhandled Promise Rejection:',
        testError
      );
    });

    it('should handle case when ExceptionsManager is not available', () => {
      // Temporarily remove the mock
      mockExceptionsManager.unstable_setGlobalHandler = null;

      // Should not throw
      expect(() => setupGlobalErrorHandler()).not.toThrow();
    });
  });

  describe('logError', () => {
    it('should log error with context', () => {
      const testError = new Error('Test error');
      const testContext = { userId: '123', action: 'submit' };

      logError(testError, testContext);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'App Error:',
        testError,
        testContext
      );
    });

    it('should log error without context', () => {
      const testError = new Error('Test error without context');

      logError(testError);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'App Error:',
        testError,
        undefined
      );
    });

    it('should handle various error types', () => {
      // Test with different error types
      const stringError = 'String error';
      const objectError = { message: 'Object error', code: 500 };
      const errorInstance = new Error('Error instance');

      logError(stringError as any);
      logError(objectError as any);
      logError(errorInstance);

      expect(mockLogger.error).toHaveBeenCalledTimes(3);
    });
  });

  describe('trackPerformance', () => {
    it('should track performance with operation and duration', () => {
      const operation = 'API call';
      const duration = 250;

      trackPerformance(operation, duration);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Performance: API call took 250ms'
      );
    });

    it('should handle various operation names and durations', () => {
      const testCases = [
        { operation: 'Database query', duration: 45 },
        { operation: 'File upload', duration: 1200 },
        { operation: 'Authentication', duration: 89 },
        { operation: 'Navigation', duration: 15 },
      ];

      testCases.forEach(({ operation, duration }) => {
        trackPerformance(operation, duration);
      });

      expect(mockLogger.debug).toHaveBeenCalledTimes(testCases.length);

      testCases.forEach(({ operation, duration }) => {
        expect(mockLogger.debug).toHaveBeenCalledWith(
          `Performance: ${operation} took ${duration}ms`
        );
      });
    });

    it('should handle zero and negative durations', () => {
      trackPerformance('Instant operation', 0);
      trackPerformance('Negative duration', -5);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Performance: Instant operation took 0ms'
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Performance: Negative duration took -5ms'
      );
    });
  });

  describe('Sentry Integration', () => {
    it('should handle Sentry import success', async () => {
      const testError = new Error('Sentry test error');

      logError(testError, { test: true });

      // Wait for dynamic import to resolve
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockLogger.error).toHaveBeenCalledWith('App Error:', testError, {
        test: true,
      });
    });

    it('should handle Sentry import failure gracefully', async () => {
      // Mock Sentry import to fail
      jest.doMock('@sentry/react-native', () => {
        throw new Error('Sentry not available');
      });

      const testError = new Error('Error when Sentry unavailable');
      logError(testError);

      // Wait for dynamic import to fail
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockLogger.error).toHaveBeenCalledWith(
        'App Error:',
        testError,
        undefined
      );
    });

    it('should handle trackPerformance Sentry integration', async () => {
      trackPerformance('Test operation', 100);

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Performance: Test operation took 100ms'
      );
    });
  });

  describe('Error Scenarios', () => {
    it('should handle null and undefined errors', () => {
      logError(null as any);
      logError(undefined as any);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'App Error:',
        null,
        undefined
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        'App Error:',
        undefined,
        undefined
      );
    });

    it('should handle circular reference in context', () => {
      const circularContext: any = { name: 'test' };
      circularContext.self = circularContext;

      const testError = new Error('Error with circular context');

      // Should not throw
      expect(() => logError(testError, circularContext)).not.toThrow();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'App Error:',
        testError,
        circularContext
      );
    });

    it('should handle very long operation names', () => {
      const longOperation = 'A'.repeat(1000);
      const duration = 500;

      expect(() => trackPerformance(longOperation, duration)).not.toThrow();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Performance: ${longOperation} took ${duration}ms`
      );
    });
  });

  describe('Integration Tests', () => {
    it('should work with all functions together', () => {
      setupGlobalErrorHandler();

      const testError = new Error('Integration test error');
      const testContext = { integration: true };

      logError(testError, testContext);
      trackPerformance('Integration test', 150);

      expect(mockErrorUtils.setGlobalHandler).toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'App Error:',
        testError,
        testContext
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Performance: Integration test took 150ms'
      );
    });

    it('should maintain functionality after multiple setups', () => {
      setupGlobalErrorHandler();
      setupGlobalErrorHandler();
      setupGlobalErrorHandler();

      // Should have been called multiple times
      expect(mockErrorUtils.setGlobalHandler).toHaveBeenCalledTimes(3);
    });
  });
});
