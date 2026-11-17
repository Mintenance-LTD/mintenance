import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const m = vi.hoisted(() => ({
  rpc: vi.fn(),
  options: {} as Record<string, unknown>,
}));
const job = '00000000-0000-4000-8000-000000000001';
const rework = '00000000-0000-4000-8000-000000000002';
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler: (options: Record<string, unknown>, fn: Function) => {
    m.options = options;
    return (request: NextRequest) =>
      fn(request, {
        user: { id: 'actor' },
        params: { id: '00000000-0000-4000-8000-000000000001' },
      });
  },
}));
vi.mock('@/lib/api/supabaseServer', () => ({ serverSupabase: { rpc: m.rpc } }));
import { POST } from '@/app/api/jobs/[id]/rework/recover/route';
const call = (
  body: unknown = { reworkRequestId: rework, reopenForEvidence: true }
) =>
  POST(
    new NextRequest(
      'https://example.test/api/jobs/' + job + '/rework/recover',
      { method: 'POST', body: JSON.stringify(body) }
    )
  );
beforeEach(() => {
  vi.clearAllMocks();
  m.rpc.mockResolvedValue({ data: true, error: null });
});
it('requires contractor and default CSRF', () => {
  expect(m.options.roles).toEqual(['contractor']);
  expect(m.options.csrf).not.toBe(false);
});
it('requires explicit recovery confirmation', async () => {
  await expect(call({ reworkRequestId: rework })).rejects.toMatchObject({
    statusCode: 400,
  });
  expect(m.rpc).not.toHaveBeenCalled();
});
it('passes the exact job, actor and cycle to the guarded transaction', async () => {
  expect(await (await call()).json()).toEqual({
    success: true,
    jobId: job,
    recovered: true,
  });
  expect(m.rpc).toHaveBeenCalledWith('recover_legacy_rework', {
    p_actor: 'actor',
    p_job: job,
    p_rework: rework,
  });
});
it.each(['40001', '23514'])(
  'does not claim recovery on a state conflict %s',
  async (code) => {
    m.rpc.mockResolvedValue({ error: { code } });
    await expect(call()).rejects.toMatchObject({ statusCode: 409 });
  }
);
it('rejects a nonboolean database response', async () => {
  m.rpc.mockResolvedValue({ data: null, error: null });
  await expect(call()).rejects.toMatchObject({ statusCode: 500 });
});
it('reports a repeated completed recovery without doing it again', async () => {
  m.rpc.mockResolvedValue({ data: false, error: null });
  expect(await (await call()).json()).toMatchObject({
    success: true,
    recovered: false,
  });
});
