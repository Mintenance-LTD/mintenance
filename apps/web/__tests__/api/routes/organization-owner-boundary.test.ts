import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ actor: 'manager', target: 'owner', update: vi.fn(), gate: vi.fn() }));
vi.mock('@/lib/api/with-api-handler', () => ({ withApiHandler: (_: unknown, handler: Function) => handler }));
vi.mock('@/lib/auth-manager/org-roles', () => ({ requireOrgRole: mocks.gate }));
vi.mock('@/lib/api/supabaseServer', () => ({ serverSupabase: { from: () => {
  const chain: Record<string, unknown> = {};
  for (const method of ['select', 'eq']) chain[method] = () => chain;
  chain.maybeSingle = async () => ({ data: { id: 'membership', org_role: mocks.target } });
  chain.then = (resolve: Function) => resolve({ count: 2, error: null });
  chain.update = mocks.update.mockReturnValue(chain);
  return chain;
} } }));
import { PATCH } from '@/app/api/organizations/[id]/members/[userId]/role/route';
import { DELETE } from '@/app/api/organizations/[id]/members/route';
beforeEach(() => {
  vi.clearAllMocks(); mocks.actor = 'manager'; mocks.target = 'owner';
  mocks.gate.mockImplementation(async () => ({ org_role: mocks.actor }));
});
async function change(role: string) {
  return PATCH({ json: async () => ({ role }) } as never, {
    user: { id: 'actor' }, params: { id: '00000000-0000-4000-8000-000000000001', userId: '00000000-0000-4000-8000-000000000002' },
  } as never);
}
it('prevents managers from demoting an owner even when another owner exists', async () => {
  await expect(change('field')).rejects.toMatchObject({ statusCode: 403 });
  expect(mocks.update).not.toHaveBeenCalled();
});
it('still prevents managers from promoting an owner', async () => {
  mocks.target = 'field';
  await expect(change('owner')).rejects.toMatchObject({ statusCode: 403 });
  expect(mocks.update).not.toHaveBeenCalled();
});
it('preserves manager permission to update ordinary members', async () => {
  mocks.target = 'field';
  expect((await change('dispatcher')).status).toBe(200);
  expect(mocks.update).toHaveBeenCalledWith({ org_role: 'dispatcher' });
});
async function removeMember() {
  return DELETE({ nextUrl: new URL('https://example.test/api?userId=00000000-0000-4000-8000-000000000002') } as never, {
    user: { id: 'actor' }, params: { id: '00000000-0000-4000-8000-000000000001' },
  } as never);
}
it('prevents managers removing an owner even when another owner exists', async () => {
  await expect(removeMember()).rejects.toMatchObject({ statusCode: 403 });
  expect(mocks.update).not.toHaveBeenCalled();
});
it('allows an owner to remove another owner when one remains', async () => {
  mocks.actor = 'owner';
  expect((await removeMember()).status).toBe(200);
  expect(mocks.update).toHaveBeenCalledWith({ status: 'removed' });
});
it('preserves manager permission to remove ordinary members', async () => {
  mocks.target = 'field';
  expect((await removeMember()).status).toBe(200);
  expect(mocks.update).toHaveBeenCalledWith({ status: 'removed' });
});
