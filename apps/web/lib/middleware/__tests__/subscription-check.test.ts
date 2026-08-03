import { describe, it, expect, vi, beforeEach } from 'vitest';

// Collaborators of subscription-check are mocked so we exercise ONLY the
// checkSubscriptionLimits('submit_bid') branch logic.
const mocks = vi.hoisted(() => ({
  getEarlyAccessEntitlement: vi.fn(),
  getSubscriptionFeatures: vi.fn(),
  getContractorSubscription: vi.fn(),
  getFeatureLimit: vi.fn(),
  supabaseFrom: vi.fn(),
  warn: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ getCurrentUserFromCookies: vi.fn() }));
vi.mock('@/lib/services/subscription/TrialService', () => ({
  TrialService: {},
}));
vi.mock('@/lib/services/subscription/SubscriptionService', () => ({
  SubscriptionService: {
    getSubscriptionFeatures: mocks.getSubscriptionFeatures,
    getContractorSubscription: mocks.getContractorSubscription,
  },
}));
vi.mock('@/lib/feature-access-config', () => ({
  getFeatureLimit: mocks.getFeatureLimit,
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { from: mocks.supabaseFrom },
}));
vi.mock('@/lib/subscription/early-access', () => ({
  getEarlyAccessEntitlement: mocks.getEarlyAccessEntitlement,
}));
vi.mock('@mintenance/shared', () => ({
  logger: { info: vi.fn(), warn: mocks.warn, error: vi.fn(), debug: vi.fn() },
}));

import { checkSubscriptionLimits } from '../subscription-check';

// Thenable Supabase query builder for the monthly bid count:
// .from('bids').select(...).eq(...).gte(...).lte(...) resolves to { count, error }.
function bidsCountChain(result: { count: number | null; error: unknown }) {
  const chain: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'gte', 'lte']) {
    chain[m] = vi.fn(() => chain);
  }
  (chain as { then: unknown }).then = (resolve: (v: unknown) => unknown) =>
    resolve(result);
  return chain;
}

const CONTRACTOR_ID = 'contractor-1';

beforeEach(() => {
  vi.clearAllMocks();
  // Defaults: not early-access, an active subscription so planType resolves.
  mocks.getEarlyAccessEntitlement.mockResolvedValue({ eligible: false });
  mocks.getSubscriptionFeatures.mockResolvedValue({});
  mocks.getContractorSubscription.mockResolvedValue({ planType: 'free' });
});

describe('checkSubscriptionLimits — submit_bid', () => {
  // Regression (2026-08-03): getFeatureLimit returns `false` for an unknown
  // plan tier / missing feature config. The old `: 0` fallback made
  // `count >= 0` always true, blocking ALL bidding with a "limit of 0 bids"
  // message. Every other failure path in this function fails open, so this
  // one must too.
  it('fails OPEN when the bid limit is unresolvable (getFeatureLimit=false)', async () => {
    mocks.getFeatureLimit.mockReturnValue(false);

    const result = await checkSubscriptionLimits(CONTRACTOR_ID, 'submit_bid');

    expect(result.allowed).toBe(true);
    // Must break before ever running the count query.
    expect(mocks.supabaseFrom).not.toHaveBeenCalled();
    // And it should surface the fail-open as a warning for operators.
    expect(mocks.warn).toHaveBeenCalled();
  });

  it('allows an unlimited plan without counting bids', async () => {
    mocks.getFeatureLimit.mockReturnValue('unlimited');

    const result = await checkSubscriptionLimits(CONTRACTOR_ID, 'submit_bid');

    expect(result.allowed).toBe(true);
    expect(mocks.supabaseFrom).not.toHaveBeenCalled();
  });

  it('allows when the contractor is under a numeric monthly limit', async () => {
    mocks.getFeatureLimit.mockReturnValue(10);
    mocks.supabaseFrom.mockReturnValue(
      bidsCountChain({ count: 3, error: null })
    );

    const result = await checkSubscriptionLimits(CONTRACTOR_ID, 'submit_bid');

    expect(result.allowed).toBe(true);
    expect(mocks.supabaseFrom).toHaveBeenCalledWith('bids');
  });

  it('blocks when the contractor has reached a numeric monthly limit', async () => {
    mocks.getFeatureLimit.mockReturnValue(10);
    mocks.supabaseFrom.mockReturnValue(
      bidsCountChain({ count: 10, error: null })
    );

    const result = await checkSubscriptionLimits(CONTRACTOR_ID, 'submit_bid');

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('10 bids');
  });

  it('fails OPEN when the bid-count query errors', async () => {
    mocks.getFeatureLimit.mockReturnValue(10);
    mocks.supabaseFrom.mockReturnValue(
      bidsCountChain({ count: null, error: { message: 'db down' } })
    );

    const result = await checkSubscriptionLimits(CONTRACTOR_ID, 'submit_bid');

    expect(result.allowed).toBe(true);
  });

  it('grants unconditional access to eligible early-access contractors', async () => {
    mocks.getEarlyAccessEntitlement.mockResolvedValue({
      eligible: true,
      role: 'contractor',
    });

    const result = await checkSubscriptionLimits(CONTRACTOR_ID, 'submit_bid');

    expect(result.allowed).toBe(true);
    expect(mocks.getFeatureLimit).not.toHaveBeenCalled();
  });
});
