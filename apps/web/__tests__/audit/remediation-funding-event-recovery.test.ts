import { beforeEach, describe, expect, it, vi } from 'vitest';
import type Stripe from 'stripe';
const mocks = vi.hoisted(() => ({ single: vi.fn(), rpc: vi.fn() }));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    from: () => ({ select: () => ({ eq: () => ({ single: mocks.single }) }) }),
    rpc: mocks.rpc,
  },
}));
import { reconcileReservedFundingIntent } from '@/lib/services/payment/PaymentFundingService';

const funding = {
  id: 'reservation',
  payer_id: 'payer',
  payee_id: 'contractor',
  job_id: 'job',
  bid_id: 'bid',
  contract_id: 'contract',
  gross_minor: 50000,
  cash_minor: 45000,
  credit_minor: 5000,
  state: 'reserved',
  payment_intent_id: null,
};
function intent(status = 'succeeded'): Stripe.PaymentIntent {
  return {
    id: 'pi_synthetic',
    status,
    amount: 45000,
    amount_received: 45000,
    currency: 'gbp',
    metadata: {
      fundingReservationId: 'reservation',
      payerId: 'payer',
      contractorId: 'contractor',
      jobId: 'job',
      bidId: 'bid',
      contractId: 'contract',
      creditAppliedPence: '5000',
    },
  } as Stripe.PaymentIntent;
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.single.mockResolvedValue({ data: funding, error: null });
  mocks.rpc.mockImplementation(async (name: string) =>
    name === 'attach_payment_funding'
      ? {
          data: [
            { id: 'escrow', payment_intent_id: 'pi_synthetic', amount: 500 },
          ],
          error: null,
        }
      : { data: true, error: null }
  );
});
describe('provider event recovery for reserved funding', () => {
  it('recovers gross escrow after provider success but missing application record', async () => {
    await expect(
      reconcileReservedFundingIntent(intent())
    ).resolves.toMatchObject({ amount: 500 });
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith(
      'attach_payment_funding',
      {
        p_reservation_id: 'reservation',
        p_payment_intent_id: 'pi_synthetic',
      }
    );
  });
  it('uses the idempotent cancellation transaction for credit restoration', async () => {
    await expect(
      reconcileReservedFundingIntent(intent('canceled'))
    ).resolves.toBeNull();
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith(
      'cancel_payment_funding',
      {
        p_reservation_id: 'reservation',
        p_actor_id: 'payer',
        p_cancelled_intent_id: 'pi_synthetic',
      }
    );
  });
  it.each([
    'payerId',
    'contractorId',
    'jobId',
    'bidId',
    'contractId',
    'creditAppliedPence',
  ])('rejects mismatched event metadata %s', async (key) => {
    const event = intent();
    event.metadata[key] = 'unrelated';
    await expect(reconcileReservedFundingIntent(event)).rejects.toThrow(
      'does not match'
    );
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('does not restore credits after an unknown or processing provider outcome', async () => {
    await expect(
      reconcileReservedFundingIntent(intent('processing'))
    ).rejects.toThrow('not settled');
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('propagates cancellation persistence failures for webhook retry', async () => {
    mocks.rpc.mockResolvedValue({
      data: null,
      error: { message: 'database unavailable' },
    });
    await expect(
      reconcileReservedFundingIntent(intent('canceled'))
    ).rejects.toThrow('requires retry');
  });
  it('does not acknowledge failed escrow recovery as successful', async () => {
    mocks.rpc.mockResolvedValue({
      data: null,
      error: { message: 'database unavailable' },
    });
    await expect(reconcileReservedFundingIntent(intent())).rejects.toThrow(
      'awaiting recovery'
    );
  });
});
