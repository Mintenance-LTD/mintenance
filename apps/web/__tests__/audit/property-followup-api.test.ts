// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const mock = vi.hoisted(() => ({
  rpc: vi.fn(),
  authorize: vi.fn(),
  maybeSingle: vi.fn(),
  from: vi.fn(),
  activePeople: vi.fn(),
}));
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler: (_: unknown, handler: unknown) => handler,
}));
vi.mock('@/lib/services/property-team/PropertyTeamService', () => ({
  PropertyTeamService: { authorize: mock.authorize },
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    rpc: mock.rpc,
    from: (table: string) => {
      mock.from(table);
      const query = {
        select: () => query,
        eq: () => query,
        maybeSingle: mock.maybeSingle,
        single: () =>
          Promise.resolve({ data: { owner_id: 'owner' }, error: null }),
        order: () => query,
        limit: () =>
          Promise.resolve({
            data: [{ body: 'Same property note' }],
            error: null,
          }),
        in: () =>
          table === 'profiles'
            ? { is: mock.activePeople }
            : Promise.resolve({ data: [{ user_id: 'manager' }], error: null }),
      };
      return query;
    },
  },
}));
import { GET, PATCH } from '@/app/api/properties/[id]/followups/route';
const id = '00000000-0000-4000-8000-000000000001';
const payload = {
  kind: 'job',
  sourceId: id,
  revision: 3,
  assignedTo: null,
  dueAt: null,
  waitingFor: 'manager',
  note: 'Local test',
};
const call = () =>
  (PATCH as unknown as (req: NextRequest, ctx: unknown) => Promise<Response>)(
    new NextRequest('http://localhost/api/properties/home/followups', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
    { user: { id: 'actor' }, params: { id: 'home' } }
  );
beforeEach(() => {
  vi.clearAllMocks();
  mock.authorize.mockResolvedValue({ authorized: true, role: 'manager' });
  mock.maybeSingle.mockResolvedValue({ data: { id }, error: null });
  mock.rpc.mockResolvedValue({ data: { revision: 4 }, error: null });
  mock.activePeople.mockResolvedValue({ data: [{ id: 'owner' }], error: null });
});
const load = () =>
  (GET as unknown as (req: NextRequest, ctx: unknown) => Promise<Response>)(
    new NextRequest(
      `http://localhost/api/properties/home/followups?kind=job&sourceId=${id}`
    ),
    { user: { id: 'actor' }, params: { id: 'home' } }
  );
it('blocks a moved source before reading former property history or assignees', async () => {
  mock.maybeSingle
    .mockResolvedValueOnce({ data: { id }, error: null })
    .mockResolvedValueOnce({
      data: { property_id: 'former-home', revision: 3 },
      error: null,
    });
  const response = await load();
  expect(response.status).toBe(409);
  expect(mock.from).not.toHaveBeenCalledWith('property_action_updates');
  expect(mock.from).not.toHaveBeenCalledWith('profiles');
  expect(JSON.stringify(await response.json())).not.toContain('former-home');
});
it('returns same-property history and limits assignee choices to active profiles', async () => {
  mock.maybeSingle
    .mockResolvedValueOnce({ data: { id }, error: null })
    .mockResolvedValueOnce({
      data: { property_id: 'home', revision: 3 },
      error: null,
    });
  const response = await load();
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({
    followup: { revision: 3 },
    updates: [{ body: 'Same property note' }],
    people: [{ id: 'owner' }],
  });
  expect(mock.activePeople).toHaveBeenCalledWith('deleted_at', null);
  expect(response.headers.get('Cache-Control')).toBe('private, no-store');
});
it.each(['PT409', '40001'])(
  'maps %s to one terminal 409 response',
  async (code) => {
    mock.rpc.mockResolvedValue({
      data: null,
      error: { code, message: 'internal SQL detail' },
    });
    const response = await call();
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: 'Someone changed this follow-up. Reload before saving.',
    });
    expect(mock.rpc).toHaveBeenCalledTimes(1);
  }
);
it.each([
  ['42501', 403],
  ['22023', 400],
])('maps %s without exposing SQL details', async (code, statusCode) => {
  mock.rpc.mockResolvedValue({
    data: null,
    error: { code, message: 'internal SQL detail' },
  });
  await expect(call()).rejects.toMatchObject({ statusCode });
});
it('denies viewers before any RPC and retains server identity binding', async () => {
  mock.authorize.mockResolvedValueOnce({ authorized: false, role: 'viewer' });
  await expect(call()).rejects.toMatchObject({ statusCode: 403 });
  expect(mock.rpc).not.toHaveBeenCalled();
  await call();
  expect(mock.rpc).toHaveBeenCalledWith(
    'save_property_action_followup',
    expect.objectContaining({
      p_actor: 'actor',
      p_property: 'home',
      p_revision: 3,
    })
  );
});
