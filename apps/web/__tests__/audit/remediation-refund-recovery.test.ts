import { beforeEach, describe, expect, it, vi } from 'vitest';
import type Stripe from 'stripe';
const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  from: vi.fn(),
  list: vi.fn(),
  retrieve: vi.fn(),
  create: vi.fn(),
  intent: vi.fn(),
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { rpc: mocks.rpc, from: mocks.from },
}));
vi.mock('@/lib/stripe', () => ({
  stripe: {
    refunds: {
      list: mocks.list,
      retrieve: mocks.retrieve,
      create: mocks.create,
    },
    paymentIntents: { retrieve: mocks.intent },
  },
}));
vi.mock('@/lib/utils/api-timeout', () => ({
  stripeWithTimeout: (fn: () => unknown) => fn(),
}));
import {
  recoverRefund,
  reconcileRefundEvent,
  reserveRefund,
  reserveAdminRefund,
  readRefundContext,
  type RefundOperation,
} from '@/lib/services/payment/RefundService';

const operation = (): RefundOperation => ({
  id: 'operation-1',
  escrow_id: 'escrow-1',
  actor_id: 'payer-1',
  gross_minor: 10000,
  cash_minor: 10000,
  credit_minor: 0,
  payment_intent_id: 'pi_synthetic',
  provider_refund_id: null,
  state: 'reserved',
  created_at: new Date().toISOString(),
  stripe_parameters: {
    payment_intent: 'pi_synthetic',
    amount: 10000,
    reason: 'requested_by_customer',
    metadata: { refundOperationId: 'operation-1' },
  },
});
const refund = (status = 'succeeded') =>
  ({
    id: 're_synthetic',
    amount: 10000,
    currency: 'gbp',
    payment_intent: 'pi_synthetic',
    metadata: { refundOperationId: 'operation-1' },
    status,
  }) as Stripe.Refund;
const balance = {
  gross_minor: 50000,
  cash_minor: 45000,
  credit_minor: 5000,
  cash_refunded_minor: 0,
  credit_returned_minor: 0,
  remaining_minor: 50000,
  needs_review: false,
};
const intent = () => ({
  status: 'succeeded',
  currency: 'gbp',
  amount_received: 45000,
  metadata: {
    jobId: 'job-1',
    payerId: 'payer-1',
    contractorId: 'contractor-1',
    creditAppliedPence: '5000',
  },
  latest_charge: {
    id: 'ch_synthetic',
    amount: 45000,
    amount_refunded: 0,
    currency: 'gbp',
    paid: true,
    captured: true,
    disputed: false,
  },
});
function tables(extra: Record<string, unknown> = {}) {
  const rows: Record<string, unknown> = {
    escrow_refund_balances: balance,
    escrow_transactions: {
      job_id: 'job-1',
      payer_id: 'payer-1',
      payee_id: 'contractor-1',
      payment_intent_id: 'pi_synthetic',
    },
    escrow_refund_operations: operation(),
    ...extra,
  };
  mocks.from.mockImplementation((name: string) => ({
    select: () => ({
      eq: () => ({
        single: async () => ({ data: rows[name], error: null }),
        maybeSingle: async () => ({ data: rows[name], error: null }),
      }),
    }),
  }));
}
beforeEach(() => {
  vi.clearAllMocks();
  tables();
  mocks.list.mockResolvedValue({ data: [], has_more: false });
  mocks.retrieve.mockResolvedValue(refund());
  mocks.create.mockResolvedValue(refund());
  mocks.intent.mockResolvedValue(intent());
  mocks.rpc.mockImplementation(async (name, params) => ({
    data: [
      {
        ...operation(),
        ...(name === 'record_escrow_refund_outcome'
          ? { state: params.p_state, provider_refund_id: params.p_refund_id }
          : {}),
      },
    ],
    error: null,
  }));
});

