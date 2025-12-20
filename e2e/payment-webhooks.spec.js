// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Stripe Webhook Verification', () => {
  test('rejects missing stripe-signature header', async ({ request }) => {
    const res = await request.post('/api/webhooks/stripe', {
      data: { type: 'payment_intent.succeeded' },
      headers: { 'content-type': 'application/json' },
    });

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Missing stripe-signature/i);
  });

  test('rejects invalid signature', async ({ request }) => {
    const payload = JSON.stringify({ type: 'payment_intent.succeeded' });
    const res = await request.post('/api/webhooks/stripe', {
      data: payload,
      headers: {
        'content-type': 'application/json',
        'stripe-signature': 't=0,v1=deadbeef',
      },
    });

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Webhook signature verification failed/i);
  });
});


