import http from 'node:http';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

// Opt-in browser challenge driver. Only loopback, only test PaymentIntents;
// never exposes an API key or accepts an arbitrary intent from the browser.
export async function browserChallenge(stripe, checkout, expected, verify) {
  const nonce = randomUUID();
  const intentId = checkout.clientSecret.split('_secret_')[0];
  const original = await stripe.paymentIntents.retrieve(intentId);
  assert.equal(original.livemode, false);
  let redirect, finish, reject;
  const completed = new Promise((resolve, fail) => {
    finish = resolve;
    reject = fail;
  });
  const server = http.createServer(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Referrer-Policy', 'no-referrer');
    const url = new URL(req.url, 'http://127.0.0.1');
    if (!url.pathname.startsWith('/' + nonce)) {
      res.writeHead(404).end();
      return;
    }
    if (url.pathname === '/' + nonce + '/challenge' && redirect) {
      res.writeHead(303, { Location: redirect }).end();
      return;
    }
    if (url.pathname === '/' + nonce + '/return') {
      try {
        const intent = await stripe.paymentIntents.retrieve(intentId);
        assert.equal(intent.livemode, false);
        assert.equal(intent.status, expected);
        await verify(intent);
        res.setHeader('Content-Type', 'text/html');
        res.end(
          '<h1>3-D Secure test passed</h1><p>Verified Stripe status: ' +
            intent.status +
            '</p><p>Application database entitlement checked. No live funds moved.</p>'
        );
        finish();
      } catch (error) {
        res
          .writeHead(500)
          .end('Challenge verification failed; see test result.');
        reject(error);
      }
      return;
    }
    res.setHeader('Content-Type', 'text/html');
    res.end(
      '<h1>Mintenance Stripe TEST challenge</h1><p>Expected outcome: ' +
        expected +
        '</p><p>Isolated local database. No live funds.</p><a href="/' +
        nonce +
        '/challenge">Open test authentication</a>'
    );
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port + '/' + nonce;
  const timer = setTimeout(
    () => reject(new Error('Interactive challenge timed out')),
    15 * 60_000
  );
  try {
    const intent = await stripe.paymentIntents.confirm(intentId, {
      payment_method: 'pm_card_threeDSecure2Required',
      return_url: base + '/return',
    });
    assert.equal(intent.status, 'requires_action');
    redirect = intent.next_action?.redirect_to_url?.url;
    assert(redirect && new URL(redirect).protocol === 'https:');
    console.log('BROWSER_TEST ' + base);
    await completed;
  } finally {
    clearTimeout(timer);
    server.closeIdleConnections();
    const closeTimer = setTimeout(() => server.closeAllConnections(), 1000);
    await new Promise((resolve) => server.close(resolve));
    clearTimeout(closeTimer);
  }
}
