import { describe, it, expect, vi } from 'vitest';
import Stripe from 'stripe';
import { createRelay, UPSTREAM, MAX_BODY_BYTES } from '../../../../supabase/functions/stripe-webhook-relay/handler';

const stripe = new Stripe('sk_test_verification_only');
const secret = 'whsec_relay_unit_test_only';
const bypass = 'relay_test_bypass_not_a_real_credential';
const payload = JSON.stringify({ id: 'evt_relay_test', type: 'audit.test', livemode: true });
const sign = (body = payload, timestamp = Math.floor(Date.now() / 1000)) => stripe.webhooks.generateTestHeaderString({ payload: body, secret, timestamp });
const request = (body = payload, signature = sign(body)) => new Request('https://receiver.example/?url=https://attacker.example', {
  method: 'POST', body, headers: { 'stripe-signature': signature, cookie: 'private=ignored', authorization: 'Bearer ignored', 'x-vercel-protection-bypass': 'attacker' },
});
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
function setup(overrides: Partial<Parameters<typeof createRelay>[0]> = {}) {
  const fetch = vi.fn(async () => json({ received: true }));
  const handler = createRelay({ signingSecret: secret, bypassSecret: bypass, fetch,
    verify: (body, signature, key) => stripe.webhooks.constructEventAsync(body, signature, key, 300), ...overrides });
  return { handler, fetch };
}

describe('Stripe public relay', () => {
  it('forwards authentic live raw bytes only to the fixed URL with private server credentials', async () => {
    const { handler, fetch } = setup();
    const body = '{ "id":"evt_whitespace", "type":"audit.test", "livemode":true, "text":"£" }';
    const signature = sign(body);
    const response = await handler(request(body, signature));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ received: true });
    const [url, options] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(UPSTREAM);
    expect(new TextDecoder().decode(options.body as Uint8Array)).toBe(body);
    expect(options.redirect).toBe('manual');
    expect(options.headers).toEqual({ 'content-type': 'application/json', 'stripe-signature': signature, 'x-vercel-protection-bypass': bypass });
    expect(response.headers.get('x-vercel-protection-bypass')).toBeNull();
  });
  it.each(['bad', sign(payload, 1), sign(payload + 'tampered')])('rejects invalid, expired or changed signatures before forwarding (%#)', async signature => {
    const { handler, fetch } = setup();
    expect((await handler(request(payload, signature))).status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each([false, undefined])('rejects non-live/missing mode %s', async livemode => {
    const { handler, fetch } = setup();
    expect((await handler(request(JSON.stringify({ id: 'evt_test', type: 'audit.test', livemode })))).status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('rejects absent signatures and non-POST methods', async () => {
    const { handler, fetch } = setup();
    expect((await handler(new Request('https://receiver.example', { method: 'POST' }))).status).toBe(400);
    expect((await handler(new Request('https://receiver.example'))).status).toBe(405);
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each([{ signingSecret: '' }, { bypassSecret: '' }])('fails closed for missing configuration', async config => {
    const { handler, fetch } = setup(config);
    expect((await handler(request())).status).toBe(503);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('bounds the actual body even without content-length', async () => {
    const { handler, fetch } = setup();
    expect((await handler(request('x'.repeat(MAX_BODY_BYTES + 1), 'invalid'))).status).toBe(413);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('rejects an oversized declared body before reading it', async () => {
    const { handler, fetch } = setup();
    const req = request(); req.headers.set('content-length', String(MAX_BODY_BYTES + 1));
    expect((await handler(req)).status).toBe(413);
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each([302, 307, 401, 429, 500])('returns retryable failure for upstream HTTP %s and never follows redirects', async status => {
    const fetch = vi.fn(async () => new Response('secret server error', { status, headers: { location: 'https://attacker.example' } }));
    const { handler } = setup({ fetch });
    const response = await handler(request());
    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain('secret');
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it.each([() => new Response('<html>Login</html>'), () => json({ received: false }), () => json({}), () => new Response('{', { headers: { 'content-type': 'application/json' } }), () => json({ received: true, excess: 'x'.repeat(17000) })])('does not acknowledge misleading successful responses (%#)', async response => {
    const { handler } = setup({ fetch: vi.fn(async () => response()) });
    expect((await handler(request())).status).toBe(502);
  });
  it('accepts the application duplicate acknowledgement without reflecting its body', async () => {
    const { handler } = setup({ fetch: vi.fn(async () => json({ received: true, duplicate: true, private: 'hidden' })) });
    expect(await (await handler(request())).json()).toEqual({ received: true });
  });
  it('allows Stripe retries after a transient failure', async () => {
    const fetch = vi.fn().mockRejectedValueOnce(new Error('private network details')).mockResolvedValueOnce(json({ received: true }));
    const { handler } = setup({ fetch });
    expect((await handler(request())).status).toBe(502);
    expect((await handler(request())).status).toBe(200);
  });
  it('times out a stalled upstream', async () => {
    const { handler } = setup({ fetch: vi.fn(() => new Promise(() => {})), timeoutMs: 10 });
    expect((await handler(request())).status).toBe(504);
  });
  it('cancels a stalled incoming body on timeout without forwarding', async () => {
    const cancel = vi.fn();
    const stream = new ReadableStream({ cancel });
    const req = new Request('https://receiver.example', { method: 'POST', body: stream, duplex: 'half', headers: { 'stripe-signature': sign() } } as RequestInit);
    const { handler, fetch } = setup({ timeoutMs: 10 });
    expect((await handler(req)).status).toBe(504);
    expect(cancel).toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });
});
