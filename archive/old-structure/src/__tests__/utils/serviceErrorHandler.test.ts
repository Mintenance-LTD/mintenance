import { ServiceErrorHandler, ServiceErrorContext, ServiceOperationResult } from '../../utils/serviceErrorHandler';
import { ErrorCategory, ErrorSeverity } from '../../utils/errorHandling';

// Mock dependencies
jest.mock('../../utils/errorHandling', () => ({
  ErrorHandlingService: {
    handleError: jest.fn((error, context) => ({
      id: 'error-123',
      message: error.message,
      userMessage: 'User friendly message',
      category: context.category || 'UNKNOWN',
      severity: 'MEDIUM',
      context,
      originalError: error,
    })),
    createError: jest.fn((message, userMessage, category, severity, context, originalError) => ({
      id: 'error-456',
      message,
      userMessage,
      category,
      severity,
      context,
      originalError,
    })),
  },
  ErrorCategory: {
    DATABASE: 'DATABASE',
    NETWORK: 'NETWORK',
    VALIDATION: 'VALIDATION',
    UNKNOWN: 'UNKNOWN',
  },
  ErrorSeverity: {
    LOW: 'LOW',
    MEDIUM: 'MEDIUM',
    HIGH: 'HIGH',
    CRITICAL: 'CRITICAL',
  },
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
});

const { ErrorHandlingService } = require('../../utils/errorHandling');
const { logger } = require('../../utils/logger');

describe('ServiceErrorHandler', () => {
  const mockContext: ServiceErrorContext = {
    service: 'TestService',
    method: 'testMethod',
    params: { id: '123' },
    userId: 'user-123',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (navigator as any).onLine = true;
  });

  describe('executeOperation', () => {
    it('should return success result when operation succeeds', async () => {
      const operation = jest.fn().mockResolvedValue({ data: 'test' });

      const result = await ServiceErrorHandler.executeOperation(operation, mockContext);

      expect(result).toEqual({
        data: { data: 'test' },
        success: true,
      });
      expect(operation).toHaveBeenCalledTimes(1);
      expect(ErrorHandlingService.handleError).not.toHaveBeenCalled();
    });

    it('should handle operation errors and return error result', async () => {
      const mockError = new Error('Operation failed');
      const operation = jest.fn().mockRejectedValue(mockError);

      const result = await ServiceErrorHandler.executeOperation(operation, mockContext);

      expect(result).toEqual({
        error: mockError,
        success: false,
      });
      expect(ErrorHandlingService.handleError).toHaveBeenCalledWith(
        mockError,
        mockContext,
        true
      );
      expect(logger.error).toHaveBeenCalledWith(
        'Service operation failed in TestService.testMethod',
        {
          errorId: 'error-123',
          context: mockContext,
          originalError: mockError,
        }
      );
    });

    it('should respect showUserAlert parameter', async () => {
      const mockError = new Error('Operation failed');
      const operation = jest.fn().mockRejectedValue(mockError);

      await ServiceErrorHandler.executeOperation(operation, mockContext, false);

      expect(ErrorHandlingService.handleError).toHaveBeenCalledWith(
        mockError,
        mockContext,
        false
      );
    });
  });

  describe('handleDatabaseError', () => {
    it('should handle not found errors with low severity', () => {
      const error = { code: 'PGRST116', message: 'Not found' };

      const result = ServiceErrorHandler.handleDatabaseError(error, mockContext);

      expect(ErrorHandlingService.createError).toHaveBeenCalledWith(
        'Not found',
        'The requested item was not found.',
        'DATABASE',
        'LOW',
        {
          ...mockContext,
          category: 'DATABASE',
        },
        error
      );
    });

    it('should handle permission errors with high severity', () => {
      const error = { code: '42501', message: 'Permission denied' };

      ServiceErrorHandler.handleDatabaseError(error, mockContext);

      expect(ErrorHandlingService.createError).toHaveBeenCalledWith(
        'Permission denied',
        'You do not have permission to perform this action.',
        'DATABASE',
        'HIGH',
        {
          ...mockContext,
          category: 'DATABASE',
        },
        error
      );
    });

    it('should handle generic database errors with medium severity', () => {
      const error = { code: 'UNKNOWN', message: 'Database error' };

      ServiceErrorHandler.handleDatabaseError(error, mockContext);

      expect(ErrorHandlingService.createError).toHaveBeenCalledWith(
        'Database error',
        'A database error occurred. Please try again.',
        'DATABASE',
        'MEDIUM',
        {
          ...mockContext,
          category: 'DATABASE',
        },
        error
      );
    });

    it('should handle errors without message', () => {
      const error = { code: 'UNKNOWN' };

      ServiceErrorHandler.handleDatabaseError(error, mockContext);

      expect(ErrorHandlingService.createError).toHaveBeenCalledWith(
        'Database operation failed',
        'A database error occurred. Please try again.',
        'DATABASE',
        'MEDIUM',
        {
          ...mockContext,
          category: 'DATABASE',
        },
        error
      );
    });
  });

  describe('handleValidationError', () => {
    it('should create validation error with correct parameters', () => {
      const message = 'Field is required';
      const field = 'email';

      ServiceErrorHandler.handleValidationError(message, field, mockContext);

      expect(ErrorHandlingService.createError).toHaveBeenCalledWith(
        'Validation failed for email: Field is required',
        message,
        'VALIDATION',
        'LOW',
        {
          ...mockContext,
          metadata: { field, ...mockContext.metadata },
        }
      );
    });

    it('should preserve existing metadata', () => {
      const contextWithMetadata = {
        ...mockContext,
        metadata: { existing: 'data' },
      };

      ServiceErrorHandler.handleValidationError('Error', 'field', contextWithMetadata);

      expect(ErrorHandlingService.createError).toHaveBeenCalledWith(
        'Validation failed for field: Error',
        'Error',
        'VALIDATION',
        'LOW',
        {
          ...contextWithMetadata,
          metadata: { field: 'field', existing: 'data' },
        }
      );
    });
  });

  describe('handleNetworkError', () => {
    it('should handle server errors with high severity', () => {
      const error = { status: 500, message: 'Internal server error' };

      ServiceErrorHandler.handleNetworkError(error, mockContext);

      expect(ErrorHandlingService.createError).toHaveBeenCalledWith(
        'Internal server error',
        'Server is currently unavailable. Please try again later.',
        'NETWORK',
        'HIGH',
        {
          ...mockContext,
          category: 'NETWORK',
        },
        error
      );
    });

    it('should handle auth errors with high severity', () => {
      const error = { status: 401, message: 'Unauthorized' };

      ServiceErrorHandler.handleNetworkError(error, mockContext);

      expect(ErrorHandlingService.createError).toHaveBeenCalledWith(
        'Unauthorized',
        'Your session has expired. Please log in again.',
        'NETWORK',
        'HIGH',
        {
          ...mockContext,
          category: 'NETWORK',
        },
        error
      );
    });

    it('should handle client errors with medium severity', () => {
      const error = { status: 400, message: 'Bad request' };

      ServiceErrorHandler.handleNetworkError(error, mockContext);

      expect(ErrorHandlingService.createError).toHaveBeenCalledWith(
        'Bad request',
        'A network error occurred. Please try again.',
        'NETWORK',
        'MEDIUM',
        {
          ...mockContext,
          category: 'NETWORK',
        },
        error
      );
    });

    it('should handle offline errors', () => {
      (navigator as any).onLine = false;
      const error = {};

      ServiceErrorHandler.handleNetworkError(error, mockContext);

      expect(ErrorHandlingService.createError).toHaveBeenCalledWith(
        'Network operation failed',
        'No internet connection. Please check your network and try again.',
        'NETWORK',
        'MEDIUM',
        {
          ...mockContext,
          category: 'NETWORK',
        },
        error
      );
    });
  });

  describe('validateRequired', () => {
    it('should not throw for valid values', () => {
      expect(() => {
        ServiceErrorHandler.validateRequired('valid', 'field', mockContext);
      }).not.toThrow();

      expect(() => {
        ServiceErrorHandler.validateRequired(123, 'number', mockContext);
      }).not.toThrow();

      expect(() => {
        ServiceErrorHandler.validateRequired(false, 'boolean', mockContext);
      }).not.toThrow();
    });

    it('should throw for null, undefined, or empty string', () => {
      expect(() => {
        ServiceErrorHandler.validateRequired(null, 'field', mockContext);
      }).toThrow();

      expect(() => {
        ServiceErrorHandler.validateRequired(undefined, 'field', mockContext);
      }).toThrow();

      expect(() => {
        ServiceErrorHandler.validateRequired('', 'field', mockContext);
      }).toThrow();
    });
  });

  describe('validateEmail', () => {
    it('should not throw for valid email addresses', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'test+label@gmail.com',
        'user123@test-domain.org',
      ];

      validEmails.forEach(email => {
        expect(() => {
          ServiceErrorHandler.validateEmail(email, mockContext);
        }).not.toThrow();
      });
    });

    it('should throw for invalid email addresses', () => {
      const invalidEmails = [
        'invalid-email',
        '@domain.com',
        'user@',
        'user name@domain.com',
        'user@domain',
        '',
      ];

      invalidEmails.forEach(email => {
        expect(() => {
          ServiceErrorHandler.validateEmail(email, mockContext);
        }).toThrow();
      });
    });
  });

  describe('validatePassword', () => {
    it('should not throw for valid passwords', () => {
      const validPasswords = [
        'password123',
        'strongPassword',
        '12345678',
        'P@ssw0rd!',
      ];

      validPasswords.forEach(password => {
        expect(() => {
          ServiceErrorHandler.validatePassword(password, mockContext);
        }).not.toThrow();
      });
    });

    it('should throw for invalid passwords', () => {
      const invalidPasswords = [
        '',
        '1234567', // Too short
        null,
        undefined,
      ];

      invalidPasswords.forEach(password => {
        expect(() => {
          ServiceErrorHandler.validatePassword(password as any, mockContext);
        }).toThrow();
      });
    });
  });

  describe('validatePositiveNumber', () => {
    it('should not throw for positive numbers', () => {
      const validNumbers = [1, 0.1, 100, 99.99];

      validNumbers.forEach(number => {
        expect(() => {
          ServiceErrorHandler.validatePositiveNumber(number, 'field', mockContext);
        }).not.toThrow();
      });
    });

    it('should throw for zero and negative numbers', () => {
      const invalidNumbers = [0, -1, -0.1, -100];

      invalidNumbers.forEach(number => {
        expect(() => {
          ServiceErrorHandler.validatePositiveNumber(number, 'field', mockContext);
        }).toThrow();
      });
    });
  });

  describe('getDatabaseUserMessage (via handleDatabaseError)', () => {
    it('should return correct messages for various error codes', () => {
      const testCases = [
        { code: 'PGRST301', expected: 'The requested item was not found.' },
        { code: 'PGRST116', expected: 'The requested item was not found.' },
        { code: 'PGRST204', expected: 'You do not have permission to perform this action.' },
        { code: '42501', expected: 'You do not have permission to perform this action.' },
        { code: '23505', expected: 'A record with these details already exists.' },
        { code: '23503', expected: 'Cannot perform this action because the item is being used elsewhere.' },
        { code: '23514', expected: 'The provided data is invalid.' },
        { code: 'UNKNOWN', expected: 'A database error occurred. Please try again.' },
      ];

      testCases.forEach(({ code, expected }) => {
        const error = { code, message: 'Test error' };

        ServiceErrorHandler.handleDatabaseError(error, mockContext);

        expect(ErrorHandlingService.createError).toHaveBeenCalledWith(
          'Test error',
          expected,
          'DATABASE',
          expect.any(String),
          expect.any(Object),
          error
        );
      });
    });
  });

  describe('getNetworkUserMessage (via handleNetworkError)', () => {
    it('should return correct messages for various status codes', () => {
      const testCases = [
        { status: 500, expected: 'Server is currently unavailable. Please try again later.' },
        { status: 502, expected: 'Server is currently unavailable. Please try again later.' },
        { status: 401, expected: 'Your session has expired. Please log in again.' },
        { status: 403, expected: 'You do not have permission to perform this action.' },
        { status: 404, expected: 'The requested resource was not found.' },
        { status: 400, expected: 'A network error occurred. Please try again.' },
      ];

      testCases.forEach(({ status, expected }) => {
        const error = { status, message: 'Test error' };

        ServiceErrorHandler.handleNetworkError(error, mockContext);

        expect(ErrorHandlingService.createError).toHaveBeenCalledWith(
          'Test error',
          expected,
          'NETWORK',
          expect.any(String),
          expect.any(Object),
          error
        );
      });
    });

    it('should handle offline scenario', () => {
      (navigator as any).onLine = false;
      const error = { message: 'Network error' };

      ServiceErrorHandler.handleNetworkError(error, mockContext);

      expect(ErrorHandlingService.createError).toHaveBeenCalledWith(
        'Network error',
        'No internet connection. Please check your network and try again.',
        'NETWORK',
        'MEDIUM',
        expect.any(Object),
        error
      );
    });
  });
});