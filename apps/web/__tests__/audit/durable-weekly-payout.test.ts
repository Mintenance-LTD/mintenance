import { beforeEach, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({
  rpc: vi.fn(),
  from: vi.fn(),
  create: vi.fn(),
  list: vi.fn(),
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { rpc: m.rpc, from: m.from },
}));
vi.mock('@/lib/stripe', () => ({
  stripe: { transfers: { create: m.create, list: m.list } },
}));
vi.mock('@mintenance/shared', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));
import { processEligiblePayouts } from '@/lib/stripe/connect/payouts';
const op = {
  id: 'operation-1',
  contractor_id: 'contractor',
  amount_minor: 70,
  currency: 'GBP',
  destination: 'acct_live',
  state: 'submitted',
  first_attempt_at: '',
};
beforeEach(() => {
  vi.clearAllMocks();
  op.first_attempt_at = new Date().toISOString();
  const q = {
    select: () => q,
    gte: () => q,
    eq: () =>
      Promise.resolve({
        data: [{ contractor_id: 'contractor', currency: 'GBP' }],
        error: null,
      }),
  };
  m.from.mockReturnValue(q);
  m.rpc.mockImplementation(async (name: string) => ({
    data: name === 'complete_weekly_payout' ? null : op,
    error: null,
  }));
  m.create.mockResolvedValue({
    id: 'tr_one',
    amount: 70,
    currency: 'gbp',
    destination: 'acct_live',
    reversed: false,
  });
});
it('reserves before contacting Stripe and completes atomically', async () => {
  expect(await processEligiblePayouts()).toEqual({
    processed: 1,
    skipped: 0,
    failed: 0,
  });
  expect(m.rpc.mock.calls.map((c) => c[0])).toEqual([
    'reserve_weekly_payout',
    'begin_weekly_payout',
    'complete_weekly_payout',
  ]);
  expect(m.create).toHaveBeenCalledWith(
    expect.objectContaining({ amount: 70 }),
    { idempotencyKey: 'weekly-payout-operation-operation-1' }
  );
});
it('does not call Stripe when the reservation write fails', async () => {
  m.rpc.mockResolvedValue({ error: { message: 'offline' } });
  expect((await processEligiblePayouts()).failed).toBe(1);
  expect(m.create).not.toHaveBeenCalled();
});
it('keeps the reservation after a lost provider response and retries the same key', async () => {
  m.create.mockRejectedValueOnce(new Error('timeout'));
  expect((await processEligiblePayouts()).failed).toBe(1);
  expect(m.rpc).not.toHaveBeenCalledWith(
    'complete_weekly_payout',
    expect.anything()
  );
  await processEligiblePayouts();
  expect(m.create.mock.calls[0][1]).toEqual(m.create.mock.calls[1][1]);
});
it('reconciles an old transfer without reusing an expired idempotency key', async () => {
  op.first_attempt_at = '2026-01-01T00:00:00Z';
  m.list.mockReturnValue(
    (async function* () {
      yield {
        id: 'tr_old',
        amount: 70,
        currency: 'gbp',
        destination: 'acct_live',
        metadata: { mintenance_payout_operation: op.id },
        reversed: false,
      };
    })()
  );
  expect((await processEligiblePayouts()).processed).toBe(1);
  expect(m.create).not.toHaveBeenCalled();
});
it('rejects a mismatched provider transfer', async () => {
  m.create.mockResolvedValue({
    id: 'tr_wrong',
    amount: 71,
    currency: 'gbp',
    destination: 'acct_live',
  });
  expect((await processEligiblePayouts()).failed).toBe(1);
  expect(m.rpc).not.toHaveBeenCalledWith(
    'complete_weekly_payout',
    expect.anything()
  );
});
it('does not report zero success after a balance query error', async () => {
  const q = {
    select: () => q,
    gte: () => q,
    eq: async () => ({ error: { message: 'offline' } }),
  };
  m.from.mockReturnValue(q);
  await expect(processEligiblePayouts()).rejects.toThrow(
    'Unable to load payout balances'
  );
});
it('preserves a successful transfer when its database completion fails', async () => {
  m.rpc.mockImplementation(async (name: string) =>
    name === 'complete_weekly_payout'
      ? { error: { message: 'offline' } }
      : { data: op, error: null }
  );
  expect((await processEligiblePayouts()).failed).toBe(1);
  expect(m.from).toHaveBeenCalledTimes(1);
});

it('holds an old uncertain operation for review when Stripe has no matching transfer', async () => {
  op.first_attempt_at = '2026-01-01T00:00:00Z';
  m.list.mockReturnValue((async function* () {})());
  const marked = vi.fn().mockResolvedValue({ error: null });
  const balanceQuery = m.from();
  m.from.mockImplementation((table: string) =>
    table === 'contractor_payout_operations'
      ? { update: () => ({ eq: () => ({ neq: marked }) }) }
      : balanceQuery
  );
  expect((await processEligiblePayouts()).failed).toBe(1);
  expect(marked).toHaveBeenCalledWith('state', 'completed');
  expect(m.create).not.toHaveBeenCalled();
  expect(m.rpc).not.toHaveBeenCalledWith(
    'complete_weekly_payout',
    expect.anything()
  );
});

it('does not send money when the persisted attempt cannot be started', async () => {
  m.rpc.mockImplementation(async (name: string) =>
    name === 'begin_weekly_payout'
      ? { error: { message: 'unavailable' } }
      : { data: op, error: null }
  );
  expect((await processEligiblePayouts()).failed).toBe(1);
  expect(m.create).not.toHaveBeenCalled();
});
