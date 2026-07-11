// @vitest-environment node
// globals: true in vitest.config — do not import from 'vitest' directly (breaks in v4)

/**
 * Characterization tests for EscrowAutoReleaseService.processAutoReleases().
 *
 * This is the hourly cron path that moves real money to contractors, and it
 * previously had ZERO test coverage (2026-07-06 full-stack audit, finding #2).
 * These tests pin the CURRENT behaviour of every branch — eligibility filters,
 * the payee-lock invariant, the fee-threading fix, direct + accumulation
 * transfer modes, and the transfer-reversal compensation on DB failure — so
 * the batch loop can be refactored later without silently changing who gets
 * paid.
 *
 * Strategy: the service's collaborators (fee services, release agent,
 * notification + helper modules, Stripe, Supabase) are all mocked, so we drive
 * pure branch logic. Supabase is a self-returning thenable chain.
 */

const mocks = vi.hoisted(() => ({
  supabaseFrom: vi.fn(),
  stripeTransfersCreate: vi.fn(),
  stripeTransfersCreateReversal: vi.fn(),
  evaluateAutoRelease: vi.fn(),
  notifyAutoRelease: vi.fn(),
  getChargeId: vi.fn(),
  notifyMissingStripeAccount: vi.fn(),
  blockEscrow: vi.fn(),
  resolveContractorTier: vi.fn(),
  calculateFees: vi.fn(),
  transferPlatformFee: vi.fn(),
  accumulateEarnings: vi.fn(),
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { from: (...args: unknown[]) => mocks.supabaseFrom(...args) },
}));

vi.mock('@/lib/stripe', () => ({
  stripe: {
    transfers: {
      create: mocks.stripeTransfersCreate,
      createReversal: mocks.stripeTransfersCreateReversal,
    },
  },
}));

vi.mock('@/lib/services/agents/EscrowReleaseAgent', () => ({
  EscrowReleaseAgent: { evaluateAutoRelease: mocks.evaluateAutoRelease },
}));

vi.mock('../escrow-release-notifications', () => ({
  notifyAutoRelease: mocks.notifyAutoRelease,
}));

vi.mock('../escrow-release-helpers', () => ({
  getChargeId: mocks.getChargeId,
  notifyMissingStripeAccount: mocks.notifyMissingStripeAccount,
  blockEscrow: mocks.blockEscrow,
}));

vi.mock('@/lib/services/payment/FeeCalculationService', () => ({
  FeeCalculationService: {
    resolveContractorTier: mocks.resolveContractorTier,
    calculateFees: mocks.calculateFees,
  },
}));

vi.mock('@/lib/services/payment/FeeTransferService', () => ({
  FeeTransferService: { transferPlatformFee: mocks.transferPlatformFee },
}));

vi.mock('@/lib/stripe/connect/payouts', () => ({
  accumulateEarnings: mocks.accumulateEarnings,
}));

vi.mock('@mintenance/shared', () => ({ logger: mocks.logger }));

import { EscrowAutoReleaseService } from '../EscrowAutoReleaseService';

// A self-returning, thenable Supabase query builder. Every chain method returns
// the same object; awaiting it (at any depth) resolves to `terminal`. Covers
// .select().eq().eq().in().lte().limit(), .update().eq(), and .in().
function chain(terminal: unknown) {
  const p: Record<string, unknown> = {};
  for (const m of [
    'select',
    'eq',
    'in',
    'lte',
    'order',
    'limit',
    'update',
    'single',
  ]) {
    p[m] = vi.fn(() => p);
  }
  p.then = (
    resolve: (v: unknown) => unknown,
    reject: (e: unknown) => unknown
  ) => Promise.resolve(terminal).then(resolve, reject);
  return p;
}

interface SupabaseScenario {
  eligible?: unknown[] | null;
  eligibleError?: { message: string } | null;
  profiles?: Array<{ id: string; stripe_connect_account_id: string | null }>;
  updateResult?: { error: { message: string } | null };
}

