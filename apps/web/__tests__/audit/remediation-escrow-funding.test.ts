// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({
  single: vi.fn(),
  funding: vi.fn(),
  balance: vi.fn(),
  retrieve: vi.fn(),
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          single: m.single,
          maybeSingle:
            table === 'payment_funding_reservations'
              ? m.funding
              : table === 'escrow_refund_balances'
                ? m.balance
                : m.single,
        }),
      }),
    }),
  },
}));
vi.mock('@/lib/stripe', () => ({
  stripe: { paymentIntents: { retrieve: m.retrieve } },
}));
vi.mock('@/lib/utils/api-timeout', () => ({
  stripeWithTimeout: (fn: () => unknown) => fn(),
}));
import { verifyEscrowFunding } from '@/lib/services/payment/EscrowFundingService';
let intent: Record<string, any>;
beforeEach(() => {
  vi.clearAllMocks();
  m.balance.mockResolvedValue({ data: null, error: null });
  m.funding.mockResolvedValue({ data: null, error: null });
  m.single.mockResolvedValue({
    data: {
      job_id: 'job',
      payer_id: 'payer',
      payee_id: 'contractor',
      amount: 500,
      payment_intent_id: 'pi_one',
    },
    error: null,
  });
  intent = {
    status: 'succeeded',
    currency: 'gbp',
    amount_received: 50000,
    metadata: { jobId: 'job', payerId: 'payer', contractorId: 'contractor' },
    latest_charge: {
      id: 'ch_one',
      paid: true,
      captured: true,
      disputed: false,
      refunded: false,
      amount_refunded: 0,
      currency: 'gbp',
      amount: 50000,
    },
  };
  m.retrieve.mockImplementation(async () => intent);
});
describe('provider-backed escrow funding', () => {
  it('accepts 450 GBP captured cash plus a trusted 50 GBP credit reservation for 500 GBP gross', async () => {
    intent.amount_received = 45000;
    intent.latest_charge.amount = 45000;
    intent.metadata.creditAppliedPence = '5000';
    intent.metadata.fundingReservationId = 'funding';
    m.funding.mockResolvedValue({
      data: {
        id: 'funding',
        state: 'attached',
        gross_minor: 50000,
        cash_minor: 45000,
        credit_minor: 5000,
        payment_intent_id: 'pi_one',
      },
      error: null,
    });
    await expect(verifyEscrowFunding('escrow')).resolves.toBe('ch_one');
  });
  it('does not treat legacy or forged credit metadata as funded principal', async () => {
    intent.amount_received = 45000;
    intent.latest_charge.amount = 45000;
    intent.metadata.creditAppliedPence = '5000';
    await expect(verifyEscrowFunding('escrow')).rejects.toThrow(
      'reconciliation'
    );
  });
  it('rejects restored credits even when the provider cash amount still matches', async () => {
    intent.amount_received = 45000;
    intent.latest_charge.amount = 45000;
    intent.metadata.creditAppliedPence = '5000';
    intent.metadata.fundingReservationId = 'funding';
    m.funding.mockResolvedValue({
      data: {
        id: 'funding',
        state: 'cancelled',
        gross_minor: 50000,
        cash_minor: 45000,
        credit_minor: 5000,
        payment_intent_id: 'pi_one',
      },
      error: null,
    });
    await expect(verifyEscrowFunding('escrow')).rejects.toThrow(
      'reconciliation'
    );
  });
  it('requires a matching captured charge for the authorised job participants', async () => {
    await expect(verifyEscrowFunding('escrow')).resolves.toBe('ch_one');
    expect(m.retrieve).toHaveBeenCalledWith('pi_one', {
      expand: ['latest_charge'],
    });
  });
  it('accepts the invoice creator contract with snake-case metadata', async () => {
    intent.metadata = {
      job_id: 'job',
      payer_id: 'payer',
      contractor_id: 'contractor',
    };
    await expect(verifyEscrowFunding('escrow')).resolves.toBe('ch_one');
  });
  it.each([
    ['status', 'processing'],
    ['amount_received', 49900],
    ['currency', 'usd'],
    ['latest_charge', null],
  ])('rejects unmatched intent field %s', async (field, value) => {
    intent[field] = value;
    await expect(verifyEscrowFunding('escrow')).rejects.toThrow(
      'reconciliation'
    );
  });
  it.each(['jobId', 'payerId', 'contractorId'])(
    'rejects another resource/participant in %s',
    async (field) => {
      intent.metadata[field] = 'unrelated';
      await expect(verifyEscrowFunding('escrow')).rejects.toThrow(
        'reconciliation'
      );
    }
  );
  it.each([
    ['captured', false],
    ['paid', false],
    ['disputed', true],
    ['refunded', true],
    ['amount_refunded', 100],
    ['amount', 49900],
  ])('rejects charge field %s', async (field, value) => {
    intent.latest_charge[field] = value;
    await expect(verifyEscrowFunding('escrow')).rejects.toThrow(
      'reconciliation'
    );
  });
  it('rejects a fabricated held row without a provider reference', async () => {
    m.single.mockResolvedValue({
      data: { amount: 500, payment_intent_id: null },
      error: null,
    });
    await expect(verifyEscrowFunding('escrow')).rejects.toThrow(
      'could not be verified'
    );
    expect(m.retrieve).not.toHaveBeenCalled();
  });
  it('fails closed when the provider is unavailable', async () => {
    m.retrieve.mockRejectedValue(new Error('Provider unavailable'));
    await expect(verifyEscrowFunding('escrow')).rejects.toThrow(
      'Provider unavailable'
    );
  });
});

