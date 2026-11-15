import { renderHook, act, waitFor } from '@testing-library/react';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
const state = vi.hoisted(() => ({
  user: null as null | { id: string; role: string },
  loading: false,
}));
vi.mock('@/hooks/useCurrentUser', () => ({ useCurrentUser: () => state }));
vi.mock('@/lib/feature-access-config', () => ({
  FEATURES: { premium: { id: 'premium', name: 'Premium' } },
  hasFeatureAccess: (_id: string, _role: string, tier: string) =>
    tier === 'paid',
  getFeatureLimit: (_id: string, _role: string, tier: string) =>
    tier === 'paid',
  getUpgradeTiers: () => ['paid'],
}));
beforeEach(() => {
  state.user = null;
  state.loading = false;
  vi.restoreAllMocks();
});
it('never flashes an upgrade during login or after an account switch', async () => {
  let resolve: (value: unknown) => void = () => {};
  vi.stubGlobal(
    'fetch',
    vi.fn(
      () =>
        new Promise((done) => {
          resolve = done;
        })
    )
  );
  const { result, rerender } = renderHook(() => useFeatureAccess());
  state.user = { id: 'one', role: 'homeowner' };
  rerender();
  expect(result.current.loading).toBe(true);
  expect(result.current.hasAccess('premium').requiresUpgrade).toBe(false);
  await act(async () =>
    resolve({
      ok: true,
      json: async () => ({ tier: 'paid', status: 'active', usage: [] }),
    })
  );
  await waitFor(() =>
    expect(result.current.hasAccess('premium').hasAccess).toBe(true)
  );
  state.user = { id: 'two', role: 'homeowner' };
  rerender();
  expect(result.current.loading).toBe(true);
  expect(result.current.hasAccess('premium').hasAccess).toBe(false);
  expect(result.current.hasAccess('premium').requiresUpgrade).toBe(false);
});
it('shows an error instead of treating an unavailable entitlement as a free plan', async () => {
  state.user = { id: 'one', role: 'homeowner' };
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 }));
  const { result } = renderHook(() => useFeatureAccess());
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.error).toMatch(/could not be checked/);
  expect(result.current.hasAccess('premium').requiresUpgrade).toBe(false);
});
