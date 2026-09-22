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
import { POST } from '@/app/api/admin/evidence-retention/route';
const decision = {
  kind: 'dispute',
  id: '11111111-1111-4111-8111-111111111111',
  revision: 2,
  legalHold: true,
  reason: 'Ongoing synthetic claim',
  reviewDueAt: '2026-10-22T12:00:00Z',
};
function submit(body: object = decision) {
  return POST(
    new NextRequest('http://localhost/api/admin/evidence-retention', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({}) }
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  m.rpc.mockResolvedValue({ data: 3, error: null });
  m.admin.mockResolvedValue(undefined);
});
it('requires fresh MFA and forwards the trusted administrator and expected revision', async () => {
  expect(m.options).toContainEqual({
    roles: ['admin'],
    requireMfaVerifiedWithinMinutes: 15,
  });
  expect(await (await submit()).json()).toEqual({ success: true, revision: 3 });
  expect(m.rpc).toHaveBeenCalledWith(
    'review_retained_evidence',
    expect.objectContaining({
      p_admin_id: 'trusted-admin',
      p_expected_revision: 2,
      p_legal_hold: true,
    })
  );
});
it('does not reserve a decision when the database role check fails', async () => {
  m.admin.mockRejectedValue(new Error('Denied'));
  await expect(submit()).rejects.toThrow('Denied');
  expect(m.rpc).not.toHaveBeenCalled();
});
it('rejects caller-supplied administrator identity', async () => {
  await expect(
    submit({ ...decision, adminId: 'different-admin' })
  ).rejects.toMatchObject({ statusCode: 400 });
  expect(m.rpc).not.toHaveBeenCalled();
});
it.each([
  ['40001', 409],
  ['P0002', 404],
  ['22023', 400],
  ['08006', 500],
])(
  'does not report success for database error %s',
  async (code, statusCode) => {
    m.rpc.mockResolvedValue({ data: null, error: { code } });
    await expect(submit()).rejects.toMatchObject({ statusCode });
  }
);
