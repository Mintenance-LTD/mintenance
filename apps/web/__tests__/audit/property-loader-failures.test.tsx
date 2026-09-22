import { beforeEach, expect, it, vi } from 'vitest';
const s = vi.hoisted(() => ({
  failed: '',
  actor: 'owner',
  memberRole: '',
  queries: vi.fn(),
}));
vi.mock('@/lib/auth', () => ({
  getCurrentUserFromCookies: async () => ({ id: s.actor }),
}));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => ({ value: 'mint-editorial' }) }),
}));
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('not-found');
  },
  redirect: () => {
    throw new Error('redirect');
  },
}));
vi.mock('@/app/properties/[id]/components/PropertyDetailsClient', () => ({
  default: () => null,
}));
vi.mock('@/app/properties/[id]/components/MintEditorialPropertyDetail', () => ({
  MintEditorialPropertyDetail: () => null,
}));
vi.mock('@/app/properties/[id]/components/SharedPropertyDetail', () => ({
  SharedPropertyDetail: () => null,
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    from: (table: string) => {
      const result = () => ({
        data:
          s.failed === table
            ? null
            : table === 'properties'
              ? {
                  id: 'property',
                  owner_id: 'owner',
                  key_safe_code: 'synthetic-entry-code',
                }
              : table === 'property_team_members'
                ? s.memberRole
                  ? { role: s.memberRole }
                  : null
                : [],
        error: s.failed === table ? { code: '08006' } : null,
      });
      const q = {
        select: () => q,
        eq: (column: string, value: string) => {
          s.queries(table, column, value);
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
import Page from '@/app/properties/[id]/page';
beforeEach(() => {
  s.failed = '';
  s.actor = 'owner';
  s.memberRole = '';
  s.queries.mockClear();
});
it.each(['properties', 'jobs', 'recurring_schedules'])(
  'does not render missing records on %s connection failure',
  async (table) => {
    s.failed = table;
    await expect(
      Page({ params: Promise.resolve({ id: 'property' }) })
    ).rejects.toThrow(/Unable to load/);
  }
);
it('keeps unknown construction year unknown and scopes property reads to its owner', async () => {
  const page = await Page({ params: Promise.resolve({ id: 'property' }) });
  expect(page.props.property.yearBuilt).toBe(0);
  expect(s.queries).toHaveBeenCalledWith('jobs', 'homeowner_id', 'owner');
  expect(s.queries).toHaveBeenCalledWith('jobs', 'property_id', 'property');
});

it.each(['viewer', 'manager', 'admin'])(
  'loads accepted %s membership without serializing owner entry secrets',
  async (role) => {
    s.actor = 'member';
    s.memberRole = role;
    const page = await Page({ params: Promise.resolve({ id: 'property' }) });
    expect(page.props.role).toBe(role);
    expect(page.props.property).toEqual({
      id: 'property',
      name: 'My Property',
      address: '',
    });
    expect(JSON.stringify(page.props)).not.toContain('synthetic-entry-code');
    expect(s.queries).toHaveBeenCalledWith(
      'property_team_members',
      'user_id',
      'member'
    );
    expect(s.queries).toHaveBeenCalledWith(
      'property_team_members',
      'status',
      'accepted'
    );
    expect(s.queries).toHaveBeenCalledWith('jobs', 'homeowner_id', 'owner');
    expect(s.queries).toHaveBeenCalledWith(
      'recurring_schedules',
      'owner_id',
      'owner'
    );
  }
);
it('denies unrelated or revoked members before loading job records', async () => {
  s.actor = 'unrelated';
  await expect(
    Page({ params: Promise.resolve({ id: 'property' }) })
  ).rejects.toThrow('not-found');
  expect(s.queries.mock.calls.some(([table]) => table === 'jobs')).toBe(false);
});
it('fails closed when shared membership cannot be checked', async () => {
  s.actor = 'member';
  s.failed = 'property_team_members';
  await expect(
    Page({ params: Promise.resolve({ id: 'property' }) })
  ).rejects.toThrow(/Unable to verify/);
  expect(s.queries.mock.calls.some(([table]) => table === 'jobs')).toBe(false);
});
