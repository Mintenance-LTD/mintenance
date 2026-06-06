/**
 * useStripeConnectPromptGate — Tier 2 nudge after a contractor wins a bid but
 * Stripe charges are not yet enabled. Probes profiles (maybeSingle) + bids
 * (count via .in()) in parallel. No onboarding_completed pre-check.
 * Mocks AsyncStorage, supabase, useAuth, logger.
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

const mockProfile = jest.fn();
const mockBidsCount = jest.fn();
jest.mock('../../config/supabase', () => {
  const chain: Record<string, unknown> = {};
  chain.select = jest.fn(() => chain);
  chain.eq = jest.fn(() => chain);
  chain.maybeSingle = jest.fn(() => mockProfile()); // profiles path
  chain.in = jest.fn(() => mockBidsCount()); // bids count path
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

import { useStripeConnectPromptGate } from '../useStripeConnectPromptGate';

const STORAGE_KEY = 'stripe_connect_prompt_dismissed_at';
const contractor = { id: 'u1', role: 'contractor' };

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAuth.mockReturnValue({ user: contractor });
  mockGetItem.mockResolvedValue(null);
  mockSetItem.mockResolvedValue(undefined);
  mockProfile.mockResolvedValue({
    data: { stripe_charges_enabled: false },
    error: null,
  });
  mockBidsCount.mockResolvedValue({ count: 1, error: null });
});

describe('probe / shouldShow', () => {
  it('is hidden for a signed-out user', async () => {
    mockUseAuth.mockReturnValue({ user: null });
    const { result } = renderHook(() => useStripeConnectPromptGate());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.shouldShow).toBe(false);
  });

  it('is hidden for a non-contractor', async () => {
    mockUseAuth.mockReturnValue({ user: { ...contractor, role: 'homeowner' } });
    const { result } = renderHook(() => useStripeConnectPromptGate());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.shouldShow).toBe(false);
  });

  it('is hidden when previously dismissed', async () => {
    mockGetItem.mockResolvedValue(new Date().toISOString());
    const { result } = renderHook(() => useStripeConnectPromptGate());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.shouldShow).toBe(false);
  });

  it('is hidden when the profile query errors', async () => {
    mockProfile.mockResolvedValue({ data: null, error: { message: 'p down' } });
    const { result } = renderHook(() => useStripeConnectPromptGate());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.shouldShow).toBe(false);
  });

  it('is hidden when the bids query errors', async () => {
    mockBidsCount.mockResolvedValue({
      count: null,
      error: { message: 'b down' },
    });
    const { result } = renderHook(() => useStripeConnectPromptGate());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.shouldShow).toBe(false);
  });

  it('is shown when a bid is won and charges are not enabled', async () => {
    const { result } = renderHook(() => useStripeConnectPromptGate());
    await waitFor(() => expect(result.current.shouldShow).toBe(true));
  });

  it('is hidden when charges are already enabled', async () => {
    mockProfile.mockResolvedValue({
      data: { stripe_charges_enabled: true },
      error: null,
    });
    const { result } = renderHook(() => useStripeConnectPromptGate());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.shouldShow).toBe(false);
  });

  it('is hidden when there is no winning bid', async () => {
    mockBidsCount.mockResolvedValue({ count: 0, error: null });
    const { result } = renderHook(() => useStripeConnectPromptGate());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.shouldShow).toBe(false);
  });

  it('is hidden when the probe throws', async () => {
    mockProfile.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useStripeConnectPromptGate());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.shouldShow).toBe(false);
  });
});

describe('dismiss + refresh', () => {
  async function ready() {
    const hook = renderHook(() => useStripeConnectPromptGate());
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
    mockProfile.mockClear();
    await act(async () => {
      await result.current.refresh();
    });
    expect(mockProfile).toHaveBeenCalled();
  });
});
