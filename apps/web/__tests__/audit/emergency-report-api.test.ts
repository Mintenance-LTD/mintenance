// @vitest-environment node
import { NextRequest } from 'next/server';
const state = vi.hoisted(() => ({
  rpc: vi.fn(),
  notify: vi.fn(),
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
  },
}));
import { POST } from '@/app/api/report/[token]/route';
import { GET, PATCH } from '@/app/api/landlord/emergency-reports/route';
const reportId = '00000000-0000-4000-8000-000000000001';
const context = {
  user: { id: 'verified-user', role: 'homeowner' },
  params: { token: 'test' },
} as never;
const submit = (urgency: string, key?: string, recover = false) =>
  POST(
    new NextRequest('https://example.test/api/report/test', {
      method: 'POST',
      headers: key ? { 'x-report-submission-key': key } : undefined,
      body: JSON.stringify(
        recover
          ? { recover: true }
          : {
              reporter_name: 'Synthetic tenant',
              description: 'Synthetic leaking pipe',
              urgency,
            }
      ),
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
  state.notify.mockResolvedValue(null);
  state.rpc.mockImplementation(async (rpc, args) => ({
    data:
      rpc === 'submit_tenant_report_once'
        ? {
            id: reportId,
            created: true,
            owner_id: 'owner',
            status: 'new',
            urgency: args.p_report?.urgency,
          }
        : { report_id: reportId, acknowledged_at: '2026-11-23T23:00:00Z' },
    error: null,
  }));
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
    expect(state.rpc).toHaveBeenCalledWith(
      'submit_tenant_report_once',
      expect.objectContaining({
        p_report: expect.objectContaining({ urgency: 'emergency' }),
      })
    );
    expect(state.notify).not.toHaveBeenCalled();
  }
);
it('never reports success when the emergency outbox transaction fails', async () => {
  state.rpc.mockResolvedValueOnce({ data: null, error: { code: '23514' } });
  const response = await submit('emergency');
  expect(response.status).toBe(500);
  expect(await response.json()).not.toHaveProperty('conversation_url');
});
it('recovers the same receipt from a private submission key without notifying again', async () => {
  const key = '1'.repeat(64);
  const original = await submit('medium', key);
  state.rpc.mockResolvedValueOnce({
    data: { id: reportId, status: 'new', urgency: 'medium', created: false },
    error: null,
  });
  const recovered = await submit('medium', key, true);
  expect(recovered.status).toBe(200);
  expect(recovered.headers.get('cache-control')).toBe('no-store');
  expect((await recovered.json()).conversation_url).toBe(
    (await original.json()).conversation_url
  );
  const [first, second] = state.rpc.mock.calls.map(([, args]) => args);
  expect(second).toMatchObject({
    p_key_hash: first.p_key_hash,
    p_receipt_hash: first.p_receipt_hash,
    p_report: null,
    p_payload_hash: null,
  });
  expect(first.p_key_hash).not.toBe(key);
  expect(state.notify).toHaveBeenCalledOnce();
  expect(state.notify.mock.calls[0][0].metadata).not.toHaveProperty(
    'conversation_url'
  );
});
it.each([undefined, 'guessable'])(
  'rejects recovery without a valid private key (%s)',
  async (key) => {
    expect((await submit('medium', key, true)).status).toBe(400);
    expect(state.rpc).not.toHaveBeenCalled();
  }
);
it.each([
  ['PT409', 409],
  ['PT410', 410],
  ['P0002', 404],
])(
  'never returns a receipt when recovery is denied (%s)',
  async (code, status) => {
    state.rpc.mockResolvedValueOnce({ data: null, error: { code } });
    const response = await submit('medium', '1'.repeat(64), true);
    expect(response.status).toBe(status);
    expect(await response.json()).not.toHaveProperty('conversation_url');
  }
);
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
