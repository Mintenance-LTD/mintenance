// @vitest-environment node
import { NextRequest } from 'next/server';
const state = vi.hoisted(() => ({
  rpc: vi.fn(),
  notify: vi.fn(),
  insert: vi.fn(),
  insertError: false,
}));
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler: (_config: unknown, handler: unknown) => handler,
}));
vi.mock('@/lib/services/notifications/NotificationService', () => ({
  NotificationService: { createNotification: state.notify },
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    rpc: state.rpc,
    from: (table: string) => {
      const query = {
        select: () => query,
        eq: () => query,
        insert: (value: unknown) => {
          state.insert(value);
          return query;
        },
        update: () => query,
        single: async () =>
          table === 'anonymous_report_tokens'
            ? {
                data: {
                  id: 'token',
                  property_id: 'property',
                  owner_id: 'owner',
                  is_active: true,
                  total_reports: 0,
                },
              }
            : state.insertError
              ? { data: null, error: { message: 'outbox transaction failed' } }
              : {
                  data: { id: 'report', created_at: '2026-11-23T23:00:00Z' },
                  error: null,
                },
      };
      return query;
    },
  },
}));
import { POST } from '@/app/api/report/[token]/route';
import { GET, PATCH } from '@/app/api/landlord/emergency-reports/route';
const reportId = '00000000-0000-4000-8000-000000000001';
const context = {
  user: { id: 'verified-user', role: 'homeowner' },
  params: { token: 'test' },
} as never;
const submit = (urgency: string) =>
  POST(
    new NextRequest('https://example.test/api/report/test', {
      method: 'POST',
      body: JSON.stringify({
        reporter_name: 'Synthetic tenant',
        description: 'Synthetic leaking pipe',
        urgency,
      }),
    }),
    context
  );
const acknowledge = (body: object) =>
  PATCH(
    new NextRequest('https://example.test/api/landlord/emergency-reports', {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
    context
  );
beforeEach(() => {
  vi.clearAllMocks();
  state.insertError = false;
  state.notify.mockResolvedValue(null);
  state.rpc.mockResolvedValue({
    data: { report_id: reportId, acknowledged_at: '2026-11-23T23:00:00Z' },
    error: null,
  });
});
it.each(['emergency', 'urgent'])(
  'saves %s through the atomic insert and returns pending acknowledgment, not delivery assurance',
  async (urgency) => {
    const response = await submit(urgency);
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({
      acknowledgment: 'pending',
      message: expect.stringContaining('awaiting human acknowledgment'),
    });
    expect(state.insert).toHaveBeenCalledWith(
      expect.objectContaining({ urgency: 'emergency', status: 'new' })
    );
    expect(state.notify).not.toHaveBeenCalled();
  }
);
it('never reports success when the emergency outbox transaction fails', async () => {
  state.insertError = true;
  const response = await submit('emergency');
  expect(response.status).toBe(500);
  expect(await response.json()).not.toHaveProperty('conversation_url');
});
it('retains ordinary tenant notification preferences and does not claim delivery on failure', async () => {
  state.notify.mockRejectedValueOnce(new Error('notification unavailable'));
  const response = await submit('medium');
  expect(response.status).toBe(201);
  expect(state.notify).toHaveBeenCalledWith(
    expect.objectContaining({ type: 'tenant_report' })
  );
  expect((await response.json()).message).not.toContain('will be notified');
});
it('binds acknowledgment to the authenticated user', async () => {
  expect((await acknowledge({ report_id: reportId })).status).toBe(200);
  expect(state.rpc).toHaveBeenCalledWith('acknowledge_emergency_report', {
    p_actor: 'verified-user',
    p_report: reportId,
  });
});
it('rejects forged actor fields before accessing the database', async () => {
  expect(
    (await acknowledge({ report_id: reportId, p_actor: 'other' })).status
  ).toBe(400);
  expect(state.rpc).not.toHaveBeenCalled();
});
it.each([
  ['42501', 403],
  ['PT409', 409],
  ['08006', 503],
])('surfaces %s without acknowledging', async (code, status) => {
  state.rpc.mockResolvedValue({ data: null, error: { code } });
  const response = await acknowledge({ report_id: reportId });
  expect(response.status).toBe(status);
  expect(await response.json()).not.toHaveProperty('incident');
});
it('does not represent an unavailable inbox as empty', async () => {
  state.rpc.mockResolvedValue({
    data: null,
    error: { message: 'unavailable' },
  });
  expect(
    (
      await GET(
        new NextRequest('https://example.test/api/landlord/emergency-reports'),
        context
      )
    ).status
  ).toBe(503);
});
