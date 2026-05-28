/**
 * useEnsurePushTokenRegistered — silent recovery for the chronic
 * `user_push_tokens = 0` production P0 (Audit P1.5, 2026-05-10).
 *
 * This hook is the safety net that re-attempts token registration on
 * mount + every foreground when permission is already granted but the
 * silent init path never landed a row. These tests pin the decision
 * logic that protects the iOS one-shot dialog and the foreground-retry
 * semantics:
 *   - Signed-out: never touches the OS / network.
 *   - Permission not granted: never prompts, never calls initialize
 *     (the soft-ask modal owns the prompt path).
 *   - Granted + token + save: savePushToken called once; a later
 *     foreground does NOT re-hit the endpoint (success is sticky).
 *   - initialize returns null (Expo throw / EAS misconfig): no save,
 *     Sentry capture fires, success flag NOT set → foreground retries.
 *   - savePushToken throws: Sentry capture, success flag NOT set →
 *     a subsequent foreground retries.
 */

import { act, renderHook, waitFor } from '@testing-library/react-native';

const mockUseAuth = jest.fn();
jest.mock('../../contexts/AuthContext', () => ({
  __esModule: true,
  useAuth: () => mockUseAuth(),
}));

const mockGetPermissionsAsync = jest.fn();
jest.mock('expo-notifications', () => ({
  __esModule: true,
  getPermissionsAsync: (...a: unknown[]) => mockGetPermissionsAsync(...a),
}));

const mockInitialize = jest.fn();
const mockSavePushToken = jest.fn();
jest.mock('../../services/NotificationService', () => ({
  __esModule: true,
  NotificationService: {
    initialize: (...a: unknown[]) => mockInitialize(...a),
    savePushToken: (...a: unknown[]) => mockSavePushToken(...a),
  },
}));

const mockCaptureException = jest.fn();
jest.mock('../../config/sentry', () => ({
  __esModule: true,
  addBreadcrumb: jest.fn(),
  captureException: (...a: unknown[]) => mockCaptureException(...a),
}));

// Controllable AppState so we can drive foreground ('active') transitions.
let appStateHandler: ((s: string) => void) | null = null;
jest.mock('react-native', () => ({
  __esModule: true,
  AppState: {
    currentState: 'active',
    addEventListener: jest.fn(
      (_event: string, handler: (s: string) => void) => {
        appStateHandler = handler;
        return { remove: jest.fn() };
      }
    ),
  },
}));

import { useEnsurePushTokenRegistered } from '../useEnsurePushTokenRegistered';

function triggerForeground(): void {
  appStateHandler?.('active');
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  appStateHandler = null;
  mockUseAuth.mockReturnValue({ user: { id: 'user-1' } });
  mockGetPermissionsAsync.mockResolvedValue({ status: 'granted' });
  mockInitialize.mockResolvedValue('ExponentPushToken[abc]');
  mockSavePushToken.mockResolvedValue(undefined);
});

afterEach(() => {
  jest.useRealTimers();
});

// Advance past the 1500ms mount debounce and flush the async chain.
async function flushMount(): Promise<void> {
  await act(async () => {
    jest.advanceTimersByTime(1600);
  });
}

describe('useEnsurePushTokenRegistered', () => {
  it('does nothing for a signed-out user', async () => {
    mockUseAuth.mockReturnValue({ user: null });
    renderHook(() => useEnsurePushTokenRegistered());
    await flushMount();
    expect(mockGetPermissionsAsync).not.toHaveBeenCalled();
    expect(mockInitialize).not.toHaveBeenCalled();
  });

  it('does not prompt or initialize when permission is not granted', async () => {
    mockGetPermissionsAsync.mockResolvedValue({ status: 'denied' });
    renderHook(() => useEnsurePushTokenRegistered());
    await flushMount();
    expect(mockGetPermissionsAsync).toHaveBeenCalled();
    expect(mockInitialize).not.toHaveBeenCalled();
    expect(mockSavePushToken).not.toHaveBeenCalled();
  });

  it('registers the token on mount when permission is granted', async () => {
    renderHook(() => useEnsurePushTokenRegistered());
    await flushMount();
    await waitFor(() => {
      expect(mockInitialize).toHaveBeenCalledWith({
        promptIfUndetermined: false,
      });
      expect(mockSavePushToken).toHaveBeenCalledWith(
        'user-1',
        'ExponentPushToken[abc]'
      );
    });
  });

  it('does not re-hit the endpoint on a later foreground after success', async () => {
    renderHook(() => useEnsurePushTokenRegistered());
    await flushMount();
    await waitFor(() => expect(mockSavePushToken).toHaveBeenCalledTimes(1));

    await act(async () => {
      triggerForeground();
    });
    // Success is sticky for the session — no second save.
    expect(mockSavePushToken).toHaveBeenCalledTimes(1);
  });

  it('captures to Sentry and does NOT mark success when Expo returns null', async () => {
    mockInitialize.mockResolvedValue(null);
    renderHook(() => useEnsurePushTokenRegistered());
    await flushMount();
    await waitFor(() => expect(mockCaptureException).toHaveBeenCalled());
    expect(mockSavePushToken).not.toHaveBeenCalled();

    // Not sticky — a foreground transition retries.
    await act(async () => {
      triggerForeground();
    });
    await waitFor(() => expect(mockInitialize).toHaveBeenCalledTimes(2));
  });

  it('retries on the next foreground after a savePushToken failure', async () => {
    mockSavePushToken.mockRejectedValueOnce(new Error('5xx'));
    renderHook(() => useEnsurePushTokenRegistered());
    await flushMount();
    await waitFor(() => expect(mockCaptureException).toHaveBeenCalled());

    mockSavePushToken.mockResolvedValueOnce(undefined);
    await act(async () => {
      triggerForeground();
    });
    await waitFor(() => expect(mockSavePushToken).toHaveBeenCalledTimes(2));
  });
});
