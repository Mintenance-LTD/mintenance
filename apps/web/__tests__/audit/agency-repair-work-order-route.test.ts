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

import { GET, PUT } from '@/app/api/portfolio/tickets/[id]/work-order/route';

const ticket = '8afc4ecb-00c1-4b60-a3ef-128a8d4ea111';
const actor = 'f0d3354c-efc5-4a12-a823-5ce887e7c222';
const draft = {
  revision: 0,
  arrangement: 'agency_contractor',
  contractorName: ' TEST ONLY Plumber ',
  quotedPence: 24000,
  approvedPence: null,
  approvalReference: null,
  invoicedPence: null,
  invoiceReference: null,
  paidPence: null,
  paymentReference: null,
  completionNote: null,
};
const call = (handler: unknown, body?: object, id = ticket) =>
  (handler as (request: NextRequest, context: unknown) => Promise<Response>)(
    new NextRequest(
      'https://local.invalid/api/portfolio/tickets/' + id + '/work-order',
      body ? { method: 'PUT', body: JSON.stringify(body) } : undefined
    ),
    { user: { id: actor, role: 'homeowner' }, params: { id } }
  );

beforeEach(() => {
  vi.resetAllMocks();
  mock.subscription.mockResolvedValue(null);
  mock.rpc.mockResolvedValue({ data: null, error: null });
});

describe('private agency work order route', () => {
  it('reads by verified session, with private no-store caching', async () => {
    const response = await call(GET);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(await response.json()).toEqual({ workOrder: null });
    expect(mock.rpc).toHaveBeenCalledWith('agency_repair_work_order', {
      p_ticket_id: ticket,
      p_actor_id: actor,
      p_changes: null,
    });
  });
  it('saves a trimmed private quote without inferring approval or payment', async () => {
    const saved = {
      ...draft,
      contractorName: 'TEST ONLY Plumber',
      revision: 1,
    };
    mock.rpc.mockResolvedValue({ data: saved, error: null });
    const response = await call(PUT, draft);
    expect(await response.json()).toEqual({ workOrder: saved });
    expect(mock.rpc).toHaveBeenCalledWith('agency_repair_work_order', {
      p_ticket_id: ticket,
      p_actor_id: actor,
      p_changes: { ...saved, revision: 0 },
    });
  });
  it('returns the subscription gate without reading the ticket', async () => {
    mock.subscription.mockResolvedValue(Response.json({}, { status: 402 }));
    expect((await call(GET)).status).toBe(402);
    expect(mock.rpc).not.toHaveBeenCalled();
  });
  it.each([
    { actorId: 'client-supplied' },
    { arrivalUrl: 'https://test.invalid' },
    { arrangement: 'marketplace' },
    { quotedPence: 1.25 },
    { approvedPence: 24000 },
    { approvedPence: 24001, approvalReference: 'TEST' },
    { invoicedPence: 24000 },
    { paidPence: 24000, paymentReference: 'TEST' },
    {
      invoicedPence: 24000,
      invoiceReference: 'TEST',
      paidPence: 24001,
      paymentReference: 'TEST',
    },
  ])('rejects invalid details before database access: %j', async (changes) => {
    await expect(call(PUT, { ...draft, ...changes })).rejects.toMatchObject({
      statusCode: 400,
    });
    expect(mock.rpc).not.toHaveBeenCalled();
  });
  it('gives a generic not found for malformed or out-of-scope ticket', async () => {
    await expect(call(GET, undefined, 'invalid')).rejects.toMatchObject({
      statusCode: 404,
    });
    expect(mock.rpc).not.toHaveBeenCalled();
    mock.rpc.mockResolvedValue({ error: { code: 'P0002' } });
    await expect(call(GET)).rejects.toMatchObject({
      message: 'Ticket not found',
      statusCode: 404,
    });
  });
  it('returns a reload conflict if a newer revision is already saved', async () => {
    mock.rpc.mockResolvedValue({ error: { code: '40001' } });
    await expect(call(PUT, draft)).rejects.toMatchObject({ statusCode: 409 });
  });
});
