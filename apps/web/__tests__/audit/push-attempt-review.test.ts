import { beforeEach, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({
  admin: vi.fn(),
  from: vi.fn(),
  update: vi.fn(),
  eq: vi.fn(),
  result: { data: null as any, error: null as any },
  options: [] as any[],
}));
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler: (options: any, handler: Function) => {
    m.options.push(options);
    return (request: any) => handler(request, { user: { id: 'admin-id' } });
  },
}));
vi.mock('@/lib/admin-verification', () => ({
  requireAdminFromDatabase: m.admin,
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { from: m.from },
}));
import { POST, GET } from '@/app/api/admin/push-attempts/route';
const id = '11111111-1111-4111-8111-111111111111';
const request = (body: unknown) => ({ json: async () => body }) as any;
beforeEach(() => {
  vi.clearAllMocks();
  m.result = { data: { id, status: 'reviewed_unknown' }, error: null };
  m.admin.mockResolvedValue(undefined);
  const q: any = {};
  for (const key of ['select', 'in', 'order', 'limit']) q[key] = vi.fn(() => q);
  q.update = (data: any) => {
    m.update(data);
    return q;
  };
  q.eq = (...args: any[]) => {
    m.eq(...args);
    return q;
  };
  q.maybeSingle = async () => m.result;
  q.then = (fn: Function) => Promise.resolve(m.result).then(fn as any);
  m.from.mockReturnValue(q);
});
it('checks current database admin status before any access', async () => {
  m.admin.mockRejectedValue(new Error('denied'));
  await expect(GET(request({}), {} as any)).rejects.toThrow('denied');
  await expect(
    POST(
      request({ id, note: 'Checked, delivery outcome cannot be confirmed.' }),
      {} as any
    )
  ).rejects.toThrow('denied');
  expect(m.from).not.toHaveBeenCalled();
  expect(
    m.options.every((o) => o.roles.includes('admin') && o.csrf !== false)
  ).toBe(true);
});
it('records unknown rather than delivered and only updates an unresolved attempt', async () => {
  const response = await POST(
    request({ id, note: 'Checked, delivery outcome cannot be confirmed.' }),
    {} as any
  );
  expect(response.status).toBe(200);
  expect(m.update).toHaveBeenCalledWith(
    expect.objectContaining({
      status: 'reviewed_unknown',
      reviewed_by: 'admin-id',
      review_note: 'Checked, delivery outcome cannot be confirmed.',
    })
  );
  expect(m.eq).toHaveBeenCalledWith('status', 'needs_review');
});
it('rejects missing review notes and ignores no failed writes', async () => {
  await expect(POST(request({ id, note: 'ok' }), {} as any)).rejects.toThrow();
  expect(m.update).not.toHaveBeenCalled();
  m.result = { data: null, error: null };
  await expect(
    POST(
      request({ id, note: 'Checked, delivery outcome cannot be confirmed.' }),
      {} as any
    )
  ).rejects.toThrow('changed');
});
