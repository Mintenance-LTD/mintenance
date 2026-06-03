import errorRecoveryManager from '../../utils/ErrorRecoveryManager';
import { logger } from '../../utils/logger';

jest.mock('../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

// AccessibilityManager default-exports a singleton with announceError().
jest.mock('../../utils/AccessibilityManager', () => ({
  __esModule: true,
  default: {
    announceError: jest.fn(),
  },
}));

describe('ErrorRecoveryManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Singleton holds cross-test state in its history/attempts maps.
    errorRecoveryManager.clearErrorHistory();
  });

  describe('categorizeError', () => {
    it('should categorize network errors', () => {
      const category = errorRecoveryManager.categorizeError(
        new Error('Network request failed')
      );
      expect(category?.name).toBe('Network Error');
      expect(category?.strategy.type).toBe('retry');
    });

    it('should categorize authentication errors', () => {
      const category = errorRecoveryManager.categorizeError(
        new Error('unauthorized: token expired')
      );
      expect(category?.name).toBe('Authentication Error');
      expect(category?.strategy.type).toBe('redirect');
    });

    it('should categorize validation errors', () => {
      const category = errorRecoveryManager.categorizeError(
        new Error('validation failed: required field')
      );
      expect(category?.name).toBe('Validation Error');
    });

    it('should categorize UI component errors', () => {
      const category = errorRecoveryManager.categorizeError(
        new Error("Cannot read property 'x' of undefined")
      );
      expect(category?.name).toBe('UI Component Error');
    });

    it('should return null for unknown errors', () => {
      const category = errorRecoveryManager.categorizeError(
        new Error('totally unrecognized failure mode')
      );
      expect(category).toBeNull();
    });
  });

  describe('getRecoveryStrategy', () => {
    it('should return the category strategy for a known error', () => {
      const strategy = errorRecoveryManager.getRecoveryStrategy(
        new Error('Network request failed')
      );
      expect(strategy.type).toBe('retry');
      expect(strategy.maxAttempts).toBe(3);
    });

    it('should return a safe fallback for unknown errors', () => {
      const strategy = errorRecoveryManager.getRecoveryStrategy(
        new Error('totally unrecognized failure mode')
      );
      expect(strategy.type).toBe('fallback');
      expect(strategy.allowUserChoice).toBe(true);
    });

    it('should escalate a recurring retry error to fallback safe mode', () => {
      const error = new Error('Network request failed');
      const context = { componentName: 'JobList' };
      // First 3 occurrences populate history; the 4th sees it as recurring.
      errorRecoveryManager.getRecoveryStrategy(error, context);
      errorRecoveryManager.getRecoveryStrategy(error, context);
      errorRecoveryManager.getRecoveryStrategy(error, context);
      const strategy = errorRecoveryManager.getRecoveryStrategy(error, context);
      expect(strategy.type).toBe('fallback');
      expect(strategy.redirectTarget).toBe('Main');
    });
  });

  describe('executeRecovery', () => {
    it('should run the onRetry callback for a retry strategy', async () => {
      const onRetry = jest.fn();
      const error = new Error('Network request failed');
      const result = await errorRecoveryManager.executeRecovery(
        error,
        { type: 'retry', maxAttempts: 3, delay: 0 },
        { componentName: 'A' },
        { onRetry }
      );
      expect(result).toBe(true);
      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('should stop retrying once maxAttempts is exhausted', async () => {
      const onRetry = jest.fn();
      const error = new Error('Network request failed');
      const context = { componentName: 'RetryLimit' };
      const strategy = { type: 'retry' as const, maxAttempts: 1, delay: 0 };

      const first = await errorRecoveryManager.executeRecovery(
        error,
        strategy,
        context,
        { onRetry }
      );
      const second = await errorRecoveryManager.executeRecovery(
        error,
        strategy,
        context,
        { onRetry }
      );

      expect(first).toBe(true);
      expect(second).toBe(false);
      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('should run the onFallback callback for a fallback strategy', async () => {
      const onFallback = jest.fn();
      const result = await errorRecoveryManager.executeRecovery(
        new Error('boom'),
        { type: 'fallback' },
        undefined,
        { onFallback }
      );
      expect(result).toBe(true);
      expect(onFallback).toHaveBeenCalledTimes(1);
    });

    it('should run the onRedirect callback for a redirect strategy', async () => {
      const onRedirect = jest.fn();
      const result = await errorRecoveryManager.executeRecovery(
        new Error('unauthorized'),
        { type: 'redirect', redirectTarget: 'Auth' },
        undefined,
        { onRedirect }
      );
      expect(result).toBe(true);
      expect(onRedirect).toHaveBeenCalledWith('Auth');
    });

    it('should run the onRefresh callback for a refresh strategy', async () => {
      const onRefresh = jest.fn();
      const result = await errorRecoveryManager.executeRecovery(
        new Error('out of memory'),
        { type: 'refresh' },
        undefined,
        { onRefresh }
      );
      expect(result).toBe(true);
      expect(onRefresh).toHaveBeenCalledTimes(1);
    });
  });

  describe('statistics + cleanup', () => {
    it('should track error statistics', () => {
      errorRecoveryManager.getRecoveryStrategy(
        new Error('Network request failed'),
        { componentName: 'X' }
      );
      const stats = errorRecoveryManager.getErrorStatistics();
      expect(stats.totalUniqueErrors).toBeGreaterThanOrEqual(1);
      expect(stats.totalOccurrences).toBeGreaterThanOrEqual(1);
    });

    it('clearErrorHistory should reset stats', () => {
      errorRecoveryManager.getRecoveryStrategy(new Error('Network failed'));
      errorRecoveryManager.clearErrorHistory();
      const stats = errorRecoveryManager.getErrorStatistics();
      expect(stats.totalUniqueErrors).toBe(0);
      expect(stats.totalOccurrences).toBe(0);
    });

    it('logs recovery via logger.info', async () => {
      await errorRecoveryManager.executeRecovery(new Error('boom'), {
        type: 'fallback',
      });
      expect(logger.info).toHaveBeenCalled();
    });
  });
});
