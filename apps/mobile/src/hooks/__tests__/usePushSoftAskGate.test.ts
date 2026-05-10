/**
 * usePushSoftAskGate — central to the chronic `user_push_tokens = 0`
 * production P0. Audit P1.5 (2026-05-10) flagged that none of the
 * lifecycle-critical mobile push files had unit tests; this is the
 * foundation that exercises the gate's decision logic so a regression
 * in the cooldown / permission-state branching fails CI loudly.
 *
 * Coverage:
 *   - Signed-out user: gate is hidden.
 *   - User without `onboarding_completed`: gate is hidden (don't stack
 *     two modals on a fresh user).
 *   - Permission already 'granted': gate is hidden (nothing to ask).
 *   - Permission 'undetermined' + no prior dismissal: gate is shown.
 *   - Permission 'denied' + no prior dismissal: gate is shown
 *     (the "Open Settings" recovery branch).
 *   - 24h cool-off after a dismissal: gate is hidden during the
 *     cooldown, re-shown after.
 *   - allowNotifications() success path: token is saved + dismissal
 *     stamp is written (so the modal closes for 24h).
 *   - allowNotifications() permission-still-not-granted path: the
 *     dismissal stamp is still written so the modal doesn't loop.
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';

// ---------------------------------------------------------------------------
// Hoisted mocks (survive vitest mockReset, jest defaults too — use vi.hoisted
// where available; mobile uses jest, so do the equivalent with module mocks).
// ---------------------------------------------------------------------------

const mockGetItem = jest.fn();
const mockSetItem = jest.fn();

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: (...args: unknown[]) => mockGetItem(...args),
    setItem: (...args: unknown[]) => mockSetItem(...args),
  },
}));

const mockGetPermissionsAsync = jest.fn();
const mockRequestPermissionsAsync = jest.fn();

jest.mock('expo-notifications', () => ({
  __esModule: true,
  getPermissionsAsync: (...args: unknown[]) => mockGetPermissionsAsync(...args),
  requestPermissionsAsync: (...args: unknown[]) =>
    mockRequestPermissionsAsync(...args),
}));

const mockOpenSettings = jest.fn();
jest.mock('react-native', () => ({
  __esModule: true,
  Linking: {
    openSettings: (...args: unknown[]) => mockOpenSettings(...args),
  },
}));

const mockUseAuth = jest.fn();
jest.mock('../../contexts/AuthContext', () => ({
  __esModule: true,
  useAuth: () => mockUseAuth(),
}));

const mockNotificationServiceInitialize = jest.fn();
const mockNotificationServiceSavePushToken = jest.fn();
jest.mock('../../services/NotificationService', () => ({
  __esModule: true,
  NotificationService: {
    initialize: (...args: unknown[]) =>
      mockNotificationServiceInitialize(...args),
    savePushToken: (...args: unknown[]) =>
      mockNotificationServiceSavePushToken(...args),
  },
}));

jest.mock('../../utils/logger', () => ({
  __esModule: true,
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../../config/sentry', () => ({
  __esModule: true,
  captureException: jest.fn(),
}));

// SUT must be imported AFTER the mocks
import { usePushSoftAskGate } from '../usePushSoftAskGate';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setOnboardedUser(): void {
  mockUseAuth.mockReturnValue({
    user: { id: 'user-1', onboarding_completed: true },
  });
}

function setUnonboardedUser(): void {
  mockUseAuth.mockReturnValue({
    user: { id: 'user-2', onboarding_completed: false },
  });
}

function setSignedOut(): void {
  mockUseAuth.mockReturnValue({ user: null });
}

beforeEach(() => {
  jest.clearAllMocks();
  // Default: no prior dismissal stamp + permission undetermined.
  mockGetItem.mockResolvedValue(null);
  mockSetItem.mockResolvedValue(undefined);
  mockGetPermissionsAsync.mockResolvedValue({ status: 'undetermined' });
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('usePushSoftAskGate — decision logic', () => {
  it('hides the gate when the user is signed out', async () => {
    setSignedOut();
    const { result } = renderHook(() => usePushSoftAskGate());
    await waitFor(() => {
      expect(result.current.shouldShow).toBe(false);
    });
    // No permission lookup attempted for signed-out users
    expect(mockGetPermissionsAsync).not.toHaveBeenCalled();
  });

  it('hides the gate when the user has not completed onboarding', async () => {
    setUnonboardedUser();
    const { result } = renderHook(() => usePushSoftAskGate());
    await waitFor(() => {
      expect(result.current.shouldShow).toBe(false);
    });
    expect(mockGetPermissionsAsync).not.toHaveBeenCalled();
  });

  it('hides the gate when push permission is already granted', async () => {
    setOnboardedUser();
    mockGetPermissionsAsync.mockResolvedValue({ status: 'granted' });
    const { result } = renderHook(() => usePushSoftAskGate());
    await waitFor(() => {
      expect(result.current.shouldShow).toBe(false);
      expect(result.current.permissionStatus).toBe('granted');
    });
    // Granted = no AsyncStorage cooldown read needed
    expect(mockGetItem).not.toHaveBeenCalled();
  });

  it('shows the gate when permission is undetermined and there is no prior dismissal', async () => {
    setOnboardedUser();
    mockGetPermissionsAsync.mockResolvedValue({ status: 'undetermined' });
    mockGetItem.mockResolvedValue(null);

    const { result } = renderHook(() => usePushSoftAskGate());

    await waitFor(() => {
      expect(result.current.shouldShow).toBe(true);
      expect(result.current.permissionStatus).toBe('undetermined');
    });
  });

  it('shows the gate when permission is denied (Open Settings recovery branch)', async () => {
    setOnboardedUser();
    mockGetPermissionsAsync.mockResolvedValue({ status: 'denied' });
    mockGetItem.mockResolvedValue(null);

    const { result } = renderHook(() => usePushSoftAskGate());

    await waitFor(() => {
      expect(result.current.shouldShow).toBe(true);
      expect(result.current.permissionStatus).toBe('denied');
    });
  });

  it('hides the gate within the 24h cooldown after a dismissal', async () => {
    setOnboardedUser();
    mockGetPermissionsAsync.mockResolvedValue({ status: 'undetermined' });
    // Stamp from 12 hours ago — well inside the 24h cooldown.
    mockGetItem.mockResolvedValue(
      new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
    );

    const { result } = renderHook(() => usePushSoftAskGate());

    await waitFor(() => {
      expect(result.current.shouldShow).toBe(false);
    });
  });

  it('re-shows the gate after the 24h cooldown elapses', async () => {
    setOnboardedUser();
    mockGetPermissionsAsync.mockResolvedValue({ status: 'undetermined' });
    // Stamp from 25 hours ago — past the 24h cooldown.
    mockGetItem.mockResolvedValue(
      new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString()
    );

    const { result } = renderHook(() => usePushSoftAskGate());

    await waitFor(() => {
      expect(result.current.shouldShow).toBe(true);
    });
  });
});

describe('usePushSoftAskGate — allowNotifications()', () => {
  it('saves the token + writes the dismissal stamp on success', async () => {
    setOnboardedUser();
    mockGetPermissionsAsync
      .mockResolvedValueOnce({ status: 'undetermined' }) // initial gate evaluation
      .mockResolvedValueOnce({ status: 'granted' }); // post-CTA re-read
    mockNotificationServiceInitialize.mockResolvedValue(
      'ExponentPushToken[abc]'
    );
    mockNotificationServiceSavePushToken.mockResolvedValue(undefined);

    const { result } = renderHook(() => usePushSoftAskGate());

    // Wait for the gate to resolve
    await waitFor(() => {
      expect(result.current.shouldShow).toBe(true);
    });

    let resolvedStatus: string = '';
    await act(async () => {
      resolvedStatus = await result.current.allowNotifications();
    });

    expect(resolvedStatus).toBe('granted');
    // Critical: the underlying initialize is called WITH promptIfUndetermined=true
    expect(mockNotificationServiceInitialize).toHaveBeenCalledWith({
      promptIfUndetermined: true,
    });
    // Token was saved against the user
    expect(mockNotificationServiceSavePushToken).toHaveBeenCalledWith(
      'user-1',
      'ExponentPushToken[abc]'
    );
    // Dismissal stamp written so the modal won't reopen on next mount
    expect(mockSetItem).toHaveBeenCalledWith(
      'push_soft_ask_dismissed_at',
      expect.any(String)
    );
  });

  it('still writes the dismissal stamp even when the user denied at the OS prompt', async () => {
    setOnboardedUser();
    mockGetPermissionsAsync
      .mockResolvedValueOnce({ status: 'undetermined' })
      .mockResolvedValueOnce({ status: 'denied' }); // user tapped Don't Allow
    mockNotificationServiceInitialize.mockResolvedValue(null);

    const { result } = renderHook(() => usePushSoftAskGate());
    await waitFor(() => {
      expect(result.current.shouldShow).toBe(true);
    });

    let resolvedStatus: string = '';
    await act(async () => {
      resolvedStatus = await result.current.allowNotifications();
    });

    expect(resolvedStatus).toBe('denied');
    expect(mockNotificationServiceSavePushToken).not.toHaveBeenCalled();
    // Still writes the stamp so the modal respects the cooldown.
    // Without this the user would see the modal on every mount.
    expect(mockSetItem).toHaveBeenCalledWith(
      'push_soft_ask_dismissed_at',
      expect.any(String)
    );
  });
});

describe('usePushSoftAskGate — dismiss + openSystemSettings', () => {
  it('dismiss() writes the cooldown stamp and hides the modal', async () => {
    setOnboardedUser();
    const { result } = renderHook(() => usePushSoftAskGate());
    await waitFor(() => {
      expect(result.current.shouldShow).toBe(true);
    });

    await act(async () => {
      await result.current.dismiss();
    });

    expect(result.current.shouldShow).toBe(false);
    expect(mockSetItem).toHaveBeenCalledWith(
      'push_soft_ask_dismissed_at',
      expect.any(String)
    );
  });

  it('openSystemSettings() deep-links to the OS settings page and closes the modal', async () => {
    setOnboardedUser();
    mockGetPermissionsAsync.mockResolvedValue({ status: 'denied' });
    const { result } = renderHook(() => usePushSoftAskGate());
    await waitFor(() => {
      expect(result.current.shouldShow).toBe(true);
    });

    await act(async () => {
      await result.current.openSystemSettings();
    });

    expect(mockOpenSettings).toHaveBeenCalledTimes(1);
    expect(result.current.shouldShow).toBe(false);
    // Cooldown stamp written so we don't re-prompt before the user
    // returns from settings.
    expect(mockSetItem).toHaveBeenCalledWith(
      'push_soft_ask_dismissed_at',
      expect.any(String)
    );
  });
});