describe('durable refund recovery', () => {
  it('does not interpret a missing provider status as success', async () => {
    mocks.create.mockResolvedValue({ ...refund(), status: null });
    await expect(recoverRefund(operation())).rejects.toThrow(
      'could not be verified'
    );
    expect(mocks.rpc).toHaveBeenCalledWith(
      'record_escrow_refund_outcome',
      expect.objectContaining({ p_state: null })
    );
  });
  it('rejects changed frozen provider parameters before creating a refund', async () => {
    const op = operation();
    op.stripe_parameters.amount = 20000;
    await expect(recoverRefund(op)).rejects.toThrow('Frozen refund parameters');
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it('does not report a contradictory terminal outcome as successful recovery', async () => {
    mocks.rpc.mockResolvedValue({
      data: [{ ...operation(), state: 'reconciliation_required' }],
      error: null,
    });
    await expect(recoverRefund(operation())).rejects.toThrow(
      'needs payment reconciliation'
    );
  });

  it('uses frozen provider parameters and one durable operation key', async () => {
    const op = operation();
    expect((await recoverRefund(op)).state).toBe('succeeded');
    expect(mocks.create).toHaveBeenCalledWith(op.stripe_parameters, {
      idempotencyKey: 'escrow_refund_operation-1',
    });
    expect(mocks.rpc).toHaveBeenCalledWith('record_escrow_refund_outcome', {
      p_operation_id: op.id,
      p_refund_id: 're_synthetic',
      p_state: 'succeeded',
    });
  });
  it('recovers a provider ID after a lost response without creating a second refund', async () => {
    mocks.create.mockRejectedValueOnce(
      new Error('connection lost after acceptance')
    );
    await expect(recoverRefund(operation())).rejects.toThrow('connection lost');
    expect(mocks.rpc).not.toHaveBeenCalled();
    mocks.list.mockResolvedValue({ data: [refund()], has_more: false });
    await recoverRefund(operation());
    expect(mocks.create).toHaveBeenCalledTimes(1);
  });
  it('recovers when the provider succeeds but the database write fails', async () => {
    mocks.rpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'synthetic outage' },
    });
    await expect(recoverRefund(operation())).rejects.toThrow(
      'awaiting recovery'
    );
    mocks.list.mockResolvedValue({ data: [refund()], has_more: false });
    expect((await recoverRefund(operation())).state).toBe('succeeded');
    expect(mocks.create).toHaveBeenCalledTimes(1);
  });
  it.each(['pending', 'requires_action', 'failed', 'canceled'])(
    'records %s without manufacturing success',
    async (status) => {
      mocks.create.mockResolvedValue(refund(status));
      expect((await recoverRefund(operation())).state).toBe(status);
    }
  );
  it('uses current retrieved state rather than an out-of-order webhook payload', async () => {
    mocks.retrieve.mockResolvedValue(refund('failed'));
    await reconcileRefundEvent(refund('pending'));
    expect(mocks.rpc).toHaveBeenCalledWith(
      'record_escrow_refund_outcome',
      expect.objectContaining({ p_state: 'failed' })
    );
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it.each([
    { amount: 10001 },
    { currency: 'usd' },
    { payment_intent: 'pi_someone_else' },
    { metadata: { refundOperationId: 'another-operation' } },
  ])('rejects mismatched provider refund evidence %j', async (change) => {
    mocks.retrieve.mockResolvedValue({ ...refund(), ...change });
    await expect(
      recoverRefund({ ...operation(), provider_refund_id: 're_synthetic' })
    ).rejects.toThrow('does not match');
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('blocks a new refund when an external refund is not accounted for locally', async () => {
    const pi = intent();
    pi.latest_charge.amount_refunded = 100;
    mocks.intent.mockResolvedValue(pi);
    await expect(recoverRefund(operation())).rejects.toThrow(
      'balances require reconciliation'
    );
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it('does not recreate an unresolved attempt after provider idempotency expiry', async () => {
    await expect(
      recoverRefund({ ...operation(), created_at: '2020-01-01T00:00:00Z' })
    ).rejects.toThrow('too old');
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it('can reconcile an old attempt when its actual provider refund is found', async () => {
    mocks.list.mockResolvedValue({ data: [refund()], has_more: false });
    expect(
      (
        await recoverRefund({
          ...operation(),
          created_at: '2020-01-01T00:00:00Z',
        })
      ).state
    ).toBe('succeeded');
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it('does not assume an incomplete paginated history means no previous refund exists', async () => {
    mocks.list.mockResolvedValue({
      data: [{ ...refund(), metadata: {} }],
      has_more: true,
    });
    await expect(recoverRefund(operation())).rejects.toThrow(
      'history requires reconciliation'
    );
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it('rejects multiple provider refunds attached to one operation', async () => {
    mocks.list.mockResolvedValue({
      data: [refund(), { ...refund(), id: 're_second' }],
      has_more: false,
    });
    await expect(recoverRefund(operation())).rejects.toThrow(
      'Multiple provider refunds'
    );
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('returns the credit-only remainder without asking Stripe to refund promotional credit', async () => {
    const op = {
      ...operation(),
      gross_minor: 5000,
      cash_minor: 0,
      credit_minor: 5000,
    };
    tables({
      escrow_refund_balances: {
        ...balance,
        cash_refunded_minor: 45000,
        remaining_minor: 5000,
      },
    });
    const pi = intent();
    pi.latest_charge.amount_refunded = 45000;
    mocks.intent.mockResolvedValue(pi);
    mocks.rpc.mockResolvedValue({
      data: [{ ...op, state: 'succeeded' }],
      error: null,
    });
    expect((await recoverRefund(op)).state).toBe('succeeded');
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.rpc).toHaveBeenCalledWith('record_escrow_refund_outcome', {
      p_operation_id: op.id,
      p_refund_id: null,
      p_state: 'succeeded',
    });
  });
  it('rejects reservation results belonging to a different payer', async () => {
    await expect(
      reserveRefund({
        actorId: 'unrelated',
        jobId: 'job-1',
        escrowId: 'escrow-1',
        requestKey: 'key',
        grossMinor: 10000,
        reason: 'Synthetic',
      })
    ).rejects.toThrow('does not match');
  });
});

describe('refund route context', () => {
  const input = {
    escrowId: 'escrow-1',
    actorId: 'payer-1',
    requestKey: 'key-1',
    originalAmount: 500,
  };
  it('uses remaining ledger principal instead of original escrow amount', async () => {
    tables({ escrow_refund_balances: { ...balance, remaining_minor: 40000 } });
    expect(await readRefundContext(input)).toMatchObject({
      remainingMinor: 40000,
      existing: { id: 'operation-1' },
    });
  });
  it('uses original principal only when no ledger exists', async () => {
    tables({ escrow_refund_balances: null, escrow_refund_operations: null });
    expect(await readRefundContext(input)).toEqual({
      remainingMinor: 50000,
      existing: null,
    });
  });
  it.each([{ actor_id: 'other' }, { escrow_id: 'other' }])(
    'rejects a mismatched operation %j',
    async (changed) => {
      tables({ escrow_refund_operations: { ...operation(), ...changed } });
      await expect(readRefundContext(input)).rejects.toThrow(
        'different operation'
      );
    }
  );
  it('blocks accounts awaiting reconciliation', async () => {
    tables({ escrow_refund_balances: { ...balance, needs_review: true } });
    await expect(readRefundContext(input)).rejects.toThrow(
      'requires reconciliation'
    );
  });
  it('does not turn a failed balance lookup into full available principal', async () => {
    mocks.from.mockReturnValue({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: null,
            error: { message: 'DB unavailable' },
          }),
        }),
      }),
    });
    await expect(readRefundContext(input)).rejects.toThrow(
      'could not be loaded'
    );
  });
});

describe('Administrator refund reservation identity', () => {
  const input = {
    adminId: 'admin-1',
    payerId: 'payer-1',
    jobId: 'job-1',
    escrowId: 'escrow-1',
    requestKey: 'admin-key',
    grossMinor: 10000,
    reason: 'Synthetic',
  };
  beforeEach(() => {
    mocks.rpc.mockReset();
    mocks.create.mockReset();
  });
  it('passes the admin authority to the RPC while retaining the payer as money owner', async () => {
    mocks.rpc.mockResolvedValue({
      data: [{ ...operation(), initiated_by: 'admin-1' }],
      error: null,
    });
    expect(await reserveAdminRefund(input)).toMatchObject({
      actor_id: 'payer-1',
      initiated_by: 'admin-1',
    });
    expect(mocks.rpc).toHaveBeenCalledWith('reserve_admin_escrow_refund', {
      p_admin_id: 'admin-1',
      p_job_id: 'job-1',
      p_escrow_id: 'escrow-1',
      p_request_key: 'admin-key',
      p_gross_minor: 10000,
      p_reason: 'Synthetic',
    });
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it.each([
    { initiated_by: 'another-admin' },
    { actor_id: 'another-payer' },
    { escrow_id: 'another-escrow' },
    { gross_minor: 10001, cash_minor: 10001 },
  ])('rejects mismatched returned operation %j', async (change) => {
    mocks.rpc.mockResolvedValue({
      data: [{ ...operation(), initiated_by: 'admin-1', ...change }],
      error: null,
    });
    await expect(reserveAdminRefund(input)).rejects.toMatchObject({
      statusCode: 409,
    });
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it('stops before provider work when database authorization or reservation fails', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code: '42501' } });
    await expect(reserveAdminRefund(input)).rejects.toMatchObject({
      statusCode: 409,
    });
    expect(mocks.create).not.toHaveBeenCalled();
  });
});

describe('refund recovery time budget', () => {
  beforeEach(() => {
    mocks.list.mockReset();
    mocks.create.mockReset();
  });
  it('does not start a provider request after the worker budget expires', async () => {
    await expect(
      recoverRefund(operation(), Date.now() - 1)
    ).rejects.toMatchObject({ statusCode: 503 });
    expect(mocks.list).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it('stops pagination when the total worker budget is exhausted', async () => {
    const start = Date.now();
    const now = vi.spyOn(Date, 'now').mockReturnValue(start);
    try {
      mocks.list.mockImplementationOnce(async () => {
        now.mockReturnValue(start + 6000);
        return { data: [{ id: 're_other', metadata: {} }], has_more: true };
      });
      await expect(
        recoverRefund(operation(), start + 5000)
      ).rejects.toMatchObject({ statusCode: 503 });
      expect(mocks.list).toHaveBeenCalledTimes(1);
      expect(mocks.create).not.toHaveBeenCalled();
    } finally {
      now.mockRestore();
    }
  });
});
