// @vitest-environment node
import { NextRequest } from 'next/server';
const m = vi.hoisted(() => ({ single: vi.fn(), cache: vi.fn(), rpc: vi.fn() }));
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler: (_: unknown, handler: Function) => (req: NextRequest) =>
    handler(req, { user: { id: 'actor', role: 'homeowner' } }),
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    rpc: m.rpc,
    from: () => ({ select: () => ({ eq: () => ({ single: m.single }) }) }),
  },
}));
vi.mock('@/lib/idempotency', () => ({
  getDeterministicIdempotencyKeyFromRequest: () => 'bound-key',
  checkIdempotency: m.cache,
  storeIdempotencyResult: vi.fn(),
  releaseOnError: vi.fn(),
}));
vi.mock('@/lib/services/disputes/DisputeWorkflowService', () => ({
  DisputeWorkflowService: {},
}));
import { POST } from '@/app/api/disputes/create/route';
const send = () =>
  POST(
    new NextRequest('http://localhost/api/disputes/create', {
      method: 'POST',
      body: JSON.stringify({
        escrowId: '11111111-1111-4111-8111-111111111111',
        reason: 'Incomplete work',
        description: 'Synthetic unfinished repair',
      }),
      headers: { 'content-type': 'application/json' },
    }),
    { params: Promise.resolve({}) }
  );
beforeEach(() => {
  vi.clearAllMocks();
  m.cache.mockResolvedValue({
    isDuplicate: true,
    cachedResult: { success: true },
  });
});
it('denies a former participant before accessing cached success', async () => {
  m.single.mockResolvedValue({
    data: { payer_id: 'new-payer', payee_id: 'contractor' },
    error: null,
  });
  await expect(send()).rejects.toMatchObject({ statusCode: 403 });
  expect(m.cache).not.toHaveBeenCalled();
  expect(m.rpc).not.toHaveBeenCalled();
});
it('does not return cached success for a missing escrow', async () => {
  m.single.mockResolvedValue({ data: null, error: null });
  await expect(send()).rejects.toMatchObject({ statusCode: 404 });
  expect(m.cache).not.toHaveBeenCalled();
});
it('allows a current participant to recover success without another mutation', async () => {
  m.single.mockResolvedValue({
    data: { payer_id: 'actor', payee_id: 'contractor' },
    error: null,
  });
  expect(await (await send()).json()).toEqual({ success: true });
  expect(m.cache).toHaveBeenCalled();
  expect(m.rpc).not.toHaveBeenCalled();
});
