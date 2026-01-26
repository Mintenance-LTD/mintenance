import { logger } from '../../utils/logger';


beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'info').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'debug').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('Logger Utility', () => {
  const originalConsole = { ...console };

  beforeEach(() => {
    console.log = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
    console.info = jest.fn();
    console.debug = jest.fn();
  });

  afterEach(() => {
    Object.assign(console, originalConsole);
  });

  describe('log levels', () => {
    it('should log info messages', () => {
      logger.info('test info');
      expect(console.info).toHaveBeenCalledWith(expect.stringContaining('test info'));
    });

    it('should log warning messages', () => {
      logger.warn('test warning');
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('test warning'));
    });

    it('should log error messages', () => {
      logger.error('test error');
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('test error'),
        undefined,
        { service: 'mobile' }
      );
    });

    it('should log debug messages', () => {
      logger.debug('test debug');
      expect(console.debug).toHaveBeenCalledWith(
        expect.stringContaining('test debug')
      );
    });
  });

  describe('error logging', () => {
    it('should handle Error objects', () => {
      const error = new Error('Test error');
      logger.error(error);
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Test error'),
        error,
        { service: 'mobile' }
      );
    });

    it('should handle error with stack trace', () => {
      const error = new Error('Stack error');
      error.stack = 'Error: Stack error\n    at test.js:1:1';
      logger.error(error);
      expect(console.error).toHaveBeenCalled();
    });
  });
});
