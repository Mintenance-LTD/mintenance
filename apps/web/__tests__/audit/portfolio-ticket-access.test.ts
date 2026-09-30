// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mock = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
  filters: vi.fn(),
  update: vi.fn(),
  role: 'tenant' as string | null,
}));
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler: (_: unknown, handler: unknown) => handler,
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { from: mock.from, rpc: mock.rpc },
}));
vi.mock('@/lib/middleware/subscription-check', () => ({
  requirePortfolioModeSubscription: async () => null,
}));
import { GET, PATCH } from '@/app/api/portfolio/tickets/[id]/route';

const resolvedAt = '2026-09-01T10:00:00Z';
beforeEach(() => {
  vi.clearAllMocks();
  mock.role = 'tenant';
  mock.rpc.mockResolvedValue({ data: { id: 'ticket' }, error: null });
  mock.from.mockImplementation((table: string) => {
    const chain = {
      select: () => chain,
      eq: (key: string, value: unknown) => {
        mock.filters(table, key, value);
        return chain;
      },
      order: () => chain,
      update: (value: unknown) => {
        mock.update(value);
        return chain;
      },
      insert: () => chain,
      maybeSingle: async () => ({
        data:
          table === 'organization_memberships'
            ? mock.role
              ? { org_role: mock.role }
              : null
            : {
                id: 'ticket',
                org_id: 'org',
                reported_by: 'reporter',
                status: 'resolved',
                resolved_at: resolvedAt,
              },
        error: null,
      }),
      single: async () => ({ data: { id: 'ticket' }, error: null }),
      then: (resolve: (value: unknown) => unknown) =>
        Promise.resolve({ data: [], error: null }).then(resolve),
    };
    return chain;
  });
});
const call = (handler: unknown, body?: object) =>
  (handler as (request: NextRequest, context: unknown) => Promise<Response>)(
    new NextRequest(
      'http://localhost/api/portfolio/tickets/ticket',
      body ? { method: 'PATCH', body: JSON.stringify(body) } : undefined
    ),
    { user: { id: 'reporter', role: 'homeowner' }, params: { id: 'ticket' } }
  );
it.each(['tenant', null])(
  'filters internal notes for reporter with role %s',
  async (role) => {
    mock.role = role;
    await call(GET);
    expect(mock.filters).toHaveBeenCalledWith(
      'ticket_updates',
      'visibility',
      'tenant_visible'
    );
  }
);
it('keeps internal history available to managers', async () => {
  mock.role = 'manager';
  await call(GET);
  expect(mock.filters).not.toHaveBeenCalledWith(
    'ticket_updates',
    'visibility',
    'tenant_visible'
  );
});
it('delegates reopening to the atomic database transition', async () => {
  mock.role = 'manager';
  await call(PATCH, { status: 'open' });
  expect(mock.rpc).toHaveBeenCalledWith('update_portfolio_ticket', {
    p_ticket_id: 'ticket',
    p_actor_id: 'reporter',
    p_changes: { status: 'open' },
  });
});
it('delegates closing to the atomic database transition', async () => {
  mock.role = 'manager';
  await call(PATCH, { status: 'closed' });
  expect(mock.rpc).toHaveBeenCalledWith('update_portfolio_ticket', {
    p_ticket_id: 'ticket',
    p_actor_id: 'reporter',
    p_changes: { status: 'closed' },
  });
});
it('rejects reporter status changes before writing', async () => {
  await expect(call(PATCH, { status: 'closed' })).rejects.toThrow(
    'Only organization managers'
  );
  expect(mock.update).not.toHaveBeenCalled();
});
