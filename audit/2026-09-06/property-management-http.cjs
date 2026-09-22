// Synthetic local HTTP role matrix. Does not load deployment credentials or send invitations.
const fs = require('fs'), { randomUUID } = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const keys = fs.readFileSync('apps/web/test/integration/supabase-test-client.ts', 'utf8').match(/eyJ[^'\s]+/g);
const service = createClient('http://127.0.0.1:55321', keys[1], { auth: { persistSession: false, autoRefreshToken: false } });
const web = 'http://localhost:3017', property = randomUUID(), users = [];
function check(ok, message) { if (!ok) throw new Error(message); }
function db(result) { if (result.error) throw new Error('Local fixture failed: ' + result.error.code); return result.data; }
async function account() {
 const email = `manager_${randomUUID()}@example.invalid`, password = `Aa1!${randomUUID()}`;
 const user = db(await service.auth.admin.createUser({ email, password, email_confirm: true })).user;
 users.push(user.id); db(await service.from('profiles').update({ role: 'homeowner', first_name: 'Synthetic', last_name: 'Audit' }).eq('id', user.id));
 const jar = new Map();
 async function request(path, method = 'GET', body) {
  const response = await fetch(web + path, { method, headers: { origin: web, cookie: [...jar].map(([key, value]) => `${key}=${value}`).join('; '), 'x-csrf-token': jar.get('csrf-token') || '', 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined, redirect: 'manual', signal: AbortSignal.timeout(90000) });
  for (const cookie of response.headers.getSetCookie()) { const part = cookie.split(';')[0], index = part.indexOf('='); jar.set(part.slice(0, index), part.slice(index + 1)); }
  return { status: response.status, data: await response.json().catch(() => null) };
 }
 await request('/api/csrf');
 const login = await request('/api/auth/login', 'POST', { email, password });
 check(login.status === 200, 'Synthetic role login failed: ' + login.status);
 return { id: user.id, email, request };
}
(async () => { try {
 const owner = await account(), manager = await account(), administrator = await account(), viewer = await account(), unrelated = await account();
 db(await service.from('properties').insert({ id: property, owner_id: owner.id, property_name: 'Synthetic role matrix', address: 'Synthetic', property_type: 'residential' }));
 // Legitimate local subscription fixture exercises delegated owner-plan entitlement; no provider IDs or payments.
 db(await service.from('homeowner_subscriptions').insert({ homeowner_id: owner.id, plan_type: 'agency', plan_name: 'Synthetic agency', status: 'active', amount: 0, currency: 'gbp' }));
 db(await service.from('property_team_members').insert([[manager, 'manager'], [administrator, 'admin'], [viewer, 'viewer']].map(([actor, role]) => ({ property_id: property, invited_by: owner.id, user_id: actor.id, email: actor.email, role, status: 'accepted' }))));
 for (const [role, actor, canWrite, canRead] of [['owner', owner, true, true], ['manager', manager, true, true], ['team administrator', administrator, true, true], ['viewer', viewer, false, true], ['unrelated', unrelated, false, false]]) {
  const base = `/api/properties/${property}`;
  for (const suffix of ['tenants', 'recurring-maintenance', 'compliance']) {
   const result = await actor.request(`${base}/${suffix}`);
   // Viewer access to the property does not include private tenant contact records.
   const permitted = canRead && !(role === 'viewer' && suffix === 'tenants');
   check(permitted ? result.status === 200 : [403,404].includes(result.status), `${role} ${suffix} read mismatch: ${result.status}`);
  }
  const contact = await actor.request(`${base}/tenants`, 'POST', { name: `Synthetic ${role}` });
  check(canWrite ? contact.status === 201 && contact.data.tenant?.id : [403,404].includes(contact.status), `${role} contact write mismatch: ${contact.status}`);
  const schedule = await actor.request(`${base}/recurring-maintenance`, 'POST', { title: 'Synthetic recurring task', frequency: 'annual', next_due_date: '2030-01-01' });
  check(canWrite ? schedule.status === 201 && schedule.data.schedule?.owner_id === owner.id : [403,404].includes(schedule.status), `${role} schedule write mismatch: ${schedule.status}`);
 }
 const schedules = db(await service.from('recurring_schedules').select('owner_id').eq('property_id', property));
 check(schedules.length === 3 && schedules.every(row => row.owner_id === owner.id), 'Delegated schedules do not belong to property owner');
 console.log('PASS: 5 real cookie-authenticated roles; 15 authorized/denied reads; owner/manager/team-admin contact and schedule writes; viewer/unrelated write denial; delegated owner attribution. No email or payment provider called.');
} finally {
 db(await service.from('properties').delete().eq('id', property));
 for (const id of users) { db(await service.from('homeowner_subscriptions').delete().eq('homeowner_id', id)); db(await service.auth.admin.deleteUser(id)); }
}})().catch(error => { console.error(error.message); process.exitCode = 1; });
