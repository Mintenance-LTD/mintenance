import { ErrorType, NetworkError, ApiError } from '../ErrorHandler';

describe('api-client ErrorHandler', () => {
  describe('ErrorType enum', () => {
    it('should define all error types', () => {
      expect(ErrorType.NETWORK).toBe('NETWORK');
      expect(ErrorType.API).toBe('API');
      expect(ErrorType.VALIDATION).toBe('VALIDATION');
      expect(ErrorType.AUTHENTICATION).toBe('AUTHENTICATION');
      expect(ErrorType.AUTHORIZATION).toBe('AUTHORIZATION');
      expect(ErrorType.NOT_FOUND).toBe('NOT_FOUND');
      expect(ErrorType.SERVER).toBe('SERVER');
      expect(ErrorType.UNKNOWN).toBe('UNKNOWN');
    });
  });

  describe('NetworkError', () => {
    it('should create a NetworkError with message', () => {
      const error = new NetworkError('Connection failed');
      expect(error.message).toBe('Connection failed');
      expect(error.type).toBe(ErrorType.NETWORK);
      expect(error.code).toBe('NETWORK_ERROR');
      expect(error.statusCode).toBe(0);
      expect(error.name).toBe('NetworkError');
    });

    it('should capture original error', () => {
      const original = new Error('ECONNREFUSED');
      const error = new NetworkError('Connection failed', original);
      expect(error.originalError).toBe(original);
    });

    it('should be an instance of Error', () => {
      const error = new NetworkError('test');
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('ApiError', () => {
    it('should create an ApiError with status code', () => {
      const error = new ApiError('Not found', 404, 'NOT_FOUND');
      expect(error.message).toBe('Not found');
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
      expect(error.type).toBe(ErrorType.API);
    });
  });
});
