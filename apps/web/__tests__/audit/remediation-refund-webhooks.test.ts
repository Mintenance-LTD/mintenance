import { beforeEach, describe, expect, it, vi } from 'vitest';
import type Stripe from 'stripe';
const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
  list: vi.fn(),
  charge: vi.fn(),
  refund: vi.fn(),
  reconcile: vi.fn(),
  create: vi.fn(),
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { from: mocks.from, rpc: mocks.rpc },
}));
vi.mock('@/lib/stripe', () => ({
  stripe: {
    charges: { retrieve: mocks.charge },
    refunds: { list: mocks.list, retrieve: mocks.refund, create: mocks.create },
  },
}));
vi.mock('@/lib/utils/api-timeout', () => ({
  stripeWithTimeout: (fn: () => unknown) => fn(),
}));
vi.mock('@/lib/services/payment/RefundService', () => ({
  reconcileRefundEvent: mocks.reconcile,
}));
import {
  reconcileLedgerRefundCharge,
  handleRefundChanged,
} from '@/lib/services/payment/RefundWebhookService';
const charge = {
  id: 'ch_synthetic',
  payment_intent: 'pi_synthetic',
  amount: 45000,
  amount_refunded: 10000,
  currency: 'gbp',
} as Stripe.Charge;
const refund = {
  id: 're_synthetic',
  charge: charge.id,
  status: 'succeeded',
  metadata: { refundOperationId: 'operation-1' },
} as unknown as Stripe.Refund;
let rows: Record<string, unknown>;
let recorded: { cash_refunded_minor: number; needs_review: boolean };
beforeEach(() => {
  vi.clearAllMocks();
  rows = {
    escrow_transactions: { id: 'escrow-1' },
    escrow_refund_balances: {
      escrow_id: 'escrow-1',
      cash_minor: 45000,
      needs_review: false,
    },
  };
  recorded = { cash_refunded_minor: 10000, needs_review: false };
  mocks.from.mockImplementation((name) => ({
    select: () => ({
      eq: () => ({
        maybeSingle: async () => ({ data: rows[name], error: null }),
        single: async () => ({ data: recorded, error: null }),
      }),
    }),
  }));
  mocks.rpc.mockResolvedValue({ error: null });
  mocks.list.mockResolvedValue({ data: [refund], has_more: false });
  mocks.charge.mockResolvedValue(charge);
  mocks.refund.mockResolvedValue(refund);
  mocks.reconcile.mockResolvedValue(true);
});
describe('ledger refund webhook recovery', () => {
  it('uses current provider totals instead of an old event snapshot', async () => {
    expect(
      await reconcileLedgerRefundCharge({ ...charge, amount_refunded: 1 })
    ).toBe(true);
    expect(mocks.reconcile).toHaveBeenCalledWith(refund);
    expect(mocks.charge).toHaveBeenCalledWith(charge.id);
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it('exhausts pagination before reconciling and never creates refunds', async () => {
    mocks.list
      .mockResolvedValueOnce({ data: [refund], has_more: true })
      .mockResolvedValueOnce({ data: [], has_more: false });
    await reconcileLedgerRefundCharge(charge);
    expect(mocks.list).toHaveBeenLastCalledWith({
      payment_intent: 'pi_synthetic',
      limit: 100,
      starting_after: 're_synthetic',
    });
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it('refuses to acknowledge incomplete history', async () => {
    mocks.list.mockResolvedValue({ data: [], has_more: true });
    await expect(reconcileLedgerRefundCharge(charge)).rejects.toThrow(
      'exhausted'
    );
    expect(mocks.reconcile).not.toHaveBeenCalled();
  });
  it.each(['pending', 'requires_action', 'succeeded'])(
    'durably freezes an unrecorded external %s refund',
    async (status) => {
      mocks.list.mockResolvedValue({
        data: [{ ...refund, metadata: {}, status }],
        has_more: false,
      });
      await expect(reconcileLedgerRefundCharge(charge)).rejects.toThrow(
        'requires reconciliation'
      );
      expect(mocks.rpc).toHaveBeenCalledWith('flag_escrow_refund_review', {
        p_escrow_id: 'escrow-1',
      });
      expect(mocks.reconcile).not.toHaveBeenCalled();
    }
  );
  it('does not acknowledge a failed review-flag write', async () => {
    mocks.list.mockResolvedValue({
      data: [{ ...refund, metadata: {} }],
      has_more: false,
    });
    mocks.rpc.mockResolvedValue({ error: { message: 'DB unavailable' } });
    await expect(reconcileLedgerRefundCharge(charge)).rejects.toThrow(
      'could not be persisted'
    );
  });
  it('propagates failed operation recording', async () => {
    mocks.reconcile.mockRejectedValue(new Error('Operation write failed'));
    await expect(reconcileLedgerRefundCharge(charge)).rejects.toThrow(
      'Operation write failed'
    );
  });
  it('retries if provider totals changed during reconciliation', async () => {
    recorded.cash_refunded_minor = 9000;
    await expect(reconcileLedgerRefundCharge(charge)).rejects.toThrow(
      'totals differ'
    );
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('does not clear a prior reconciliation flag', async () => {
    recorded.needs_review = true;
    await expect(reconcileLedgerRefundCharge(charge)).rejects.toThrow(
      'totals differ'
    );
  });
  it('freezes a charge with the wrong payment identity', async () => {
    mocks.charge.mockResolvedValue({ ...charge, payment_intent: 'pi_other' });
    await expect(reconcileLedgerRefundCharge(charge)).rejects.toThrow(
      'requires reconciliation'
    );
    expect(mocks.rpc).toHaveBeenCalled();
  });
  it('leaves non-ledger charges to the legacy handler', async () => {
    rows.escrow_refund_balances = null;
    expect(await reconcileLedgerRefundCharge(charge)).toBe(false);
    expect(mocks.list).not.toHaveBeenCalled();
  });
  it('fails on DB lookup errors instead of selecting the legacy path', async () => {
    mocks.from.mockReturnValue({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: null,
            error: { message: 'unavailable' },
          }),
        }),
      }),
    });
    await expect(reconcileLedgerRefundCharge(charge)).rejects.toThrow(
      'lookup failed'
    );
  });
  it('routes refund status changes to the durable operation', async () => {
    await handleRefundChanged(refund);
    expect(mocks.reconcile).toHaveBeenCalledWith(refund);
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it('checks an unmarked refund against its current charge', async () => {
    mocks.reconcile.mockResolvedValueOnce(false);
    await handleRefundChanged({ ...refund, metadata: {} });
    expect(mocks.refund).toHaveBeenCalledWith(refund.id);
    expect(mocks.charge).toHaveBeenCalledWith(charge.id);
  });
});
