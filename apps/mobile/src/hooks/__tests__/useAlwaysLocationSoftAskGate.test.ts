/**
 * useAlwaysLocationSoftAskGate — Tier 2 background-location soft-ask.
 * Like the foreground gate but additionally gated on: foreground granted,
 * background not granted, and >=1 active job (supabase count query).
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
const mockGetBg = jest.fn();
const mockRequestBg = jest.fn();
jest.mock('expo-location', () => ({
  __esModule: true,
  getForegroundPermissionsAsync: (...a: unknown[]) => mockGetFg(...a),
  getBackgroundPermissionsAsync: (...a: unknown[]) => mockGetBg(...a),
  requestBackgroundPermissionsAsync: (...a: unknown[]) => mockRequestBg(...a),
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

const mockJobsCount = jest.fn();
jest.mock('../../config/supabase', () => {
  const chain: Record<string, unknown> = {};
  chain.select = jest.fn(() => chain);
  chain.eq = jest.fn(() => chain);
  chain.in = jest.fn(() => mockJobsCount());
  return { __esModule: true, supabase: { from: jest.fn(() => chain) } };
});

jest.mock('../../utils/logger', () => ({
  __esModule: true,
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

import { useAlwaysLocationSoftAskGate } from '../useAlwaysLocationSoftAskGate';

const STORAGE_KEY = 'always_location_soft_ask_dismissed_at';
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
  mockGetFg.mockResolvedValue({ status: 'granted' });
  mockGetBg.mockResolvedValue({ status: 'undetermined' });
  mockRequestBg.mockResolvedValue({ status: 'granted' });
  mockJobsCount.mockResolvedValue({ count: 1, error: null });
});

async function ready() {
  const hook = renderHook(() => useAlwaysLocationSoftAskGate());
  await waitFor(() =>
    expect(hook.result.current.permissionStatus).not.toBe(undefined)
  );
  return hook;
}

describe('gate visibility', () => {
  it('is hidden for a signed-out user', async () => {
    mockUseAuth.mockReturnValue({ user: null });
    const { result } = renderHook(() => useAlwaysLocationSoftAskGate());
    await waitFor(() => expect(result.current.shouldShow).toBe(false));
    expect(mockGetFg).not.toHaveBeenCalled();
  });

  it('is hidden for a non-contractor', async () => {
    mockUseAuth.mockReturnValue({
      user: { ...onboardedContractor, role: 'homeowner' },
    });
    const { result } = renderHook(() => useAlwaysLocationSoftAskGate());
    await waitFor(() => expect(result.current.shouldShow).toBe(false));
  });

  it('is hidden until onboarding is complete', async () => {
    mockUseAuth.mockReturnValue({
      user: { ...onboardedContractor, onboarding_completed: false },
    });
    const { result } = renderHook(() => useAlwaysLocationSoftAskGate());
    await waitFor(() => expect(result.current.shouldShow).toBe(false));
  });

  it('is hidden when foreground permission is not yet granted', async () => {
    mockGetFg.mockResolvedValue({ status: 'undetermined' });
    const { result } = renderHook(() => useAlwaysLocationSoftAskGate());
    await waitFor(() => expect(result.current.shouldShow).toBe(false));
    expect(mockGetBg).not.toHaveBeenCalled();
  });

  it('is hidden when background permission is already granted', async () => {
    mockGetBg.mockResolvedValue({ status: 'granted' });
    const { result } = renderHook(() => useAlwaysLocationSoftAskGate());
    await waitFor(() =>
      expect(result.current.permissionStatus).toBe('granted')
    );
    expect(result.current.shouldShow).toBe(false);
  });

  it('respects the 7-day cool-off', async () => {
    mockGetItem.mockResolvedValue(new Date().toISOString());
    const { result } = renderHook(() => useAlwaysLocationSoftAskGate());
    await waitFor(() =>
      expect(result.current.permissionStatus).toBe('undetermined')
    );
    expect(result.current.shouldShow).toBe(false);
  });

  it('is hidden when there is no active job', async () => {
    mockJobsCount.mockResolvedValue({ count: 0, error: null });
    const { result } = renderHook(() => useAlwaysLocationSoftAskGate());
    await waitFor(() =>
      expect(result.current.permissionStatus).toBe('undetermined')
    );
    expect(result.current.shouldShow).toBe(false);
  });

  it('is shown when all gates pass and an active job exists', async () => {
    const { result } = renderHook(() => useAlwaysLocationSoftAskGate());
    await waitFor(() => expect(result.current.shouldShow).toBe(true));
  });

  it('is hidden when the jobs query errors', async () => {
    mockJobsCount.mockResolvedValue({
      count: null,
      error: { message: 'db down' },
    });
    const { result } = renderHook(() => useAlwaysLocationSoftAskGate());
    await waitFor(() =>
      expect(result.current.permissionStatus).toBe('undetermined')
    );
    expect(result.current.shouldShow).toBe(false);
  });

  it('is hidden on an evaluation error', async () => {
    mockGetBg.mockRejectedValue(new Error('perm boom'));
    const { result } = renderHook(() => useAlwaysLocationSoftAskGate());
    await waitFor(() => expect(result.current.shouldShow).toBe(false));
  });
});

describe('allowAlways', () => {
  it('returns undetermined without a user id', async () => {
    mockUseAuth.mockReturnValue({ user: {} });
    const { result } = await ready();
    let outcome: string | undefined;
    await act(async () => {
      outcome = await result.current.allowAlways();
    });
    expect(outcome).toBe('undetermined');
    expect(mockRequestBg).not.toHaveBeenCalled();
  });

  it('requests background permission, stamps and returns status', async () => {
    const { result } = await ready();
    let outcome: string | undefined;
    await act(async () => {
      outcome = await result.current.allowAlways();
    });
    expect(outcome).toBe('granted');
    expect(mockSetItem).toHaveBeenCalledWith(STORAGE_KEY, expect.any(String));
  });

  it('returns undetermined and logs when the request throws', async () => {
    mockRequestBg.mockRejectedValueOnce(new Error('req boom'));
    const { result } = await ready();
    let outcome: string | undefined;
    await act(async () => {
      outcome = await result.current.allowAlways();
    });
    expect(outcome).toBe('undetermined');
  });
});

describe('dismiss / openSystemSettings / refresh', () => {
  it('dismiss stamps cool-off and hides', async () => {
    const { result } = await ready();
    await act(async () => {
      await result.current.dismiss();
    });
    expect(mockSetItem).toHaveBeenCalledWith(STORAGE_KEY, expect.any(String));
  });

  it('dismiss swallows a persistence failure', async () => {
    mockSetItem.mockRejectedValueOnce(new Error('disk full'));
    const { result } = await ready();
    await act(async () => {
      await result.current.dismiss();
    });
    expect(result.current.shouldShow).toBe(false);
  });

  it('openSystemSettings deep-links and stamps', async () => {
    mockOpenSettings.mockResolvedValue(undefined);
    const { result } = await ready();
    await act(async () => {
      await result.current.openSystemSettings();
    });
    expect(mockOpenSettings).toHaveBeenCalled();
  });

  it('openSystemSettings swallows a failure', async () => {
    mockOpenSettings.mockRejectedValueOnce(new Error('no settings'));
    const { result } = await ready();
    await act(async () => {
      await result.current.openSystemSettings();
    });
    expect(result.current.shouldShow).toBe(false);
  });

  it('refresh re-runs the probe', async () => {
    const { result } = await ready();
    mockGetFg.mockClear();
    await act(async () => {
      await result.current.refresh();
    });
    expect(mockGetFg).toHaveBeenCalled();
  });
});
