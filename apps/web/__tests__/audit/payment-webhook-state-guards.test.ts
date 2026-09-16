import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  update: vi.fn(),
  cash: vi.fn(),
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { from: mocks.from },
}));
vi.mock('@/lib/services/payment/PaymentFundingService', () => ({
  getEscrowCashRequirement: mocks.cash,
  reconcileReservedFundingIntent: vi.fn(),
}));
import {
  handlePaymentIntentSucceeded,
  handlePaymentIntentFailed,
  handlePaymentIntentCanceled,
} from '@/lib/services/stripe-webhook/payment-intent-handlers';
const intent = {
  id: 'pi_synthetic_guard',
  currency: 'gbp',
  amount: 50000,
  metadata: {},
} as never;
beforeEach(() => {
  vi.clearAllMocks();
  mocks.cash.mockResolvedValue(50000);
});
describe('webhook funding state boundaries', () => {
  it.each([handlePaymentIntentFailed, handlePaymentIntentCanceled])(
    'rejects terminal-event lookup errors for webhook retry',
    async (handler) => {
      const query = {
        select: () => query,
        eq: () => query,
        maybeSingle: async () => ({
          data: null,
          error: { message: 'synthetic database unavailable' },
        }),
        update: mocks.update,
      };
      mocks.from.mockReturnValue(query);
      await expect(handler(intent, vi.fn())).rejects.toThrow();
      expect(mocks.update).not.toHaveBeenCalled();
    }
  );
  it.each([
    'pending_review',
    'awaiting_homeowner_approval',
    'refunded',
    'released',
    'disputed',
  ])('does not reopen funded escrow in %s', async (status) => {
    const query = {
      select: () => query,
      eq: () => query,
      maybeSingle: async () => ({
        data: { id: 'escrow', status, amount: 500 },
        error: null,
      }),
      update: mocks.update.mockImplementation(() => {
        throw new Error('Unexpected funded-state mutation');
      }),
    };
    mocks.from.mockReturnValue(query);
    await expect(
      handlePaymentIntentSucceeded(intent, vi.fn())
    ).resolves.toBeUndefined();
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
