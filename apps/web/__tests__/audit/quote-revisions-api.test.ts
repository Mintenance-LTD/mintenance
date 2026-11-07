// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const mocks = vi.hoisted(() => ({
  read: vi.fn(),
  history: vi.fn(),
  rpc: vi.fn(),
  eq: vi.fn(),
  lt: vi.fn(),
  order: vi.fn(),
  limit: vi.fn(),
}));
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler: (_: unknown, handler: unknown) => handler,
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    rpc: mocks.rpc,
    from: (table: string) => {
      const q = {
        select: () => q,
        eq: (...args: unknown[]) => {
          mocks.eq(table, ...args);
          return q;
        },
        lt: (...args: unknown[]) => {
          mocks.lt(...args);
          return q;
        },
        order: (...args: unknown[]) => {
          mocks.order(...args);
          return q;
        },
        limit: (...args: unknown[]) => {
          mocks.limit(...args);
          return q;
        },
        maybeSingle: mocks.read,
        then: (resolve: (value: unknown) => unknown) =>
          mocks.history().then(resolve),
      };
      return q;
    },
  },
}));
import { GET, POST } from '@/app/api/contractor/quotes/[id]/revisions/route';
const input = {
  request_id: '11111111-1111-4111-8111-111111111111',
  expected_updated_at: '2026-11-06T12:00:00.123456Z',
  reason: 'Additional work',
  pricing: {
    line_items: [{ description: 'Part', quantity: 1.5, unitPrice: 10.01 }],
    tax_rate_percent: 20,
  },
};
const call = (handler: typeof GET, body?: unknown, query = '') =>
  (
    handler as unknown as (
      req: NextRequest,
      ctx: { user: { id: string }; params: { id: string } }
    ) => Promise<Response>
  )(
    new NextRequest(
      `http://localhost/api/contractor/quotes/quote/revisions${query}`,
      body ? { method: 'POST', body: JSON.stringify(body) } : undefined
    ),
    { user: { id: 'actor' }, params: { id: 'quote' } }
  );
beforeEach(() => {
  vi.clearAllMocks();
  mocks.read.mockResolvedValue({ data: { id: 'quote' }, error: null });
  mocks.history.mockResolvedValue({ data: [], error: null });
  mocks.rpc.mockResolvedValue({ data: { id: 'revision' }, error: null });
});
it('calculates the proposed snapshot on the server and supplies only the authenticated actor', async () => {
  expect((await call(POST, input)).status).toBe(200);
  expect(mocks.rpc).toHaveBeenCalledWith('propose_quote_amendment', {
    p_quote_id: 'quote',
    p_actor_id: 'actor',
    p_request_id: input.request_id,
    p_expected_updated_at: input.expected_updated_at,
    p_reason: input.reason,
    p_pricing: {
      line_items: [{ ...input.pricing.line_items[0], total: 15.02 }],
      subtotal: 15.02,
      tax_rate: 20,
      tax_amount: 3,
      total_amount: 18.02,
    },
  });
});
it.each([
  { ...input, actor_id: 'forged' },
  { ...input, total_amount: 1 },
  { ...input, expected_updated_at: undefined },
  { ...input, reason: ' ' },
  { ...input, pricing: { ...input.pricing, line_items: [] } },
  { ...input, request_id: 'invalid' },
])('rejects incomplete/forged proposal input %#', async (payload) => {
  expect((await call(POST, payload)).status).toBe(400);
  expect(mocks.rpc).not.toHaveBeenCalled();
});
it('rejects invalid quantity before the RPC', async () => {
  await expect(
    call(POST, {
      ...input,
      pricing: {
        ...input.pricing,
        line_items: [{ description: 'Part', quantity: 0, unitPrice: 2 }],
      },
    })
  ).rejects.toMatchObject({ statusCode: 400 });
  expect(mocks.rpc).not.toHaveBeenCalled();
});
it('allows an explicitly null legacy timestamp', async () => {
  await call(POST, { ...input, expected_updated_at: null });
  expect(mocks.rpc.mock.calls[0][1].p_expected_updated_at).toBeNull();
});
it.each([
  ['P0002', 404],
  ['40001', 409],
  ['22023', 400],
  ['42P01', 500],
])('maps RPC %s without claiming success', async (code, statusCode) => {
  mocks.rpc.mockResolvedValue({ data: null, error: { code } });
  await expect(call(POST, input)).rejects.toMatchObject({ statusCode });
});
it('does not claim success on a missing RPC result', async () => {
  mocks.rpc.mockResolvedValue({ data: null, error: null });
  await expect(call(POST, input)).rejects.toMatchObject({ statusCode: 500 });
});
it('owner-scopes the quote and history, and paginates in stable revision order', async () => {
  mocks.history.mockResolvedValue({
    data: Array.from({ length: 51 }, (_, i) => ({ revision_number: 100 - i })),
    error: null,
  });
  const data = await (await call(GET, undefined, '?before=101')).json();
  expect(data.revisions).toHaveLength(50);
  expect(data.next_before).toBe(51);
  expect(mocks.eq).toHaveBeenCalledWith(
    'contractor_quotes',
    'contractor_id',
    'actor'
  );
  expect(mocks.eq).toHaveBeenCalledWith(
    'quote_revisions',
    'contractor_id',
    'actor'
  );
  expect(mocks.lt).toHaveBeenCalledWith('revision_number', 101);
  expect(mocks.order).toHaveBeenCalledWith('revision_number', {
    ascending: false,
  });
  expect(mocks.limit).toHaveBeenCalledWith(51);
});
it('returns genuine empty history and no cursor', async () => {
  expect(await (await call(GET)).json()).toEqual({
    revisions: [],
    next_before: null,
  });
});
it.each(['0', '1.5', '-2', 'NaN', '9007199254740993'])(
  'rejects invalid cursor %s',
  async (cursor) => {
    await expect(
      call(GET, undefined, `?before=${cursor}`)
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(mocks.read).not.toHaveBeenCalled();
  }
);
it('does not expose history for a missing/foreign quote', async () => {
  mocks.read.mockResolvedValue({ data: null, error: null });
  await expect(call(GET)).rejects.toMatchObject({ statusCode: 404 });
  expect(mocks.history).not.toHaveBeenCalled();
});
it('surfaces history/migration failure instead of returning empty history', async () => {
  mocks.history.mockResolvedValue({ data: null, error: { code: '42P01' } });
  await expect(call(GET)).rejects.toMatchObject({ statusCode: 500 });
});
it('surfaces a failed ownership lookup', async () => {
  mocks.read.mockResolvedValue({ data: null, error: { message: 'offline' } });
  await expect(call(GET)).rejects.toMatchObject({ statusCode: 500 });
});
