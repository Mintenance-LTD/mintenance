import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const m = vi.hoisted(() => ({
  actor: 'manager',
  role: 'manager',
  membershipError: null as unknown,
  insert: vi.fn(),
  tier: vi.fn(),
  filters: vi.fn(),
  update: vi.fn(),
  entitled: true,
  rpc: vi.fn(),
}));
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler: (_: unknown, fn: Function) => (req: NextRequest) =>
    fn(req, {
      user: { id: m.actor, role: 'homeowner' },
      params: { id: 'property' },
    }),
}));
vi.mock('@/lib/admin-verification', () => ({
  requireAdminFromDatabase: vi.fn(),
}));
vi.mock('@/lib/subscription/early-access', () => ({
  getEffectiveHomeownerTier: (id: string) => {
    m.tier(id);
    return Promise.resolve('landlord');
  },
}));
vi.mock('@/lib/feature-access-config', () => ({
  hasFeatureAccess: () => m.entitled,
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    rpc: (...args: unknown[]) => m.rpc(...args),
    from: (table: string) => {
      const filters: Record<string, unknown> = {};
      let inserted: unknown;
      const result = () => ({
        data:
          table === 'properties'
            ? { id: 'property', owner_id: 'owner' }
            : table === 'property_team_members'
              ? m.role
                ? { role: m.role }
                : null
              : inserted
                ? { id: 'schedule', ...(inserted as object) }
                : [],
        error: table === 'property_team_members' ? m.membershipError : null,
      });
      const q = {
        select: () => q,
        eq: (key: string, value: unknown) => {
          filters[key] = value;
          m.filters(table, key, value);
          return q;
        },
        insert: (value: unknown) => {
          inserted = value;
          m.insert(table, value);
          return q;
        },
        update: (value: unknown) => {
          inserted = value;
          m.update(table, value);
          return q;
        },
        single: async () => result(),
        maybeSingle: async () => result(),
        order: async () => result(),
      };
      return q;
    },
  },
}));
import { GET, POST, DELETE } from '@/app/api/properties/[id]/team/route';
const context = { params: Promise.resolve({ id: 'property' }) };
const member = '11111111-1111-4111-8111-111111111111';
const request = (
  method = 'POST',
  body: unknown = { email: ' Admin@Example.invalid ', role: 'manager' }
) =>
  new NextRequest(
    `http://localhost/api/properties/property/team?memberId=${member}`,
    { method, ...(method === 'POST' ? { body: JSON.stringify(body) } : {}) }
  );
beforeEach(() => {
  vi.clearAllMocks();
  m.actor = 'team-admin';
  m.role = 'admin';
  m.membershipError = null;
  m.entitled = true;
  m.rpc.mockResolvedValue({ data: { id: member }, error: null });
});
it('lets an accepted team administrator invite under the owner plan and passes the actor to atomic reauthorization', async () => {
  expect((await POST(request(), context)).status).toBe(201);
  expect(m.tier).toHaveBeenCalledWith('owner');
  expect(m.rpc).toHaveBeenCalledWith('manage_property_team', {
    p_property_id: 'property',
    p_actor_id: 'team-admin',
    p_action: 'invite',
    p_email: 'admin@example.invalid',
    p_role: 'manager',
  });
});
it.each(['manager', 'viewer', ''])(
  'denies %s access to team records and mutations',
  async (role) => {
    m.role = role;
    await expect(GET(request('GET'), context)).rejects.toMatchObject({
      statusCode: 404,
    });
    await expect(POST(request(), context)).rejects.toMatchObject({
      statusCode: 404,
    });
    await expect(DELETE(request('DELETE'), context)).rejects.toMatchObject({
      statusCode: 404,
    });
    expect(m.rpc).not.toHaveBeenCalled();
  }
);
it.each([
  ['23505', 409],
  ['23514', 422],
  ['42501', 403],
  ['P0002', 404],
  ['08006', 500],
])(
  'surfaces atomic database failure %s without success',
  async (code, status) => {
    m.rpc.mockResolvedValue({ data: null, error: { code } });
    expect((await POST(request(), context)).status).toBe(status);
  }
);
it('does not treat an empty removal result as success', async () => {
  m.rpc.mockResolvedValue({ data: null, error: null });
  expect((await DELETE(request('DELETE'), context)).status).toBe(500);
  m.rpc.mockResolvedValue({ data: { id: member, removed: true }, error: null });
  expect((await DELETE(request('DELETE'), context)).status).toBe(200);
});
it('validates email before writing', async () => {
  expect(
    (await POST(request('POST', { email: 'invalid', role: 'admin' }), context))
      .status
  ).toBe(400);
  expect(m.rpc).not.toHaveBeenCalled();
});
