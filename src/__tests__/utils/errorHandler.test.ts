import React from 'react';
import { ErrorHandler, handleError, safeAsync } from '../../utils/errorHandler';
import { Alert } from 'react-native';

jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn(),
  },
}));

const mockAlert = Alert.alert as jest.MockedFunction<typeof Alert.alert>;

describe('ErrorHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.error = jest.fn();
  });

  describe('handle', () => {
    it('should display user-friendly error message', () => {
      const error = { message: 'Network error', userMessage: 'Please check your connection' };
      
      ErrorHandler.handle(error, 'test context');
      
      expect(mockAlert).toHaveBeenCalledWith('Error', 'Please check your connection');
      expect(console.error).toHaveBeenCalledWith('Error in test context:', error);
    });

    it('should handle database duplicate key errors', () => {
      const error = { message: 'duplicate key violation' };
      
      ErrorHandler.handle(error);
      
      expect(mockAlert).toHaveBeenCalledWith('Error', 'This record already exists.');
    });

    it('should handle permission denied errors', () => {
      const error = { code: '42501' };
      
      ErrorHandler.handle(error);
      
      expect(mockAlert).toHaveBeenCalledWith('Error', 'You do not have permission to perform this action.');
    });

    it('should handle HTTP status code errors', () => {
      const error = { statusCode: 404 };
      
      ErrorHandler.handle(error);
      
      expect(mockAlert).toHaveBeenCalledWith('Error', 'The requested item was not found.');
    });

    it('should provide generic fallback message', () => {
      const error = { message: 'Unknown error' };
      
      ErrorHandler.handle(error);
      
      expect(mockAlert).toHaveBeenCalledWith('Error', 'An unexpected error occurred. Please try again.');
    });
  });

  describe('getUserMessage', () => {
    it('should return custom user message when provided', () => {
      const error = { userMessage: 'Custom error message' };
      
      const message = ErrorHandler.getUserMessage(error);
      
      expect(message).toBe('Custom error message');
    });

    it('should handle network errors', () => {
      const error = { code: 'NETWORK_ERROR' };
      
      const message = ErrorHandler.getUserMessage(error);
      
      expect(message).toBe('Please check your internet connection and try again.');
    });

    it('should handle various HTTP status codes', () => {
      const testCases = [
        { statusCode: 400, expected: 'Invalid request. Please check your input and try again.' },
        { statusCode: 401, expected: 'Please log in to continue.' },
        { statusCode: 403, expected: 'You do not have permission to perform this action.' },
        { statusCode: 500, expected: 'Server error. Please try again later.' },
      ];

      testCases.forEach(({ statusCode, expected }) => {
        const error = { statusCode };
        const message = ErrorHandler.getUserMessage(error);
        expect(message).toBe(expected);
      });
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
    });
  });

  describe('isNetworkError', () => {
    it('should identify network errors', () => {
      const networkErrors = [
        { code: 'NETWORK_ERROR' },
        { message: 'Network request failed' },
      ];

      networkErrors.forEach(error => {
        expect(ErrorHandler.isNetworkError(error)).toBe(true);
      });
    });

    it('should not identify non-network errors as network errors', () => {
      const error = { code: 'VALIDATION_ERROR' };
      expect(ErrorHandler.isNetworkError(error)).toBe(false);
    });
  });

  describe('safeAsync', () => {
    it('should return result on success', async () => {
      const mockPromise = Promise.resolve('success');
      
      const [result, error] = await safeAsync(mockPromise);
      
      expect(result).toBe('success');
      expect(error).toBeNull();
    });

    it('should return error on failure', async () => {
      const mockError = new Error('Test error');
      const mockPromise = Promise.reject(mockError);
      
      const [result, error] = await safeAsync(mockPromise);
      
      expect(result).toBeNull();
      expect(error).toEqual(mockError);
    });
  });
});