import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  run: vi.fn(),
  status: vi.fn(),
  queryResult: { count: 0, data: [], error: null } as {
    count: number;
    data: unknown[];
    error: null | { code: string };
  },
}));
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler: (_options: unknown, handler: unknown) => handler,
}));
vi.mock('@/lib/validation/validator', () => ({
  validateRequest: async () => ({ confirmation: 'DELETE' }),
}));
vi.mock('@/lib/rate-limiting/admin-gdpr', () => ({
  checkDeleteAccountRateLimit: async () => null,
}));
vi.mock('@/lib/services/account/AccountDeletionRecoveryService', () => ({
  runAccountDeletionCleanup: mocks.run,
  getAccountDeletionStatus: mocks.status,
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    rpc: mocks.rpc,
    from: () => {
      const q: Record<string, unknown> = {};
      for (const method of ['select', 'or', 'in', 'eq', 'not'])
        q[method] = () => q;
      q.then = (resolve: (value: unknown) => unknown) =>
        resolve(mocks.queryResult);
      return q;
    },
  },
}));
import { POST } from '@/app/api/user/delete-account/route';
const userId = 'fa360906-0000-4000-8000-000000000001';
const operationId = 'fa360906-0000-4000-8000-000000000003';
const handler = POST as unknown as (
  request: NextRequest,
  context: { user: { id: string; role: string } }
) => Promise<Response>;
const call = () =>
  handler(
    new NextRequest('http://localhost/api/user/delete-account', {
      method: 'POST',
    }),
    { user: { id: userId, role: 'homeowner' } }
  );
beforeEach(() => {
  vi.clearAllMocks();
  mocks.queryResult = { count: 0, data: [], error: null };
  mocks.rpc.mockResolvedValue({ data: operationId, error: null });
  mocks.run.mockResolvedValue({ completed: 1 });
  mocks.status.mockResolvedValue('completed');
});
describe('account deletion response and recovery boundary', () => {
  it('reports completion only after durable cleanup confirms it', async () => {
    const response = await call();
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      success: true,
      status: 'completed',
      requestId: operationId,
    });
    expect(mocks.rpc).toHaveBeenCalledWith('delete_account_with_recovery', {
      p_user_id: userId,
    });
  });
  it.each(['pending', 'needs_review'])(
    'returns 202 for %s instead of false success',
    async (status) => {
      mocks.status.mockResolvedValue(status);
      const response = await call();
      expect(response.status).toBe(202);
      expect(await response.json()).toMatchObject({
        success: false,
        status,
        requestId: operationId,
      });
    }
  );
  it('keeps a committed deletion pending when worker or acknowledgement fails', async () => {
    mocks.run.mockRejectedValue(new Error('lost response'));
    const response = await call();
    expect(response.status).toBe(202);
    expect(await response.json()).toMatchObject({
      success: false,
      status: 'pending',
      requestId: operationId,
    });
  });
  it('does not invoke provider cleanup after a database deletion failure', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code: '23503' } });
    await expect(call()).rejects.toMatchObject({ statusCode: 500 });
    expect(mocks.run).not.toHaveBeenCalled();
  });
  it('still refuses deletion when active marketplace state exists', async () => {
    mocks.queryResult.count = 1;
    const response = await call();
    expect(response.status).toBe(409);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('fails closed when preflight queries fail', async () => {
    mocks.queryResult.error = { code: 'offline' };
    await expect(call()).rejects.toMatchObject({ statusCode: 500 });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
