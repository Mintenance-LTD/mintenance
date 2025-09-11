import React from 'react';
import { logger, log } from '../../utils/logger';
import * as Sentry from '../../config/sentry';

// Mock Sentry
jest.mock('../../config/sentry', () => ({
  captureMessage: jest.fn(),
  captureException: jest.fn(),
  addBreadcrumb: jest.fn(),
}));

const mockSentry = Sentry as jest.Mocked<typeof Sentry>;

// Mock console methods
const originalConsole = global.console;
beforeAll(() => {
  global.console = {
    ...originalConsole,
    log: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
});

afterAll(() => {
  global.console = originalConsole;
});

describe('Logger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('debug', () => {
    it('logs to console in development', () => {
      logger.debug('Debug message', { key: 'value' });

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('DEBUG: Debug message | {"key":"value"}')
      );
      expect(mockSentry.addBreadcrumb).toHaveBeenCalledWith(
        'Debug: Debug message',
        'debug',
        { key: 'value' }
      );
    });

    it('logs without context', () => {
      logger.debug('Debug message');

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('DEBUG: Debug message')
      );
    });
  });

  describe('info', () => {
    it('logs to console and Sentry', () => {
      logger.info('Info message', { key: 'value' });

      expect(console.info).toHaveBeenCalledWith(
        expect.stringContaining('INFO: Info message | {"key":"value"}')
      );
      expect(mockSentry.addBreadcrumb).toHaveBeenCalledWith(
        'Info: Info message',
        'info',
        { key: 'value' }
      );
      expect(mockSentry.captureMessage).toHaveBeenCalledWith(
        'Info message',
        'info'
      );
    });
  });

  describe('warn', () => {
    it('logs warning to console and Sentry', () => {
      logger.warn('Warning message', { key: 'value' });

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('WARN: Warning message | {"key":"value"}')
      );
      expect(mockSentry.addBreadcrumb).toHaveBeenCalledWith(
        'Warning: Warning message',
        'warning',
        { key: 'value' }
      );
      expect(mockSentry.captureMessage).toHaveBeenCalledWith(
        'Warning message',
        'warning'
      );
    });
  });

  describe('error', () => {
    it('logs error with Error object', () => {
      const error = new Error('Test error');
      logger.error('Error message', error, { key: 'value' });

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('ERROR: Error message | {"key":"value"}'),
        error
      );
      expect(mockSentry.addBreadcrumb).toHaveBeenCalledWith(
        'Error: Error message',
        'error',
        { key: 'value', error: 'Test error' }
      );
      expect(mockSentry.captureException).toHaveBeenCalledWith(error, {
        contexts: { logContext: { key: 'value' } },
      });
    });

    it('logs error without Error object', () => {
      logger.error('Error message', undefined, { key: 'value' });

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('ERROR: Error message | {"key":"value"}'),
        undefined
      );
      expect(mockSentry.captureMessage).toHaveBeenCalledWith(
        'Error message',
        'error'
      );
    });
  });

  describe('performance', () => {
    it('logs performance metrics', () => {
      logger.performance('API Call', 1250, { endpoint: '/api/users' });

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(
          'INFO: API Call completed in 1250ms | {"endpoint":"/api/users"}'
        )
      );
      expect(mockSentry.addBreadcrumb).toHaveBeenCalledWith(
        'Performance: API Call completed in 1250ms',
        'performance',
        {
          duration: 1250,
          operation: 'API Call',
          endpoint: '/api/users',
        }
      );
    });
  });

  describe('network', () => {
    it('logs successful network request', () => {
      logger.network('GET', '/api/users', 200, 150);

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('INFO: GET /api/users - 200 (150ms)')
      );
      expect(mockSentry.addBreadcrumb).toHaveBeenCalledWith(
        'Network: GET /api/users - 200 (150ms)',
        'http',
        {
          method: 'GET',
          url: '/api/users',
          status: 200,
          duration: 150,
        }
      );
    });

    it('logs failed network request', () => {
      logger.network('POST', '/api/users', 500, 1200);

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('ERROR: POST /api/users - 500 (1200ms)')
      );
      expect(mockSentry.captureMessage).toHaveBeenCalledWith(
        'Network Error: POST /api/users - 500 (1200ms)',
        'error'
      );
    });

    it('logs redirect as warning', () => {
      logger.network('GET', '/api/users', 302, 50);

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('WARN: GET /api/users - 302 (50ms)')
      );
    });
  });

  describe('userAction', () => {
    it('logs user actions', () => {
      logger.userAction('button_click', { button: 'login' });

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(
          'INFO: User action: button_click | {"button":"login"}'
        )
      );
      expect(mockSentry.addBreadcrumb).toHaveBeenCalledWith(
        'User action: button_click',
        'user',
        { button: 'login' }
      );
    });
  });

  describe('navigation', () => {
    it('logs navigation events', () => {
      logger.navigation('Home', 'Profile', { userId: '123' });

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(
          'INFO: Navigation: Home -> Profile | {"userId":"123"}'
        )
      );
      expect(mockSentry.addBreadcrumb).toHaveBeenCalledWith(
        'Navigation: Home -> Profile',
        'navigation',
        { from: 'Home', to: 'Profile', userId: '123' }
      );
    });
  });

  describe('auth', () => {
    it('logs successful authentication', () => {
      logger.auth('login', true, { method: 'email' });

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(
          'INFO: Auth login: success | {"method":"email"}'
        )
      );
      expect(mockSentry.addBreadcrumb).toHaveBeenCalledWith(
        'Auth login: success',
        'auth',
        { action: 'login', success: true, method: 'email' }
      );
    });

    it('logs failed authentication', () => {
      logger.auth('login', false, {
        method: 'email',
        error: 'invalid_credentials',
      });

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('WARN: Auth login: failed')
      );
      expect(mockSentry.captureMessage).toHaveBeenCalledWith(
        'Authentication failed: login',
        'warning'
      );
    });
  });

  describe('convenience methods', () => {
    it('log.debug works correctly', () => {
      log.debug('Debug via convenience method');

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('DEBUG: Debug via convenience method')
      );
    });

    it('log.error works correctly', () => {
      const error = new Error('Test error');
      log.error('Error via convenience method', error);

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('ERROR: Error via convenience method'),
        error
      );
    });

    it('log.performance works correctly', () => {
      log.performance('Test operation', 500);

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('INFO: Test operation completed in 500ms')
      );
    });

    it('log.network works correctly', () => {
      log.network('GET', '/test', 200, 100);

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('INFO: GET /test - 200 (100ms)')
      );
    });

    it('log.userAction works correctly', () => {
      log.userAction('test_action');

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('INFO: User action: test_action')
      );
    });

    it('log.navigation works correctly', () => {
      log.navigation('From', 'To');

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('INFO: Navigation: From -> To')
      );
    });

    it('log.auth works correctly', () => {
      log.auth('test_auth', true);

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('INFO: Auth test_auth: success')
      );
    });
  });

  describe('message formatting', () => {
    it('formats messages with timestamp', () => {
      logger.info('Test message');

      expect(console.info).toHaveBeenCalledWith(
        expect.stringMatching(
          /\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] INFO: Test message/
        )
      );
    });

    it('includes context in formatted message', () => {
      logger.info('Test message', { key: 'value', nested: { prop: 123 } });

      expect(console.info).toHaveBeenCalledWith(
        expect.stringContaining(
          'INFO: Test message | {"key":"value","nested":{"prop":123}}'
        )
      );
    });
  });
});
