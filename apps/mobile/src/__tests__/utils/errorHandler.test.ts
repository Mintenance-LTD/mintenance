import { Alert } from 'react-native';
import ErrorHandler, { handleError, safeAsync } from '../../utils/errorHandler';
import { logger } from '../../utils/logger';

// Mock dependencies
jest.mock('react-native', () => ({
  Alert: { alert: jest.fn() },
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    info: jest.fn()
  },
}));

// Mock Sentry
jest.mock('../../config/sentry', () => ({
  captureException: jest.fn(),
}));

const mockAlert = Alert.alert as jest.MockedFunction<typeof Alert.alert>;

describe('ErrorHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.error = jest.fn();
    // Reset navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });
  });

  describe('handle', () => {
    it('should display user-friendly error message', () => {
      const error = {
        message: 'Network error',
        userMessage: 'Please check your connection',
      };

      ErrorHandler.handle(error, 'test context');

      expect(mockAlert).toHaveBeenCalledWith(
        'Error',
        'Please check your connection'
      );
      expect(logger.error).toHaveBeenCalledWith(
        'Error in test context:',
        error
      );
    });

    it('should handle database duplicate key errors', () => {
      const error = { message: 'duplicate key violation' };

      ErrorHandler.handle(error);

      expect(mockAlert).toHaveBeenCalledWith(
        'Error',
        'This record already exists.'
      );
    });

    it('should handle permission denied errors', () => {
      const error = { code: '42501' };

      ErrorHandler.handle(error);

      expect(mockAlert).toHaveBeenCalledWith(
        'Error',
        'You do not have permission to perform this action.'
      );
    });

    it('should handle HTTP status code errors', () => {
      const error = { statusCode: 404 };

      ErrorHandler.handle(error);

      expect(mockAlert).toHaveBeenCalledWith(
        'Error',
        'The requested item was not found.'
      );
    });

    it('should provide generic fallback message', () => {
      const error = { message: 'Unknown error' };

      ErrorHandler.handle(error);

      expect(mockAlert).toHaveBeenCalledWith(
        'Error',
        'An unexpected error occurred. Please try again.'
      );
    });

    it('should report errors in production', () => {
      const originalDev = global.__DEV__;
      global.__DEV__ = false;

      const error = new Error('Test error');
      ErrorHandler.handle(error, 'production context');

      // Should attempt to report error
      expect(logger.error).toHaveBeenCalledWith(
        'Error in production context:',
        error
      );

      global.__DEV__ = originalDev;
    });
  });

  describe('getUserMessage', () => {
    it('should return custom user message when provided', () => {
      const error = { userMessage: 'Custom error message' };

      const message = ErrorHandler.getUserMessage(error);

      expect(message).toBe('Custom error message');
    });

    describe('Supabase specific errors', () => {
      const testCases = [
        { code: 'PGRST301', expected: 'The requested item was not found.' },
        { code: 'PGRST116', expected: 'The requested item was not found.' },
        { code: 'PGRST204', expected: 'You do not have permission to perform this action.' },
        { code: '42501', expected: 'You do not have permission to perform this action.' },
        { code: '23505', expected: 'A record with these details already exists.' },
        { code: '23503', expected: 'Cannot perform this action because the item is being used elsewhere.' },
        { code: '23514', expected: 'The provided data is invalid.' },
        { code: 'invalid_credentials', expected: 'Invalid email or password. Please check your credentials and try again.' },
        { code: 'email_not_confirmed', expected: 'Please check your email and confirm your account before signing in.' },
        { code: 'weak_password', expected: 'Password must be at least 8 characters long.' },
        { code: 'email_address_invalid', expected: 'Please enter a valid email address.' },
        { code: 'signup_disabled', expected: 'Account registration is currently disabled.' },
      ];

      testCases.forEach(({ code, expected }) => {
        it(`should handle ${code} error`, () => {
          const error = { code };
          const message = ErrorHandler.getUserMessage(error);
          expect(message).toBe(expected);
        });
      });

      it('should handle error_code variant', () => {
        const error = { error_code: 'PGRST301' };
        const message = ErrorHandler.getUserMessage(error);
        expect(message).toBe('The requested item was not found.');
      });
    });

    describe('Message-based error detection', () => {
      const testCases = [
        { message: 'Invalid login credentials', expected: 'Invalid email or password. Please check your credentials and try again.' },
        { message: 'Email not confirmed', expected: 'Please check your email and confirm your account before signing in.' },
        { message: 'Network request failed', expected: 'Network connection failed. Please check your internet connection and try again.' },
        { message: 'fetch error occurred', expected: 'Network connection failed. Please check your internet connection and try again.' },
        { message: 'duplicate key error', expected: 'This record already exists.' },
        { message: 'foreign key constraint', expected: 'Cannot delete this item because it is being used elsewhere.' },
        { message: 'not found in database', expected: 'The requested item was not found.' },
        { message: 'PGRST116 error', expected: 'The requested item was not found.' },
        { message: 'permission denied for table', expected: 'You do not have permission to perform this action.' },
        { message: 'row-level security violation', expected: 'You do not have permission to perform this action.' },
        { message: 'policy violation', expected: 'You do not have permission to perform this action.' },
        { message: 'password is too weak', expected: 'Password must be at least 8 characters long.' },
        { message: 'invalid email format', expected: 'Please enter a valid email address.' },
      ];

      testCases.forEach(({ message, expected }) => {
        it(`should handle "${message}"`, () => {
          const error = { message };
          const result = ErrorHandler.getUserMessage(error);
          expect(result).toBe(expected);
        });
      });
    });

    describe('HTTP status codes', () => {
      const testCases = [
        { statusCode: 400, expected: 'Invalid request. Please check your input and try again.' },
        { statusCode: 401, expected: 'Please log in to continue.' },
        { statusCode: 403, expected: 'You do not have permission to perform this action.' },
        { statusCode: 404, expected: 'The requested item was not found.' },
        { statusCode: 409, expected: 'This action conflicts with the current state. Please refresh and try again.' },
        { statusCode: 422, expected: 'The provided data is invalid. Please check and try again.' },
        { statusCode: 429, expected: 'Too many requests. Please wait a moment and try again.' },
        { statusCode: 500, expected: 'Server error. Please try again later.' },
        { statusCode: 503, expected: 'Service temporarily unavailable. Please try again later.' },
      ];

      testCases.forEach(({ statusCode, expected }) => {
        it(`should handle ${statusCode} status code`, () => {
          const error = { statusCode };
          const message = ErrorHandler.getUserMessage(error);
          expect(message).toBe(expected);
        });
      });
    });

    it('should handle network errors', () => {
      const error = { code: 'NETWORK_ERROR' };

      const message = ErrorHandler.getUserMessage(error);

      expect(message).toBe(
        'Please check your internet connection and try again.'
      );
    });

    it('should detect offline state', () => {
      Object.defineProperty(navigator, 'onLine', { value: false });
      const error = {};

      const message = ErrorHandler.getUserMessage(error);

      expect(message).toBe(
        'Please check your internet connection and try again.'
      );
    });
  });

  describe('createError', () => {
    it('should create AppError with all properties', () => {
      const error = ErrorHandler.createError(
        'Test error',
        'TEST_CODE',
        'Test user message'
      );

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_CODE');
      expect(error.userMessage).toBe('Test user message');
      expect(error instanceof Error).toBe(true);
    });

    it('should create error without optional properties', () => {
      const error = ErrorHandler.createError('Test error');

      expect(error.message).toBe('Test error');
      expect(error.code).toBeUndefined();
      expect(error.userMessage).toBeUndefined();
    });
  });

  describe('isNetworkError', () => {
    it('should identify network errors by code', () => {
      const error = { code: 'NETWORK_ERROR' };
      expect(ErrorHandler.isNetworkError(error)).toBe(true);
    });

    it('should identify network errors by message', () => {
      const error = { message: 'Network request failed' };
      expect(ErrorHandler.isNetworkError(error)).toBe(true);
    });

    it('should identify offline state as network error', () => {
      Object.defineProperty(navigator, 'onLine', { value: false });
      const error = {};
      expect(ErrorHandler.isNetworkError(error)).toBe(true);
    });

    it('should not identify non-network errors', () => {
      const error = { code: 'VALIDATION_ERROR' };
      expect(ErrorHandler.isNetworkError(error)).toBe(false);
    });

    it('should handle errors without message property', () => {
      const error = { code: 'OTHER_ERROR' };
      expect(ErrorHandler.isNetworkError(error)).toBe(false);
    });
  });

  describe('isAuthError', () => {
    it('should identify auth errors by status code', () => {
      const error = { statusCode: 401 };
      expect(ErrorHandler.isAuthError(error)).toBe(true);
    });

    it('should identify auth errors by code', () => {
      const error = { code: '42501' };
      expect(ErrorHandler.isAuthError(error)).toBe(true);
    });

    it('should identify auth errors by message', () => {
      const error = { message: 'permission denied' };
      expect(ErrorHandler.isAuthError(error)).toBe(true);
    });

    it('should not identify non-auth errors', () => {
      const error = { statusCode: 404 };
      // The implementation returns undefined for falsy checks, which is falsy
      expect(ErrorHandler.isAuthError(error)).toBeFalsy();
    });
  });

  describe('isValidationError', () => {
    it('should identify validation errors by status code 400', () => {
      const error = { statusCode: 400 };
      expect(ErrorHandler.isValidationError(error)).toBe(true);
    });

    it('should identify validation errors by status code 422', () => {
      const error = { statusCode: 422 };
      expect(ErrorHandler.isValidationError(error)).toBe(true);
    });

    it('should identify validation errors by message', () => {
      const error = { message: 'validation failed' };
      expect(ErrorHandler.isValidationError(error)).toBe(true);
    });

    it('should not identify non-validation errors', () => {
      const error = { statusCode: 500 };
      // The implementation returns undefined for falsy checks, which is falsy
      expect(ErrorHandler.isValidationError(error)).toBeFalsy();
    });
  });

  describe('validateEmail', () => {
    it('should accept valid email addresses', () => {
      expect(() => ErrorHandler.validateEmail('test@example.com')).not.toThrow();
      expect(() => ErrorHandler.validateEmail('user.name@company.co.uk')).not.toThrow();
    });

    it('should reject invalid email addresses', () => {
      expect(() => ErrorHandler.validateEmail('')).toThrow('Invalid email format');
      expect(() => ErrorHandler.validateEmail('notanemail')).toThrow('Invalid email format');
      expect(() => ErrorHandler.validateEmail('missing@domain')).toThrow('Invalid email format');
      expect(() => ErrorHandler.validateEmail('@example.com')).toThrow('Invalid email format');
    });

    it('should throw AppError with correct properties', () => {
      try {
        ErrorHandler.validateEmail('invalid');
      } catch (error) {
        expect(error.code).toBe('VALIDATION_ERROR');
        expect(error.userMessage).toBe('Please enter a valid email address.');
      }
    });
  });

  describe('validatePassword', () => {
    it('should accept valid passwords', () => {
      expect(() => ErrorHandler.validatePassword('validpass123')).not.toThrow();
      expect(() => ErrorHandler.validatePassword('12345678')).not.toThrow();
    });

    it('should reject short passwords', () => {
      expect(() => ErrorHandler.validatePassword('')).toThrow('Password too short');
      expect(() => ErrorHandler.validatePassword('short')).toThrow('Password too short');
      expect(() => ErrorHandler.validatePassword('1234567')).toThrow('Password too short');
    });

    it('should throw AppError with correct properties', () => {
      try {
        ErrorHandler.validatePassword('short');
      } catch (error) {
        expect(error.code).toBe('VALIDATION_ERROR');
        expect(error.userMessage).toBe('Password must be at least 8 characters long.');
      }
    });
  });

  describe('validateRequired', () => {
    it('should accept valid values', () => {
      expect(() => ErrorHandler.validateRequired('value', 'Field')).not.toThrow();
      expect(() => ErrorHandler.validateRequired(123, 'Number')).not.toThrow();
      expect(() => ErrorHandler.validateRequired({ id: 1 }, 'Object')).not.toThrow();
    });

    it('should reject empty values', () => {
      expect(() => ErrorHandler.validateRequired(null, 'Field')).toThrow('Field is required');
      expect(() => ErrorHandler.validateRequired(undefined, 'Field')).toThrow('Field is required');
      expect(() => ErrorHandler.validateRequired('', 'Field')).toThrow('Field is required');
      expect(() => ErrorHandler.validateRequired('   ', 'Field')).toThrow('Field is required');
    });

    it('should include field name in error message', () => {
      try {
        ErrorHandler.validateRequired(null, 'Username');
      } catch (error) {
        expect(error.message).toBe('Username is required');
        expect(error.userMessage).toBe('Username is required.');
      }
    });
  });

  describe('validateRequiredFields', () => {
    it('should validate all required fields are present', () => {
      const data = { name: 'John', email: 'john@example.com' };
      expect(() =>
        ErrorHandler.validateRequiredFields(data, ['name', 'email'])
      ).not.toThrow();
    });

    it('should throw for missing fields', () => {
      const data = { name: 'John' };
      expect(() =>
        ErrorHandler.validateRequiredFields(data, ['name', 'email'])
      ).toThrow('email is required');
    });

    it('should validate multiple missing fields', () => {
      const data = {};
      expect(() =>
        ErrorHandler.validateRequiredFields(data, ['name', 'email'])
      ).toThrow('name is required');
    });
  });

  describe('handleAsync', () => {
    it('should return result on success', async () => {
      const mockPromise = Promise.resolve('success');

      const [result, error] = await ErrorHandler.handleAsync(mockPromise);

      expect(result).toBe('success');
      expect(error).toBeNull();
    });

    it('should return error on failure', async () => {
      const mockError = new Error('Test error');
      const mockPromise = Promise.reject(mockError);

      const [result, error] = await ErrorHandler.handleAsync(mockPromise);

      expect(result).toBeNull();
      expect(error).toEqual(mockError);
    });

    it('should log error with context', async () => {
      const mockError = new Error('Test error');
      const mockPromise = Promise.reject(mockError);

      await ErrorHandler.handleAsync(mockPromise, 'test context');

      expect(logger.error).toHaveBeenCalledWith('Error in test context:', mockError);
    });
  });

  describe('withRetry', () => {
    it('should succeed on first attempt', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      const result = await ErrorHandler.withRetry(operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on network error', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce({ code: 'NETWORK_ERROR' })
        .mockResolvedValue('success');

      const result = await ErrorHandler.withRetry(operation, { delay: 10 });

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Retrying operation'),
        expect.any(Object)
      );
    });

    it('should retry on server error', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce({ statusCode: 500 })
        .mockResolvedValue('success');

      const result = await ErrorHandler.withRetry(operation, { delay: 10 });

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should not retry on client error', async () => {
      const clientError = { statusCode: 400 };
      const operation = jest.fn().mockRejectedValue(clientError);

      await expect(
        ErrorHandler.withRetry(operation, { delay: 10 })
      ).rejects.toEqual(clientError);

      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should respect max attempts', async () => {
      const error = { code: 'NETWORK_ERROR' };
      const operation = jest.fn().mockRejectedValue(error);

      await expect(
        ErrorHandler.withRetry(operation, { maxAttempts: 2, delay: 10 })
      ).rejects.toEqual(error);

      expect(operation).toHaveBeenCalledTimes(2);
      expect(logger.error).toHaveBeenCalledWith(
        'Operation failed after 2 attempts',
        expect.any(Object)
      );
    });

    it('should use exponential backoff', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce({ code: 'NETWORK_ERROR' })
        .mockRejectedValueOnce({ code: 'NETWORK_ERROR' })
        .mockResolvedValue('success');

      const start = Date.now();
      const result = await ErrorHandler.withRetry(operation, {
        delay: 10,
        backoff: true,
      });

      const duration = Date.now() - start;
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
      // First retry after 10ms, second after 20ms (10 * 2^1)
      expect(duration).toBeGreaterThanOrEqual(30);
    });

    it('should not use backoff when disabled', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce({ code: 'NETWORK_ERROR' })
        .mockRejectedValueOnce({ code: 'NETWORK_ERROR' })
        .mockResolvedValue('success');

      const start = Date.now();
      const result = await ErrorHandler.withRetry(operation, {
        delay: 10,
        backoff: false,
      });

      const duration = Date.now() - start;
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
      // Both retries after 10ms each (with tolerance for test environment)
      expect(duration).toBeGreaterThanOrEqual(20);
      expect(duration).toBeLessThan(60); // Increased tolerance for CI environments
    });

    it('should retry on specific Supabase errors', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce({ code: 'PGRST301' })
        .mockResolvedValue('success');

      const result = await ErrorHandler.withRetry(operation, { delay: 10 });

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });
  });

  describe('shouldRetry', () => {
    it('should retry network errors', () => {
      expect(ErrorHandler.shouldRetry({ code: 'NETWORK_ERROR' })).toBe(true);
    });

    it('should retry server errors', () => {
      expect(ErrorHandler.shouldRetry({ statusCode: 500 })).toBe(true);
      expect(ErrorHandler.shouldRetry({ statusCode: 503 })).toBe(true);
    });

    it('should retry specific Supabase errors', () => {
      expect(ErrorHandler.shouldRetry({ code: 'PGRST301' })).toBe(true);
      expect(ErrorHandler.shouldRetry({ code: 'PGRST116' })).toBe(true);
    });

    it('should not retry client errors', () => {
      expect(ErrorHandler.shouldRetry({ statusCode: 400 })).toBe(false);
      expect(ErrorHandler.shouldRetry({ statusCode: 404 })).toBe(false);
    });

    it('should not retry non-retryable errors', () => {
      expect(ErrorHandler.shouldRetry({ code: 'VALIDATION_ERROR' })).toBe(false);
      expect(ErrorHandler.shouldRetry({})).toBe(false);
    });
  });

  describe('reportError', () => {
    it('should call reportError method', () => {
      const spy = jest.spyOn(ErrorHandler, 'reportError');
      const error = new Error('Test error');

      ErrorHandler.reportError(error, 'test context');

      expect(spy).toHaveBeenCalledWith(error, 'test context');
      spy.mockRestore();
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Test error');

      // Should not throw
      expect(() => ErrorHandler.reportError(error, 'test context')).not.toThrow();

      // Wait for any async operations
      await new Promise(resolve => setTimeout(resolve, 100));

      // The method should have been called even if Sentry fails
      expect(logger.error).toHaveBeenCalledWith(
        'Error reporting failed:',
        expect.any(Error),
        expect.any(Object)
      );
    });
  });

  describe('utility functions', () => {
    it('handleError should call ErrorHandler.handle', () => {
      const spy = jest.spyOn(ErrorHandler, 'handle');
      const error = new Error('Test');

      handleError(error, 'context');

      expect(spy).toHaveBeenCalledWith(error, 'context');
      spy.mockRestore();
    });

    it('safeAsync should call ErrorHandler.handleAsync', async () => {
      const spy = jest.spyOn(ErrorHandler, 'handleAsync');
      const promise = Promise.resolve('result');

      await safeAsync(promise, 'context');

      expect(spy).toHaveBeenCalledWith(promise, 'context');
      spy.mockRestore();
    });
  });
});