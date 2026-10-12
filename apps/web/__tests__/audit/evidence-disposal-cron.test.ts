import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const m = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn(), backlog: vi.fn() }));
vi.mock('@/lib/cron-handler', () => ({
  withCronHandler: (_name: string, fn: Function) => fn,
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    rpc: (...args: unknown[]) => m.rpc(...args),
    from: (...args: unknown[]) => m.from(...args),
  },
}));
import { GET } from '@/app/api/cron/evidence-disposal/route';
const call = () =>
  GET(new NextRequest('http://localhost/api/cron/evidence-disposal'));
beforeEach(() => {
  vi.clearAllMocks();
  m.backlog.mockResolvedValue({ data: [], error: null });
  m.from.mockImplementation(() => {
    const chain = { select: () => chain, eq: () => chain, limit: m.backlog };
    return chain;
  });
});
it('uses bounded batches and returns confirmed counters', async () => {
  const data = {
    processed: 1,
    completed: 1,
    needsReconciliation: 0,
    cancelled: 0,
  };
  m.rpc.mockResolvedValue({ data, error: null });
  expect(await call()).toEqual(data);
  expect(m.rpc).toHaveBeenCalledWith('process_retained_evidence_disposals', {
    p_limit: 10,
  });
});
it.each([
  { data: null, error: { code: '08006' } },
  { data: {}, error: null },
  {
    data: { processed: 1, completed: 0, needsReconciliation: 1, cancelled: 0 },
    error: null,
  },
])(
  'surfaces unconfirmed work and reconciliation as operational failures',
  async (result) => {
    m.rpc.mockResolvedValue(result);
    await expect(call()).rejects.toMatchObject({ statusCode: 503 });
  }
);
it('keeps a previous reconciliation failure visible on an otherwise idle run', async () => {
  m.rpc.mockResolvedValue({
    data: { processed: 0, completed: 0, needsReconciliation: 0, cancelled: 0 },
    error: null,
  });
  m.backlog.mockResolvedValue({
    data: [{ id: 'old-blocked-decision' }],
    error: null,
  });
  await expect(call()).rejects.toThrow('remains blocked');
  expect(m.from).toHaveBeenCalledWith('evidence_disposal_requests');
});
it('does not report healthy when the outstanding backlog cannot be read', async () => {
  m.rpc.mockResolvedValue({
    data: { processed: 0, completed: 0, needsReconciliation: 0, cancelled: 0 },
    error: null,
  });
  m.backlog.mockResolvedValue({ data: null, error: { message: 'offline' } });
  await expect(call()).rejects.toThrow('backlog could not be verified');
});
