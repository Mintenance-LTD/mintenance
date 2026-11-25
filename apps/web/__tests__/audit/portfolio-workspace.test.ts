// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mock = vi.hoisted(() => ({
  rpc: vi.fn(),
  features: vi.fn(),
  membership: vi.fn(),
  filters: vi.fn(),
  from: vi.fn(),
  blocked: vi.fn(),
}));
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler: (_: unknown, handler: unknown) => handler,
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { rpc: mock.rpc, from: mock.from },
}));
vi.mock('@/lib/middleware/subscription-check', () => ({
  requirePortfolioModeSubscription: mock.blocked,
}));
vi.mock('@/lib/feature-access-config', () => ({
  hasFeatureAccess: mock.features,
}));
vi.mock('@/lib/subscription/early-access', () => ({
  getEffectiveHomeownerTier: async () => 'agency',
}));
vi.mock('@/lib/auth-manager/org-roles', () => ({
  getOrgMembership: mock.membership,
}));

import { GET as properties } from '@/app/api/portfolio/properties/route';
import {
  GET as list,
  POST as setup,
} from '@/app/api/portfolio/workspace/route';

const propertyId = '00000000-0000-4000-8000-000000000001';
const orgId = '00000000-0000-4000-8000-000000000002';
const user = { id: 'actor', role: 'homeowner' };
const ctx = { user } as never;

beforeEach(() => {
  vi.resetAllMocks();
  mock.blocked.mockResolvedValue(null);
  mock.features.mockReturnValue(true);
  mock.rpc.mockResolvedValue({ data: orgId, error: null });
  mock.from.mockImplementation((table: string) => {
    const chain = {
      select: () => chain,
      eq: (key: string, value: unknown) => {
        mock.filters(table, key, value);
        return chain;
      },
      is: (key: string, value: unknown) => {
        mock.filters(table, key, value);
        return chain;
      },
      in: (key: string, value: unknown) => {
        mock.filters(table, key, value);
        return chain;
      },
      order: () => chain,
      range: () => chain,
      then: (resolve: (value: unknown) => unknown) =>
        resolve(
          table === 'organization_memberships'
            ? { data: [], error: null }
            : { data: [{ id: propertyId }], error: null, count: 1 }
        ),
    };
    return chain;
  });
});

it('does not turn property sharing into organisation membership on visit', async () => {
  const result = await list(
    new NextRequest('http://localhost/api/portfolio/workspace'),
    ctx
  );
  expect(await result.json()).toMatchObject({
    workspaces: [],
    canSetUp: true,
    unlinkedProperties: [{ id: propertyId }],
  });
  expect(mock.filters).toHaveBeenCalledWith('properties', 'owner_id', 'actor');
  expect(mock.filters).toHaveBeenCalledWith('properties', 'org_id', null);
  expect(mock.rpc).not.toHaveBeenCalled();
});

function setUp(workspace: object) {
  return setup(
    new NextRequest('http://localhost/api/portfolio/workspace', {
      method: 'POST',
      body: JSON.stringify({ propertyId, workspace, actorId: 'ignored' }),
    }),
    ctx
  );
}

it('uses the signed-in actor and the explicitly selected property', async () => {
  const result = await setUp({ action: 'create', name: ' Test workspace ' });
  expect(await result.json()).toEqual({ orgId });
  expect(mock.rpc).toHaveBeenCalledWith('setup_portfolio_workspace', {
    p_actor_id: 'actor',
    p_property_id: propertyId,
    p_org_id: null,
    p_name: 'Test workspace',
  });
});

it('requires Agency setup entitlement and fails closed when the database refuses ownership', async () => {
  mock.features.mockReturnValue(false);
  await expect(setUp({ action: 'link', orgId })).rejects.toThrow('Agency plan');
  expect(mock.rpc).not.toHaveBeenCalled();
  mock.features.mockReturnValue(true);
  mock.rpc.mockResolvedValue({ error: { code: '42501' } });
  await expect(setUp({ action: 'link', orgId })).rejects.toThrow('own both');
});

it('loads explicitly selected workspace properties for an active coordinator', async () => {
  mock.membership.mockResolvedValue({ org_role: 'maintenance_coordinator' });
  const response = await properties(
    new NextRequest(`http://localhost/api/portfolio/properties?orgId=${orgId}`),
    ctx
  );
  expect((await response.json()).properties).toHaveLength(1);
  expect(mock.membership).toHaveBeenCalledWith(orgId, 'actor');
  expect(mock.filters).toHaveBeenCalledWith('properties', 'org_id', orgId);
  expect(mock.filters).not.toHaveBeenCalledWith(
    'properties',
    'owner_id',
    'actor'
  );
});

it.each([null, { org_role: 'tenant' }])(
  'does not list workspace properties without an active staff role',
  async (membership) => {
    mock.membership.mockResolvedValue(membership);
    await expect(
      properties(
        new NextRequest(
          `http://localhost/api/portfolio/properties?orgId=${orgId}`
        ),
        ctx
      )
    ).rejects.toThrow('active staff');
    expect(mock.from).not.toHaveBeenCalled();
  }
);
