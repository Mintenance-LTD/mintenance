import { beforeEach, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({
  job: {
    homeowner_id: 'owner',
    payer_user_id: 'payer',
    contractor_id: 'contractor',
  } as Record<string, string> | null,
  history: vi.fn(),
}));
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler: (_: unknown, handler: unknown) => handler,
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    from: () => {
      const q = {
        select: () => q,
        eq: () => q,
        single: async () => ({ data: state.job, error: null }),
      };
      return q;
    },
  },
}));
vi.mock('@/lib/jobs/rework-evidence', () => ({
  getJobReworkRequests: state.history,
}));
import { GET } from '@/app/api/jobs/[id]/rework/route';
const read = (id: string, role = 'homeowner') =>
  (
    GET as unknown as (
      request: Request,
      context: { user: { id: string; role: string }; params: { id: string } }
    ) => Promise<Response>
  )(new Request('https://example.test/api/jobs/job/rework'), {
    user: { id, role },
    params: { id: 'job' },
  });
beforeEach(() => {
  state.job = {
    homeowner_id: 'owner',
    payer_user_id: 'payer',
    contractor_id: 'contractor',
  };
  state.history
    .mockReset()
    .mockResolvedValue([{ id: 'cycle', comments: 'Repair the edge' }]);
});
it.each(['owner', 'payer', 'contractor'])(
  'permits the linked %s account',
  async (id) => {
    const r = await read(id);
    expect((await r.json()).requests).toHaveLength(1);
  }
);
it('denies an unrelated contractor before reading private feedback', async () => {
  await expect(read('outsider', 'contractor')).rejects.toThrow(/cannot access/);
  expect(state.history).not.toHaveBeenCalled();
});
it('denies an unrelated homeowner before reading private feedback', async () => {
  await expect(read('outsider')).rejects.toThrow(/cannot access/);
  expect(state.history).not.toHaveBeenCalled();
});
it('does not read history for a missing job', async () => {
  state.job = null;
  await expect(read('owner')).rejects.toThrow(/not found/);
  expect(state.history).not.toHaveBeenCalled();
});
