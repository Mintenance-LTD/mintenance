// @vitest-environment node
import { NextRequest } from 'next/server';
const state = vi.hoisted(() => ({
  tables: {} as Record<string, Record<string, unknown>[]>,
  failTable: '',
  rpc: vi.fn(),
  configs: [] as Record<string, unknown>[],
}));
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler: (config: Record<string, unknown>, handler: unknown) => {
    state.configs.push(config);
    return handler;
  },
}));
vi.mock('@/lib/api/supabaseServer', async () => {
  const { notificationDatabase } =
    await import('@/lib/services/notifications/__tests__/notificationDatabaseFixture');
  return { serverSupabase: { ...notificationDatabase(state), rpc: state.rpc } };
});
import { GET, POST } from '@/app/api/admin/quote-amendment-emails/route';
const id = '00000000-0000-4000-8000-000000000001';
const payload = {
  request_id: id,
  amendment_id: id,
  version: 1,
  expected_review_version: 0,
  action: 'retry',
  evidence: 'not_accepted',
  note: 'Provider reference TEST-123 confirms no acceptance.',
  confirmed: true,
};
const call = (method: typeof GET, body?: unknown, query = '') =>
  (
    method as unknown as (
      req: NextRequest,
      ctx: { user: { id: string } }
    ) => Promise<Response>
  )(
    new NextRequest(
      `http://localhost/api/admin/quote-amendment-emails${query}`,
      body ? { method: 'POST', body: JSON.stringify(body) } : undefined
    ),
    { user: { id: 'operator' } }
  );
beforeEach(() => {
  vi.clearAllMocks();
  state.failTable = '';
  state.tables = {
    profiles: [{ id: 'operator', role: 'admin', deleted_at: null }],
    quote_amendment_email_outbox: [],
    quote_amendment_email_reviews: [],
  };
  state.rpc.mockResolvedValue({
    data: { request_id: id, result_status: 'pending' },
    error: null,
  });
});
it('requires database admin checks for reads and writes and retains default CSRF', () => {
  expect(state.configs).toHaveLength(2);
  for (const config of state.configs) {
    expect(config).toMatchObject({ roles: ['admin'], requireDbAdmin: true });
    expect(config.csrf).not.toBe(false);
  }
});
it.each(['deleted', 'demoted', 'offline'])(
  'rejects %s operator reads',
  async (kind) => {
    if (kind === 'deleted') state.tables.profiles[0].deleted_at = '2026-11-07';
    if (kind === 'demoted') state.tables.profiles[0].role = 'contractor';
    if (kind === 'offline') state.failTable = 'profiles';
    await expect(call(GET)).rejects.toMatchObject({ statusCode: 403 });
  }
);
it('bounds the page with a cursor and excludes closed and sending rows', async () => {
  state.tables.quote_amendment_email_outbox = Array.from(
    { length: 27 },
    (_, i) => ({ status: 'failed', review_sequence: 30 - i })
  );
  state.tables.quote_amendment_email_outbox.push({
    status: 'sending',
    review_sequence: 50,
  });
  const res = await call(GET);
  expect(res.headers.get('Cache-Control')).toBe('private, no-store');
  expect(await res.json()).toMatchObject({
    rows: expect.any(Array),
    next_before: 6,
  });
  const older = await (await call(GET, undefined, '?before=6')).json();
  expect(older.rows).toHaveLength(2);
  expect(older.next_before).toBeNull();
});
it('offers closed reviews separately', async () => {
  state.tables.quote_amendment_email_outbox = [
    { status: 'reviewed_accepted', review_sequence: 1, review_version: 1 },
    { status: 'failed', review_sequence: 2, review_version: 0 },
  ];
  const data = await (await call(GET, undefined, '?view=reviewed')).json();
  expect(data.rows).toHaveLength(1);
  expect(data.rows[0].status).toBe('reviewed_accepted');
});
it('loads review history only for the specified event', async () => {
  state.tables.quote_amendment_email_reviews = [
    { amendment_id: id, version: 1, note: 'Evidence' },
    { amendment_id: id, version: 2, note: 'Other' },
  ];
  expect(
    await (await call(GET, undefined, `?amendment_id=${id}&version=1`)).json()
  ).toEqual({ reviews: [{ amendment_id: id, version: 1, note: 'Evidence' }] });
});
it('keeps queued and accepted retries visible in reviewed events', async () => {
  state.tables.quote_amendment_email_outbox = [
    'pending',
    'sending',
    'sent',
    'cancelled',
  ].map((status, i) => ({ status, review_sequence: i + 1, review_version: 1 }));
  expect(
    (await (await call(GET, undefined, '?view=reviewed')).json()).rows
  ).toHaveLength(4);
});
it.each([
  '?before=-1',
  '?view=all',
  '?amendment_id=bad',
  '?version=1',
  '?unknown=1',
])('rejects invalid filter %s', async (query) => {
  await expect(call(GET, undefined, query)).rejects.toMatchObject({
    statusCode: 400,
  });
});
it('never turns queue failure into an empty success', async () => {
  state.failTable = 'quote_amendment_email_outbox';
  await expect(call(GET)).rejects.toMatchObject({ statusCode: 500 });
});
it('uses the authenticated actor and exact retry/version/evidence input', async () => {
  await call(POST, payload);
  expect(state.rpc).toHaveBeenCalledWith(
    'review_quote_amendment_email',
    expect.objectContaining({
      p_actor: 'operator',
      p_request: id,
      p_expected_review: 0,
      p_action: 'retry',
      p_evidence: 'not_accepted',
      p_note: payload.note,
    })
  );
});
it.each([
  { confirmed: false },
  { actor_id: 'intruder' },
  { evidence: 'unknown' },
  { note: 'short' },
  { expected_review_version: -1 },
])('rejects unsafe review %j', async (override) => {
  await expect(call(POST, { ...payload, ...override })).rejects.toMatchObject({
    statusCode: 400,
  });
  expect(state.rpc).not.toHaveBeenCalled();
});
it.each([
  ['42501', 403],
  ['P0002', 404],
  ['40001', 409],
  ['23505', 409],
  ['22023', 400],
  ['XX000', 500],
])('maps %s without leaking SQL', async (code, statusCode) => {
  state.rpc.mockResolvedValue({
    data: null,
    error: { code, message: 'private database details' },
  });
  await expect(call(POST, payload)).rejects.toMatchObject({ statusCode });
});