function configureSupabase(s: SupabaseScenario) {
  mocks.supabaseFrom.mockImplementation((table: string) => {
    if (table === 'profiles') {
      return {
        select: vi.fn(() => chain({ data: s.profiles ?? [], error: null })),
      };
    }
    // escrow_transactions: select (fetch batch) vs update (finalize)
    return {
      select: vi.fn(() =>
        chain({ data: s.eligible ?? [], error: s.eligibleError ?? null })
      ),
      update: vi.fn(() => chain(s.updateResult ?? { error: null })),
    };
  });
}

function makeEscrow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'escrow-1',
    job_id: 'job-1',
    payer_id: 'homeowner-1',
    payee_id: 'contractor-1',
    amount: 100,
    status: 'held',
    payment_type: 'final',
    payment_intent_id: 'pi_1',
    metadata: null,
    auto_release_enabled: true,
    auto_release_date: '2020-01-01T00:00:00.000Z',
    admin_hold_status: 'none',
    homeowner_approval: false,
    cooling_off_ends_at: null,
    jobs: {
      id: 'job-1',
      status: 'completed',
      contractor_id: 'contractor-1',
      homeowner_id: 'homeowner-1',
      title: 'Fix the boiler',
    },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.ESCROW_USE_PAYOUT_ACCUMULATION;
  // Sensible happy-path defaults; individual tests override.
  mocks.evaluateAutoRelease.mockResolvedValue({ success: true });
  mocks.notifyAutoRelease.mockResolvedValue(undefined);
  mocks.getChargeId.mockResolvedValue('ch_1');
  mocks.notifyMissingStripeAccount.mockResolvedValue(undefined);
  mocks.blockEscrow.mockResolvedValue(undefined);
  mocks.resolveContractorTier.mockResolvedValue('standard');
  mocks.calculateFees.mockReturnValue({
    platformFee: 12,
    contractorAmount: 86.5,
    stripeFee: 1.5,
  });
  mocks.transferPlatformFee.mockResolvedValue({
    status: 'succeeded',
    feeTransferId: 'ft_1',
  });
  mocks.stripeTransfersCreate.mockResolvedValue({ id: 'tr_1' });
  mocks.stripeTransfersCreateReversal.mockResolvedValue({ id: 'trr_1' });
  mocks.accumulateEarnings.mockResolvedValue(undefined);
});

