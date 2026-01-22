import { ErrorHandler } from '../../../utils/errorHandler';
import { logger } from '../../../utils/logger';

jest.mock('../../../utils/logger');

describe('Error Handler - Comprehensive', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Error Classification', () => {
    it('should classify network errors', () => {
      const error = new Error('Network request failed');
      error.code = 'NETWORK_ERROR';

      const classified = ErrorHandler.classify(error);
      expect(classified.type).toBe('network');
      expect(classified.severity).toBe('medium');
      expect(classified.recoverable).toBe(true);
    });

    it('should classify authentication errors', () => {
      const error = new Error('Invalid credentials');
      error.code = 'AUTH_ERROR';

      const classified = ErrorHandler.classify(error);
      expect(classified.type).toBe('auth');
      expect(classified.severity).toBe('high');
      expect(classified.recoverable).toBe(false);
    });

    it('should classify validation errors', () => {
      const error = new Error('Invalid input');
      error.code = 'VALIDATION_ERROR';

      const classified = ErrorHandler.classify(error);
      expect(classified.type).toBe('validation');
      expect(classified.severity).toBe('low');
      expect(classified.recoverable).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle errors with retry logic', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValue('Success');

      const result = await ErrorHandler.withRetry(operation, 3);

      expect(result).toBe('Success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should fail after max retries', async () => {
      const operation = jest.fn()
        .mockRejectedValue(new Error('Persistent failure'));

      await expect(ErrorHandler.withRetry(operation, 3)).rejects.toThrow('Persistent failure');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should handle errors with fallback', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Failed'));
      const fallback = jest.fn().mockResolvedValue('Fallback');

      const result = await ErrorHandler.withFallback(operation, fallback);

      expect(result).toBe('Fallback');
      expect(fallback).toHaveBeenCalled();
    });
  });

  describe('Error Logging', () => {
    it('should log errors with context', () => {
      const error = new Error('Test error');
      const context = { userId: '123', action: 'login' };

      ErrorHandler.logError(error, context);

      expect(logger.error).toHaveBeenCalledWith(
        'Test error',
        expect.objectContaining({
          error,
          context,
          timestamp: expect.any(String),
        })
      );
    });

    it('should log error stack traces', () => {
      const error = new Error('Test error');
      error.stack = 'Error: Test error\n    at test.js:10';

      ErrorHandler.logError(error);

      expect(logger.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          stack: error.stack,
        })
      );
    });
  });

  describe('User-Friendly Messages', () => {
    it('should convert technical errors to user messages', () => {
      const errors = [
        { code: 'NETWORK_ERROR', expected: 'Connection failed. Please check your internet.' },
        { code: 'AUTH_ERROR', expected: 'Please sign in to continue.' },
        { code: 'PERMISSION_DENIED', expected: 'You don\'t have permission to do this.' },
        { code: 'NOT_FOUND', expected: 'The requested item was not found.' },
        { code: 'RATE_LIMIT', expected: 'Too many requests. Please try again later.' },
      ];

      errors.forEach(({ code, expected }) => {
        const error = new Error();
        error.code = code;
        expect(ErrorHandler.getUserMessage(error)).toBe(expected);
      });
    });

    it('should provide generic message for unknown errors', () => {
      const error = new Error('Unknown error');
      expect(ErrorHandler.getUserMessage(error)).toBe('Something went wrong. Please try again.');
    });
  });

  describe('Error Recovery', () => {
    it('should attempt automatic recovery', async () => {
      const error = new Error('Network timeout');
      error.code = 'TIMEOUT';

      const recovery = await ErrorHandler.attemptRecovery(error);

      expect(recovery.attempted).toBe(true);
      expect(recovery.strategy).toBe('retry');
    });

    it('should not attempt recovery for fatal errors', async () => {
      const error = new Error('Critical system error');
      error.code = 'FATAL';

      const recovery = await ErrorHandler.attemptRecovery(error);

      expect(recovery.attempted).toBe(false);
      expect(recovery.reason).toBe('Non-recoverable error');
    });
  });

  describe('Error Aggregation', () => {
    it('should aggregate similar errors', () => {
      const errors = [
        new Error('Network failed'),
        new Error('Network failed'),
        new Error('Auth failed'),
      ];

      const aggregated = ErrorHandler.aggregate(errors);

      expect(aggregated).toHaveLength(2);
      expect(aggregated[0].count).toBe(2);
      expect(aggregated[0].message).toBe('Network failed');
      expect(aggregated[1].count).toBe(1);
      expect(aggregated[1].message).toBe('Auth failed');
    });
  });
});