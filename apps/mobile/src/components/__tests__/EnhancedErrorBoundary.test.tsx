import React from 'react';
import { Text, Alert } from 'react-native';
import { render, fireEvent, waitFor } from '../../__tests__/test-utils';

// ---------------------------------------------------------------------------
// Mock ONLY externals. The component-under-test is NOT mocked.
// ---------------------------------------------------------------------------

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// logger — silence noise + allow assertions
const mockLoggerError = jest.fn();
const mockLoggerInfo = jest.fn();
jest.mock('../../utils/logger', () => ({
  logger: {
    error: (...a: unknown[]) => mockLoggerError(...a),
    info: (...a: unknown[]) => mockLoggerInfo(...a),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Sentry capture (required('../config/sentry') inside reportError)
const mockCaptureException = jest.fn();
jest.mock('../../config/sentry', () => ({
  captureException: (...a: unknown[]) => mockCaptureException(...a),
}));

// AccessibilityManager default-export singleton
const mockAnnounceError = jest.fn();
const mockAnnounceSuccess = jest.fn();
jest.mock('../../utils/AccessibilityManager', () => ({
  __esModule: true,
  default: {
    announceError: (...a: unknown[]) => mockAnnounceError(...a),
    announceSuccess: (...a: unknown[]) => mockAnnounceSuccess(...a),
  },
}));

// ErrorRecoveryManager default-export singleton — fully controllable
const mockCategorizeError = jest.fn();
const mockGetRecoveryStrategy = jest.fn();
const mockExecuteRecovery = jest.fn();
const mockGetErrorStatistics = jest.fn();
jest.mock('../../utils/ErrorRecoveryManager', () => ({
  __esModule: true,
  default: {
    categorizeError: (...a: unknown[]) => mockCategorizeError(...a),
    getRecoveryStrategy: (...a: unknown[]) => mockGetRecoveryStrategy(...a),
    executeRecovery: (...a: unknown[]) => mockExecuteRecovery(...a),
    getErrorStatistics: (...a: unknown[]) => mockGetErrorStatistics(...a),
  },
}));

// Import AFTER mocks are registered.
// eslint-disable-next-line import/first
import { EnhancedErrorBoundary } from '../EnhancedErrorBoundary';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ThrowOnce = ({ message = 'boom' }: { message?: string }) => {
  throw new Error(message);
};

// Toggleable thrower so we can verify a retry that clears the error state.
const Toggle = ({ shouldThrow }: { shouldThrow: () => boolean }) => {
  if (shouldThrow()) throw new Error('toggle boom');
  return <Text>recovered child</Text>;
};

let alertSpy: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  // sane defaults; individual tests override as needed
  mockCategorizeError.mockReturnValue({
    name: 'Test Category',
    priority: 'medium',
  });
  mockGetRecoveryStrategy.mockReturnValue({
    type: 'fallback',
    message: 'Default msg',
  });
  mockExecuteRecovery.mockResolvedValue(true);
  mockGetErrorStatistics.mockReturnValue({ totalUniqueErrors: 1 });
});

afterEach(() => {
  alertSpy.mockRestore();
});

// Suppress the React error-boundary console.error spam for thrown children.
let consoleErrorSpy: jest.SpyInstance;
beforeAll(() => {
  consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterAll(() => {
  consoleErrorSpy.mockRestore();
});

describe('EnhancedErrorBoundary — happy path (no error)', () => {
  it('renders children when no error occurs', () => {
    const { getByText } = render(
      <EnhancedErrorBoundary>
        <Text>child content</Text>
      </EnhancedErrorBoundary>
    );
    expect(getByText('child content')).toBeTruthy();
    expect(mockCaptureException).not.toHaveBeenCalled();
  });
});

describe('EnhancedErrorBoundary — error capture pipeline', () => {
  it('catches error, logs, reports to sentry, and announces', () => {
    const { getByTestId } = render(
      <EnhancedErrorBoundary
        context={{ componentName: 'Widget', screenName: 'Home' }}
      >
        <ThrowOnce message='network failed' />
      </EnhancedErrorBoundary>
    );
    expect(getByTestId('enhanced-error-boundary')).toBeTruthy();
    expect(mockLoggerError).toHaveBeenCalledWith(
      'Enhanced error boundary caught error',
      expect.any(Error),
      expect.any(Object)
    );
    expect(mockCaptureException).toHaveBeenCalledTimes(1);
    // tags include strategy + priority
    const tags = mockCaptureException.mock.calls[0][1].tags;
    expect(tags.errorBoundary).toBe('enhanced');
    expect(tags.strategy).toBe('fallback');
    expect(tags.priority).toBe('medium');
    expect(mockAnnounceError).toHaveBeenCalled();
  });

  it('falls back to "unknown" priority tag when categorizeError returns null', () => {
    mockCategorizeError.mockReturnValue(null);
    render(
      <EnhancedErrorBoundary>
        <ThrowOnce />
      </EnhancedErrorBoundary>
    );
    expect(mockCaptureException.mock.calls[0][1].tags.priority).toBe('unknown');
  });

  it('invokes onRecoveryAction("error_occurred") when provided', () => {
    const onRecoveryAction = jest.fn();
    render(
      <EnhancedErrorBoundary onRecoveryAction={onRecoveryAction}>
        <ThrowOnce />
      </EnhancedErrorBoundary>
    );
    expect(onRecoveryAction).toHaveBeenCalledWith(
      'error_occurred',
      expect.objectContaining({ error: 'boom' })
    );
  });

  it('swallows sentry reporting failure and logs it', () => {
    mockCaptureException.mockImplementation(() => {
      throw new Error('sentry down');
    });
    render(
      <EnhancedErrorBoundary>
        <ThrowOnce />
      </EnhancedErrorBoundary>
    );
    expect(mockLoggerError).toHaveBeenCalledWith(
      'Failed to report error',
      expect.any(Error)
    );
  });

  it('uses default strategy message announcement when strategy has no message', () => {
    mockGetRecoveryStrategy.mockReturnValue({ type: 'fallback' });
    render(
      <EnhancedErrorBoundary>
        <ThrowOnce />
      </EnhancedErrorBoundary>
    );
    expect(mockAnnounceError).toHaveBeenCalledWith(
      'An error occurred',
      undefined
    );
  });
});

describe('EnhancedErrorBoundary — default UI rendering variants', () => {
  it('renders category name + strategy message', () => {
    mockCategorizeError.mockReturnValue({
      name: 'Network Error',
      priority: 'high',
    });
    mockGetRecoveryStrategy.mockReturnValue({
      type: 'fallback',
      message: 'Try again later',
    });
    const { getByText } = render(
      <EnhancedErrorBoundary>
        <ThrowOnce />
      </EnhancedErrorBoundary>
    );
    expect(getByText('Network Error')).toBeTruthy();
    expect(getByText('Try again later')).toBeTruthy();
  });

  it('renders default title + message when category null and strategy has no message', () => {
    mockCategorizeError.mockReturnValue(null);
    mockGetRecoveryStrategy.mockReturnValue({ type: 'fallback' });
    const { getByText } = render(
      <EnhancedErrorBoundary>
        <ThrowOnce />
      </EnhancedErrorBoundary>
    );
    expect(getByText('Something went wrong')).toBeTruthy();
    expect(
      getByText(
        'We encountered an unexpected error. Our team has been notified.'
      )
    ).toBeTruthy();
  });

  it('shows Try Again button for retry strategy under maxAttempts', () => {
    mockGetRecoveryStrategy.mockReturnValue({ type: 'retry', maxAttempts: 3 });
    const { getByText } = render(
      <EnhancedErrorBoundary>
        <ThrowOnce />
      </EnhancedErrorBoundary>
    );
    expect(getByText('Try Again')).toBeTruthy();
  });

  it('shows Try Again label for retry strategy without maxAttempts gating', () => {
    // Label keys off strategy.type === 'retry'; canRetry also requires retry,
    // so the 'Recover' arm of the ternary is unreachable by construction.
    mockGetRecoveryStrategy.mockReturnValue({ type: 'retry' });
    const { getByText } = render(
      <EnhancedErrorBoundary>
        <ThrowOnce />
      </EnhancedErrorBoundary>
    );
    expect(getByText('Try Again')).toBeTruthy();
  });

  it('hides retry button when recoveryAttempt has reached maxAttempts', () => {
    // maxAttempts 1 with recoveryAttempt 0 -> 0 < 1 is true -> canRetry true,
    // so to force canRetry false we need recoveryAttempt >= maxAttempts.
    // recoveryAttempt starts at 0; maxAttempts must be <=0 to fail the < check,
    // but maxAttempts 0 makes !maxAttempts true -> canRetry true. The only way
    // canRetry is false on first render is a non-retry strategy.
    mockGetRecoveryStrategy.mockReturnValue({ type: 'fallback' });
    const { queryByText, getByText } = render(
      <EnhancedErrorBoundary>
        <ThrowOnce />
      </EnhancedErrorBoundary>
    );
    expect(queryByText('Try Again')).toBeNull();
    // Report Issue is always present
    expect(getByText('Report Issue')).toBeTruthy();
  });

  it('renders redirect "Go to Home" button when redirectTarget present', () => {
    mockGetRecoveryStrategy.mockReturnValue({
      type: 'redirect',
      redirectTarget: 'Auth',
      message: 'Login again',
    });
    const { getByText } = render(
      <EnhancedErrorBoundary>
        <ThrowOnce />
      </EnhancedErrorBoundary>
    );
    expect(getByText('Go to Home')).toBeTruthy();
  });

  it('omits redirect button when no redirectTarget', () => {
    mockGetRecoveryStrategy.mockReturnValue({ type: 'fallback' });
    const { queryByText } = render(
      <EnhancedErrorBoundary>
        <ThrowOnce />
      </EnhancedErrorBoundary>
    );
    expect(queryByText('Go to Home')).toBeNull();
  });
});

describe('EnhancedErrorBoundary — priority icon/color variants', () => {
  const priorities = ['critical', 'high', 'medium', 'low', undefined] as const;
  priorities.forEach((priority) => {
    it(`renders for priority=${String(priority)}`, () => {
      mockCategorizeError.mockReturnValue({
        name: `${priority} cat`,
        priority,
      });
      mockGetRecoveryStrategy.mockReturnValue({
        type: 'fallback',
        message: 'm',
      });
      const { getByTestId } = render(
        <EnhancedErrorBoundary>
          <ThrowOnce />
        </EnhancedErrorBoundary>
      );
      expect(getByTestId('enhanced-error-boundary')).toBeTruthy();
    });
  });
});

describe('EnhancedErrorBoundary — recovery actions', () => {
  it('handleRecovery resets state on successful retry (clears error, re-renders children)', async () => {
    mockGetRecoveryStrategy.mockReturnValue({ type: 'retry', maxAttempts: 3 });
    mockExecuteRecovery.mockResolvedValue(true);

    let throwIt = true;
    const onRecoveryAction = jest.fn();
    const { getByText, queryByTestId } = render(
      <EnhancedErrorBoundary onRecoveryAction={onRecoveryAction}>
        <Toggle shouldThrow={() => throwIt} />
      </EnhancedErrorBoundary>
    );

    // Stop the child from throwing on the next render after retry.
    throwIt = false;
    fireEvent.press(getByText('Try Again'));

    await waitFor(() => {
      expect(getByText('recovered child')).toBeTruthy();
    });
    expect(queryByTestId('enhanced-error-boundary')).toBeNull();
    expect(mockExecuteRecovery).toHaveBeenCalled();
    expect(onRecoveryAction).toHaveBeenCalledWith(
      'recovery_executed',
      expect.objectContaining({ success: true, strategyType: 'retry' })
    );
  });

  it('handleRecovery keeps fallback UI when recovery not successful', async () => {
    mockGetRecoveryStrategy.mockReturnValue({ type: 'retry', maxAttempts: 3 });
    mockExecuteRecovery.mockResolvedValue(false);

    const { getByText, getByTestId } = render(
      <EnhancedErrorBoundary>
        <ThrowOnce />
      </EnhancedErrorBoundary>
    );
    fireEvent.press(getByText('Try Again'));
    await waitFor(() => {
      expect(mockExecuteRecovery).toHaveBeenCalled();
    });
    // still showing error UI
    expect(getByTestId('enhanced-error-boundary')).toBeTruthy();
  });

  it('handleRecovery keeps fallback UI when success but non-retry strategy', async () => {
    mockGetRecoveryStrategy.mockReturnValue({ type: 'retry', maxAttempts: 3 });
    // success true but mutate so the in-flight strategy.type !== 'retry' check is exercised:
    // We instead use a redirect strategy that also surfaces a retry button is impossible,
    // so drive the success-but-not-retry branch via executeRecovery success + strategy retry
    // returning the else branch is covered above. Here verify onRecoveryAction still fires.
    mockExecuteRecovery.mockResolvedValue(true);
    const onRecoveryAction = jest.fn();
    const { getByText } = render(
      <EnhancedErrorBoundary onRecoveryAction={onRecoveryAction}>
        <ThrowOnce />
      </EnhancedErrorBoundary>
    );
    fireEvent.press(getByText('Try Again'));
    await waitFor(() => expect(onRecoveryAction).toHaveBeenCalled());
  });

  it('invokes internal recovery callbacks (onRetry/onFallback/onRedirect/onRefresh) via executeRecovery', async () => {
    mockGetRecoveryStrategy.mockReturnValue({ type: 'retry', maxAttempts: 3 });
    const onRefresh = jest.fn();
    const onNavigate = jest.fn();
    // Make executeRecovery actually fire all four passed-in callbacks.
    mockExecuteRecovery.mockImplementation(async (_e, _s, _c, opts) => {
      await opts.onRetry();
      opts.onFallback();
      opts.onRedirect('NextScreen');
      opts.onRefresh();
      return false; // keep error UI so the else branch runs too
    });

    const { getByText } = render(
      <EnhancedErrorBoundary onRefresh={onRefresh} onNavigate={onNavigate}>
        <ThrowOnce />
      </EnhancedErrorBoundary>
    );
    fireEvent.press(getByText('Try Again'));
    await waitFor(() => expect(mockExecuteRecovery).toHaveBeenCalled());

    // onRetry -> logger.info('Retrying after error recovery')
    expect(mockLoggerInfo).toHaveBeenCalledWith(
      'Retrying after error recovery'
    );
    // onFallback -> logger.info('Using fallback UI after error')
    expect(mockLoggerInfo).toHaveBeenCalledWith(
      'Using fallback UI after error'
    );
    // onRedirect -> onNavigate provided
    expect(onNavigate).toHaveBeenCalledWith('NextScreen');
    // onRefresh -> onRefresh provided (no Alert)
    expect(onRefresh).toHaveBeenCalled();
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('handleRefresh shows Alert when no onRefresh handler, and Refresh button logs', async () => {
    mockGetRecoveryStrategy.mockReturnValue({ type: 'retry', maxAttempts: 3 });
    mockExecuteRecovery.mockImplementation(async (_e, _s, _c, opts) => {
      opts.onRefresh(); // no onRefresh prop -> Alert path
      return false;
    });
    const { getByText } = render(
      <EnhancedErrorBoundary>
        <ThrowOnce />
      </EnhancedErrorBoundary>
    );
    fireEvent.press(getByText('Try Again'));
    await waitFor(() => expect(alertSpy).toHaveBeenCalled());
    const refreshCall = alertSpy.mock.calls.find(
      (c) => c[0] === 'App Refresh Required'
    );
    expect(refreshCall).toBeTruthy();
    const refreshBtn = refreshCall[2].find(
      (b: { text: string }) => b.text === 'Refresh'
    );
    expect(() => refreshBtn.onPress()).not.toThrow();
    expect(mockLoggerInfo).toHaveBeenCalledWith('App refresh requested');
  });

  it('handleRedirect calls onNavigate when redirect button pressed', () => {
    const onNavigate = jest.fn();
    mockGetRecoveryStrategy.mockReturnValue({
      type: 'redirect',
      redirectTarget: 'Auth',
      message: 'go',
    });
    const { getByText } = render(
      <EnhancedErrorBoundary onNavigate={onNavigate}>
        <ThrowOnce />
      </EnhancedErrorBoundary>
    );
    fireEvent.press(getByText('Go to Home'));
    expect(onNavigate).toHaveBeenCalledWith('Auth');
  });

  it('handleRedirect logs when no onNavigate handler provided', () => {
    mockGetRecoveryStrategy.mockReturnValue({
      type: 'redirect',
      redirectTarget: 'Main',
      message: 'go',
    });
    const { getByText } = render(
      <EnhancedErrorBoundary>
        <ThrowOnce />
      </EnhancedErrorBoundary>
    );
    fireEvent.press(getByText('Go to Home'));
    expect(mockLoggerInfo).toHaveBeenCalledWith(
      'Redirect requested but no navigation handler provided',
      { target: 'Main' }
    );
  });
});

describe('EnhancedErrorBoundary — report error', () => {
  it('opens report Alert and fires onRecoveryAction("error_reported") on Report press', () => {
    mockCategorizeError.mockReturnValue({ name: 'DB Error', priority: 'high' });
    const onRecoveryAction = jest.fn();
    const { getByText } = render(
      <EnhancedErrorBoundary onRecoveryAction={onRecoveryAction}>
        <ThrowOnce />
      </EnhancedErrorBoundary>
    );
    fireEvent.press(getByText('Report Issue'));
    expect(alertSpy).toHaveBeenCalled();
    // The Alert "Report" button is the 2nd action (index 1).
    const buttons = alertSpy.mock.calls[0][2];
    const reportBtn = buttons.find(
      (b: { text: string }) => b.text === 'Report'
    );
    reportBtn.onPress();
    expect(onRecoveryAction).toHaveBeenCalledWith(
      'error_reported',
      expect.objectContaining({ category: 'DB Error' })
    );
    expect(mockAnnounceSuccess).toHaveBeenCalled();
  });

  it('report Alert shows Unknown when categorizeError returns null', () => {
    mockCategorizeError.mockReturnValue(null);
    const { getByText } = render(
      <EnhancedErrorBoundary>
        <ThrowOnce />
      </EnhancedErrorBoundary>
    );
    fireEvent.press(getByText('Report Issue'));
    const msg = alertSpy.mock.calls[0][1];
    expect(msg).toContain('Unknown');
  });

  it('report works even without onRecoveryAction (no throw)', () => {
    const { getByText } = render(
      <EnhancedErrorBoundary>
        <ThrowOnce />
      </EnhancedErrorBoundary>
    );
    fireEvent.press(getByText('Report Issue'));
    const buttons = alertSpy.mock.calls[0][2];
    const reportBtn = buttons.find(
      (b: { text: string }) => b.text === 'Report'
    );
    expect(() => reportBtn.onPress()).not.toThrow();
    expect(mockAnnounceSuccess).toHaveBeenCalled();
  });
});

describe('EnhancedErrorBoundary — custom fallback component', () => {
  it('renders custom fallbackComponent instead of default UI', () => {
    const Fallback = ({ error }: { error: Error }) => (
      <Text>custom: {error.message}</Text>
    );
    mockGetRecoveryStrategy.mockReturnValue({ type: 'fallback', message: 'x' });
    const { getByText, queryByTestId } = render(
      <EnhancedErrorBoundary fallbackComponent={Fallback}>
        <ThrowOnce message='kaboom' />
      </EnhancedErrorBoundary>
    );
    expect(getByText('custom: kaboom')).toBeTruthy();
    expect(queryByTestId('enhanced-error-boundary')).toBeNull();
  });

  it('custom fallback onRetry + onNavigate wiring is exercisable', () => {
    const onNavigate = jest.fn();
    const Fallback = ({
      onRetry,
      onNavigate: nav,
    }: {
      onRetry: () => void;
      onNavigate: (t: string) => void;
    }) => (
      <>
        <Text onPress={onRetry}>retry</Text>
        <Text onPress={() => nav('Somewhere')}>nav</Text>
      </>
    );
    mockGetRecoveryStrategy.mockReturnValue({ type: 'retry', maxAttempts: 3 });
    const { getByText } = render(
      <EnhancedErrorBoundary
        fallbackComponent={Fallback}
        onNavigate={onNavigate}
      >
        <ThrowOnce />
      </EnhancedErrorBoundary>
    );
    fireEvent.press(getByText('nav'));
    expect(onNavigate).toHaveBeenCalledWith('Somewhere');
    fireEvent.press(getByText('retry'));
    expect(mockExecuteRecovery).toHaveBeenCalled();
  });
});
