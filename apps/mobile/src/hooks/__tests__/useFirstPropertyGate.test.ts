/**
 * useFirstPropertyGate — prompts a new homeowner to add their first property.
 * Shown for an onboarded homeowner with zero properties and no dismissal.
 * Mocks AsyncStorage, supabase (local count query via .eq()), useAuth, logger.
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

const mockCount = jest.fn();
jest.mock('../../config/supabase', () => {
  const chain: Record<string, unknown> = {};
  chain.select = jest.fn(() => chain);
  chain.eq = jest.fn(() => mockCount());
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

import { useFirstPropertyGate } from '../useFirstPropertyGate';

const STORAGE_KEY = 'first_property_prompt_dismissed_at';
const onboardedHomeowner = {
  id: 'u1',
  role: 'homeowner',
  onboarding_completed: true,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAuth.mockReturnValue({ user: onboardedHomeowner });
  mockGetItem.mockResolvedValue(null);
  mockSetItem.mockResolvedValue(undefined);
  mockCount.mockResolvedValue({ count: 0, error: null });
});

describe('probe / shouldShow', () => {
  it('is hidden for a signed-out user', async () => {
    mockUseAuth.mockReturnValue({ user: null });
    const { result } = renderHook(() => useFirstPropertyGate());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.shouldShow).toBe(false);
  });

  it('is hidden for a non-homeowner', async () => {
    mockUseAuth.mockReturnValue({
      user: { ...onboardedHomeowner, role: 'contractor' },
    });
    const { result } = renderHook(() => useFirstPropertyGate());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.shouldShow).toBe(false);
  });

  it('is hidden until onboarding is complete', async () => {
    mockUseAuth.mockReturnValue({
      user: { ...onboardedHomeowner, onboarding_completed: false },
    });
    const { result } = renderHook(() => useFirstPropertyGate());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.shouldShow).toBe(false);
  });

  it('is hidden when previously dismissed', async () => {
    mockGetItem.mockResolvedValue(new Date().toISOString());
    const { result } = renderHook(() => useFirstPropertyGate());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.shouldShow).toBe(false);
  });

  it('is hidden when the property count query errors', async () => {
    mockCount.mockResolvedValue({ count: null, error: { message: 'db down' } });
    const { result } = renderHook(() => useFirstPropertyGate());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.shouldShow).toBe(false);
  });

  it('is shown when the homeowner has no properties', async () => {
    const { result } = renderHook(() => useFirstPropertyGate());
    await waitFor(() => expect(result.current.shouldShow).toBe(true));
  });

  it('is hidden when the homeowner already has properties', async () => {
    mockCount.mockResolvedValue({ count: 3, error: null });
    const { result } = renderHook(() => useFirstPropertyGate());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.shouldShow).toBe(false);
  });

  it('is hidden when the probe throws', async () => {
    mockCount.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useFirstPropertyGate());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.shouldShow).toBe(false);
  });
});

describe('dismiss + refresh', () => {
  async function ready() {
    const hook = renderHook(() => useFirstPropertyGate());
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

  it('refresh re-probes the property count', async () => {
    const result = await ready();
    mockCount.mockClear();
    await act(async () => {
      await result.current.refresh();
    });
    expect(mockCount).toHaveBeenCalled();
  });
});
