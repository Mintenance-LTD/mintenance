import { Alert } from 'react-native';
import {
  ErrorHandlingService,
  ErrorCategory,
  ErrorSeverity,
} from '../../utils/errorHandling';
import { logger } from '../../utils/logger';

// react-native Alert is the only RN surface used by the service.
jest.mock('react-native', () => ({
  Alert: { alert: jest.fn() },
}));

// Logger exposes info/warn/error/debug; the service routes by severity.
jest.mock('../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

const mockAlert = Alert.alert as jest.MockedFunction<typeof Alert.alert>;

describe('ErrorHandlingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createError', () => {
    it('should build a standardized error object', () => {
      const original = new Error('boom');
      const std = ErrorHandlingService.createError(
        'boom',
        'Something went wrong',
        ErrorCategory.SYSTEM,
        ErrorSeverity.HIGH,
        { screen: 'Home' },
        original
      );

      expect(std.message).toBe('boom');
      expect(std.userMessage).toBe('Something went wrong');
      expect(std.category).toBe(ErrorCategory.SYSTEM);
      expect(std.severity).toBe(ErrorSeverity.HIGH);
      expect(std.context).toEqual({ screen: 'Home' });
      expect(std.originalError).toBe(original);
      expect(typeof std.id).toBe('string');
      expect(typeof std.timestamp).toBe('string');
    });

    it('should generate unique ids for distinct errors', () => {
      const a = ErrorHandlingService.createError(
        'a',
        'a',
        ErrorCategory.SYSTEM
      );
      const b = ErrorHandlingService.createError(
        'b',
        'b',
        ErrorCategory.SYSTEM
      );
      expect(a.id).not.toBe(b.id);
    });
  });

  describe('classifyError (via handleError)', () => {
    it('should classify network errors', () => {
      const result = ErrorHandlingService.handleError(
        new Error('Network request failed'),
        {},
        false
      );
      expect(result.category).toBe(ErrorCategory.NETWORK);
      expect(result.userMessage).toContain('Network connection failed');
    });

    it('should classify authentication errors', () => {
      const result = ErrorHandlingService.handleError(
        new Error('unauthorized token'),
        {},
        false
      );
      expect(result.category).toBe(ErrorCategory.AUTHENTICATION);
      expect(result.severity).toBe(ErrorSeverity.HIGH);
    });

    it('should classify authorization errors', () => {
      const result = ErrorHandlingService.handleError(
        new Error('permission denied: access denied'),
        {},
        false
      );
      expect(result.category).toBe(ErrorCategory.AUTHORIZATION);
    });

    it('should classify validation errors', () => {
      const result = ErrorHandlingService.handleError(
        new Error('invalid input: field required'),
        {},
        false
      );
      expect(result.category).toBe(ErrorCategory.VALIDATION);
      expect(result.severity).toBe(ErrorSeverity.LOW);
    });

    it('should default unknown errors to system category', () => {
      const result = ErrorHandlingService.handleError(
        new Error('some weird failure'),
        {},
        false
      );
      expect(result.category).toBe(ErrorCategory.SYSTEM);
      expect(result.userMessage).toContain('unexpected error');
    });
  });

  describe('handleError logging + alert', () => {
    it('should log high-severity errors via logger.error', () => {
      ErrorHandlingService.handleError(new Error('unauthorized'), {}, false);
      expect(logger.error).toHaveBeenCalled();
    });

    it('should log low-severity errors via logger.info', () => {
      ErrorHandlingService.handleError(new Error('invalid value'), {}, false);
      expect(logger.info).toHaveBeenCalled();
    });

    it('should log medium-severity errors via logger.warn', () => {
      ErrorHandlingService.handleError(
        new Error('some weird failure'),
        {},
        false
      );
      expect(logger.warn).toHaveBeenCalled();
    });

    it('should show a user alert when requested', () => {
      ErrorHandlingService.handleError(
        new Error('Network request failed'),
        {},
        true
      );
      expect(mockAlert).toHaveBeenCalled();
      const [title] = mockAlert.mock.calls[0];
      expect(title).toBe('Connection Error');
    });

    it('should not show an alert when suppressed', () => {
      ErrorHandlingService.handleError(new Error('boom'), {}, false);
      expect(mockAlert).not.toHaveBeenCalled();
    });

    it('should pass through an already-standardized error unchanged', () => {
      const std = ErrorHandlingService.createError(
        'pre-built',
        'Pre-built user message',
        ErrorCategory.BUSINESS_LOGIC,
        ErrorSeverity.MEDIUM
      );
      const result = ErrorHandlingService.handleError(std, {}, false);
      expect(result.id).toBe(std.id);
      expect(result.category).toBe(ErrorCategory.BUSINESS_LOGIC);
    });
  });

  describe('specialized handlers', () => {
    it('handleNetworkError should produce a NETWORK error', () => {
      const result = ErrorHandlingService.handleNetworkError(
        new Error('socket hang up')
      );
      expect(result.category).toBe(ErrorCategory.NETWORK);
      expect(result.userMessage).toContain('Unable to connect');
    });

    it('handleValidationError should join messages', () => {
      const result = ErrorHandlingService.handleValidationError([
        'Name required',
        'Email invalid',
      ]);
      expect(result.category).toBe(ErrorCategory.VALIDATION);
      expect(result.message).toBe('Name required, Email invalid');
    });

    it('handleAuthenticationError should be HIGH severity', () => {
      const result = ErrorHandlingService.handleAuthenticationError(
        new Error('token expired')
      );
      expect(result.category).toBe(ErrorCategory.AUTHENTICATION);
      expect(result.severity).toBe(ErrorSeverity.HIGH);
    });

    it('handleBusinessError should use BUSINESS_LOGIC category', () => {
      const result = ErrorHandlingService.handleBusinessError(
        'job already assigned',
        'This job has already been assigned.'
      );
      expect(result.category).toBe(ErrorCategory.BUSINESS_LOGIC);
      expect(result.userMessage).toBe('This job has already been assigned.');
    });
  });
});
