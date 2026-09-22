import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const m = vi.hoisted(() => ({
  actor: 'manager',
  role: 'manager',
  membershipError: null as unknown,
  insert: vi.fn(),
  tier: vi.fn(),
  filters: vi.fn(),
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
  hasFeatureAccess: () => true,
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
        single: async () => result(),
        maybeSingle: async () => result(),
        order: async () => result(),
      };
      return q;
    },
  },
}));
import {
  GET,
  POST,
} from '@/app/api/properties/[id]/recurring-maintenance/route';
import { GET as certificateGET } from '@/app/api/properties/[id]/compliance/route';
const context = { params: Promise.resolve({ id: 'property' }) };
const request = () =>
  new NextRequest(
    'http://localhost/api/properties/property/recurring-maintenance',
    {
      method: 'POST',
      body: JSON.stringify({
        title: 'Boiler inspection',
        frequency: 'annual',
        next_due_date: '2026-12-15',
      }),
    }
  );
beforeEach(() => {
  vi.clearAllMocks();
  m.actor = 'manager';
  m.role = 'manager';
  m.membershipError = null;
});
it('lets a current manager create for the owner and checks the owner subscription', async () => {
  expect((await POST(request(), context)).status).toBe(201);
  expect(m.insert).toHaveBeenCalledWith(
    'recurring_schedules',
    expect.objectContaining({ owner_id: 'owner', property_id: 'property' })
  );
  expect(m.tier).toHaveBeenCalledWith('owner');
  expect(m.filters).toHaveBeenCalledWith(
    'property_team_members',
    'status',
    'accepted'
  );
  expect(m.filters).toHaveBeenCalledWith(
    'property_team_members',
    'user_id',
    'manager'
  );
});
it('lets a viewer read both surfaces but denies schedule creation', async () => {
  m.role = 'viewer';
  expect((await GET(request(), context)).status).toBe(200);
  expect((await certificateGET(request(), context)).status).toBe(200);
  await expect(POST(request(), context)).rejects.toMatchObject({
    statusCode: 404,
  });
  expect(m.insert).not.toHaveBeenCalled();
});
it('denies unrelated or revoked membership before reading management records', async () => {
  m.role = '';
  await expect(GET(request(), context)).rejects.toMatchObject({
    statusCode: 404,
  });
  await expect(POST(request(), context)).rejects.toMatchObject({
    statusCode: 404,
  });
  expect(m.insert).not.toHaveBeenCalled();
});
it('surfaces a membership lookup failure without writing', async () => {
  m.membershipError = { code: '08006' };
  await expect(POST(request(), context)).rejects.toMatchObject({
    statusCode: 500,
  });
  expect(m.insert).not.toHaveBeenCalled();
});
