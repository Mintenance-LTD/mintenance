// Isolated local registration proof. Never uses deployment credentials or real email.
const fs = require('fs');
const { randomUUID, randomBytes } = require('crypto');
const assert = require('assert/strict');
const { createClient } = require('@supabase/supabase-js');
const keys = fs.readFileSync('apps/web/test/integration/supabase-test-client.ts', 'utf8').match(/eyJ[^'\s]+/g);
const service = createClient('http://127.0.0.1:55321', keys[1], { auth: { persistSession: false, autoRefreshToken: false } });
const web = 'http://localhost:3017';
const email = `registration-${randomUUID()}@example.invalid`;
const password = randomBytes(24).toString('base64') + 'aA9!';
const jar = new Map();
let userId;
let stage = 'csrf';
async function request(path, method = 'GET', body) {
  const response = await fetch(web + path, {
    method, redirect: 'manual', signal: AbortSignal.timeout(90000),
    headers: { origin: web, 'content-type': 'application/json',
      cookie: [...jar].map(([key, value]) => `${key}=${value}`).join('; '),
      'x-csrf-token': jar.get('csrf-token') || '' },
    body: body ? JSON.stringify(body) : undefined,
  });
  for (const cookie of response.headers.getSetCookie()) {
    const part = cookie.split(';')[0], index = part.indexOf('=');
    jar.set(part.slice(0, index), part.slice(index + 1));
  }
  return response;
}
(async () => {
  try {
    await request('/api/csrf');
    stage = 'signed-out verification recovery';
    const recovery = await request('/api/auth/resend-verification', 'POST', { email });
    assert.equal(recovery.status, 200);
    assert((await recovery.json()).message.includes('If this address'));
    stage = 'registration';
    const registered = await request('/api/auth/register', 'POST', {
      email, password, firstName: 'Synthetic', lastName: 'Audit',
      phone: '+447700900123', role: 'homeowner',
    });
    assert.equal(registered.status, 201);
    const body = await registered.json();
    userId = body.user.id;
    assert.equal(body.requiresEmailVerification, true);
    assert(!jar.get('mintenance-auth') && !jar.get('mintenance-refresh'));
    const identity = await service.auth.admin.getUserById(userId);
    assert(!identity.error && !identity.data.user.email_confirmed_at);
    stage = 'unconfirmed login';
    const denied = await request('/api/auth/login', 'POST', { email, password });
    assert.equal(denied.status, 401);
    assert(!jar.get('mintenance-auth') && !jar.get('mintenance-refresh'));
    stage = 'local mailbox';
    const mailbox = await fetch('http://127.0.0.1:55324/api/v1/messages').then(r => r.json());
    const mail = mailbox.messages.find(m => m.To?.some(to => to.Address === email));
    assert(mail, 'Confirmation email was not captured locally');
    const message = await fetch(`http://127.0.0.1:55324/api/v1/message/${mail.ID}`).then(r => r.json());
    const links = (message.Text + '\n' + message.HTML).match(/https?:\/\/[^\s"<>]+/g) || [];
    const confirmation = links.map(link => link.replaceAll('&amp;', '&')).find(link => {
      const url = new URL(link);
      return ['localhost', '127.0.0.1'].includes(url.hostname) && url.port === '55321' && url.pathname === '/auth/v1/verify';
    });
    assert(confirmation, 'No isolated Auth verification link');
    stage = 'confirmation';
    const verified = await fetch(confirmation, { redirect: 'manual' });
    assert([302,303,307,308].includes(verified.status));
    const confirmed = await service.auth.admin.getUserById(userId);
    assert(confirmed.data.user.email_confirmed_at);
    stage = 'confirmed login';
    const login = await request('/api/auth/login', 'POST', { email, password });
    assert.equal(login.status, 200);
    assert(jar.get('mintenance-auth'));
    console.log('PASS: registration withheld session, unconfirmed login denied, local mailbox confirmation consumed, verified login issued session.');
  } finally {
    if (userId) assert(!(await service.auth.admin.deleteUser(userId)).error, 'Synthetic cleanup failed');
  }
})().catch(() => { console.error(`FAIL: registration diagnostic at ${stage}; credentials suppressed.`); process.exitCode = 1; });
