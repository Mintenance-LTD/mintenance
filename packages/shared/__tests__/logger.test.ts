/**
 * Logger Tests
 * 
 * Tests for production-safe logging with sensitive data sanitization
 */

import { Logger } from '../src/logger';

describe('Logger', () => {
  let logger: Logger;
  let consoleSpy: jest.SpyInstance;
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    logger = new Logger();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'debug').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    process.env.NODE_ENV = originalEnv;
  });

  describe('log levels', () => {
    test('should log info messages', () => {
      logger.info('Test message');
      expect(console.log).toHaveBeenCalled();
    });

    test('should log warn messages', () => {
      logger.warn('Warning message');
      expect(console.warn).toHaveBeenCalled();
    });

    test('should log error messages', () => {
      logger.error('Error message');
      expect(console.error).toHaveBeenCalled();
    });

    test('should log debug messages in development', () => {
      process.env.NODE_ENV = 'development';
      const devLogger = new Logger();
      devLogger.debug('Debug message');
      expect(console.debug).toHaveBeenCalled();
    });

    test('should not log debug messages in production', () => {
      process.env.NODE_ENV = 'production';
      const prodLogger = new Logger();
      prodLogger.debug('Debug message');
      expect(console.debug).not.toHaveBeenCalled();
    });
  });

  describe('sensitive data sanitization', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
      logger = new Logger();
    });

    test('should redact password field', () => {
      logger.info('User data', { email: 'user@test.com', password: 'secret123' });
      
      const loggedMessage = consoleSpy.mock.calls[0][0];
      expect(loggedMessage).toContain('user@test.com');
      expect(loggedMessage).toContain('[REDACTED]');
      expect(loggedMessage).not.toContain('secret123');
    });

    test('should redact token fields', () => {
      logger.info('Auth data', { 
        accessToken: 'abc123',
        refreshToken: 'def456',
        token: 'ghi789'
      });
      
      const loggedMessage = consoleSpy.mock.calls[0][0];
      expect(loggedMessage).not.toContain('abc123');
      expect(loggedMessage).not.toContain('def456');
      expect(loggedMessage).not.toContain('ghi789');
      expect((loggedMessage.match(/\[REDACTED\]/g) || []).length).toBe(3);
    });

    test('should redact API key fields', () => {
      logger.info('Config', { 
        apiKey: 'key123',
        api_key: 'key456',
        secret: 'mysecret'
      });
      
      const loggedMessage = consoleSpy.mock.calls[0][0];
      expect(loggedMessage).not.toContain('key123');
      expect(loggedMessage).not.toContain('key456');
      expect(loggedMessage).not.toContain('mysecret');
    });

    test('should redact credit card data', () => {
      logger.info('Payment', { 
        creditCard: '4111111111111111',
        card_number: '5555555555554444',
        cvv: '123'
      });
      
      const loggedMessage = consoleSpy.mock.calls[0][0];
      expect(loggedMessage).not.toContain('4111111111111111');
      expect(loggedMessage).not.toContain('5555555555554444');
      expect(loggedMessage).not.toContain('123');
    });

    test('should redact SSN', () => {
      logger.info('User info', { 
        ssn: '123-45-6789',
        social_security: '987-65-4321'
      });
      
      const loggedMessage = consoleSpy.mock.calls[0][0];
      expect(loggedMessage).not.toContain('123-45-6789');
      expect(loggedMessage).not.toContain('987-65-4321');
    });

    test('should redact authorization headers', () => {
      logger.info('Request', { 
        authorization: 'Bearer abc123'
      });
      
      const loggedMessage = consoleSpy.mock.calls[0][0];
      expect(loggedMessage).not.toContain('Bearer abc123');
      expect(loggedMessage).toContain('[REDACTED]');
    });

    test('should redact nested sensitive data', () => {
      logger.info('Complex object', { 
        user: {
          email: 'user@test.com',
          password: 'secret',
          profile: {
            token: 'abc123'
          }
        }
      });
      
      const loggedMessage = consoleSpy.mock.calls[0][0];
      expect(loggedMessage).toContain('user@test.com');
      expect(loggedMessage).not.toContain('secret');
      expect(loggedMessage).not.toContain('abc123');
    });

    test('should handle arrays with sensitive data', () => {
      logger.info('Users', { 
        users: [
          { name: 'User 1', password: 'pass1' },
          { name: 'User 2', password: 'pass2' }
        ]
      });
      
      const loggedMessage = consoleSpy.mock.calls[0][0];
      expect(loggedMessage).toContain('User 1');
      expect(loggedMessage).toContain('User 2');
      expect(loggedMessage).not.toContain('pass1');
      expect(loggedMessage).not.toContain('pass2');
    });

    test('should allow sensitive data in development', () => {
      process.env.NODE_ENV = 'development';
      const devLogger = new Logger();
      
      devLogger.info('Dev data', { password: 'visible-in-dev' });
      
      const loggedMessage = consoleSpy.mock.calls[0][0];
      expect(loggedMessage).toContain('visible-in-dev');
    });

    test('should sanitize case-insensitive field names', () => {
      logger.info('Mixed case', { 
        Password: 'secret1',
        TOKEN: 'secret2',
        ApiKey: 'secret3'
      });
      
      const loggedMessage = consoleSpy.mock.calls[0][0];
      expect(loggedMessage).not.toContain('secret1');
      expect(loggedMessage).not.toContain('secret2');
      expect(loggedMessage).not.toContain('secret3');
    });
  });

  describe('structured logging', () => {
    test('should include context in log message', () => {
      logger.info('Operation complete', { 
        service: 'auth',
        userId: '123',
        duration: 100
      });
      
      const loggedMessage = consoleSpy.mock.calls[0][0];
      expect(loggedMessage).toContain('auth');
      expect(loggedMessage).toContain('123');
      expect(loggedMessage).toContain('100');
    });

    test('should format timestamps', () => {
      logger.info('Test message');
      
      const loggedMessage = consoleSpy.mock.calls[0][0];
      expect(loggedMessage).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    test('should include log level', () => {
      logger.info('Info message');
      logger.warn('Warn message');
      logger.error('Error message');
      
      expect(consoleSpy.mock.calls[0][0]).toContain('INFO');
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('WARN'));
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('ERROR'));
    });

    test('should handle empty context', () => {
      logger.info('No context');
      expect(console.log).toHaveBeenCalled();
    });

    test('should handle null context', () => {
      logger.info('Null context', null as any);
      expect(console.log).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    test('should log error objects', () => {
      const error = new Error('Test error');
      logger.error('Operation failed', error);
      
      expect(console.error).toHaveBeenCalled();
      const errorCall = (console.error as jest.Mock).mock.calls.find((call: any) => 
        call[0]?.includes?.('Error details')
      );
      expect(errorCall).toBeDefined();
    });

    test('should log error stack traces', () => {
      const error = new Error('Test error');
      logger.error('Operation failed', error);
      
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Error details'),
        expect.stringMatching(/Error: Test error/)
      );
    });

    test('should handle non-Error objects', () => {
      logger.error('Failed', { code: 'ERR_TEST' });
      expect(console.error).toHaveBeenCalled();
    });

    test('should handle error with context', () => {
      const error = new Error('Test error');
      logger.error('Operation failed', error, { userId: '123', service: 'auth' });
      
      const loggedMessage = (console.error as jest.Mock).mock.calls[0][0];
      expect(loggedMessage).toContain('userId');
      expect(loggedMessage).toContain('123');
    });
  });

  describe('child loggers', () => {
    test('should create child logger with preset context', () => {
      const childLogger = logger.child({ service: 'auth', module: 'login' });
      childLogger.info('User logged in', { userId: '123' });
      
      const loggedMessage = consoleSpy.mock.calls[0][0];
      expect(loggedMessage).toContain('auth');
      expect(loggedMessage).toContain('login');
      expect(loggedMessage).toContain('123');
    });

    test('should merge child and call context', () => {
      const childLogger = logger.child({ service: 'auth' });
      childLogger.info('Event', { action: 'login' });
      
      const loggedMessage = consoleSpy.mock.calls[0][0];
      expect(loggedMessage).toContain('auth');
      expect(loggedMessage).toContain('login');
    });

    test('should not affect parent logger', () => {
      const childLogger = logger.child({ service: 'auth' });
      logger.info('Parent message');
      
      const loggedMessage = consoleSpy.mock.calls[0][0];
      expect(loggedMessage).not.toContain('auth');
    });
  });

  describe('log level filtering', () => {
    test('should respect LOG_LEVEL environment variable', () => {
      process.env.LOG_LEVEL = 'error';
      const errorLogger = new Logger();
      
      errorLogger.info('Info message');
      errorLogger.warn('Warn message');
      errorLogger.error('Error message');
      
      expect(console.log).not.toHaveBeenCalled();
      expect(console.warn).not.toHaveBeenCalled();
      expect(console.error).toHaveBeenCalled();
    });

    test('should default to debug in development', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.LOG_LEVEL;
      const devLogger = new Logger();
      
      devLogger.debug('Debug message');
      expect(console.debug).toHaveBeenCalled();
    });

    test('should default to info in production', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.LOG_LEVEL;
      const prodLogger = new Logger();
      
      prodLogger.debug('Debug message');
      prodLogger.info('Info message');
      
      expect(console.debug).not.toHaveBeenCalled();
      expect(console.log).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    test('should handle very long messages', () => {
      const longMessage = 'A'.repeat(10000);
      logger.info(longMessage);
      expect(console.log).toHaveBeenCalled();
    });

    test('should handle special characters', () => {
      logger.info('Special chars: ™®©∞§¶•ªº');
      expect(console.log).toHaveBeenCalled();
    });

    test('should handle circular references', () => {
      const circular: any = { name: 'test' };
      circular.self = circular;
      
      // Should not throw
      expect(() => logger.info('Circular', circular)).not.toThrow();
    });

    test('should handle undefined values', () => {
      logger.info('Test', { value: undefined });
      expect(console.log).toHaveBeenCalled();
    });

    test('should handle null values', () => {
      logger.info('Test', { value: null });
      expect(console.log).toHaveBeenCalled();
    });
  });

  describe('performance', () => {
    test('should log many messages quickly', () => {
      const startTime = Date.now();
      
      for (let i = 0; i < 1000; i++) {
        logger.info(`Message ${i}`, { index: i });
      }
      
      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(1000); // Should complete in < 1 second
    });

    test('should handle large context objects efficiently', () => {
      const largeContext = {
        data: Array.from({ length: 1000 }, (_, i) => ({ id: i, value: `value-${i}` }))
      };
      
      const startTime = Date.now();
      logger.info('Large object', largeContext);
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(100); // Should complete in < 100ms
    });
  });
});

