import { beforeEach, expect, it, vi } from 'vitest';
const s = vi.hoisted(() => ({ failed: '', queries: vi.fn() }));
vi.mock('@/lib/auth', () => ({
  getCurrentUserFromCookies: async () => ({ id: 'owner' }),
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
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    from: (table: string) => {
      const result = () => ({
        data:
          s.failed === table
            ? null
            : table === 'properties'
              ? { id: 'property', owner_id: 'owner' }
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
        order: async () => result(),
      };
      return q;
    },
  },
}));
import Page from '@/app/properties/[id]/page';
beforeEach(() => {
  s.failed = '';
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
  expect(s.queries).toHaveBeenCalledWith('properties', 'owner_id', 'owner');
  expect(s.queries).toHaveBeenCalledWith('jobs', 'property_id', 'property');
});
