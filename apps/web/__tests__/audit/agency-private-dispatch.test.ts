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

import { GET as inbox } from '@/app/api/agency-work/route';
import {
  GET,
  POST,
} from '@/app/api/portfolio/tickets/[id]/private-dispatch/route';
import {
  GET as identity,
  PUT,
} from '@/app/api/organizations/[id]/agency-landlords/[landlordId]/identity/route';

const id = '018dcfde-06f2-7e19-b4dc-e5586313112a';
const actor = '7a1e9989-6261-4b58-9ccc-926b5881174d';
const landlordId = 'f59c3556-b8ed-4d3f-b21f-1ad6aeadb002';
const call = (handler: unknown, body?: object) =>
  (handler as (request: NextRequest, context: unknown) => Promise<Response>)(
    new NextRequest(
      'https://local.invalid/api/agency-work',
      body
        ? {
            method: handler === PUT ? 'PUT' : 'POST',
            body: JSON.stringify(body),
          }
        : undefined
    ),
    { user: { id: actor, role: 'homeowner' }, params: { id, landlordId } }
  );

beforeEach(() => {
  vi.resetAllMocks();
  mock.subscription.mockResolvedValue(null);
  mock.rpc.mockResolvedValue({ data: { viewer: 'staff' }, error: null });
});

describe('agency private repair endpoints', () => {
  it('reads exact ticket via actor verified by route wrapper', async () => {
    const response = await call(GET);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(await response.json()).toEqual({ dispatch: { viewer: 'staff' } });
    expect(mock.rpc).toHaveBeenCalledWith('agency_private_dispatch', {
      p_ticket_id: id,
      p_actor_id: actor,
      p_command: null,
    });
  });

  it('lists only actor records without a Portfolio subscription', async () => {
    mock.rpc.mockResolvedValue({ data: [], error: null });
    expect(await (await call(inbox)).json()).toEqual({ items: [] });
    expect(mock.rpc).toHaveBeenCalledWith('agency_private_work_inbox', {
      p_actor_id: actor,
    });
    expect(mock.subscription).not.toHaveBeenCalled();
  });

  it('normalizes exact email only in a gated dispatch mutation', async () => {
    await call(POST, {
      action: 'dispatch',
      revision: 2,
      quoteVersion: 1,
      contractorEmail: ' A@Test.invalid ',
    });
    expect(mock.subscription).toHaveBeenCalledOnce();
    expect(mock.rpc).toHaveBeenCalledWith('agency_private_dispatch', {
      p_ticket_id: id,
      p_actor_id: actor,
      p_command: {
        action: 'dispatch',
        revision: 2,
        quoteVersion: 1,
        contractorEmail: 'a@test.invalid',
      },
    });
  });

  it.each(['approve', 'reject', 'accept', 'revoke'])(
    'lets DB decide %s without requiring a staff subscription',
    async (action) => {
      await call(POST, { action, revision: 1, quoteVersion: 1 });
      expect(mock.subscription).not.toHaveBeenCalled();
      expect(mock.rpc).toHaveBeenCalledOnce();
    }
  );

  it('still gates a new landlord link but not status or revocation', async () => {
    mock.subscription.mockResolvedValue(Response.json({}, { status: 402 }));
    expect(
      (await call(PUT, { landlordEmail: 'landlord@test.invalid' })).status
    ).toBe(402);
    expect(mock.rpc).not.toHaveBeenCalled();
    await call(identity);
    expect(mock.rpc).toHaveBeenCalledWith('get_agency_landlord_identity', {
      p_org_id: id,
      p_landlord_id: landlordId,
      p_actor_id: actor,
    });
    await call(PUT, { landlordEmail: null });
    expect(mock.rpc).toHaveBeenCalledWith('set_agency_landlord_identity', {
      p_org_id: id,
      p_landlord_id: landlordId,
      p_actor_id: actor,
      p_email: null,
    });
    expect(mock.subscription).toHaveBeenCalledOnce();
  });

  it.each([
    { action: 'approve', revision: 1 },
    {
      action: 'dispatch',
      revision: 1,
      quoteVersion: 0,
      contractorEmail: 'contractor@test.invalid',
    },
    { action: 'quote', revision: 0, quotePence: 1.5, quoteScope: 'Check tap' },
    { action: 'approve', revision: 1, quoteVersion: 1, approvedPence: 24000 },
    {
      action: 'approve',
      revision: 1,
      quoteVersion: 1,
      actorId: 'client subscriber',
    },
  ])(
    'rejects malformed commands without touching the DB: %j',
    async (command) => {
      await expect(call(POST, command)).rejects.toMatchObject({
        statusCode: 400,
      });
      expect(mock.rpc).not.toHaveBeenCalled();
    }
  );

  it.each([
    ['P0002', 404],
    ['42501', 403],
    ['40001', 409],
    ['55000', 409],
    ['22023', 400],
  ])(
    'maps outcome %s without exposing DB details',
    async (code, statusCode) => {
      mock.rpc.mockResolvedValue({
        data: null,
        error: { code, message: 'Internal diagnostic' },
      });
      await expect(
        call(POST, { action: 'approve', revision: 1, quoteVersion: 1 })
      ).rejects.toMatchObject({ statusCode });
    }
  );
});
