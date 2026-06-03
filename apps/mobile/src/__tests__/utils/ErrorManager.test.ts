import { Alert } from 'react-native';
import {
  ErrorManager,
  ErrorSeverity,
  ErrorCategory,
} from '../../utils/ErrorManager';
import { logger } from '../../utils/logger';
import { captureException } from '../../config/sentry';
import { isOnlineCached } from '../../utils/networkUtils';

jest.mock('react-native', () => ({
  Alert: { alert: jest.fn() },
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../../config/sentry', () => ({
  captureException: jest.fn(),
}));

// Source reads NetInfo-backed `isOnlineCached()` (navigator.onLine is
// undefined in React Native).
jest.mock('../../utils/networkUtils', () => ({
  isOnlineCached: jest.fn(() => true),
}));

const mockAlert = Alert.alert as jest.MockedFunction<typeof Alert.alert>;
const mockIsOnlineCached = isOnlineCached as jest.MockedFunction<
  typeof isOnlineCached
>;

/**
 * The ErrorManager singleton guards against stacking alerts via a private
 * `isShowingError` flag that only resets when the alert's OK button fires.
 * Drive that callback so each test starts from a clean "no alert showing"
 * state.
 */
function dismissActiveAlert(): void {
  const calls = mockAlert.mock.calls;
  if (calls.length === 0) return;
  const buttons = calls[calls.length - 1][2] as
    | { text: string; onPress?: () => void }[]
    | undefined;
  buttons?.[0]?.onPress?.();
}

describe('ErrorManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsOnlineCached.mockReturnValue(true);
  });

  afterEach(() => {
    dismissActiveAlert();
  });

  describe('handleError', () => {
    it('should log and show a generic error', () => {
      ErrorManager.handleError(new Error('Boom'));

      expect(logger.error).toHaveBeenCalledWith(
        'Error:',
        expect.objectContaining({ message: 'Boom' })
      );
      expect(mockAlert).toHaveBeenCalledWith(
        'Error',
        'Boom',
        expect.any(Array)
      );
    });

    it('should accept a string error', () => {
      ErrorManager.handleError('String failure');
      expect(mockAlert).toHaveBeenCalledWith(
        'Error',
        'String failure',
        expect.any(Array)
      );
    });

    it('should report to Sentry via captureException', () => {
      ErrorManager.handleError(new Error('Tracked'), {
        severity: ErrorSeverity.HIGH,
        category: ErrorCategory.SYSTEM,
      });

      expect(captureException).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          tags: expect.objectContaining({
            severity: ErrorSeverity.HIGH,
            category: ErrorCategory.SYSTEM,
          }),
        })
      );
    });

    it('should not stack a second alert while one is showing', () => {
      ErrorManager.handleError('first');
      ErrorManager.handleError('second');
      // Only the first alert is shown until the OK callback resets the guard.
      expect(mockAlert).toHaveBeenCalledTimes(1);
    });
  });

  describe('handleNetworkError', () => {
    it('should report offline when cache says offline', () => {
      mockIsOnlineCached.mockReturnValue(false);
      ErrorManager.handleNetworkError({ status: 500 });

      expect(mockAlert).toHaveBeenCalledWith(
        'Error',
        'No internet connection. Please check your network.',
        expect.any(Array)
      );
    });

    it('should report 401 as authentication required', () => {
      ErrorManager.handleNetworkError({ status: 401 });
      expect(mockAlert).toHaveBeenCalledWith(
        'Error',
        'Authentication required. Please log in.',
        expect.any(Array)
      );
    });

    it('should report 403 as access denied', () => {
      ErrorManager.handleNetworkError({ status: 403 });
      expect(mockAlert).toHaveBeenCalledWith(
        'Error',
        'Access denied. Insufficient permissions.',
        expect.any(Array)
      );
    });

    it('should report 5xx as server error', () => {
      ErrorManager.handleNetworkError({ status: 503 });
      expect(mockAlert).toHaveBeenCalledWith(
        'Error',
        'Server error. Please try again later.',
        expect.any(Array)
      );
    });

    it('should fall back to a generic network message when online with no status', () => {
      ErrorManager.handleNetworkError({});
      expect(mockAlert).toHaveBeenCalledWith(
        'Error',
        'Network error occurred',
        expect.any(Array)
      );
    });
  });

  describe('handleValidationError', () => {
    it('should show a single validation error verbatim', () => {
      ErrorManager.handleValidationError(['Email is required']);
      expect(mockAlert).toHaveBeenCalledWith(
        'Error',
        'Email is required',
        expect.any(Array)
      );
    });

    it('should join multiple validation errors', () => {
      ErrorManager.handleValidationError(['Email required', 'Name required']);
      expect(mockAlert).toHaveBeenCalledWith(
        'Error',
        'Please fix: Email required, Name required',
        expect.any(Array)
      );
    });
  });
});
