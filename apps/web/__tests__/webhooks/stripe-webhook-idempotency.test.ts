/** @jest-environment node */
import { NextRequest, NextResponse } from 'next/server';

jest.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    rpc: jest.fn(async (fn: string, args: any) => {
      if (fn === 'check_webhook_idempotency') {
        return { data: [{ is_duplicate: false, event_id: 'evt_row_1' }], error: null };
      }
      if (fn === 'mark_webhook_processed') {
        return { data: null, error: null };
      }
      return { data: null, error: null };
    }),
  },
}));

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    webhooks: {
      constructEvent: (body: string) => ({ id: 'evt_1', type: 'payment_intent.succeeded', data: { object: { id: 'pi_1' }}}),
    },
  }));
});

function makeReq(headers: Record<string,string>, body: string) {
  return new NextRequest('http://localhost/api/webhooks/stripe', {
    method: 'POST',
    headers: new Headers(headers as any),
    body,
  } as any);
}

describe('Stripe webhook idempotency', () => {
  it('marks event processed and returns received true', async () => {
    const mod = await import('../../../app/api/webhooks/stripe/route');
    const res = await mod.POST(makeReq({ 'stripe-signature': 'sig', 'x-forwarded-for': '1.1.1.1' }, '{}'));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.received).toBe(true);
  });

  it('returns duplicate=true when idempotency detects duplicate', async () => {
    const mod = await import('../../../app/api/webhooks/stripe/route');
    const { serverSupabase } = await import('@/lib/api/supabaseServer');
    (serverSupabase.rpc as jest.Mock).mockResolvedValueOnce({ data: [{ is_duplicate: true, event_id: 'evt_row_1' }], error: null });
    const res = await mod.POST(makeReq({ 'stripe-signature': 'sig', 'x-forwarded-for': '1.1.1.1' }, '{}'));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.duplicate).toBe(true);
  });
});