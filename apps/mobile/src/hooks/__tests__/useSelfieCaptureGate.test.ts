/**
 * useSelfieCaptureGate — Tier 1 final nudge for a live-capture selfie.
 * Shown for an onboarded contractor whose identity is submitted and whose
 * profile photo is not a verified selfie. Mocks AsyncStorage, supabase
 * (maybeSingle), useAuth, logger.
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

const mockUseAuth = jest.fn();
jest.mock('../../contexts/AuthContext', () => ({
  __esModule: true,
  useAuth: () => mockUseAuth(),
}));

const mockMaybeSingle = jest.fn();
jest.mock('../../config/supabase', () => {
  const chain: Record<string, unknown> = {};
  chain.select = jest.fn(() => chain);
  chain.eq = jest.fn(() => chain);
  chain.maybeSingle = jest.fn(() => mockMaybeSingle());
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

import { useSelfieCaptureGate } from '../useSelfieCaptureGate';

const STORAGE_KEY = 'selfie_capture_prompt_dismissed_at';
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
  mockMaybeSingle.mockResolvedValue({
    data: { profile_photo_is_selfie: false, verification_status: 'verified' },
    error: null,
  });
});

describe('probe / shouldShow', () => {
  it('is hidden for a signed-out user', async () => {
    mockUseAuth.mockReturnValue({ user: null });
    const { result } = renderHook(() => useSelfieCaptureGate());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.shouldShow).toBe(false);
  });

  it('is hidden for a non-contractor', async () => {
    mockUseAuth.mockReturnValue({
      user: { ...onboardedContractor, role: 'homeowner' },
    });
    const { result } = renderHook(() => useSelfieCaptureGate());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.shouldShow).toBe(false);
  });

  it('is hidden until onboarding is complete', async () => {
    mockUseAuth.mockReturnValue({
      user: { ...onboardedContractor, onboarding_completed: false },
    });
    const { result } = renderHook(() => useSelfieCaptureGate());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.shouldShow).toBe(false);
  });

  it('is hidden when previously dismissed', async () => {
    mockGetItem.mockResolvedValue(new Date().toISOString());
    const { result } = renderHook(() => useSelfieCaptureGate());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.shouldShow).toBe(false);
  });

  it('is hidden when the query errors', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: null,
      error: { message: 'db down' },
    });
    const { result } = renderHook(() => useSelfieCaptureGate());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.shouldShow).toBe(false);
  });

  it('is shown when identity is done and a selfie is still needed', async () => {
    const { result } = renderHook(() => useSelfieCaptureGate());
    await waitFor(() => expect(result.current.shouldShow).toBe(true));
  });

  it('is hidden when the profile photo is already a verified selfie', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { profile_photo_is_selfie: true, verification_status: 'verified' },
      error: null,
    });
    const { result } = renderHook(() => useSelfieCaptureGate());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.shouldShow).toBe(false);
  });

  it('is hidden when identity has not been submitted', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { profile_photo_is_selfie: false, verification_status: 'none' },
      error: null,
    });
    const { result } = renderHook(() => useSelfieCaptureGate());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.shouldShow).toBe(false);
  });

  it('is hidden when the probe throws', async () => {
    mockMaybeSingle.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useSelfieCaptureGate());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.shouldShow).toBe(false);
  });
});

describe('dismiss + refresh', () => {
  async function ready() {
    const hook = renderHook(() => useSelfieCaptureGate());
    await waitFor(() => expect(hook.result.current.loading).toBe(false));
    return hook.result;
  }

  it('dismiss stamps the flag and hides', async () => {
    const result = await ready();
    await act(async () => {
      await result.current.dismiss();
    });
    expect(mockSetItem).toHaveBeenCalledWith(STORAGE_KEY, expect.any(String));
    expect(result.current.shouldShow).toBe(false);
  });

  it('dismiss swallows a persistence failure', async () => {
    mockSetItem.mockRejectedValueOnce(new Error('disk full'));
    const result = await ready();
    await act(async () => {
      await result.current.dismiss();
    });
    expect(result.current.shouldShow).toBe(false);
  });

  it('refresh re-probes', async () => {
    const result = await ready();
    mockMaybeSingle.mockClear();
    await act(async () => {
      await result.current.refresh();
    });
    expect(mockMaybeSingle).toHaveBeenCalled();
  });
});
