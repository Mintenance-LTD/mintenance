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
import { GET, POST, PATCH } from '@/app/api/properties/[id]/report-token/route';
const context = { params: Promise.resolve({ id: 'property' }) };
const request = (
  method = 'POST',
  body: unknown = { label: 'Tenant maintenance' }
) =>
  new NextRequest('http://localhost/api/properties/property/report-token', {
    method,
    ...(method !== 'GET' ? { body: JSON.stringify(body) } : {}),
  });
beforeEach(() => {
  vi.clearAllMocks();
  m.actor = 'manager';
  m.role = 'manager';
  m.membershipError = null;
  m.entitled = true;
});
it('creates for the property owner using the owner subscription and accepted membership', async () => {
  expect((await POST(request(), context)).status).toBe(201);
  expect(m.insert).toHaveBeenCalledWith(
    'anonymous_report_tokens',
    expect.objectContaining({ owner_id: 'owner', property_id: 'property' })
  );
  expect(m.tier).toHaveBeenCalledWith('owner');
  expect(m.filters).toHaveBeenCalledWith(
    'property_team_members',
    'status',
    'accepted'
  );
});
it.each(['viewer', ''])(
  'denies %s membership before reading or creating reporting links',
  async (role) => {
    m.role = role;
    await expect(GET(request('GET'), context)).rejects.toMatchObject({
      statusCode: 404,
    });
    await expect(POST(request(), context)).rejects.toMatchObject({
      statusCode: 404,
    });
    expect(m.insert).not.toHaveBeenCalled();
    expect(m.filters).not.toHaveBeenCalledWith(
      'anonymous_report_tokens',
      expect.anything(),
      expect.anything()
    );
  }
);
it('fails closed on a membership lookup error', async () => {
  m.membershipError = { code: '08006' };
  await expect(POST(request(), context)).rejects.toMatchObject({
    statusCode: 500,
  });
  expect(m.insert).not.toHaveBeenCalled();
});
it('allows revocation after downgrade but rejects reactivation', async () => {
  m.entitled = false;
  const token = '11111111-1111-4111-8111-111111111111';
  expect(
    (
      await PATCH(
        request('PATCH', { token_id: token, is_active: false }),
        context
      )
    ).status
  ).toBe(200);
  expect(m.filters).toHaveBeenCalledWith(
    'anonymous_report_tokens',
    'id',
    token
  );
  expect(m.filters).toHaveBeenCalledWith(
    'anonymous_report_tokens',
    'property_id',
    'property'
  );
  expect(m.tier).not.toHaveBeenCalled();
  m.update.mockClear();
  expect(
    (
      await PATCH(
        request('PATCH', { token_id: token, is_active: true }),
        context
      )
    ).status
  ).toBe(402);
  expect(m.update).not.toHaveBeenCalled();
});
it('validates malformed labels before mutation', async () => {
  expect(
    (await POST(request('POST', { label: { invalid: true } }), context)).status
  ).toBe(400);
  expect(m.insert).not.toHaveBeenCalled();
});
