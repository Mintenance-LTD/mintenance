// @vitest-environment node
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mock = vi.hoisted(() => ({ rpc: vi.fn(), subscription: vi.fn() }));
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler: (_: unknown, handler: unknown) => handler,
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { rpc: mock.rpc },
}));
vi.mock('@/lib/middleware/subscription-check', () => ({
  requirePortfolioModeSubscription: mock.subscription,
}));

import { GET, POST } from '@/app/api/organizations/[id]/agency-landlords/route';
import { PUT } from '@/app/api/organizations/[id]/agency-landlords/[landlordId]/route';

const orgId = '018dcfde-06f2-7e19-b4dc-e5586313112a';
const actorId = '7a1e9989-6261-4b58-9ccc-926b5881174d';
const landlordId = 'f59c3556-b8ed-4d3f-b21f-1ad6aeadb002';
const propertyId = 'c866bed6-6e8a-426a-a83c-c63ba8499444';
const call = (handler: unknown, body?: object, id = orgId) =>
  (handler as (request: NextRequest, context: unknown) => Promise<Response>)(
    new NextRequest(
      'https://local.invalid/api/organizations/' + id + '/agency-landlords',
      body
        ? {
            method: handler === PUT ? 'PUT' : 'POST',
            body: JSON.stringify(body),
          }
        : undefined
    ),
    { user: { id: actorId, role: 'homeowner' }, params: { id, landlordId } }
  );

beforeEach(() => {
  vi.resetAllMocks();
  mock.subscription.mockResolvedValue(null);
  mock.rpc.mockResolvedValue({
    data: { landlords: [], staff: [], properties: [], canEdit: true },
    error: null,
  });
});

describe('agency landlord directory API', () => {
  it('lists the workspace directory with verified actor and no cache', async () => {
    const response = await call(GET);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(await response.json()).toEqual({
      landlords: [],
      staff: [],
      properties: [],
      canEdit: true,
    });
    expect(mock.rpc).toHaveBeenCalledWith('agency_landlord_directory', {
      p_org_id: orgId,
      p_actor_id: actorId,
      p_landlord_id: null,
      p_changes: null,
    });
  });
  it('creates a contact record without creating an account', async () => {
    const response = await call(POST, { displayName: ' TEST ONLY Landlord ' });
    expect(response.status).toBe(201);
    expect(mock.rpc).toHaveBeenCalledWith('agency_landlord_directory', {
      p_org_id: orgId,
      p_actor_id: actorId,
      p_landlord_id: null,
      p_changes: {
        displayName: 'TEST ONLY Landlord',
        approvalLimitPence: null,
        primaryManagerId: null,
        backupManagerId: null,
        propertyIds: [],
      },
    });
  });
  it('requires an exact revision and desired property set on update', async () => {
    const response = await call(PUT, {
      displayName: 'TEST ONLY Landlord',
      approvalLimitPence: 0,
      propertyIds: [propertyId],
      revision: 2,
    });
    expect(response.status).toBe(200);
    expect(mock.rpc).toHaveBeenCalledWith('agency_landlord_directory', {
      p_org_id: orgId,
      p_actor_id: actorId,
      p_landlord_id: landlordId,
      p_changes: {
        displayName: 'TEST ONLY Landlord',
        approvalLimitPence: 0,
        primaryManagerId: null,
        backupManagerId: null,
        propertyIds: [propertyId],
        revision: 2,
      },
    });
  });
  it.each([
    { actorId },
    { sendInvitation: true },
    { approvalLimitPence: 2.5 },
    { primaryManagerId: actorId, backupManagerId: actorId.toUpperCase() },
    { propertyIds: [propertyId, propertyId.toUpperCase()] },
  ])(
    'rejects invalid or unapproved fields before touching the DB: %j',
    async (changes) => {
      await expect(
        call(POST, { displayName: 'TEST ONLY Landlord', ...changes })
      ).rejects.toMatchObject({ statusCode: 400 });
      expect(mock.rpc).not.toHaveBeenCalled();
    }
  );
  it('gates the directory on portfolio entitlement', async () => {
    mock.subscription.mockResolvedValue(Response.json({}, { status: 402 }));
    expect((await call(GET)).status).toBe(402);
    expect(mock.rpc).not.toHaveBeenCalled();
  });
  it.each([
    ['P0002', 404],
    ['42501', 403],
    ['40001', 409],
    ['23505', 409],
    ['22023', 400],
  ])('maps %s without returning database details', async (code, statusCode) => {
    mock.rpc.mockResolvedValue({
      error: { code, message: 'Database diagnostic' },
    });
    await expect(
      call(PUT, {
        displayName: 'TEST ONLY Landlord',
        propertyIds: [],
        revision: 1,
      })
    ).rejects.toMatchObject({ statusCode });
  });
});
