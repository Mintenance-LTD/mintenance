import { ErrorHandler, errorHandler } from '../../utils/errorHandler';

describe('ErrorHandler Utility', () => {
  describe('error capture', () => {
    it('should capture and log errors', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const error = new Error('Test error');

      errorHandler.captureError(error);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Test error'));
      consoleSpy.mockRestore();
    });

    it('should extract error message from various formats', () => {
      expect(errorHandler.getMessage(new Error('Error object'))).toBe('Error object');
      expect(errorHandler.getMessage('String error')).toBe('String error');
      expect(errorHandler.getMessage({ message: 'Object error' })).toBe('Object error');
      expect(errorHandler.getMessage(null)).toBe('Unknown error');
    });

    it('should categorize errors by type', () => {
      expect(errorHandler.getErrorType(new TypeError())).toBe('TypeError');
      expect(errorHandler.getErrorType(new ReferenceError())).toBe('ReferenceError');
      expect(errorHandler.getErrorType(new Error())).toBe('Error');
    });
  });

  describe('error recovery', () => {
    it('should attempt recovery with retry logic', async () => {
      let attempts = 0;
      const failingFunc = jest.fn(() => {
        attempts++;
        if (attempts < 3) throw new Error('Retry me');
        return 'Success';
      });

      const result = await errorHandler.withRetry(failingFunc, 3);

      expect(result).toBe('Success');
      expect(failingFunc).toHaveBeenCalledTimes(3);
    });

    it('should fail after max retries', async () => {
      const failingFunc = jest.fn(() => {
        throw new Error('Always fails');
      });

      await expect(errorHandler.withRetry(failingFunc, 2)).rejects.toThrow('Always fails');
      expect(failingFunc).toHaveBeenCalledTimes(2);
    });
  });
});