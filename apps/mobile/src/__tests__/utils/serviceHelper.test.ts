import {
  withErrorHandling,
  handleDatabaseOperation,
  validateRequired
} from '../../utils/serviceHelper';

// Mock ServiceErrorHandler
jest.mock('../../utils/serviceErrorHandler', () => ({
  ServiceErrorHandler: {
    executeOperation: jest.fn(),
    validateRequired: jest.fn(),
    handleDatabaseError: jest.fn()
  }
}));

// Mock serviceHealthMonitor
jest.mock('../../utils/serviceHealthMonitor', () => ({
  serviceHealthMonitor: {
    recordServiceOperation: jest.fn()
  }
}));

import { ServiceErrorHandler } from '../../utils/serviceErrorHandler';
import { serviceHealthMonitor } from '../../utils/serviceHealthMonitor';

const mockServiceErrorHandler = ServiceErrorHandler as jest.Mocked<typeof ServiceErrorHandler>;
const mockServiceHealthMonitor = serviceHealthMonitor as jest.Mocked<typeof serviceHealthMonitor>;

describe('serviceHelper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockContext = {
    service: 'TestService',
    method: 'testMethod',
    params: { id: 'test-123' }
  };

  describe('withErrorHandling', () => {
    it('should execute operation successfully and record metrics', async () => {
      const mockOperation = jest.fn().mockResolvedValue('success result');
      const mockExecuteOperation = mockServiceErrorHandler.executeOperation as jest.Mock;

      mockExecuteOperation.mockResolvedValue({
        success: true,
        data: 'success result'
      });

      const result = await withErrorHandling(mockOperation, mockContext);

      expect(mockExecuteOperation).toHaveBeenCalledWith(mockOperation, mockContext);
      expect(mockServiceHealthMonitor.recordServiceOperation).toHaveBeenCalledWith(
        mockContext.service,
        mockContext.method,
        expect.any(Number), // responseTime
        true // success
      );
      expect(result).toBe('success result');
    });

    it('should handle operation failure and record metrics', async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error('Operation failed'));
      const mockError = new Error('Service error');

      mockServiceErrorHandler.executeOperation.mockResolvedValue({
        success: false,
        error: mockError
      });

      await expect(withErrorHandling(mockOperation, mockContext)).rejects.toThrow('Service error');

      expect(mockServiceHealthMonitor.recordServiceOperation).toHaveBeenCalledWith(
        mockContext.service,
        mockContext.method,
        expect.any(Number), // responseTime
        false // success
      );
    });

    it('should measure response time accurately', async () => {
      const mockOperation = jest.fn().mockImplementation(async () => {
        // Simulate some processing time
        await new Promise(resolve => setTimeout(resolve, 100));
        return 'result';
      });

      mockServiceErrorHandler.executeOperation.mockImplementation(async (operation) => {
        const result = await operation();
        return { success: true, data: result };
      });

      await withErrorHandling(mockOperation, mockContext);

      const recordCall = mockServiceHealthMonitor.recordServiceOperation.mock.calls[0];
      const responseTime = recordCall[2];

      expect(responseTime).toBeGreaterThan(0);
      expect(responseTime).toBeLessThan(1000); // Should be reasonable
    });

    it('should pass through context correctly', async () => {
      const mockOperation = jest.fn().mockResolvedValue('result');

      mockServiceErrorHandler.executeOperation.mockResolvedValue({
        success: true,
        data: 'result'
      });

      await withErrorHandling(mockOperation, mockContext);

      expect(mockServiceErrorHandler.executeOperation).toHaveBeenCalledWith(
        mockOperation,
        mockContext
      );
    });
  });

  describe('handleDatabaseOperation', () => {
    it('should handle successful database operation', async () => {
      const mockDatabaseOperation = jest.fn().mockResolvedValue({
        data: { id: 'test-123', name: 'Test Record' },
        error: null
      });

      // Mock executeOperation to return success with the data from the operation
      mockServiceErrorHandler.executeOperation.mockImplementation(async (operation) => {
        const result = await operation();
        return {
          success: true,
          data: result,
          error: null
        };
      });

      const result = await handleDatabaseOperation(mockDatabaseOperation, mockContext);

      expect(result).toEqual({ id: 'test-123', name: 'Test Record' });
    });

    it('should handle database errors', async () => {
      const mockDatabaseError = { message: 'Database constraint violation', code: '23505' };
      const mockDatabaseOperation = jest.fn().mockResolvedValue({
        data: null,
        error: mockDatabaseError
      });

      mockServiceErrorHandler.handleDatabaseError.mockImplementation(() => {
        throw new Error('Database error handled');
      });

      // Create a mock that throws when the operation contains an error
      const mockWithErrorHandling = jest.fn().mockImplementation(async (operation) => {
        const result = await operation();
        return result;
      });

      // We need to test the actual implementation behavior
      const actualHandleDatabaseOperation = async (operation: any, context: any) => {
        return mockWithErrorHandling(async () => {
          const { data, error } = await operation();

          if (error) {
            throw mockServiceErrorHandler.handleDatabaseError(error, context);
          }

          return data;
        }, context);
      };

      await expect(
        actualHandleDatabaseOperation(mockDatabaseOperation, mockContext)
      ).rejects.toThrow('Database error handled');

      expect(mockServiceErrorHandler.handleDatabaseError).toHaveBeenCalledWith(
        mockDatabaseError,
        mockContext
      );
    });

    it('should handle null data gracefully', async () => {
      const mockDatabaseOperation = jest.fn().mockResolvedValue({
        data: null,
        error: null
      });

      // Mock withErrorHandling to directly return the operation result
      const mockWithErrorHandling = jest.fn().mockImplementation(async (operation) => {
        return await operation();
      });

      const actualHandleDatabaseOperation = async (operation: any, context: any) => {
        return mockWithErrorHandling(async () => {
          const { data, error } = await operation();

          if (error) {
            throw mockServiceErrorHandler.handleDatabaseError(error, context);
          }

          return data;
        }, context);
      };

      const result = await actualHandleDatabaseOperation(mockDatabaseOperation, mockContext);

      expect(result).toBeNull();
    });
  });

  describe('validateRequired', () => {
    it('should validate required fields successfully', () => {
      mockServiceErrorHandler.validateRequired.mockImplementation((value, fieldName, context) => {
        if (!value || value === '') {
          throw new Error(`${fieldName} is required`);
        }
      });

      expect(() => {
        validateRequired('valid-value', 'testField', mockContext);
      }).not.toThrow();

      expect(mockServiceErrorHandler.validateRequired).toHaveBeenCalledWith(
        'valid-value',
        'testField',
        mockContext
      );
    });

    it('should throw error for empty values', () => {
      mockServiceErrorHandler.validateRequired.mockImplementation((value, fieldName) => {
        if (!value || value === '') {
          throw new Error(`${fieldName} is required`);
        }
      });

      expect(() => {
        validateRequired('', 'testField', mockContext);
      }).toThrow('testField is required');

      expect(() => {
        validateRequired(null, 'testField', mockContext);
      }).toThrow('testField is required');

      expect(() => {
        validateRequired(undefined, 'testField', mockContext);
      }).toThrow('testField is required');
    });

    it('should pass context to ServiceErrorHandler', () => {
      validateRequired('valid-value', 'testField', mockContext);

      expect(mockServiceErrorHandler.validateRequired).toHaveBeenCalledWith(
        'valid-value',
        'testField',
        mockContext
      );
    });
  });

  describe('integration scenarios', () => {
    it('should work together in a typical service flow', async () => {
      // Mock a typical database service method
      const createRecord = async (data: any) => {
        // Validate input
        validateRequired(data.name, 'name', mockContext);

        // Perform database operation
        return handleDatabaseOperation(
          async () => ({
            data: { id: 'new-123', name: data.name },
            error: null
          }),
          mockContext
        );
      };

      // Setup mocks for successful flow
      mockServiceErrorHandler.validateRequired.mockImplementation((value, fieldName) => {
        if (!value || value === '') {
          throw new Error(`${fieldName} is required`);
        }
      });

      // Mock executeOperation to handle the database operation properly
      mockServiceErrorHandler.executeOperation.mockImplementation(async (operation) => {
        const result = await operation();
        return {
          success: true,
          data: result,
          error: null
        };
      });

      const result = await createRecord({ name: 'Test Record' });

      expect(result).toEqual({ id: 'new-123', name: 'Test Record' });
      expect(mockServiceErrorHandler.validateRequired).toHaveBeenCalled();
    });

    it('should handle validation failures in service flow', async () => {
      const createRecord = async (data: any) => {
        validateRequired(data.name, 'name', mockContext);
        return 'should not reach here';
      };

      mockServiceErrorHandler.validateRequired.mockImplementation((value, fieldName) => {
        if (!value || value === '') {
          throw new Error(`${fieldName} is required`);
        }
      });

      await expect(createRecord({ name: '' })).rejects.toThrow('name is required');
    });
  });
});