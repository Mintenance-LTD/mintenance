// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const mock = vi.hoisted(() => ({
  from: vi.fn(),
  insert: vi.fn(),
  property: true,
  unit: true,
  filters: vi.fn(),
}));
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler: (_: unknown, handler: unknown) => handler,
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { from: mock.from },
}));
vi.mock('@/lib/middleware/subscription-check', () => ({
  requirePortfolioModeSubscription: async () => null,
}));
import { POST } from '@/app/api/portfolio/tickets/route';
const orgId = '00000000-0000-4000-8000-000000000001';
const propertyId = '00000000-0000-4000-8000-000000000002';
const unitId = '00000000-0000-4000-8000-000000000003';
beforeEach(() => {
  vi.clearAllMocks();
  mock.property = true;
  mock.unit = true;
  mock.from.mockImplementation((table: string) => {
    const chain = {
      select: () => chain,
      eq: (key: string, value: unknown) => {
        mock.filters(table, key, value);
        return chain;
      },
      insert: (value: unknown) => {
        mock.insert(value);
        return chain;
      },
      single: async () => ({ data: { id: 'ticket' }, error: null }),
      maybeSingle: async () => ({
        data:
          table === 'organization_memberships'
            ? { id: 'member', org_role: 'manager' }
            : (table === 'properties' ? mock.property : mock.unit)
              ? { id: 'fixture' }
              : null,
        error: null,
      }),
    };
    return chain;
  });
});
const call = () =>
  (
    POST as unknown as (
      request: NextRequest,
      context: unknown
    ) => Promise<Response>
  )(
    new NextRequest('http://localhost/api/portfolio/tickets', {
      method: 'POST',
      body: JSON.stringify({
        orgId,
        propertyId,
        unitId,
        title: 'Synthetic repair',
        description: 'Synthetic repair description',
      }),
    }),
    { user: { id: 'actor', role: 'homeowner' } }
  );
it('rejects a property outside the organization before creating a ticket', async () => {
  mock.property = false;
  await expect(call()).rejects.toThrow('Property does not belong');
  expect(mock.insert).not.toHaveBeenCalled();
});
it('rejects a unit outside the selected property before creating a ticket', async () => {
  mock.unit = false;
  await expect(call()).rejects.toThrow('Unit does not belong');
  expect(mock.insert).not.toHaveBeenCalled();
});
it('constrains both related-record lookups and derives the reporter from authentication', async () => {
  expect((await call()).status).toBe(201);
  expect(mock.filters).toHaveBeenCalledWith('properties', 'org_id', orgId);
  expect(mock.filters).toHaveBeenCalledWith('units', 'property_id', propertyId);
  expect(mock.insert).toHaveBeenCalledWith(
    expect.objectContaining({ reported_by: 'actor' })
  );
});