describe('EscrowAutoReleaseService.processAutoReleases', () => {
  it('throws when the eligible-escrow fetch errors', async () => {
    configureSupabase({ eligible: null, eligibleError: { message: 'boom' } });
    await expect(
      EscrowAutoReleaseService.processAutoReleases()
    ).rejects.toThrow('Failed to fetch eligible escrows');
  });

  it('returns zeroed results when no escrows are eligible', async () => {
    configureSupabase({ eligible: [] });
    const res = await EscrowAutoReleaseService.processAutoReleases();
    expect(res).toEqual({ evaluated: 0, released: 0, errors: 0, delayed: 0 });
    expect(mocks.stripeTransfersCreate).not.toHaveBeenCalled();
  });

  it('skips escrows whose job is not completed (evaluated but not released)', async () => {
    configureSupabase({
      eligible: [
        makeEscrow({ jobs: { ...makeEscrow().jobs, status: 'in_progress' } }),
      ],
    });
    const res = await EscrowAutoReleaseService.processAutoReleases();
    expect(res.evaluated).toBe(1);
    expect(res.released).toBe(0);
    expect(mocks.stripeTransfersCreate).not.toHaveBeenCalled();
  });

  it('skips admin-held escrows', async () => {
    configureSupabase({
      eligible: [makeEscrow({ admin_hold_status: 'pending_review' })],
    });
    const res = await EscrowAutoReleaseService.processAutoReleases();
    expect(res.released).toBe(0);
    expect(mocks.evaluateAutoRelease).not.toHaveBeenCalled();
  });

  it('skips escrows still inside the cooling-off window', async () => {
    const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    configureSupabase({
      eligible: [makeEscrow({ cooling_off_ends_at: future })],
    });
    const res = await EscrowAutoReleaseService.processAutoReleases();
    expect(res.released).toBe(0);
    expect(mocks.evaluateAutoRelease).not.toHaveBeenCalled();
  });

  it('counts a delayed evaluation under `delayed`', async () => {
    configureSupabase({ eligible: [makeEscrow()] });
    mocks.evaluateAutoRelease.mockResolvedValue({
      success: false,
      message: 'release delayed pending review',
    });
    const res = await EscrowAutoReleaseService.processAutoReleases();
    expect(res.delayed).toBe(1);
    expect(res.released).toBe(0);
  });

  it('blocks release when payee_id diverges from the current job contractor', async () => {
    configureSupabase({
      eligible: [
        makeEscrow({
          payee_id: 'contractor-OLD',
          jobs: { ...makeEscrow().jobs, contractor_id: 'contractor-NEW' },
        }),
      ],
    });
    const res = await EscrowAutoReleaseService.processAutoReleases();
    expect(mocks.blockEscrow).toHaveBeenCalledWith(
      'escrow-1',
      'payee_contractor_mismatch'
    );
    expect(res.errors).toBe(1);
    expect(mocks.stripeTransfersCreate).not.toHaveBeenCalled();
  });

  it('notifies + counts an error when the contractor has no Stripe account', async () => {
    configureSupabase({
      eligible: [makeEscrow()],
      profiles: [{ id: 'contractor-1', stripe_connect_account_id: null }],
    });
    const res = await EscrowAutoReleaseService.processAutoReleases();
    expect(mocks.notifyMissingStripeAccount).toHaveBeenCalled();
    expect(res.errors).toBe(1);
    expect(mocks.stripeTransfersCreate).not.toHaveBeenCalled();
  });

  it('releases via direct Stripe transfer on the happy path', async () => {
    configureSupabase({
      eligible: [makeEscrow()],
      profiles: [{ id: 'contractor-1', stripe_connect_account_id: 'acct_1' }],
    });
    const res = await EscrowAutoReleaseService.processAutoReleases();

    expect(res.released).toBe(1);
    expect(res.errors).toBe(0);
    // contractorAmount 86.5 -> 8650 minor units, to the correct destination.
    expect(mocks.stripeTransfersCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 8650,
        currency: 'gbp',
        destination: 'acct_1',
      })
    );
    expect(mocks.notifyAutoRelease).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'direct', contractorId: 'contractor-1' })
    );
  });

  it('resolves the contractor tier ONCE and threads it into fee calc + fee transfer', async () => {
    configureSupabase({
      eligible: [makeEscrow()],
      profiles: [{ id: 'contractor-1', stripe_connect_account_id: 'acct_1' }],
    });
    mocks.resolveContractorTier.mockResolvedValue('professional');
    await EscrowAutoReleaseService.processAutoReleases();

    expect(mocks.resolveContractorTier).toHaveBeenCalledWith('contractor-1');
    expect(mocks.calculateFees).toHaveBeenCalledWith(
      100,
      expect.objectContaining({ contractorTier: 'professional' })
    );
    expect(mocks.transferPlatformFee).toHaveBeenCalledWith(
      expect.objectContaining({ contractorTier: 'professional' })
    );
  });

  it('reverses the Stripe transfer when the finalizing DB update fails', async () => {
    configureSupabase({
      eligible: [makeEscrow()],
      profiles: [{ id: 'contractor-1', stripe_connect_account_id: 'acct_1' }],
      updateResult: { error: { message: 'db write failed' } },
    });
    const res = await EscrowAutoReleaseService.processAutoReleases();

    expect(mocks.stripeTransfersCreate).toHaveBeenCalled();
    expect(mocks.stripeTransfersCreateReversal).toHaveBeenCalledWith('tr_1');
    expect(res.errors).toBe(1);
    expect(res.released).toBe(0);
  });

  it('uses accumulation mode (no direct transfer) when the flag is set', async () => {
    process.env.ESCROW_USE_PAYOUT_ACCUMULATION = 'true';
    configureSupabase({
      eligible: [makeEscrow()],
      profiles: [{ id: 'contractor-1', stripe_connect_account_id: 'acct_1' }],
    });
    const res = await EscrowAutoReleaseService.processAutoReleases();

    expect(mocks.accumulateEarnings).toHaveBeenCalledWith(
      expect.objectContaining({
        contractorId: 'contractor-1',
        amountMinor: 8650,
      })
    );
    expect(mocks.stripeTransfersCreate).not.toHaveBeenCalled();
    expect(res.released).toBe(1);
    expect(mocks.notifyAutoRelease).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'accumulated' })
    );
  });
});
