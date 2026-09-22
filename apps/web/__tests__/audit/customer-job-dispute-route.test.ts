import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const s = vi.hoisted(() => ({
  actor: 'fa220922-0000-4000-8000-000000000001',
  job: 'fa220922-0000-4000-8000-000000000010',
  escrow: 'fa220922-0000-4000-8000-000000000020',
  record: 'fa220922-0000-4000-8000-000000000030',
  rpc: vi.fn(),
  cache: vi.fn(),
  store: vi.fn(),
  single: vi.fn(),
}));
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler: (_: unknown, fn: Function) => (req: NextRequest) =>
    fn(req, {
      user: { id: s.actor, role: 'homeowner' },
      params: { id: s.job },
    }),
}));
vi.mock('@/lib/idempotency', () => ({
  getIdempotencyKeyFromRequest: () => 'retry-key',
  checkIdempotency: s.cache,
  storeIdempotencyResult: s.store,
  releaseOnError: (_key: string, _op: string, fn: Function) => fn(),
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    rpc: s.rpc,
    from: () => {
      const q = { select: () => q, eq: () => q, single: s.single };
      return q;
    },
  },
}));
import { POST } from '@/app/api/jobs/[id]/dispute/route';
const send = () =>
  POST(
    new NextRequest(`http://localhost/api/jobs/${s.job}/dispute`, {
      method: 'POST',
      body: JSON.stringify({
        reason: '  The completed repair is incomplete  ',
        category: 'incomplete',
      }),
    }),
    { params: Promise.resolve({ id: s.job }) }
  );
beforeEach(() => {
  vi.clearAllMocks();
  s.single.mockResolvedValue({
    data: { id: s.job, homeowner_id: s.actor },
    error: null,
  });
  s.cache.mockResolvedValue(null);
  s.rpc.mockResolvedValue({
    data: [{ job_id: s.job, dispute_id: s.record, escrow_id: s.escrow }],
    error: null,
  });
});
it('returns the escrow route identity only after atomic confirmation and stores the canonical identity', async () => {
  expect(await (await send()).json()).toMatchObject({
    success: true,
    disputeId: s.escrow,
    disputeRecordId: s.record,
  });
  expect(s.rpc).toHaveBeenCalledWith('create_customer_job_dispute', {
    p_job_id: s.job,
    p_actor_id: s.actor,
    p_reason: 'The completed repair is incomplete',
    p_category: 'incomplete',
  });
  expect(s.cache).toHaveBeenCalledWith(
    'retry-key',
    'job_dispute_atomic',
    true,
    expect.any(Object)
  );
  expect(s.store).toHaveBeenCalledTimes(1);
});
it.each([
  [],
  null,
  [{ dispute_id: s.record, job_id: s.escrow, escrow_id: s.escrow }],
])('rejects absent or mismatched confirmation: %j', async (data) => {
  s.rpc.mockResolvedValue({ data, error: null });
  await expect(send()).rejects.toMatchObject({ statusCode: 500 });
  expect(s.store).not.toHaveBeenCalled();
});
it.each([
  ['42501', 403],
  ['23514', 409],
  ['P0002', 404],
  ['08006', 500],
])(
  'propagates transaction failure %s without caching success',
  async (code, statusCode) => {
    s.rpc.mockResolvedValue({ data: null, error: { code } });
    await expect(send()).rejects.toMatchObject({ statusCode });
    expect(s.store).not.toHaveBeenCalled();
  }
);
it('does not turn an access lookup outage into missing data or replay success', async () => {
  s.single.mockResolvedValue({ data: null, error: { code: '08006' } });
  await expect(send()).rejects.toMatchObject({ statusCode: 500 });
  expect(s.cache).not.toHaveBeenCalled();
  expect(s.rpc).not.toHaveBeenCalled();
});
