import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const state = vi.hoisted(() => ({
  rpc: vi.fn(),
  verify: vi.fn(),
  options: {} as Record<string, unknown>,
}));
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler: (options: Record<string, unknown>, fn: Function) => {
    state.options = options;
    return (request: NextRequest) => fn(request, { user: { id: 'admin-id' } });
  },
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { rpc: state.rpc },
}));
vi.mock('@/lib/admin-verification', () => ({
  requireAdminFromDatabase: state.verify,
}));
import { POST } from '@/app/api/admin/disputes/close/route';
const escrowId = '00000000-0000-4000-8000-000000000001';
const disputeId = '00000000-0000-4000-8000-000000000002';
const body = {
  escrowId,
  disputeId,
  reason: 'Erroneous test complaint',
  keepAdminHold: true,
};
const call = (input: unknown = body) =>
  POST(
    new NextRequest('https://example.test/api/admin/disputes/close', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  );
beforeEach(() => {
  vi.clearAllMocks();
  state.verify.mockResolvedValue(undefined);
  state.rpc.mockResolvedValue({
    data: [
      {
        id: 'closure-id',
        escrow_id: escrowId,
        dispute_id: disputeId,
        reason: body.reason,
        created_at: '2026-11-17',
      },
    ],
    error: null,
  });
});
it('requires admin, recent MFA and the default CSRF gate', () => {
  expect(state.options.roles).toEqual(['admin']);
  expect(state.options.requireMfaVerifiedWithinMinutes).toBe(15);
  expect(state.options.csrf).not.toBe(false);
});
it('closes only the exact case through the atomic nonfinancial RPC', async () => {
  const result = await call();
  expect(await result.json()).toMatchObject({
    success: true,
    escrowId,
    disputeId,
    closureId: 'closure-id',
  });
  expect(state.verify).toHaveBeenCalledWith('admin-id');
  expect(state.rpc).toHaveBeenCalledExactlyOnceWith(
    'close_dispute_without_settlement',
    {
      p_admin_id: 'admin-id',
      p_escrow_id: escrowId,
      p_dispute_id: disputeId,
      p_reason: body.reason,
    }
  );
});
it.each([
  { ...body, keepAdminHold: false },
  { ...body, keepAdminHold: undefined },
  { ...body, reason: 'tiny' },
  { ...body, decision: 'pay_contractor' },
])('rejects incomplete or money-decision requests', async (input) => {
  await expect(call(input)).rejects.toMatchObject({ statusCode: 400 });
  expect(state.rpc).not.toHaveBeenCalled();
});
it('rejects a stale admin before entering the RPC', async () => {
  state.verify.mockRejectedValue(new Error('Admin revoked'));
  await expect(call()).rejects.toThrow('Admin revoked');
  expect(state.rpc).not.toHaveBeenCalled();
});
it.each([
  { data: null, error: { message: 'settlement started' } },
  {
    data: [
      {
        id: 'wrong',
        escrow_id: escrowId,
        dispute_id: 'other',
        reason: body.reason,
      },
    ],
    error: null,
  },
])('does not claim success on an error or mismatched case', async (result) => {
  state.rpc.mockResolvedValue(result);
  await expect(call()).rejects.toMatchObject({ statusCode: 409 });
});
