import { beforeEach, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('@/lib/api/supabaseServer', () => ({ serverSupabase: { rpc: m.rpc } }));
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler: (_: unknown, h: Function) => h,
}));
import { GET } from '@/app/api/messages/threads/route';
import { fetchAllMessageThreads } from '@/lib/messages/fetch-threads';
const actor = '00000000-0000-4000-8000-000000000003';
const row = (n: number) => ({
  job: {
    id: `00000000-0000-4000-9000-${String(n).padStart(12, '0')}`,
    title: 'Job',
    homeowner_id: 'owner',
    payer_user_id: actor,
    contractor_id: 'contractor',
  },
  last_message: {
    content: 'Hi',
    message_type: 'text',
    created_at: '2026-01-01T00:00:00+00:00',
  },
  last_activity: '2026-01-01T00:00:00.123456+00:00',
  unread_count: 2,
});
const get = (query = '') =>
  GET(
    { url: 'https://app.test/api/messages/threads' + query } as never,
    { user: { id: actor }, params: {} } as never
  );
beforeEach(() => vi.clearAllMocks());
it('uses authenticated actor and preserves microseconds and tie-break ID in cursor', async () => {
  m.rpc.mockResolvedValue({ data: [row(3), row(2), row(1)], error: null });
  const first = await (await get('?limit=2')).json();
  expect(first.threads).toHaveLength(2);
  const cursor = JSON.parse(
    Buffer.from(first.nextCursor, 'base64url').toString()
  );
  expect(cursor.at).toBe(row(2).last_activity);
  expect(cursor.id).toBe(row(2).job.id);
  await get('?cursor=' + first.nextCursor);
  expect(m.rpc).toHaveBeenLastCalledWith(
    'list_message_inbox',
    expect.objectContaining({
      p_actor: actor,
      p_before: cursor.at,
      p_before_id: cursor.id,
      p_snapshot: cursor.snapshot,
    })
  );
});
it('rejects invalid cursors before querying and surfaces database failures', async () => {
  await expect(get('?cursor=garbage')).rejects.toMatchObject({
    statusCode: 400,
  });
  expect(m.rpc).not.toHaveBeenCalled();
  m.rpc.mockResolvedValue({ data: null, error: { message: 'unavailable' } });
  await expect(get()).rejects.toThrow('Unable to load');
});
it('web follows pages, deduplicates and resets cursor on refresh', async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        threads: [row(2).job].map((job) => ({ jobId: job.id })),
        nextCursor: 'older',
      }),
    })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        threads: [{ jobId: row(2).job.id }, { jobId: row(1).job.id }],
      }),
    })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ threads: [] }) });
  vi.stubGlobal('fetch', fetch);
  try {
    expect(await fetchAllMessageThreads()).toHaveLength(2);
    expect(fetch.mock.calls[1][0]).toContain('cursor=older');
    await fetchAllMessageThreads();
    expect(fetch.mock.calls[2][0]).toBe('/api/messages/threads');
  } finally {
    vi.unstubAllGlobals();
  }
});
