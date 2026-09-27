import { beforeEach, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({
  tenant: { id: 'tenant' } as object | null,
  error: null as object | null,
  filters: vi.fn(),
  selects: vi.fn(),
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    from: (table: string) => {
      const q = {
        select: (columns: string) => {
          m.selects(table, columns);
          return q;
        },
        eq: (...args: unknown[]) => {
          m.filters(table, ...args);
          return q;
        },
        not: (...args: unknown[]) => {
          m.filters(table, ...args);
          return q;
        },
        maybeSingle: async () => ({
          data:
            table === 'property_tenants'
              ? m.tenant
              : {
                  id: 'property',
                  property_name: 'Synthetic',
                  address: 'Synthetic address',
                },
          error: m.error,
        }),
      };
      return q;
    },
  },
}));
import { getInvitedProperty } from '@/lib/services/tenants/invited-property';
beforeEach(() => {
  vi.clearAllMocks();
  m.tenant = { id: 'tenant' };
  m.error = null;
});
it('requires current accepted active tenancy and selects only resident-safe fields', async () => {
  expect(await getInvitedProperty('actor', 'property')).toMatchObject({
    property_name: 'Synthetic',
  });
  expect(m.filters).toHaveBeenCalledWith(
    'property_tenants',
    'user_id',
    'actor'
  );
  expect(m.filters).toHaveBeenCalledWith('property_tenants', 'is_active', true);
  expect(m.filters).toHaveBeenCalledWith(
    'property_tenants',
    'invitation_accepted_at',
    'is',
    null
  );
  expect(m.selects).toHaveBeenCalledWith(
    'properties',
    'id, property_name, address'
  );
});
it('does not read property details for missing or revoked tenancy', async () => {
  m.tenant = null;
  expect(await getInvitedProperty('unrelated', 'property')).toBeNull();
  expect(m.selects).not.toHaveBeenCalledWith('properties', expect.anything());
});
it('fails closed on a database error', async () => {
  m.error = { code: '08006' };
  await expect(getInvitedProperty('actor', 'property')).rejects.toMatchObject({
    statusCode: 500,
  });
});
