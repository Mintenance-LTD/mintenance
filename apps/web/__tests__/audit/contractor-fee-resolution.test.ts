import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ early: vi.fn(), subscription: vi.fn() }));
vi.mock('@/lib/subscription/early-access', () => ({
  getEarlyAccessEntitlement: mocks.early,
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    from: () => {
      const query = {
        select: () => query,
        eq: () => query,
        in: () => query,
        order: () => query,
        limit: () => query,
        maybeSingle: mocks.subscription,
      };
      return query;
    },
  },
}));
import { FeeCalculationService } from '@/lib/services/payment/FeeCalculationService';

describe('contractor fee lookup failure boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.early.mockResolvedValue({ eligible: false, reason: 'not_in_cohort' });
    mocks.subscription.mockResolvedValue({ data: null, error: null });
  });
  it('uses basic only after a successful lookup with no subscription', async () => {
    await expect(
      FeeCalculationService.resolveContractorTier('contractor')
    ).resolves.toBe('basic');
  });
  it('honours an early-access contractor grant', async () => {
    mocks.early.mockResolvedValue({
      eligible: true,
      role: 'contractor',
      reason: 'eligible',
    });
    await expect(
      FeeCalculationService.resolveContractorTier('contractor')
    ).resolves.toBe('enterprise');
    expect(mocks.subscription).not.toHaveBeenCalled();
  });
  it('does not convert an early-access outage into a higher fee', async () => {
    mocks.early.mockResolvedValue({ eligible: false, reason: 'error' });
    await expect(
      FeeCalculationService.resolveContractorTier('contractor')
    ).rejects.toMatchObject({ statusCode: 503 });
    expect(mocks.subscription).not.toHaveBeenCalled();
  });
  it('does not convert a subscription database error into basic', async () => {
    mocks.subscription.mockResolvedValue({
      data: null,
      error: { code: 'XX000' },
    });
    await expect(
      FeeCalculationService.resolveContractorTier('contractor')
    ).rejects.toMatchObject({ statusCode: 503 });
  });
  it('rejects an unrecognized paid plan rather than guessing its fee', async () => {
    mocks.subscription.mockResolvedValue({
      data: { plan_type: 'invalid' },
      error: null,
    });
    await expect(
      FeeCalculationService.resolveContractorTier('contractor')
    ).rejects.toMatchObject({ statusCode: 503 });
  });
  it.each(['free', 'basic', 'professional', 'enterprise'])(
    'preserves the recorded %s tier',
    async (plan_type) => {
      mocks.subscription.mockResolvedValue({
        data: { plan_type },
        error: null,
      });
      await expect(
        FeeCalculationService.resolveContractorTier('contractor')
      ).resolves.toBe(plan_type);
    }
  );
});
