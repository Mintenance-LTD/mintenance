import { ErrorHandler } from '../../../utils/errorHandler';
import { logger } from '../../../utils/logger';

// NOTE (test realignment 2026-06-02): the original suite asserted a speculative
// ErrorHandler API (classify/withFallback/logError/attemptRecovery/aggregate and
// a withRetry(op, number) signature) that does not exist in src/utils/errorHandler.ts.
// The real class exposes getUserMessage, handle, handleAsync, withRetry(op, options),
// shouldRetry, isNetworkError/isAuthError/isValidationError and validation helpers.
// Rewritten to the CURRENT contract. No source changes made.

jest.mock('../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// react-native Alert is exercised by handle(); keep it inert.
jest.mock('react-native', () => ({
  Alert: { alert: jest.fn() },
}));

type ErrWithMeta = Error & {
  code?: string;
  statusCode?: number;
  userMessage?: string;
};

describe('Error Handler - Comprehensive', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Error Classification helpers', () => {
    it('should detect network errors by code', () => {
      const error = new Error('Network request failed') as ErrWithMeta;
      error.code = 'NETWORK_ERROR';
      expect(ErrorHandler.isNetworkError(error)).toBe(true);
    });

    it('should detect auth errors by status code', () => {
      const error = new Error('Invalid credentials') as ErrWithMeta;
      error.statusCode = 401;
      expect(ErrorHandler.isAuthError(error)).toBe(true);
    });

    it('should detect validation errors by status code', () => {
      const error = new Error('Invalid input') as ErrWithMeta;
      error.statusCode = 422;
      expect(ErrorHandler.isValidationError(error)).toBe(true);
    });
  });

  describe('Retry Logic (withRetry / shouldRetry)', () => {
    it('should retry retryable operations until success', async () => {
      const netError = Object.assign(new Error('Network failure'), {
        code: 'NETWORK_ERROR',
      });
      const operation = jest
        .fn()
        .mockRejectedValueOnce(netError)
        .mockResolvedValue('Success');

      const result = await ErrorHandler.withRetry(operation, {
        maxAttempts: 3,
        delay: 1,
      });

      expect(result).toBe('Success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should fail after max attempts for persistently retryable errors', async () => {
      const netError = Object.assign(new Error('Persistent failure'), {
        code: 'NETWORK_ERROR',
      });
      const operation = jest.fn().mockRejectedValue(netError);

      await expect(
        ErrorHandler.withRetry(operation, { maxAttempts: 3, delay: 1 })
      ).rejects.toThrow('Persistent failure');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should NOT retry non-retryable errors (fail fast)', async () => {
      const validationError = Object.assign(new Error('Bad input'), {
        statusCode: 400,
      });
      const operation = jest.fn().mockRejectedValue(validationError);

      await expect(
        ErrorHandler.withRetry(operation, { maxAttempts: 3, delay: 1 })
      ).rejects.toThrow('Bad input');
      // shouldRetry returns false for 400 -> only called once
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should mark 5xx server errors as retryable', () => {
      const serverError = Object.assign(new Error('boom'), { statusCode: 503 });
      expect(ErrorHandler.shouldRetry(serverError)).toBe(true);
    });
  });

  describe('handleAsync tuple wrapper', () => {
    it('should return [result, null] on success', async () => {
      const [result, error] = await ErrorHandler.handleAsync(
        Promise.resolve('ok')
      );
      expect(result).toBe('ok');
      expect(error).toBeNull();
    });

    it('should return [null, error] on rejection and log with context', async () => {
      const boom = new Error('boom');
      const [result, error] = await ErrorHandler.handleAsync(
        Promise.reject(boom),
        'fetchJobs'
      );
      expect(result).toBeNull();
      expect(error).toBe(boom);
      expect(logger.error).toHaveBeenCalledWith('Error in fetchJobs:', boom);
    });
  });

  describe('User-Friendly Messages (getUserMessage)', () => {
    it('should map known Supabase/PostgREST codes', () => {
      const notFound = Object.assign(new Error(), { code: 'PGRST116' });
      expect(ErrorHandler.getUserMessage(notFound)).toBe(
        'The requested item was not found.'
      );

      const denied = Object.assign(new Error(), { code: '42501' });
      expect(ErrorHandler.getUserMessage(denied)).toBe(
        'You do not have permission to perform this action.'
      );

      const dup = Object.assign(new Error(), { code: '23505' });
      expect(ErrorHandler.getUserMessage(dup)).toBe(
        'A record with these details already exists.'
      );
    });

    it('should map HTTP status codes', () => {
      const rateLimited = Object.assign(new Error(), { statusCode: 429 });
      expect(ErrorHandler.getUserMessage(rateLimited)).toBe(
        'Too many requests. Please wait a moment and try again.'
      );

      const unauthorized = Object.assign(new Error(), { statusCode: 401 });
      expect(ErrorHandler.getUserMessage(unauthorized)).toBe(
        'Please log in to continue.'
      );
    });

    it('should prefer an explicit userMessage when present', () => {
      const custom = Object.assign(new Error('raw'), {
        userMessage: 'Friendly thing happened.',
      });
      expect(ErrorHandler.getUserMessage(custom)).toBe(
        'Friendly thing happened.'
      );
    });

    it('should fall back to a generic message for unknown errors', () => {
      const unknown = new Error('totally novel failure');
      expect(ErrorHandler.getUserMessage(unknown)).toBe(
        'An unexpected error occurred. Please try again.'
      );
    });
  });

  describe('createError factory', () => {
    it('should attach code and userMessage', () => {
      const err = ErrorHandler.createError(
        'tech message',
        'VALIDATION_ERROR',
        'Please fix your input.'
      );
      expect(err.message).toBe('tech message');
      expect(err.code).toBe('VALIDATION_ERROR');
      expect(err.userMessage).toBe('Please fix your input.');
      expect(ErrorHandler.getUserMessage(err)).toBe('Please fix your input.');
    });
  });

  describe('handle()', () => {
    it('should log the error with its context', () => {
      const error = new Error('Test error');
      ErrorHandler.handle(error, 'login');
      expect(logger.error).toHaveBeenCalledWith('Error in login:', error);
    });
  });
});
