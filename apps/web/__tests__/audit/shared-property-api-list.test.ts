import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const m = vi.hoisted(() => ({
  memberError: null as unknown,
  filters: vi.fn(),
  select: vi.fn(),
}));
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler: (_: unknown, handler: Function) => (request: NextRequest) =>
    handler(request, { user: { id: 'member', role: 'homeowner' }, params: {} }),
}));
vi.mock('@/lib/rate-limiter', () => ({
  rateLimiter: { checkRateLimit: async () => ({ allowed: true }) },
}));
vi.mock('@/lib/api/job-storage', () => ({
  resignJobStorageUrls: async () => [],
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  createRequestScopedClient: () => null,
  serverSupabase: {
    from: (table: string) => {
      const q = {
        select: (columns: string) => {
          m.select(table, columns);
          return q;
        },
        eq: (key: string, value: string) => {
          m.filters(table, key, value);
          return q;
        },
        order: () => q,
        in: () => q,
        then: (resolve: Function) =>
          resolve(
            table === 'properties'
              ? { data: [], error: null }
              : {
                  data: [
                    {
                      role: 'viewer',
                      property_id: 'shared',
                      properties: {
                        id: 'shared',
                        property_name: 'Synthetic share',
                      },
                    },
                  ],
                  error: m.memberError,
                }
          ),
      };
      return q;
    },
  },
}));
import { GET } from '@/app/api/properties/route';
beforeEach(() => {
  m.memberError = null;
  vi.clearAllMocks();
});
const request = () =>
  new NextRequest('http://localhost/api/properties?includeShared=view');
it('returns a currently accepted share to its member without selecting entry secrets', async () => {
  const response = await GET(request(), { params: Promise.resolve({}) });
  expect(response.status).toBe(200);
  expect((await response.json()).properties).toEqual([
    expect.objectContaining({ id: 'shared', _role: 'viewer' }),
  ]);
  expect(m.filters).toHaveBeenCalledWith(
    'property_team_members',
    'user_id',
    'member'
  );
  expect(m.filters).toHaveBeenCalledWith(
    'property_team_members',
    'status',
    'accepted'
  );
  expect(
    m.select.mock.calls.every(
      ([, columns]) =>
        !columns.includes('*') && !columns.includes('key_safe_code')
    )
  ).toBe(true);
});
it('does not return a misleading partial success when shared access cannot be loaded', async () => {
  m.memberError = { code: '08006', message: 'synthetic failure' };
  await expect(
    GET(request(), { params: Promise.resolve({}) })
  ).rejects.toMatchObject({ statusCode: 500 });
});
