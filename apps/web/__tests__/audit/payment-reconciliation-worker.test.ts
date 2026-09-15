import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import type Stripe from 'stripe';
const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  from: vi.fn(),
  retrieve: vi.fn(),
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { rpc: mocks.rpc, from: mocks.from },
}));
vi.mock('@/lib/stripe', () => ({
  stripe: { paymentIntents: { retrieve: mocks.retrieve } },
}));
import { PaymentReconciliationService } from '@/lib/services/payment/PaymentReconciliationService';
import {
  compareReconciliationFunding,
  type ReconciliationSource,
} from '@/lib/services/payment/reconciliation-funding';
const source = (): ReconciliationSource => ({
  id: 'escrow',
  payment_intent_id: 'pi_test',
  amount: 100,
  status: 'completed',
  job_id: 'job',
  payer_id: 'payer',
  payee_id: 'payee',
  funding: {
    id: 'funding',
    state: 'attached',
    gross_minor: 10000,
    cash_minor: 9000,
    credit_minor: 1000,
    payment_intent_id: 'pi_test',
  },
  refund: null,
});
const intent = () =>
  ({
    id: 'pi_test',
    currency: 'gbp',
    status: 'succeeded',
    amount: 9000,
    amount_received: 9000,
    metadata: {
      jobId: 'job',
      payerId: 'payer',
      contractorId: 'payee',
      fundingReservationId: 'funding',
      creditAppliedPence: '1000',
    },
    latest_charge: {
      amount: 9000,
      currency: 'gbp',
      paid: true,
      captured: true,
      disputed: false,
      amount_refunded: 0,
      refunded: false,
    },
  }) as unknown as Stripe.PaymentIntent;
function chain(data: unknown) {
  const query: Record<string, unknown> = {};
  for (const name of ['insert', 'update', 'select', 'eq'])
    query[name] = vi.fn(() => query);
  query.single = async () => ({ data, error: null });
  return query;
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.from.mockImplementation(() => chain({ id: 'run' }));
  let claimed = false;
  mocks.rpc.mockImplementation(async (name: string) => {
    if (name === 'finish_payment_reconciliation')
      return { data: true, error: null };
    if (claimed) return { data: null, error: null };
    claimed = true;
    return {
      data: { escrow_id: 'escrow', token: 'owner-token', source: source() },
      error: null,
    };
  });
  mocks.retrieve.mockResolvedValue(intent());
});
afterEach(() => vi.useRealTimers());

it('compares captured cash, not gross principal, and persists with the claim token', async () => {
  expect(await PaymentReconciliationService.reconcile()).toMatchObject({
    checked: 1,
    matched: 1,
    errors: 0,
  });
  expect(mocks.rpc).toHaveBeenCalledWith(
    'finish_payment_reconciliation',
    expect.objectContaining({
      p_token: 'owner-token',
      p_outcome: 'matched',
      p_evidence: expect.objectContaining({ expected_cash_minor: 9000 }),
    })
  );
});
it('checks fully refunded retired funding without inventing an outstanding amount', () => {
  const row = source();
  row.status = 'refunded';
  row.funding!.state = 'cancelled';
  row.refund = {
    gross_minor: 10000,
    cash_minor: 9000,
    credit_minor: 1000,
    cash_refunded_minor: 9000,
    credit_returned_minor: 1000,
    remaining_minor: 0,
    needs_review: false,
  };
  const pi = intent();
  Object.assign(pi.latest_charge as object, {
    amount_refunded: 9000,
    refunded: true,
  });
  expect(compareReconciliationFunding(row, pi).matched).toBe(true);
});
it.each([
  'wrong payer',
  'wrong cash',
  'uncaptured',
  'unrecorded refund',
  'missing ledger',
])('flags %s', (reason) => {
  const row = source();
  const pi = intent();
  if (reason === 'wrong payer') pi.metadata.payerId = 'other';
  if (reason === 'wrong cash') pi.amount = 10000;
  if (reason === 'uncaptured')
    Object.assign(pi.latest_charge as object, { captured: false });
  if (reason === 'unrecorded refund')
    Object.assign(pi.latest_charge as object, { amount_refunded: 100 });
  if (reason === 'missing ledger') row.funding = null;
  expect(compareReconciliationFunding(row, pi).matched).toBe(false);
});
it('does not report an expired or stale acknowledgement as a match', async () => {
  const original = mocks.rpc.getMockImplementation()!;
  mocks.rpc.mockImplementation((name: string, args: unknown) =>
    name === 'finish_payment_reconciliation'
      ? Promise.resolve({ data: false, error: null })
      : original(name, args)
  );
  expect(await PaymentReconciliationService.reconcile()).toMatchObject({
    matched: 0,
    errors: 1,
  });
});
it.each(['resource_missing', 'parameter_invalid'])(
  'classifies provider error %s correctly',
  async (code) => {
    mocks.retrieve.mockRejectedValue({ code });
    const result = await PaymentReconciliationService.reconcile();
    expect(result.missingInStripe).toBe(code === 'resource_missing' ? 1 : 0);
    expect(result.errors).toBe(code === 'resource_missing' ? 0 : 1);
  }
);
it('bounds a stalled provider call without hidden retries', async () => {
  vi.useFakeTimers();
  mocks.retrieve.mockImplementation(() => new Promise(() => {}));
  const pending = PaymentReconciliationService.reconcile();
  await vi.advanceTimersByTimeAsync(8001);
  expect(await pending).toMatchObject({ checked: 1, errors: 1 });
  expect(mocks.retrieve).toHaveBeenCalledTimes(1);
  expect(vi.getTimerCount()).toBe(0);
});
it('stops after three claims even with a larger backlog', async () => {
  mocks.rpc.mockImplementation(async (name: string) => ({
    data:
      name === 'finish_payment_reconciliation'
        ? true
        : { escrow_id: 'escrow', token: 'owner-token', source: source() },
    error: null,
  }));
  expect((await PaymentReconciliationService.reconcile()).checked).toBe(3);
});
it('fails when result persistence fails instead of claiming success', async () => {
  const original = mocks.rpc.getMockImplementation()!;
  mocks.rpc.mockImplementation((name: string, args: unknown) =>
    name === 'finish_payment_reconciliation'
      ? Promise.resolve({ data: null, error: { message: 'synthetic failure' } })
      : original(name, args)
  );
  await expect(PaymentReconciliationService.reconcile()).rejects.toThrow(
    'could not be saved'
  );
});
