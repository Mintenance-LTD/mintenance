// Create mock for ErrorUtils
const mockErrorUtils = { setGlobalHandler: jest.fn() };

// Override the global ErrorUtils
// @ts-ignore
global.ErrorUtils = mockErrorUtils;

const mockSentry = { captureException: jest.fn(), addBreadcrumb: jest.fn() };
jest.mock('@sentry/react-native', () => mockSentry);

const mockExceptionsManager = { unstable_setGlobalHandler: jest.fn() };
jest.mock(
  'react-native/Libraries/Core/ExceptionsManager',
  () => mockExceptionsManager
);

// Logger mock — source uses logger.error/warn/debug/info. Hoisted so it is
// stable under module resets and shared with the test assertions.
const mockLogger = {
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};
jest.mock('../../utils/logger', () => ({ logger: mockLogger }));

// Only `setupGlobalErrorHandler` is part of the module's public API. The
// former `logError`/`trackPerformance` exports were stripped (commit
// 867632aa5, knip --fix: zero importers) and are now file-private, so the
// suite no longer exercises them.
let setupGlobalErrorHandler: any;

// @ts-ignore
global.__DEV__ = false;

describe('GlobalErrorHandler', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    mockErrorUtils.setGlobalHandler.mockClear();
    mockExceptionsManager.unstable_setGlobalHandler = jest.fn();
    // @ts-ignore
    global.__DEV__ = false;
    ({ setupGlobalErrorHandler } = require('../../utils/globalErrorHandler'));
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
      // @ts-ignore
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
      // @ts-ignore
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
      // Temporarily remove the handler
      mockExceptionsManager.unstable_setGlobalHandler = null as any;

      // Should not throw
      expect(() => setupGlobalErrorHandler()).not.toThrow();
    });
  });

  describe('Integration Tests', () => {
    it('should maintain functionality after multiple setups', () => {
      setupGlobalErrorHandler();
      setupGlobalErrorHandler();
      setupGlobalErrorHandler();

      expect(mockErrorUtils.setGlobalHandler).toHaveBeenCalledTimes(3);
    });
  });
});
