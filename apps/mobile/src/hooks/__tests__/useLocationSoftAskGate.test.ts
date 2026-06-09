/**
 * useLocationSoftAskGate — contextual foreground-location soft-ask for
 * contractors. Mirrors the usePushSoftAskGate test: exercises the gate
 * decision branches (signed-out / non-contractor / not-onboarded / granted /
 * undetermined / denied / cool-off / error) plus allow/dismiss/openSettings.
 */
import { renderHook, act, waitFor } from '@testing-library/react-native';

const mockGetItem = jest.fn();
const mockSetItem = jest.fn();
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: (...a: unknown[]) => mockGetItem(...a),
    setItem: (...a: unknown[]) => mockSetItem(...a),
  },
}));

const mockGetFg = jest.fn();
const mockRequestFg = jest.fn();
jest.mock('expo-location', () => ({
  __esModule: true,
  getForegroundPermissionsAsync: (...a: unknown[]) => mockGetFg(...a),
  requestForegroundPermissionsAsync: (...a: unknown[]) => mockRequestFg(...a),
}));

const mockOpenSettings = jest.fn();
jest.mock('react-native', () => ({
  __esModule: true,
  Linking: { openSettings: (...a: unknown[]) => mockOpenSettings(...a) },
}));

const mockUseAuth = jest.fn();
jest.mock('../../contexts/AuthContext', () => ({
  __esModule: true,
  useAuth: () => mockUseAuth(),
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

import { useLocationSoftAskGate } from '../useLocationSoftAskGate';

const STORAGE_KEY = 'location_soft_ask_dismissed_at';
const onboardedContractor = {
  id: 'u1',
  role: 'contractor',
  onboarding_completed: true,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAuth.mockReturnValue({ user: onboardedContractor });
  mockGetItem.mockResolvedValue(null);
  mockSetItem.mockResolvedValue(undefined);
  mockGetFg.mockResolvedValue({ status: 'undetermined' });
  mockRequestFg.mockResolvedValue({ status: 'granted' });
});

async function renderGate() {
  const hook = renderHook(() => useLocationSoftAskGate());
  // Let the evaluate effect settle.
  await waitFor(() =>
    expect(hook.result.current.permissionStatus).not.toBe(undefined)
  );
  return hook;
}

describe('gate visibility', () => {
  it('is hidden for a signed-out user', async () => {
    mockUseAuth.mockReturnValue({ user: null });
    const { result } = renderHook(() => useLocationSoftAskGate());
    await waitFor(() => expect(result.current.shouldShow).toBe(false));
    expect(mockGetFg).not.toHaveBeenCalled();
  });

  it('is hidden for a non-contractor', async () => {
    mockUseAuth.mockReturnValue({
      user: { ...onboardedContractor, role: 'homeowner' },
    });
    const { result } = renderHook(() => useLocationSoftAskGate());
    await waitFor(() => expect(result.current.shouldShow).toBe(false));
    expect(mockGetFg).not.toHaveBeenCalled();
  });

  it('is hidden until onboarding is complete', async () => {
    mockUseAuth.mockReturnValue({
      user: { ...onboardedContractor, onboarding_completed: false },
    });
    const { result } = renderHook(() => useLocationSoftAskGate());
    await waitFor(() => expect(result.current.shouldShow).toBe(false));
  });

  it('is hidden when permission is already granted', async () => {
    mockGetFg.mockResolvedValue({ status: 'granted' });
    const { result } = renderHook(() => useLocationSoftAskGate());
    await waitFor(() =>
      expect(result.current.permissionStatus).toBe('granted')
    );
    expect(result.current.shouldShow).toBe(false);
  });

  it('is shown for undetermined permission with no prior dismissal', async () => {
    const { result } = renderHook(() => useLocationSoftAskGate());
    await waitFor(() => expect(result.current.shouldShow).toBe(true));
  });

  it('is shown for denied permission (recovery path)', async () => {
    mockGetFg.mockResolvedValue({ status: 'denied' });
    const { result } = renderHook(() => useLocationSoftAskGate());
    await waitFor(() => expect(result.current.shouldShow).toBe(true));
    expect(result.current.permissionStatus).toBe('denied');
  });

  it('respects the 7-day cool-off then re-shows after it', async () => {
    mockGetItem.mockResolvedValue(new Date().toISOString()); // just dismissed
    const within = renderHook(() => useLocationSoftAskGate());
    await waitFor(() =>
      expect(within.result.current.permissionStatus).toBe('undetermined')
    );
    expect(within.result.current.shouldShow).toBe(false);

    const old = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
    mockGetItem.mockResolvedValue(old);
    const after = renderHook(() => useLocationSoftAskGate());
    await waitFor(() => expect(after.result.current.shouldShow).toBe(true));
  });

  it('hides on an evaluation error', async () => {
    mockGetFg.mockRejectedValue(new Error('perm boom'));
    const { result } = renderHook(() => useLocationSoftAskGate());
    await waitFor(() => expect(result.current.shouldShow).toBe(false));
  });
});

describe('allowLocation', () => {
  it('returns undetermined without a user id', async () => {
    mockUseAuth.mockReturnValue({ user: {} });
    const { result } = await renderGate();
    let outcome: string | undefined;
    await act(async () => {
      outcome = await result.current.allowLocation();
    });
    expect(outcome).toBe('undetermined');
    expect(mockRequestFg).not.toHaveBeenCalled();
  });

  it('requests permission, stamps cool-off and returns the status', async () => {
    const { result } = await renderGate();
    let outcome: string | undefined;
    await act(async () => {
      outcome = await result.current.allowLocation();
    });
    expect(outcome).toBe('granted');
    expect(mockSetItem).toHaveBeenCalledWith(STORAGE_KEY, expect.any(String));
    expect(result.current.shouldShow).toBe(false);
  });

  it('returns undetermined and logs when the request throws', async () => {
    mockRequestFg.mockRejectedValueOnce(new Error('request boom'));
    const { result } = await renderGate();
    let outcome: string | undefined;
    await act(async () => {
      outcome = await result.current.allowLocation();
    });
    expect(outcome).toBe('undetermined');
  });
});

describe('dismiss + openSystemSettings', () => {
  it('dismiss stamps the cool-off and hides', async () => {
    const { result } = await renderGate();
    await act(async () => {
      await result.current.dismiss();
    });
    expect(mockSetItem).toHaveBeenCalledWith(STORAGE_KEY, expect.any(String));
    expect(result.current.shouldShow).toBe(false);
  });

  it('dismiss swallows a persistence failure', async () => {
    mockSetItem.mockRejectedValueOnce(new Error('disk full'));
    const { result } = await renderGate();
    await act(async () => {
      await result.current.dismiss();
    });
    expect(result.current.shouldShow).toBe(false);
  });

  it('openSystemSettings deep-links and stamps cool-off', async () => {
    mockOpenSettings.mockResolvedValue(undefined);
    const { result } = await renderGate();
    await act(async () => {
      await result.current.openSystemSettings();
    });
    expect(mockOpenSettings).toHaveBeenCalled();
    expect(mockSetItem).toHaveBeenCalledWith(STORAGE_KEY, expect.any(String));
  });

  it('openSystemSettings swallows a deep-link failure', async () => {
    mockOpenSettings.mockRejectedValueOnce(new Error('no settings'));
    const { result } = await renderGate();
    await act(async () => {
      await result.current.openSystemSettings();
    });
    expect(result.current.shouldShow).toBe(false);
  });
});
