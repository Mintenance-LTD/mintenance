// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), revalidate: vi.fn() }));
vi.mock('next/cache', () => ({
  revalidateTag: mocks.revalidate,
  unstable_cache: vi.fn(),
}));
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler: (_: unknown, handler: unknown) => handler,
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { rpc: mocks.rpc },
}));
import { GET } from '@/app/api/jobs/[id]/quote-amendments/route';
import { POST } from '@/app/api/jobs/[id]/quote-amendments/[revisionId]/route';
const input = {
  action: 'approve',
  expected_version: 1,
  confirmed: true,
  note: 'Reviewed',
};
const call = (handler: typeof GET, body?: unknown, query = '') =>
  (
    handler as unknown as (
      request: NextRequest,
      context: {
        user: { id: string };
        params: { id: string; revisionId: string };
      }
    ) => Promise<Response>
  )(
    new NextRequest(
      `http://localhost/api/jobs/job/quote-amendments/revision${query}`,
      body ? { method: 'POST', body: JSON.stringify(body) } : undefined
    ),
    { user: { id: 'actor' }, params: { id: 'job', revisionId: 'revision' } }
  );
beforeEach(() => {
  vi.clearAllMocks();
  mocks.revalidate.mockReset();
  mocks.rpc.mockResolvedValue({
    data: { id: 'revision', status: 'approved' },
    error: null,
  });
});
it('expires cached quote/bid summaries only after confirmed application', async () => {
  mocks.rpc.mockResolvedValue({
    data: { id: 'revision', status: 'applied' },
    error: null,
  });
  await call(POST, { ...input, action: 'apply', expected_version: 2 });
  expect(mocks.revalidate).toHaveBeenCalledWith('user-bids', { expire: 0 });
});
it('reports committed application even when cache invalidation fails', async () => {
  mocks.rpc.mockResolvedValue({
    data: { id: 'revision', status: 'applied' },
    error: null,
  });
  mocks.revalidate.mockImplementation(() => {
    throw new Error('Cache offline');
  });
  const response = await call(POST, {
    ...input,
    action: 'apply',
    expected_version: 2,
  });
  expect(response.status).toBe(200);
  expect((await response.json()).warning).toContain('Pricing was applied');
});
it.each(['publish', 'approve', 'reject', 'withdraw', 'apply'])(
  'binds %s to the authenticated actor, job, proposal and reviewed version',
  async (action) => {
    expect((await call(POST, { ...input, action })).status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith('transition_quote_amendment', {
      p_job: 'job',
      p_revision: 'revision',
      p_actor: 'actor',
      p_action: action,
      p_expected_version: 1,
      p_note: 'Reviewed',
    });
  }
);
it.each([
  { ...input, actor_id: 'forged' },
  { ...input, confirmed: false },
  { ...input, expected_version: undefined },
  { ...input, expected_version: -1 },
  { ...input, action: 'pay' },
  { ...input, amount: 100 },
  { ...input, note: 'x'.repeat(2001) },
])('rejects unreviewed, forged or malformed writes %#', async (body) => {
  expect((await call(POST, body)).status).toBe(400);
  expect(mocks.rpc).not.toHaveBeenCalled();
});
it.each([
  ['42501', 403],
  ['P0002', 404],
  ['40001', 409],
  ['23505', 409],
  ['23514', 409],
  ['22023', 400],
  ['42P01', 500],
])('maps %s without invented success', async (code, statusCode) => {
  mocks.rpc.mockResolvedValue({ data: null, error: { code } });
  await expect(call(POST, input)).rejects.toMatchObject({ statusCode });
});
it('requires a confirmed row', async () => {
  mocks.rpc.mockResolvedValue({ data: null, error: null });
  await expect(call(POST, input)).rejects.toMatchObject({ statusCode: 500 });
});
it('uses the role-checked read RPC and paginates without claiming all records were loaded', async () => {
  mocks.rpc.mockResolvedValue({
    data: {
      amendments: Array.from({ length: 51 }, (_, i) => ({ sequence: 100 - i })),
      can_approve: true,
      is_contractor: false,
    },
    error: null,
  });
  const response = await call(GET, undefined, '?before=101');
  const data = await response.json();
  expect(data.amendments).toHaveLength(50);
  expect(data.next_before).toBe(51);
  expect(response.headers.get('cache-control')).toBe('no-store');
  expect(mocks.rpc).toHaveBeenCalledWith('read_job_quote_amendments', {
    p_job: 'job',
    p_actor: 'actor',
    p_before: 101,
  });
});
it.each(['0', '-1', 'NaN', '1.5'])(
  'rejects invalid history cursor %s',
  async (cursor) => {
    await expect(
      call(GET, undefined, `?before=${cursor}`)
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(mocks.rpc).not.toHaveBeenCalled();
  }
);
it('does not replace a failed read with empty proposals', async () => {
  mocks.rpc.mockResolvedValue({ data: null, error: { code: '42P01' } });
  await expect(call(GET)).rejects.toMatchObject({ statusCode: 500 });
});
