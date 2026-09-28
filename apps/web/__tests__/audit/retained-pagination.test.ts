import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const m = vi.hoisted(() => ({
  actor: 'actor',
  rows: [] as Record<string, unknown>[],
  filters: vi.fn(),
  error: null as unknown,
}));
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler: (_: unknown, fn: Function) => (req: NextRequest) =>
    fn(req, { user: { id: m.actor } }),
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    from: () => {
      const q = {
        select: () => q,
        contains: (...args: unknown[]) => {
          m.filters('contains', ...args);
          return q;
        },
        not: () => q,
        order: (...args: unknown[]) => {
          m.filters('order', ...args);
          return q;
        },
        or: (value: string) => {
          m.filters('or', value);
          return q;
        },
        limit: async (value: number) => {
          m.filters('limit', value);
          return { data: m.rows, error: m.error };
        },
      };
      return q;
    },
  },
}));
import { GET } from '@/app/api/disputes/retained/route';
const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const request = (cursor?: string) =>
  new NextRequest(
    'http://localhost/api/disputes/retained' +
      (cursor ? '?cursor=' + encodeURIComponent(cursor) : '')
  );
beforeEach(() => {
  vi.clearAllMocks();
  m.actor = 'actor';
  m.error = null;
  m.rows = Array.from({ length: 51 }, (_, n) => ({
    dispute_id: id(100 - n),
    escrow_id: id(200 - n),
    archived_at: '2026-09-27T08:00:00.123456+00:00',
    review_due_at: '2026-10-27T08:00:00+00:00',
  }));
});
it('uses a tie-breaking cursor from the last returned raw row and authorizes every page', async () => {
  const first = await (await GET(request(), {} as never)).json();
  expect(first.records).toHaveLength(50);
  expect(first.records[0]).not.toHaveProperty('dispute_id');
  expect(
    JSON.parse(Buffer.from(first.nextCursor, 'base64url').toString())
  ).toEqual({ at: m.rows[49].archived_at, id: m.rows[49].dispute_id });
  m.actor = 'unrelated';
  m.rows = [];
  const second = await (
    await GET(request(first.nextCursor), {} as never)
  ).json();
  expect(second).toMatchObject({ records: [], nextCursor: null });
  expect(m.filters).toHaveBeenCalledWith('contains', 'participant_ids', [
    'unrelated',
  ]);
  expect(m.filters).toHaveBeenCalledWith(
    'or',
    expect.stringContaining('dispute_id.lt.')
  );
  expect(m.filters).toHaveBeenCalledWith('limit', 51);
});
it('keeps pagination available even when a page contains repeated payment references', async () => {
  m.rows.forEach((row) => {
    row.escrow_id = id(1);
  });
  const page = await (await GET(request(), {} as never)).json();
  expect(page.records).toHaveLength(1);
  expect(page.nextCursor).toBeTruthy();
});
it('rejects injected cursor fields before any database filter', async () => {
  const cursor = Buffer.from(
    JSON.stringify({ at: '2026-09-27),participant_ids.cs.{}', id: id(1) })
  ).toString('base64url');
  await expect(GET(request(cursor), {} as never)).rejects.toMatchObject({
    statusCode: 400,
  });
  expect(m.filters).not.toHaveBeenCalled();
});
it('reports database failure instead of a false empty final page', async () => {
  m.error = { code: '08006' };
  await expect(GET(request(), {} as never)).rejects.toMatchObject({
    statusCode: 500,
  });
});
