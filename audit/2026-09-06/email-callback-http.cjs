// Real local Auth token consumption and application redirect; no email is sent.
const fs = require('fs');
const { randomUUID, randomBytes } = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const assert = require('assert/strict');
const keys = fs.readFileSync('apps/web/test/integration/supabase-test-client.ts','utf8').match(/eyJ[^'\s]+/g);
const client = createClient('http://127.0.0.1:55321', keys[1], { auth: { persistSession: false, autoRefreshToken: false } });
const created = [];
let stage = 'generate synthetic token';
async function callback(query) {
  const response = await fetch('http://localhost:3017/auth/callback'+query, { redirect: 'manual' });
  assert([302,303,307,308].includes(response.status), 'Callback must redirect');
  const target = new URL(response.headers.get('location'));
  assert.equal(target.pathname, '/login');
  assert(!/mintenance-(auth|refresh)=/.test(response.headers.get('set-cookie') || ''), 'Verification must not bypass application login/MFA');
  return target;
}
(async () => {
  try {
    const { data, error } = await client.auth.admin.generateLink({ type: 'signup', email: `callback-${randomUUID()}@example.invalid`, password: randomBytes(24).toString('base64')+'aA9!' });
    assert(!error && data.user && data.properties?.hashed_token, 'Synthetic verification token generation failed');
    created.push(data.user.id);
    stage = 'consume confirmation token';
    const query='?type=email&token_hash='+encodeURIComponent(data.properties.hashed_token);
    const target=await callback(query);
    assert.equal(target.searchParams.get('verified'),'true');
    stage = 'check Auth and profile';
    const confirmed=await client.auth.admin.getUserById(data.user.id);
    assert(confirmed.data.user.email_confirmed_at, 'Auth email is not confirmed');
    const profile=await client.from('profiles').select('verified').eq('id',data.user.id).single();
    assert.equal(profile.data?.verified,true);
    stage = 'reject replay';
    const replay=await callback(query);
    assert.equal(replay.searchParams.get('error'),'verification_failed');
    stage = 'default callback';
    const plain=await callback('');
    assert(!plain.searchParams.has('error') && !plain.searchParams.has('verified'));
    console.log('PASS: real local Auth token confirmed, profile synchronized, replay rejected, no application session issued; default callback continues to login without claiming verification.');
  } finally {
    for (const id of created) {
      const result=await client.auth.admin.deleteUser(id);
      assert(!result.error,'Synthetic account cleanup failed');
    }
  }
})().catch(() => { console.error(`FAIL: local callback diagnostic at ${stage}; token values suppressed.`); process.exitCode=1; });
