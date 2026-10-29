import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMobileRelay, type RelayDependencies } from './handler';

const id = '11111111-1111-4111-8111-111111111111';
// Model the URL actually received after the hosted gateway strips /functions/v1.
const base = 'https://example.supabase.co/mobile-api-relay';
const request = (path = '/api/users/profile', init: RequestInit = {}) =>
  new Request(base + path, {
    ...init,
    headers: { authorization: 'Bearer user.jwt.token', ...init.headers },
  });
function fixture(overrides: Partial<RelayDependencies> = {}) {
  const calls: { url: string; init: RequestInit }[] = [];
  let verifications = 0;
  const handler = createMobileRelay({
    bypassSecret: 'server-only-synthetic-secret',
    allowedUserIds: [id],
    verifyUser: async () => {
      verifications++;
      return { id, confirmed: true };
    },
    fetch: (async (url, init) => {
      calls.push({ url: String(url), init: init! });
      return Response.json({ profile: { id } });
    }) as typeof fetch,
    ...overrides,
  });
  return { handler, calls, verifications: () => verifications };
}

test('approved user gets profile using their own bearer token and a fixed upstream', async () => {
  const f = fixture();
  const response = await f.handler(request('/api/users/profile?view=mobile'));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { profile: { id } });
  assert.equal(
    f.calls[0].url,
    'https://www.mintenance.co.uk/api/users/profile?view=mobile'
  );
  const headers = new Headers(f.calls[0].init.headers);
  assert.equal(headers.get('authorization'), 'Bearer user.jwt.token');
  assert.equal(
    headers.get('x-vercel-protection-bypass'),
    'server-only-synthetic-secret'
  );
  assert.equal(f.calls[0].init.redirect, 'manual');
});

test('external URL form preserves the same fixed upstream and authentication', async () => {
  const f = fixture();
  const response = await f.handler(
    new Request(
      'https://example.supabase.co/functions/v1/mobile-api-relay/api/users/profile?view=mobile',
      { headers: { authorization: 'Bearer user.jwt.token' } }
    )
  );
  assert.equal(response.status, 200);
  assert.equal(f.verifications(), 1);
  assert.equal(
    f.calls[0].url,
    'https://www.mintenance.co.uk/api/users/profile?view=mobile'
  );
});

test('lookalike function prefixes and bare API paths remain denied', async () => {
  const f = fixture();
  for (const path of [
    '/api/users/profile',
    '/mobile-api-relay-other/api/users/profile',
    '/other/mobile-api-relay/api/users/profile',
    '/functions/v1/mobile-api-relay-other/api/users/profile',
    '/functions/v1/mobile-api-relay/api/admin/users',
    '/mobile-api-relay//api/users/profile',
  ]) {
    const response = await f.handler(
      new Request('https://example.supabase.co' + path, {
        headers: { authorization: 'Bearer user.jwt.token' },
      })
    );
    assert.equal(response.status, 403, path);
  }
  assert.equal(f.verifications(), 0);
  assert.equal(f.calls.length, 0);
});

