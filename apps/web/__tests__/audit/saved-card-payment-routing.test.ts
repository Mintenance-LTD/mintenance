// @vitest-environment node
import { NextRequest, NextResponse } from 'next/server';
const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  record: vi.fn(),
  confirm: vi.fn(),
  from: vi.fn(),
}));
vi.mock('@/app/api/payments/create-intent/route', () => ({
  POST: mocks.create,
}));
vi.mock('@/app/api/payments/confirm-intent/route', () => ({
  POST: mocks.record,
}));
vi.mock('@/lib/stripe', () => ({
  stripe: { paymentIntents: { confirm: mocks.confirm } },
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { from: mocks.from },
}));
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler:
    (
      _options: unknown,
      handler: (request: NextRequest, context: unknown) => Promise<Response>
    ) =>
    (request: NextRequest) =>
      handler(request, { user: { id: 'owner', role: 'homeowner' } }),
}));
import { POST } from '@/app/api/payments/process-job-payment/route';
const jobId = '51d2d196-81f8-4a23-b858-a55e32f42f43';
const request = () =>
  new NextRequest('http://localhost/api/payments/process-job-payment', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      cookie: 'mintenance-auth=session',
      'x-csrf-token': 'csrf-proof',
      'idempotency-key': 'request-1',
    },
    body: JSON.stringify({ jobId, amount: 5, paymentMethodId: 'pm_testcard' }),
  });
beforeEach(() => {
  mocks.from.mockReturnValue({
    select: () => ({
      eq: () => ({
        single: async () => ({
          data: {
            id: jobId,
            homeowner_id: 'owner',
            contractor_id: 'contractor',
          },
          error: null,
        }),
      }),
    }),
  });
  mocks.create.mockResolvedValue(
    NextResponse.json({
      paymentIntentId: 'pi_test',
      escrowTransactionId: 'escrow',
    })
  );
  mocks.confirm.mockResolvedValue({ id: 'pi_test', status: 'succeeded' });
  mocks.record.mockResolvedValue(NextResponse.json({ success: true }));
});
it('preserves cookie, CSRF and request identity through both canonical handlers', async () => {
  const res = await POST(request(), { params: Promise.resolve({}) });
  expect(res.status).toBe(200);
  for (const handler of [mocks.create, mocks.record]) {
    const forwarded = handler.mock.calls[0][0] as NextRequest;
    expect(forwarded.headers.get('cookie')).toBe('mintenance-auth=session');
    expect(forwarded.headers.get('x-csrf-token')).toBe('csrf-proof');
    expect(forwarded.headers.get('idempotency-key')).toBe('request-1');
    expect(new URL(forwarded.url).origin).toBe('http://localhost');
  }
  expect(await mocks.record.mock.calls[0][0].json()).toEqual({
    paymentIntentId: 'pi_test',
    jobId,
  });
});
it('returns the canonical authorization failure without charging the card', async () => {
  mocks.create.mockResolvedValue(
    NextResponse.json({ error: 'denied' }, { status: 403 })
  );
  expect((await POST(request(), { params: Promise.resolve({}) })).status).toBe(
    403
  );
  expect(mocks.confirm).not.toHaveBeenCalled();
});
it('does not report a successful payment when persistence fails', async () => {
  mocks.record.mockResolvedValue(
    NextResponse.json({ error: 'retry confirmation' }, { status: 500 })
  );
  const res = await POST(request(), { params: Promise.resolve({}) });
  expect(res.status).toBe(500);
  expect(await res.json()).toEqual({ error: 'retry confirmation' });
});
it('returns additional authentication to the client without marking funds received', async () => {
  mocks.confirm.mockResolvedValue({
    id: 'pi_test',
    status: 'requires_action',
    client_secret: 'synthetic',
  });
  const res = await POST(request(), { params: Promise.resolve({}) });
  expect(await res.json()).toMatchObject({
    success: false,
    requiresAction: true,
  });
  expect(mocks.record).not.toHaveBeenCalled();
});
