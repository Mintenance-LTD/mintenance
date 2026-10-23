import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const m = vi.hoisted(() => ({
  env: { STRIPE_SECRET_KEY: 'sk_live_synthetic', STRIPE_WEBHOOK_SECRET: 'whsec_synthetic' },
  construct: vi.fn(), rpc: vi.fn(), handler: vi.fn(),
}));
vi.mock('@/lib/env', () => ({ env: m.env }));
vi.mock('@/lib/stripe', () => ({ stripe: { webhooks: { constructEvent: m.construct } } }));
vi.mock('@/lib/api/supabaseServer', () => ({ serverSupabase: { rpc: m.rpc } }));
vi.mock('@/lib/rate-limiter', () => ({ rateLimiter: { checkRateLimit: async () => ({ allowed: true }) } }));
vi.mock('@/lib/request-ip', () => ({ getClientIp: () => '127.0.0.1' }));
vi.mock('@mintenance/shared', async (importOriginal) => ({
  ...await importOriginal<typeof import('@mintenance/shared')>(),
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock('@/lib/services/stripe-webhook/stripe-webhook-event-handler', () => ({
  StripeWebhookEventHandler: class { handleEvent = m.handler; },
}));
import { StripeWebhookService } from '@/lib/services/stripe-webhook/stripe-webhook-service';
const request = () => new NextRequest('http://localhost/api/webhooks/stripe', {
  method: 'POST', body: '{}', headers: { 'stripe-signature': 'synthetic' },
});
beforeEach(() => {
  vi.clearAllMocks();
  m.env.STRIPE_SECRET_KEY = 'sk_live_synthetic';
  m.construct.mockReturnValue({ id: 'evt_synthetic', type: 'payment_intent.succeeded', livemode: true });
  m.rpc.mockImplementation(async (name: string) => ({
    data: name === 'check_webhook_idempotency' ? [{ event_id: 'row', is_duplicate: false }] : null,
    error: null,
  }));
  m.handler.mockResolvedValue(undefined);
});
it.each([['live', false], ['test', true], ['live', undefined]] as const)(
  'rejects %s key with event livemode %s before any database claim', async (mode, livemode) => {
    m.env.STRIPE_SECRET_KEY = `sk_${mode}_synthetic`;
    m.construct.mockReturnValue({ id: 'evt_synthetic', livemode });
    expect((await StripeWebhookService.getInstance().handleRequest(request())).status).toBe(400);
    expect(m.rpc).not.toHaveBeenCalled();
    expect(m.handler).not.toHaveBeenCalled();
  }
);
it.each(['live', 'test'])('processes correctly signed matching %s events', async (mode) => {
  m.env.STRIPE_SECRET_KEY = `sk_${mode}_synthetic`;
  m.construct.mockReturnValue({ id: 'evt_synthetic', type: 'payment_intent.succeeded', livemode: mode === 'live' });
  expect((await StripeWebhookService.getInstance().handleRequest(request())).status).toBe(200);
  expect(m.handler).toHaveBeenCalledTimes(1);
  expect(m.rpc).toHaveBeenCalledWith('mark_webhook_processed', expect.any(Object));
});
it('fails closed with an unknown key mode', async () => {
  m.env.STRIPE_SECRET_KEY = 'invalid';
  expect((await StripeWebhookService.getInstance().handleRequest(request())).status).toBe(500);
  expect(m.rpc).not.toHaveBeenCalled();
});
it('verifies the signature before trusting the event mode', async () => {
  m.construct.mockImplementation(() => { throw new Error('invalid signature'); });
  expect((await StripeWebhookService.getInstance().handleRequest(request())).status).toBe(400);
  expect(m.rpc).not.toHaveBeenCalled();
  expect(m.handler).not.toHaveBeenCalled();
});
