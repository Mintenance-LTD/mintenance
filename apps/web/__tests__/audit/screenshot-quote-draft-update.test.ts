// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const mocks = vi.hoisted(() => ({
  owner: vi.fn(),
  saved: vi.fn(),
  eq: vi.fn(),
  update: vi.fn(),
  list: vi.fn(),
  is: vi.fn(),
  from: vi.fn(),
}));
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler: (_: unknown, handler: unknown) => handler,
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    from: (table: string) => {
      mocks.from(table);
      let updating = false;
      const query = {
        select: () => query,
        eq: (...args: unknown[]) => {
          mocks.eq(...args);
          return query;
        },
        is: (...args: unknown[]) => {
          mocks.is(...args);
          return query;
        },
        single: mocks.owner,
        maybeSingle: () => (updating ? mocks.saved() : mocks.owner()),
        update: (...args: unknown[]) => {
          updating = true;
          mocks.update(...args);
          return query;
        },
        order: () => query,
        then: (
          resolve: (data: unknown) => unknown,
          reject: (error: unknown) => unknown
        ) => mocks.list().then(resolve, reject),
      };
      return query;
    },
  },
}));
import { PUT } from '@/app/api/contractor/quotes/[id]/route';
import { GET } from '@/app/api/contractor/quotes/route';
const handler = PUT as unknown as (
  req: NextRequest,
  context: { user: { id: string; role: string }; params: { id: string } }
) => Promise<Response>;
const call = (
  body: Record<string, unknown> = {
    title: 'Updated title',
    expected_status: 'draft',
  }
) =>
  handler(
    new NextRequest('http://localhost/api/contractor/quotes/quote', {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
    { user: { id: 'actor', role: 'contractor' }, params: { id: 'quote' } }
  );
beforeEach(() => {
  vi.clearAllMocks();
  mocks.owner.mockResolvedValue({
    data: {
      id: 'quote',
      status: 'draft',
      updated_at: '2026-11-06T12:00:00.000Z',
    },
    error: null,
  });
  mocks.list.mockResolvedValue({ data: [], error: null });
  mocks.saved.mockResolvedValue({
    data: { id: 'quote', status: 'draft', title: 'Updated title' },
    error: null,
  });
});

const priceEdit = {
  expected_status: 'draft',
  expected_updated_at: '2026-11-06T12:00:00.000Z',
  pricing: {
    tax_rate_percent: 20,
    line_items: [
      { description: ' Labour ', quantity: 1.5, unitPrice: 12.5 },
      { description: 'Parts', quantity: 1, unitPrice: 20 },
    ],
  },
};

it('atomically saves computed pricing, guarded by owner, draft and timestamp', async () => {
  await call(priceEdit);
  expect(mocks.update).toHaveBeenCalledWith(
    expect.objectContaining({
      line_items: [
        { description: 'Labour', quantity: 1.5, unitPrice: 12.5, total: 18.75 },
        { description: 'Parts', quantity: 1, unitPrice: 20, total: 20 },
      ],
      subtotal: 38.75,
      tax_rate: 20,
      tax_amount: 7.75,
      total_amount: 46.5,
    })
  );
  expect(mocks.eq.mock.calls.slice(-4)).toEqual([
    ['id', 'quote'],
    ['contractor_id', 'actor'],
    ['status', 'draft'],
    ['updated_at', priceEdit.expected_updated_at],
  ]);
  expect(mocks.update.mock.calls[0][0]).not.toHaveProperty('pricing');
});

it('returns the saved amounts, breakdown and version to the mobile read path', async () => {
  await call(priceEdit);
  const saved = {
    ...mocks.update.mock.calls[0][0],
    id: 'quote',
    status: 'draft',
    title: 'Repair',
  };
  mocks.list.mockResolvedValue({ data: [saved], error: null });
  const response = await (GET as unknown as typeof handler)(
    new NextRequest('http://localhost/api/contractor/quotes'),
    { user: { id: 'actor', role: 'contractor' }, params: {} as { id: string } }
  );
  expect(mocks.from).toHaveBeenCalledWith('current_contractor_quotes');
  const { quotes } = await response.json();
  expect(quotes[0]).toMatchObject({
    total_amount: 46.5,
    subtotal: 38.75,
    tax_amount: 7.75,
    updated_at: saved.updated_at,
    pricing_edit_version: 1,
    line_items: saved.line_items,
  });
});

it('does not recalculate prices during a details-only update', async () => {
  await call();
  for (const field of [
    'line_items',
    'subtotal',
    'tax_rate',
    'tax_amount',
    'total_amount',
  ]) {
    expect(mocks.update.mock.calls[0][0]).not.toHaveProperty(field);
  }
});

it.each([{ expected_status: undefined }, { expected_updated_at: undefined }])(
  'rejects incomplete or conflicting price updates: %j',
  async (overrides) => {
    await expect(call({ ...priceEdit, ...overrides })).rejects.toMatchObject({
      statusCode: 400,
    });
    expect(mocks.update).not.toHaveBeenCalled();
  }
);

it.each([
  { tax_rate_percent: -1, line_items: priceEdit.pricing.line_items },
  { tax_rate_percent: 101, line_items: priceEdit.pricing.line_items },
  { tax_rate_percent: 0, line_items: [] },
  {
    tax_rate_percent: 0,
    line_items: [{ description: 'Item', quantity: 1, unitPrice: 10, total: 1 }],
  },
])('rejects malformed pricing before mutating: %j', async (pricing) => {
  expect((await call({ ...priceEdit, pricing })).status).toBe(400);
  expect(mocks.update).not.toHaveBeenCalled();
});

it('rejects precision that cannot be represented in the pricing contract', async () => {
  await expect(
    call({
      ...priceEdit,
      pricing: {
        ...priceEdit.pricing,
        tax_rate_percent: 0.001,
      },
    })
  ).rejects.toMatchObject({ statusCode: 400 });
  expect(mocks.update).not.toHaveBeenCalled();
});

it('rejects a concurrent price/status change instead of overwriting it', async () => {
  mocks.saved.mockResolvedValue({ data: null, error: null });
  await expect(call(priceEdit)).rejects.toMatchObject({ statusCode: 409 });
  expect(mocks.eq).toHaveBeenCalledWith(
    'updated_at',
    priceEdit.expected_updated_at
  );
  expect(mocks.eq).toHaveBeenCalledWith('status', 'draft');
});

it('reports an ownership lookup failure as unavailable, not missing', async () => {
  mocks.owner.mockResolvedValue({ data: null, error: { message: 'offline' } });
  await expect(call(priceEdit)).rejects.toMatchObject({ statusCode: 500 });
  expect(mocks.update).not.toHaveBeenCalled();
});
it('conditions the saved mutation on actor, id and draft status', async () => {
  const response = await call();
  expect(response.status).toBe(200);
  expect(mocks.update).toHaveBeenCalledWith(
    expect.objectContaining({ title: 'Updated title' })
  );
  expect(mocks.update.mock.calls[0][0]).not.toHaveProperty('expected_status');
  expect(mocks.eq.mock.calls.slice(-4)).toEqual([
    ['id', 'quote'],
    ['contractor_id', 'actor'],
    ['status', 'draft'],
    ['updated_at', '2026-11-06T12:00:00.000Z'],
  ]);
  expect((await response.json()).quote.id).toBe('quote');
});
it('returns a conflict when the draft status changed before the update', async () => {
  mocks.saved.mockResolvedValue({ data: null, error: null });
  await expect(call()).rejects.toMatchObject({ statusCode: 409 });
});
it('does not attempt a mutation if ownership cannot be established', async () => {
  mocks.owner.mockResolvedValue({ data: null, error: null });
  await expect(call()).rejects.toMatchObject({ statusCode: 404 });
  expect(mocks.update).not.toHaveBeenCalled();
});
it('rejects unsupported expected statuses before querying', async () => {
  const response = await call({
    title: 'New title',
    expected_status: 'accepted',
  });
  expect(response.status).toBe(400);
  expect(mocks.update).not.toHaveBeenCalled();
});
it('does not convert a database failure into a stale-draft conflict', async () => {
  mocks.saved.mockResolvedValue({ data: null, error: { message: 'offline' } });
  await expect(call()).rejects.toMatchObject({ statusCode: 500 });
});

it.each([
  { total_amount: 1 },
  { line_items: [] },
  { status: 'draft' },
  { status: 'sent' },
])('rejects the old total/status bypass: %j', async (fields) => {
  const res = await call({ title: 'Legacy edit', ...fields });
  expect(res.status).toBe(400);
  expect(mocks.update).not.toHaveBeenCalled();
});
it.each(['sent', 'viewed', 'accepted', 'rejected', 'expired'])(
  'protects %s quotes even without a client status guard',
  async (status) => {
    mocks.owner.mockResolvedValue({
      data: { id: 'quote', status },
      error: null,
    });
    await expect(call({ title: 'Legacy edit' })).rejects.toMatchObject({
      statusCode: 409,
    });
    expect(mocks.update).not.toHaveBeenCalled();
  }
);
it('clears optional fields without altering the price or status', async () => {
  await call({ title: 'Repair', terms: '', notes: '', valid_until: null });
  expect(mocks.update).toHaveBeenCalledWith(
    expect.objectContaining({ terms: '', notes: '', valid_until: null })
  );
  expect(mocks.update.mock.calls[0][0]).not.toHaveProperty('status');
  expect(mocks.update.mock.calls[0][0]).not.toHaveProperty('total_amount');
});
it.each(['2026-02-30', '2026-13-01', '', 'tomorrow'])(
  'rejects invalid expiry %s',
  async (valid_until) => {
    expect((await call({ valid_until })).status).toBe(400);
    expect(mocks.update).not.toHaveBeenCalled();
  }
);
it('guards an explicitly loaded null timestamp on an old draft', async () => {
  await call({ ...priceEdit, expected_updated_at: null });
  expect(mocks.is).toHaveBeenCalledWith('updated_at', null);
});
