import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  scoped: vi.fn(),
  user: 'payer',
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { from: mocks.from },
  createRequestScopedClient: () => ({ from: mocks.scoped }),
}));
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler:
    (_options: unknown, handler: Function) => (request: NextRequest) =>
      handler(request, { user: { id: mocks.user } }),
}));
import { GET } from '@/app/api/payments/history/route';
const id = '11111111-1111-4111-8111-111111111111';
let rows: unknown[];
let balances: unknown[];
let balanceError: unknown;
let query: Record<string, ReturnType<typeof vi.fn>>;
let ledger: Record<string, ReturnType<typeof vi.fn>>;
beforeEach(() => {
  vi.clearAllMocks();
  rows = [
    {
      id,
      job_id: 'job',
      payer_id: 'payer',
      payee_id: 'contractor',
      amount: 100,
      status: 'held',
      created_at: '2026-09-01',
      updated_at: '2026-09-02',
    },
  ];
  balances = [{ escrow_id: id, remaining_minor: 6000, needs_review: false }];
  balanceError = null;
  query = {};
  for (const method of ['select', 'or', 'order', 'limit', 'eq', 'lt'])
    query[method] = vi.fn(() => query);
  query.then = vi.fn((resolve) => resolve({ data: rows, error: null }));
  ledger = {
    select: vi.fn(() => ledger),
    in: vi.fn(async () => ({ data: balances, error: balanceError })),
  };
  mocks.scoped.mockReturnValue(query);
  mocks.from.mockReturnValue(ledger);
});
const request = () =>
  GET(
    new NextRequest(
      `http://localhost/api/payments/history?transactionId=${id}`
    ),
    {} as never
  );
describe('payment history balance boundary', () => {
  it('applies actor ownership and exact ID before reading the private ledger', async () => {
    const response = await request();
    const body = await response.json();
    expect(query.or).toHaveBeenCalledWith(
      'payer_id.eq.payer,payee_id.eq.payer'
    );
    expect(query.eq).toHaveBeenCalledWith('id', id);
    expect(ledger.in).toHaveBeenCalledWith('escrow_id', [id]);
    expect(body.payments[0]).toMatchObject({
      id,
      amount: 100,
      remainingAmount: 60,
      refundNeedsReview: false,
      jobId: 'job',
    });
  });
  it('does not read private balances for a missing or unrelated transaction', async () => {
    rows = [];
    const response = await request();
    expect((await response.json()).payments).toEqual([]);
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it('fails rather than reporting original principal when ledger lookup fails', async () => {
    balanceError = { message: 'database unavailable' };
    await expect(request()).rejects.toThrow('current payment balances');
  });
  it('exposes review holds without inventing a spendable balance', async () => {
    balances = [{ escrow_id: id, remaining_minor: 2500, needs_review: true }];
    expect((await (await request()).json()).payments[0]).toMatchObject({
      remainingAmount: 25,
      refundNeedsReview: true,
    });
  });
});
