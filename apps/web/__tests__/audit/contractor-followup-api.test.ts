import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const mocks = vi.hoisted(() => ({
  insert: vi.fn(),
  update: vi.fn(),
  eq: vi.fn(),
  bids: [] as { quote_id: string; status: string }[],
  own: true,
  assignment: vi.fn(),
}));
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler: (_: unknown, handler: unknown) => handler,
}));
vi.mock('@/lib/services/contractor/job-assignment', () => ({
  assertContractorJobAssignment: mocks.assignment,
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  createRequestScopedClient: () => null,
  serverSupabase: {
    rpc: async () => ({ data: 'QA-1', error: null }),
    from: () => {
      const q = {
        select: () => q,
        eq: (...args: unknown[]) => {
          mocks.eq(...args);
          return q;
        },
        in: () => q,
        order: () => q,
        range: async () => ({ data: mocks.bids, error: null }),
        single: async () => ({
          data: mocks.own ? { id: 'expense' } : null,
          error: null,
        }),
        insert: (data: unknown) => {
          mocks.insert(data);
          return q;
        },
        update: (data: unknown) => {
          mocks.update(data);
          return q;
        },
        then: (resolve: (v: unknown) => unknown) =>
          Promise.resolve({ data: [], error: null }).then(resolve),
      };
      return q;
    },
  },
}));
import { POST as createQuote } from '@/app/api/contractor/quotes/route';
import { PATCH as editExpense } from '@/app/api/contractor/expenses/route';
import { withEffectiveQuoteStatuses } from '@/lib/quotes/effective-quotes';
const id = '11111111-1111-4111-8111-111111111111';
const call = (handler: unknown, body: unknown) =>
  (handler as (r: NextRequest, c: unknown) => Promise<Response>)(
    new NextRequest('http://localhost/test', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
    { user: { id: 'contractor' }, params: {} }
  );
beforeEach(() => {
  vi.clearAllMocks();
  mocks.own = true;
  mocks.bids = [];
});
it('persists the contractor draft payload with line items and validity', async () => {
  const body = {
    title: 'QA repair',
    clientName: 'QA client',
    clientEmail: 'qa@example.test',
    lineItems: [{ description: 'Repair', quantity: 1, unitPrice: 2, total: 2 }],
    subtotal: 2,
    taxRate: 0,
    taxAmount: 0,
    totalAmount: 2,
    validUntil: '2026-12-16',
  };
  expect((await call(createQuote, body)).status).toBe(201);
  expect(mocks.insert).toHaveBeenCalledWith(
    expect.objectContaining({
      contractor_id: 'contractor',
      title: 'QA repair',
      status: 'draft',
      valid_until: '2026-12-16',
      line_items: body.lineItems,
    })
  );
});
it('uses rejected linked bids and expiry consistently while preserving accepted precedence', async () => {
  mocks.bids = [
    { quote_id: 'rejected', status: 'rejected' },
    { quote_id: 'accepted', status: 'accepted' },
    { quote_id: 'accepted', status: 'withdrawn' },
  ];
  const result = await withEffectiveQuoteStatuses(
    [
      { id: 'rejected', status: 'sent' },
      { id: 'expired', status: 'sent', valid_until: '2000-01-01' },
      { id: 'accepted', status: 'sent' },
    ],
    'contractor'
  );
  expect(result.map((q) => q.status)).toEqual([
    'rejected',
    'expired',
    'accepted',
  ]);
  expect(mocks.eq).toHaveBeenCalledWith('contractor_id', 'contractor');
});
it('rejects zero/negative expense edits and foreign fields before updating', async () => {
  for (const body of [
    { id, amount: 0 },
    { id, amount: -1 },
    { id, contractor_id: 'other' },
  ])
    expect((await call(editExpense, body)).status).toBe(400);
  expect(mocks.update).not.toHaveBeenCalled();
});
it('requires ownership on expense edits and validates linked job access', async () => {
  mocks.own = false;
  expect((await call(editExpense, { id, amount: 0.01 })).status).toBe(404);
  expect(mocks.update).not.toHaveBeenCalled();
  mocks.own = true;
  expect(
    (await call(editExpense, { id, amount: 0.01, jobId: id })).status
  ).toBe(200);
  expect(mocks.assignment).toHaveBeenCalledWith(id, 'contractor');
  expect(mocks.eq).toHaveBeenCalledWith('contractor_id', 'contractor');
  expect((await call(editExpense, { id, jobId: null, notes: '' })).status).toBe(
    200
  );
  expect(mocks.update).toHaveBeenLastCalledWith(
    expect.objectContaining({ job_id: null, notes: '' })
  );
});