describe('partial-refund funding reconciliation', () => {
  it('accepts an exact committed cash refund with principal remaining', async () => {
    intent.latest_charge.amount_refunded = 10000;
    m.balance.mockResolvedValue({
      data: {
        gross_minor: 50000,
        cash_minor: 50000,
        credit_minor: 0,
        cash_refunded_minor: 10000,
        credit_returned_minor: 0,
        remaining_minor: 40000,
        needs_review: false,
      },
      error: null,
    });
    await expect(verifyEscrowFunding('escrow')).resolves.toBe('ch_one');
  });
  it.each([
    { cash_refunded_minor: 9000, remaining_minor: 41000 },
    { needs_review: true },
    { remaining_minor: 50000 },
    { cash_minor: 45000 },
    { credit_returned_minor: 100 },
  ])('rejects inconsistent/reviewed refund ledger %#', async (change) => {
    intent.latest_charge.amount_refunded = 10000;
    m.balance.mockResolvedValue({
      data: {
        gross_minor: 50000,
        cash_minor: 50000,
        credit_minor: 0,
        cash_refunded_minor: 10000,
        credit_returned_minor: 0,
        remaining_minor: 40000,
        needs_review: false,
        ...change,
      },
      error: null,
    });
    await expect(verifyEscrowFunding('escrow')).rejects.toThrow(
      'reconciliation'
    );
  });
});

it('keeps only unreturned promotional credit funded after all provider cash is refunded', async () => {
  intent.amount_received = 45000;
  intent.metadata.creditAppliedPence = '5000';
  intent.metadata.fundingReservationId = 'funding';
  Object.assign(intent.latest_charge, {
    amount: 45000,
    amount_refunded: 45000,
    refunded: true,
  });
  m.funding.mockResolvedValue({
    data: {
      id: 'funding',
      state: 'attached',
      gross_minor: 50000,
      cash_minor: 45000,
      credit_minor: 5000,
      payment_intent_id: 'pi_one',
    },
    error: null,
  });
  m.balance.mockResolvedValue({
    data: {
      gross_minor: 50000,
      cash_minor: 45000,
      credit_minor: 5000,
      cash_refunded_minor: 45000,
      credit_returned_minor: 2000,
      remaining_minor: 3000,
      needs_review: false,
    },
    error: null,
  });
  await expect(verifyEscrowFunding('escrow')).resolves.toBe('ch_one');
  m.balance.mockResolvedValue({
    data: {
      gross_minor: 50000,
      cash_minor: 45000,
      credit_minor: 5000,
      cash_refunded_minor: 45000,
      credit_returned_minor: 5000,
      remaining_minor: 0,
      needs_review: false,
    },
    error: null,
  });
  await expect(verifyEscrowFunding('escrow')).rejects.toThrow('reconciliation');
});
