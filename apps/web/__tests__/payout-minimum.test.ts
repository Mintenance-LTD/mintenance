import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  maybeSingle: vi.fn(),
  gte: vi.fn(),
  eq: vi.fn(),
  select: vi.fn(),
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { from: mocks.from },
}));
vi.mock('@/lib/stripe', () => ({ stripe: {} }));
vi.mock('@mintenance/shared', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));
import {
  getPayoutBalance,
  processEligiblePayouts,
} from '@/lib/stripe/connect/payouts';
describe('one-penny payout eligibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const query = {
      select: mocks.select,
      eq: mocks.eq,
      gte: mocks.gte,
      maybeSingle: mocks.maybeSingle,
    };
    mocks.from.mockReturnValue(query);
    mocks.select.mockReturnValue(query);
    mocks.eq.mockReturnValue(query);
    mocks.gte.mockReturnValue(query);
  });
  it.each([
    [0, false],
    [1, true],
    [70, true],
    [4999, true],
  ])('balance %i pence has eligibility %s', async (amount, eligible) => {
    mocks.maybeSingle.mockResolvedValue({
      data: {
        contractor_id: 'contractor',
        currency: 'GBP',
        pending_amount_minor: amount,
        lifetime_paid_out_minor: 0,
      },
      error: null,
    });
    const balance = await getPayoutBalance('contractor');
    expect(balance?.threshold).toBe(1);
    expect(balance?.eligibleForPayout).toBe(eligible);
  });
  it('weekly processor selects every positive balance', async () => {
    mocks.eq.mockResolvedValue({ data: [], error: null });
    expect(await processEligiblePayouts()).toEqual({
      processed: 0,
      skipped: 0,
      failed: 0,
    });
    expect(mocks.gte).toHaveBeenCalledWith('pending_amount_minor', 1);
  });
});
