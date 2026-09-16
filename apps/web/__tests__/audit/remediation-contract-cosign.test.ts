import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { rpc: mocks.rpc },
}));
// Boundary tests only: database permissions and concurrency are tested by the SQL/Python diagnostics.
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler: (_options: unknown, handler: unknown) => handler,
}));
import { POST as sign } from '@/app/api/contracts/[id]/sign-as-cosigner/route';
import { POST as remove } from '@/app/api/contracts/[id]/delete/route';
type Handler = (
  request: NextRequest,
  context: { user: { id: string }; params: { id: string } }
) => Promise<Response>;
const contractId = 'fa160906-0000-4000-8000-000000000040';
const actorId = 'fa160906-0000-4000-8000-000000000003';
const context = { user: { id: actorId }, params: { id: contractId } };
const request = () =>
  new NextRequest(`http://localhost/api/contracts/${contractId}`, {
    method: 'POST',
  });
beforeEach(() => {
  vi.clearAllMocks();
});
describe.each([
  [
    'co-sign',
    sign as unknown as Handler,
    'sign_contract_cosigner_atomic',
    'p_signer_id',
  ],
  [
    'delete',
    remove as unknown as Handler,
    'delete_unsigned_contract_atomic',
    'p_contractor_id',
  ],
] as const)('%s atomic route boundary', (_name, handler, rpc, actorKey) => {
  it('passes the authenticated actor and resource to the atomic operation', async () => {
    mocks.rpc.mockResolvedValue({ data: { success: true }, error: null });
    expect((await handler(request(), context)).status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith(rpc, {
      p_contract_id: contractId,
      [actorKey]: actorId,
    });
  });
  it.each([
    ['P0002', 404],
    ['42501', 403],
    ['23514', 400],
    ['XX000', 500],
  ])('maps %s without reporting success', async (code, statusCode) => {
    mocks.rpc.mockResolvedValue({
      data: null,
      error: { code, message: 'private database details' },
    });
    await expect(handler(request(), context)).rejects.toMatchObject({
      statusCode,
    });
  });
  it.each([null, {}, { success: false }])(
    'does not claim success for malformed outcome %j',
    async (data) => {
      mocks.rpc.mockResolvedValue({ data, error: null });
      await expect(handler(request(), context)).rejects.toMatchObject({
        statusCode: 500,
      });
    }
  );
  it('rejects invalid IDs before any database call', async () => {
    await expect(
      handler(request(), { ...context, params: { id: 'invalid' } })
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('rechecks the database on retries instead of serving stale authorization', async () => {
    mocks.rpc
      .mockResolvedValueOnce({ data: { success: true }, error: null })
      .mockResolvedValueOnce({ data: null, error: { code: '42501' } });
    await handler(request(), context);
    await expect(handler(request(), context)).rejects.toMatchObject({
      statusCode: 403,
    });
    expect(mocks.rpc).toHaveBeenCalledTimes(2);
  });
});

// Viewer contract tests; the SQL diagnostic proves authorization against real records.
import { GET as retained } from '@/app/api/contracts/[id]/retained/route';
describe('retained contract viewer boundary', () => {
  const handler = retained as unknown as Handler;
  const viewRequest = () =>
    new NextRequest(`http://localhost/api/contracts/${contractId}/retained`);
  it('uses the current actor and prevents cached private responses', async () => {
    mocks.rpc.mockResolvedValue({
      data: { contract: { id: contractId }, signatures: [] },
      error: null,
    });
    const response = await handler(viewRequest(), context);
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(mocks.rpc).toHaveBeenCalledWith('read_retained_contract', {
      p_contract_id: contractId,
      p_user_id: actorId,
    });
  });
  it.each([
    ['P0002', 404],
    ['42501', 403],
    ['XX000', 500],
  ])('maps viewer %s to %s', async (code, statusCode) => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code } });
    await expect(handler(viewRequest(), context)).rejects.toMatchObject({
      statusCode,
    });
  });
  it.each([null, {}, { contract: { id: 'another-contract' } }])(
    'rejects an invalid viewer result %j',
    async (data) => {
      mocks.rpc.mockResolvedValue({ data, error: null });
      await expect(handler(viewRequest(), context)).rejects.toMatchObject({
        statusCode: 500,
      });
    }
  );
  it('rejects malformed IDs without database access', async () => {
    await expect(
      handler(viewRequest(), { ...context, params: { id: 'invalid' } })
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
