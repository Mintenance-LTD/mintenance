import { ErrorHandler } from '../../utils/errorHandler';

jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('ErrorHandler Utility', () => {
  describe('error messaging', () => {
    it('should derive user-friendly messages', () => {
      expect(
        ErrorHandler.getUserMessage({ userMessage: 'User-friendly error' })
      ).toBe('User-friendly error');
      expect(
        ErrorHandler.getUserMessage(new Error('Invalid login credentials'))
      ).toBe(
        'Invalid email or password. Please check your credentials and try again.'
      );
    });

    it('should detect network errors', () => {
      expect(ErrorHandler.isNetworkError(new Error('Network request failed'))).toBe(
        true
      );
    });
  });

  describe('error recovery', () => {
    it('should attempt recovery with retry logic', async () => {
      let attempts = 0;
      const failingFunc = jest.fn(async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Network request failed');
        }
        return 'Success';
      });

      const result = await ErrorHandler.withRetry(failingFunc, {
        maxAttempts: 3,
        delay: 0,
        backoff: false,
      });

      expect(result).toBe('Success');
      expect(failingFunc).toHaveBeenCalledTimes(3);
    });

    it('should fail after max retries', async () => {
      const failingFunc = jest.fn(async () => {
        throw new Error('Network request failed');
      });

      await expect(
        ErrorHandler.withRetry(failingFunc, {
          maxAttempts: 2,
          delay: 0,
          backoff: false,
        })
      ).rejects.toThrow('Network request failed');
      expect(failingFunc).toHaveBeenCalledTimes(2);
    });
  });
});
