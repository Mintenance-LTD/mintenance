// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const m = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler: (_: unknown, handler: Function) => (request: NextRequest) =>
    handler(request, { user: { id: 'trusted-actor' }, params: { id: 'case' } }),
}));
vi.mock('@/lib/api/supabaseServer', () => ({ serverSupabase: { rpc: m.rpc } }));
vi.mock('@/lib/services/support/SupportService', () => ({
  readCase: vi.fn(),
  replyCase: vi.fn(),
  supportReplySchema: {},
  parseInput: (schema: { parse: Function }, value: unknown) =>
    schema.parse(value),
}));
import { POST as visit } from '@/app/api/appointments/respond/route';
import { PATCH as support } from '@/app/api/admin/support/[id]/route';
const visitBody = {
  id: '00000000-0000-4000-8000-000000000001',
  date: '2026-11-09',
  start: '09:00',
  end: '10:00',
  response: 'confirmed',
};
const supportBody = {
  revision: 2,
  status: 'in_progress',
  assignedTo: null,
  priority: 'normal',
  reason: 'Investigating',
};
const call = (handler: typeof visit, body: unknown) =>
  handler(
    new NextRequest('https://example.test/api', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id: 'case' }) }
  );
beforeEach(() => {
  vi.clearAllMocks();
  m.rpc.mockResolvedValue({ data: { id: 'case' }, error: null });
});
it.each(['40001', 'PT409'])(
  'visit conflict %s returns 409 with no retry or success',
  async (code) => {
    m.rpc.mockResolvedValue({ error: { code } });
    const response = await call(visit, visitBody);
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: 'Visit changed. Refresh before confirming.',
    });
    expect(m.rpc).toHaveBeenCalledTimes(1);
    expect(m.rpc).toHaveBeenCalledWith(
      'respond_to_visit',
      expect.objectContaining({ p_actor: 'trusted-actor' })
    );
  }
);
it.each(['40001', 'PT409', '23514'])(
  'support conflict %s preserves the refresh-required result',
  async (code) => {
    m.rpc.mockResolvedValue({ error: { code } });
    await expect(call(support, supportBody)).rejects.toMatchObject({
      statusCode: 409,
    });
    expect(m.rpc).toHaveBeenCalledTimes(1);
    expect(m.rpc).toHaveBeenCalledWith(
      'update_support_case',
      expect.objectContaining({ p_actor: 'trusted-actor', p_revision: 2 })
    );
  }
);
it('keeps successful visit and support updates working', async () => {
  expect(await (await call(visit, visitBody)).json()).toEqual({
    success: true,
  });
  expect(await (await call(support, supportBody)).json()).toEqual({
    ticket: { id: 'case' },
  });
});
it('keeps denied visits and unknown support failures unsuccessful', async () => {
  m.rpc.mockResolvedValue({ error: { code: '42501' } });
  await expect(call(visit, visitBody)).rejects.toMatchObject({
    statusCode: 403,
  });
  m.rpc.mockResolvedValue({ error: { code: '08006' } });
  await expect(call(support, supportBody)).rejects.toMatchObject({
    statusCode: 500,
  });
});
