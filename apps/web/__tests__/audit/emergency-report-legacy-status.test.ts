// @vitest-environment node
import { NextRequest } from 'next/server';
const m = vi.hoisted(() => ({
  update: vi.fn(),
  owner: 'new-owner',
  error: false,
  urgency: 'emergency',
  tokens: { owner_id: 'old-owner' } as
    | { owner_id: string }
    | Array<{ owner_id: string }>,
}));
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler: (_: unknown, handler: unknown) => handler,
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    from: (table: string) => {
      const q = {
        select: () => q,
        eq: () => q,
        update: (value: unknown) => {
          m.update(value);
          return q;
        },
        single: async () => ({
          data: {
            id: 'report',
            property_id: 'property',
            urgency: m.urgency,
            status: 'new',
            acknowledged_at: null,
            anonymous_report_tokens: m.tokens,
          },
        }),
        maybeSingle: async () =>
          table === 'properties'
            ? {
                data: { owner_id: m.owner },
                error: m.error ? { message: 'unavailable' } : null,
              }
            : { data: null },
      };
      return q;
    },
  },
}));
import { PATCH } from '@/app/api/landlord/reports/[id]/route';
const call = (actor: string, status = 'acknowledged') =>
  PATCH(
    new NextRequest('https://example.test/api/landlord/reports/report', {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
    {
      user: { id: actor, role: 'homeowner' },
      params: { id: 'report' },
    } as never
  );
beforeEach(() => {
  vi.clearAllMocks();
  m.owner = 'new-owner';
  m.error = false;
  m.urgency = 'emergency';
  m.tokens = { owner_id: 'old-owner' };
});
it.each(['acknowledged', 'resolved', 'dismissed'])(
  'prevents a former token owner from setting emergency status to %s',
  async (status) => {
    expect((await call('old-owner', status)).status).toBe(403);
    expect(m.update).not.toHaveBeenCalled();
  }
);
it('allows the current property owner to acknowledge through the existing controls', async () => {
  expect((await call('new-owner')).status).toBe(200);
  expect(m.update).toHaveBeenCalledWith(
    expect.objectContaining({
      status: 'acknowledged',
      acknowledged_at: expect.any(String),
    })
  );
});
it('fails closed if current ownership cannot be verified', async () => {
  m.error = true;
  expect((await call('new-owner')).status).toBe(503);
  expect(m.update).not.toHaveBeenCalled();
});
it.each(['object', 'array'])(
  'retains routine report access with a to-one %s join',
  async (shape) => {
    m.urgency = 'medium';
    if (shape === 'array') m.tokens = [{ owner_id: 'old-owner' }];
    expect((await call('old-owner')).status).toBe(200);
  }
);
