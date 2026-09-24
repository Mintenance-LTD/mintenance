import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const m = vi.hoisted(() => ({
  rpc: vi.fn(),
  admin: vi.fn(),
  options: [] as object[],
}));
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler: (options: object, fn: Function) => {
    m.options.push(options);
    return (request: NextRequest) =>
      fn(request, { user: { id: 'trusted-admin' } });
  },
}));
vi.mock('@/lib/admin-verification', () => ({
  requireAdminFromDatabase: (...args: unknown[]) => m.admin(...args),
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { rpc: (...args: unknown[]) => m.rpc(...args) },
}));
import { POST } from '@/app/api/admin/evidence-retention/disposal/route';
const id = '11111111-1111-4111-8111-111111111111';
const decision = {
  action: 'schedule',
  kind: 'contract',
  id,
  revision: 2,
  scheduledFor: '2030-10-22T12:00:00Z',
  reason: 'Classified synthetic case',
  inventoryReference: 'CASE-001',
  classificationConfirmed: true,
};
function submit(body: object = decision) {
  return POST(
    new NextRequest('http://localhost/api/admin/evidence-retention/disposal', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({}) }
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  m.rpc.mockResolvedValue({ data: id, error: null });
  m.admin.mockResolvedValue(undefined);
});
it('requires fresh MFA and binds scheduling to the database-verified administrator', async () => {
  expect(m.options).toContainEqual({
    roles: ['admin'],
    requireMfaVerifiedWithinMinutes: 15,
  });
  expect(await (await submit()).json()).toEqual({
    success: true,
    requestId: id,
  });
  expect(m.admin).toHaveBeenCalledWith('trusted-admin');
  expect(m.rpc).toHaveBeenCalledWith(
    'schedule_retained_evidence_disposal',
    expect.objectContaining({
      p_admin_id: 'trusted-admin',
      p_expected_revision: 2,
      p_inventory_reference: 'CASE-001',
    })
  );
});
it.each([
  { ...decision, classificationConfirmed: false },
  { ...decision, adminId: 'other' },
  { ...decision, revision: 0 },
])('rejects unsafe decision input', async (body) => {
  await expect(submit(body)).rejects.toMatchObject({ statusCode: 400 });
  expect(m.rpc).not.toHaveBeenCalled();
});
it('does not call the worker when database admin verification fails', async () => {
  m.admin.mockRejectedValue(new Error('Denied'));
  await expect(submit()).rejects.toThrow('Denied');
  expect(m.rpc).not.toHaveBeenCalled();
});
it.each([
  ['40001', 409],
  ['P0002', 404],
  ['22023', 400],
  ['08006', 500],
])(
  'does not report success after database failure %s',
  async (code, statusCode) => {
    m.rpc.mockResolvedValue({ data: null, error: { code } });
    await expect(submit()).rejects.toMatchObject({ statusCode });
  }
);
it('requires a confirmed cancellation, not merely a successful HTTP exchange', async () => {
  const cancel = { action: 'cancel', kind: 'contract', id, requestId: id };
  m.rpc.mockResolvedValue({ data: false, error: null });
  await expect(submit(cancel)).rejects.toMatchObject({ statusCode: 500 });
  m.rpc.mockResolvedValue({ data: true, error: null });
  expect(await (await submit(cancel)).json()).toEqual({ success: true });
});