for (const options of [
  { allowedUserIds: [] },
  { allowedUserIds: ['*'] },
  { bypassSecret: '' },
]) {
  test(`fails closed for configuration ${JSON.stringify(options)}`, async () => {
    const f = fixture(options);
    assert.equal((await f.handler(request())).status, 503);
    assert.equal(f.calls.length, 0);
  });
}
test('missing or invalid auth never reaches Vercel', async () => {
  const f = fixture({ verifyUser: async () => null });
  assert.equal(
    (await f.handler(new Request(base + '/api/users/profile'))).status,
    401
  );
  assert.equal((await f.handler(request())).status, 401);
  assert.equal(f.calls.length, 0);
});
test('valid non-beta and unconfirmed accounts are denied before forwarding', async () => {
  for (const user of [
    { id: '22222222-2222-4222-8222-222222222222', confirmed: true },
    { id, confirmed: false },
  ]) {
    const f = fixture({ verifyUser: async () => user });
    assert.equal((await f.handler(request())).status, 403);
    assert.equal(f.calls.length, 0);
  }
});
test('Auth transport failure is availability failure, not a revoked user session', async () => {
  const f = fixture({
    verifyUser: async () => {
      throw new Error('sensitive transport detail');
    },
  });
  const response = await f.handler(request());
  assert.equal(response.status, 503);
  assert.doesNotMatch(await response.text(), /sensitive/);
  assert.equal(f.calls.length, 0);
});
test('reserved, encoded and non-API paths cannot become a general hosting bypass', async () => {
  const f = fixture();
  for (const path of [
    '/login',
    '/api/cron/model-retraining',
    '/api/admin/users',
    '/api/building-surveyor/retrain',
    '/api/building-surveyor/corrections/example/approve',
    '/api/auth/login',
    '/api/webhooks/stripe',
    '/api/jobs/%2fadmin',
    '/api/jobs//x',
    '/api/jobs/../../admin',
    '/api/jobs/%252e%252e/admin',
  ]) {
    assert.equal((await f.handler(request(path))).status, 403, path);
  }
  assert.equal(f.verifications(), 0);
  assert.equal(f.calls.length, 0);
});
test('caller cookies, trusted headers and bypass parameters are never forwarded as credentials', async () => {
  const f = fixture();
  await f.handler(
    request('/api/jobs', {
      headers: {
        cookie: 'session=other-user',
        'x-vercel-protection-bypass': 'attacker',
        'x-forwarded-for': '127.0.0.1',
        'x-user-id': 'other-user',
        'x-cron-signature': 'fake',
      },
    })
  );
  const headers = new Headers(f.calls[0].init.headers);
  for (const name of [
    'cookie',
    'x-forwarded-for',
    'x-user-id',
    'x-cron-signature',
  ])
    assert.equal(headers.get(name), null);
  assert.equal(
    headers.get('x-vercel-protection-bypass'),
    'server-only-synthetic-secret'
  );
});
test('mutation body and idempotency key survive without replay', async () => {
  const f = fixture();
  await f.handler(
    request('/api/onboarding/progress', {
      method: 'PUT',
      headers: {
        'content-type': 'application/json',
        'idempotency-key': 'synthetic-request',
      },
      body: '{"step":3}',
    })
  );
  assert.equal(f.calls.length, 1);
  assert.equal(f.calls[0].init.method, 'PUT');
  assert.equal(
    new TextDecoder().decode(f.calls[0].init.body as Uint8Array),
    '{"step":3}'
  );
  assert.equal(
    new Headers(f.calls[0].init.headers).get('idempotency-key'),
    'synthetic-request'
  );
});
test('upstream ownership and revoked-session rejections are preserved', async () => {
  for (const status of [401, 403, 404]) {
    const f = fixture({
      fetch: (async () =>
        Response.json({ error: 'Denied' }, { status })) as typeof fetch,
    });
    assert.equal((await f.handler(request())).status, status);
  }
});
test('upstream hosting gate and redirects become availability errors without leaking secrets', async () => {
  for (const upstream of [
    Response.json(
      { message: 'Protected by Vercel Authentication' },
      { status: 401 }
    ),
    new Response('<html>private login</html>', {
      headers: { 'content-type': 'text/html' },
    }),
    new Response(null, {
      status: 302,
      headers: { location: 'https://evil.example/secret' },
    }),
  ]) {
    const f = fixture({ fetch: (async () => upstream) as typeof fetch });
    const response = await f.handler(request());
    assert.equal(response.status, 503);
    assert.equal(response.headers.get('location'), null);
    assert.doesNotMatch(await response.text(), /secret|private login/);
  }
});
test('upstream cookies and diagnostic headers never reach clients', async () => {
  const f = fixture({
    fetch: (async () =>
      Response.json(
        { ok: true },
        {
          headers: {
            'set-cookie': 'secret=value',
            'x-vercel-protection-bypass': 'secret',
          },
        }
      )) as typeof fetch,
  });
  const response = await f.handler(request());
  assert.equal(response.headers.get('set-cookie'), null);
  assert.equal(response.headers.get('x-vercel-protection-bypass'), null);
  assert.equal(response.headers.get('cache-control'), 'no-store');
});
test('oversized request is refused before forwarding', async () => {
  const f = fixture();
  const response = await f.handler(
    request('/api/jobs', {
      method: 'POST',
      body: 'x'.repeat(8 * 1024 * 1024 + 1),
    })
  );
  assert.equal(response.status, 413);
  assert.equal(f.calls.length, 0);
});
test('deadline bounds Auth and no late verification can trigger forwarding', async () => {
  let release!: (user: { id: string; confirmed: boolean }) => void;
  const f = fixture({
    timeoutMs: 10,
    verifyUser: () =>
      new Promise((resolve) => {
        release = resolve;
      }),
  });
  assert.equal((await f.handler(request())).status, 504);
  release({ id, confirmed: true });
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(f.calls.length, 0);
});
