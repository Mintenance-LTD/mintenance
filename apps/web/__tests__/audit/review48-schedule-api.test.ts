import { NextRequest } from 'next/server';
import { PATCH, POST } from '@/app/api/jobs/[id]/schedule/route';

const rpc = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler: (_: unknown, handler: unknown) => handler,
}));
vi.mock('@/lib/api/supabaseServer', () => ({ serverSupabase: { rpc } }));
beforeEach(() => rpc.mockReset());

const id = '00000000-0000-4000-8000-000000000001';
const proposalId = '00000000-0000-4000-8000-000000000002';
const context = { user: { role: 'contractor', id: 'actor' }, params: { id } };
const request = (method: string, data: unknown) =>
  new NextRequest('http://localhost/api/jobs/' + id + '/schedule', {
    method,
    body: JSON.stringify(data),
  });

it('proposes a window using the authenticated actor and the transactional queue-backed RPC', async () => {
  rpc.mockResolvedValue({
    data: { id: proposalId, state: 'pending' },
    error: null,
  });
  const response = await POST(
    request('POST', { uk_start: '2099-07-10T12:00', uk_end: null }),
    context as never
  );
  expect(await response.json()).toEqual({
    proposal: { id: proposalId, state: 'pending' },
  });
  expect(rpc).toHaveBeenCalledWith('apply_job_work_window_action', {
    p_job: id,
    p_actor: 'actor',
    p_start: '2099-07-10T11:00:00.000Z',
    p_end: null,
    p_duration: null,
    p_proposal: null,
    p_action: 'propose',
  });
});

it('accepts the exact proposal and reports stale data or queue failure as an error', async () => {
  const req = () => request('PATCH', { proposalId, decision: 'accepted' });
  rpc
    .mockResolvedValueOnce({ error: { code: '40001' } })
    .mockResolvedValueOnce({ error: { code: '23514' } });
  await expect(PATCH(req(), context as never)).rejects.toThrow(
    'proposal changed'
  );
  await expect(PATCH(req(), context as never)).rejects.toThrow(
    'Unable to save'
  );
  expect(rpc).toHaveBeenCalledWith(
    'apply_job_work_window_action',
    expect.objectContaining({
      p_actor: 'actor',
      p_job: id,
      p_proposal: proposalId,
      p_action: 'accepted',
    })
  );
});

it('rejects an ambiguous UK wall time before any database write', async () => {
  await expect(
    POST(
      request('POST', { uk_start: '2026-10-25T01:30', uk_end: null }),
      context as never
    )
  ).rejects.toThrow('occurs twice');
  expect(rpc).not.toHaveBeenCalled();
});
