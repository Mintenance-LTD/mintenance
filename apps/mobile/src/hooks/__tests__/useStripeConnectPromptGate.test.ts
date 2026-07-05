/**
 * useStripeConnectPromptGate — Tier 2 nudge after a contractor wins a bid but
 * Stripe charges are not yet enabled. Probes the canonical readiness endpoint
 * GET /api/payments/stripe-connect/status (stripe_charges_enabled is
 * column-revoked from the authenticated role, so it must come from the
 * server) + bids (count via .in()) in parallel. No onboarding_completed
 * pre-check. Mocks AsyncStorage, mobileApiClient, supabase, useAuth, logger.
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

// Connect readiness comes from the server endpoint, never a profiles select
// (column-grant lockdown 20260508100543).
const mockConnectStatusGet = jest.fn();
jest.mock('../../utils/mobileApiClient', () => ({
  __esModule: true,
  mobileApiClient: {
    get: (...a: unknown[]) => mockConnectStatusGet(...a),
  },
}));

const mockBidsCount = jest.fn();
jest.mock('../../config/supabase', () => {
  const chain: Record<string, unknown> = {};
  chain.select = jest.fn(() => chain);
  chain.eq = jest.fn(() => chain);
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
  mockConnectStatusGet.mockResolvedValue({
    success: true,
    status: { chargesEnabled: false },
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

  it('is hidden when the connect status fetch fails', async () => {
    mockConnectStatusGet.mockRejectedValue(new Error('p down'));
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

  it('is shown when no Connect account exists yet (status null)', async () => {
    // The endpoint returns status: null when the contractor has never
    // started Connect onboarding — the gate's core audience.
    mockConnectStatusGet.mockResolvedValue({ success: true, status: null });
    const { result } = renderHook(() => useStripeConnectPromptGate());
    await waitFor(() => expect(result.current.shouldShow).toBe(true));
  });

  it('is hidden when charges are already enabled', async () => {
    mockConnectStatusGet.mockResolvedValue({
      success: true,
      status: { chargesEnabled: true },
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
    // The connect fetch has its own .catch, so exercise the outer
    // try/catch via the AsyncStorage dismissal read.
    mockGetItem.mockRejectedValue(new Error('boom'));
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
    mockConnectStatusGet.mockClear();
    await act(async () => {
      await result.current.refresh();
    });
    expect(mockConnectStatusGet).toHaveBeenCalledWith(
      '/api/payments/stripe-connect/status'
    );
  });
});
