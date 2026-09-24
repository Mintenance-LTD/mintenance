// Synthetic local HTTP role matrix. Does not load deployment credentials or send invitations.
const fs = require('fs'), { randomUUID } = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const keys = fs.readFileSync('apps/web/test/integration/supabase-test-client.ts', 'utf8').match(/eyJ[^'\s]+/g);
const service = createClient('http://127.0.0.1:55321', keys[1], { auth: { persistSession: false, autoRefreshToken: false } });
const web = process.env.AUDIT_WEB_URL || 'http://localhost:3017', property = randomUUID(), users = [];
if (!/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(web)) throw new Error('Local audit server required');
const bearerMode = process.argv.includes('--bearer');
function check(ok, message) { if (!ok) throw new Error(message); }
function db(result) { if (result.error) throw new Error('Local fixture failed: ' + result.error.code); return result.data; }
async function account() {
 const email = `manager_${randomUUID()}@example.invalid`, password = `Aa1!${randomUUID()}`;
 const user = db(await service.auth.admin.createUser({ email, password, email_confirm: true })).user;
 users.push(user.id); db(await service.from('profiles').update({ role: 'homeowner', first_name: 'Synthetic', last_name: 'Audit' }).eq('id', user.id));
 const jar = new Map();
 let accessToken;
 async function request(path, method = 'GET', body) {
  const response = await fetch(web + path, { method, headers: { origin: web, ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}), cookie: [...jar].map(([key, value]) => `${key}=${value}`).join('; '), 'x-csrf-token': jar.get('csrf-token') || '', 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined, redirect: 'manual', signal: AbortSignal.timeout(90000) });
  for (const cookie of response.headers.getSetCookie()) { const part = cookie.split(';')[0], index = part.indexOf('='); jar.set(part.slice(0, index), part.slice(index + 1)); }
  return { status: response.status, data: await response.json().catch(() => null) };
 }
 if (bearerMode) {
  const client = createClient('http://127.0.0.1:55321', keys[0], { auth: { persistSession: false, autoRefreshToken: false } });
  accessToken = db(await client.auth.signInWithPassword({ email, password })).session?.access_token;
  check(accessToken, 'Synthetic provider sign-in failed');
  return { id: user.id, email, request };
 }
 await request('/api/csrf');
 let login = await request('/api/auth/login', 'POST', { email, password });
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
  const reporting = await actor.request(`${base}/report-token`);
  check(canWrite ? reporting.status === 200 : [403,404].includes(reporting.status), `${role} reporting link read mismatch: ${reporting.status}`);
  const createdLink = await actor.request(`${base}/report-token`, 'POST', { label: 'Synthetic reporting link' });
  check(canWrite ? createdLink.status === 201 : [403,404].includes(createdLink.status), `${role} reporting link create mismatch: ${createdLink.status}`);
  if (canWrite) {
   const link = createdLink.data.token;
   check(typeof link.token === 'string' && link.token !== link.id, 'Reporting token must differ from internal row identity');
   const listed = await actor.request(`${base}/report-token`);
   check(listed.data.tokens.some(row => row.id === link.id && row.token === link.token), 'List omitted the usable reporting token');
   const publicRead = async value => fetch(`${web}/api/report/${encodeURIComponent(value)}`, { signal: AbortSignal.timeout(90000) });
   check([401,403,404].includes((await publicRead(link.id)).status), 'Internal row ID unexpectedly accepted as reporting token');
   check((await publicRead(link.token)).status === 200, 'Generated public reporting token failed');
   const disabled = await actor.request(`${base}/report-token`, 'PATCH', { token_id: link.id, is_active: false });
   check(disabled.status === 200 && disabled.data.token.is_active === false, 'Reporting link revocation not confirmed');
   check((await publicRead(link.token)).status === 410, 'Revoked reporting token remains usable');
  }
  const canManageTeam = role === 'owner' || role === 'team administrator';
  const teamRead = await actor.request(`${base}/team`);
  check(canManageTeam ? teamRead.status === 200 : [403,404].includes(teamRead.status), `${role} private team read mismatch: ${teamRead.status}`);
  const teamInvite = await actor.request(`${base}/team`, 'POST', { email: `audit_${randomUUID()}@example.invalid`, role: 'viewer' });
  check(canManageTeam ? teamInvite.status === 201 && teamInvite.data.invitation?.activated === false : [403,404].includes(teamInvite.status), `${role} team invitation mismatch: ${teamInvite.status}`);
  if (canManageTeam) {
   const removed = await actor.request(`${base}/team?memberId=${teamInvite.data.member.id}`, 'DELETE');
   check(removed.status === 200 && removed.data.success === true, 'Team invitation removal not confirmed');
  }
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
  if (canWrite) {
   const original = schedule.data.schedule;
   const edit = { scheduleId: original.id, expected_updated_at: original.updated_at, title: 'Edited synthetic task', frequency: 'quarterly', next_due_date: '2030-02-01' };
   const updated = await actor.request(`${base}/recurring-maintenance`, 'PATCH', edit);
   check(updated.status === 200 && updated.data.schedule?.title === edit.title, `${role} schedule edit mismatch: ${updated.status}`);
   const stale = await actor.request(`${base}/recurring-maintenance`, 'PATCH', edit);
   check(stale.status === 409, `${role} stale schedule edit allowed: ${stale.status}`);
  }
 }
 const schedules = db(await service.from('recurring_schedules').select('owner_id').eq('property_id', property));
 check(schedules.length === 3 && schedules.every(row => row.owner_id === owner.id), 'Delegated schedules do not belong to property owner');
 // Keep the manager's existing session: revocation must take effect without logout.
 const membership = db(await service.from('property_team_members').select('id').eq('property_id', property).eq('user_id', manager.id).single());
 const removedManager = await owner.request(`/api/properties/${property}/team?memberId=${membership.id}`, 'DELETE');
 check(removedManager.status === 200, 'Owner could not revoke manager');
 for (const suffix of ['tenants', 'recurring-maintenance', 'compliance', 'report-token']) {
  const denied = await manager.request(`/api/properties/${property}/${suffix}`);
  check([403, 404].includes(denied.status), `Revoked manager can still read ${suffix}: ${denied.status}`);
 }
 const deniedWrites = await Promise.all([
  manager.request(`/api/properties/${property}/tenants`, 'POST', { name: 'Revoked write must not persist' }),
  manager.request(`/api/properties/${property}/recurring-maintenance`, 'POST', { title: 'Revoked write must not persist', frequency: 'annual', next_due_date: '2030-01-01' }),
  manager.request(`/api/properties/${property}/report-token`, 'POST', { label: 'Revoked write must not persist' }),
 ]);
 check(deniedWrites.every(result => [403, 404].includes(result.status)), 'Revoked manager mutation was not denied');
 check(db(await service.from('recurring_schedules').select('id').eq('property_id', property)).length === 3, 'Denied schedule persisted');
 check((await owner.request(`/api/properties/${property}/recurring-maintenance`)).status === 200, 'Revocation removed owner access');
 console.log('PASS: owner revokes manager through team API; unchanged manager session denies four reads and three concurrent writes; owner remains authorized.');
 const token = randomUUID(), tenantId = randomUUID();
 db(await service.from('property_tenants').insert({ id: tenantId, property_id: property, name: 'Synthetic invited tenant', email: unrelated.email, invitation_token: token, is_active: true }));
 const wrongIdentity = await viewer.request('/api/tenant-invite/accept', 'POST', { token });
 check(wrongIdentity.status === 403, 'Wrong verified invitation identity accepted');
 const accepted = await Promise.all([1,2].map(() => unrelated.request('/api/tenant-invite/accept', 'POST', { token })));
 check(accepted.every(result => result.status === 200 && result.data.success === true && result.data.property_id === property), 'Concurrent correct-user invitation acceptance was not confirmed');
 const repeat = await unrelated.request('/api/tenant-invite/accept', 'POST', { token });
 check(repeat.status === 200 && repeat.data.success === true, 'Repeated invitation acceptance failed');
 const linked = db(await service.from('property_tenants').select('user_id,invitation_accepted_at').eq('id', tenantId).single());
 check(linked.user_id === unrelated.id && linked.invitation_accepted_at, 'Invitation did not persist the verified invitee');
 console.log('PASS: invitation rejects a different verified user; concurrent and repeated acceptance confirms one persisted invited identity. Synthetic fixture only; no invitation email sent.');
 console.log(`PASS: 5 real ${bearerMode ? 'provider-bearer' : 'cookie'}-authenticated roles; 15 authorized/denied reads; owner/manager/team-admin contact and schedule writes; viewer/unrelated write denial; delegated owner attribution. No email or payment provider called.`);
 console.log('PASS: 5-role reporting/team access; public reporting tokens differ from row IDs, load successfully and revoke with 410; owner/team-admin invite/remove allowed and manager/viewer/unrelated denied. No report submitted and no email sent.');
} finally {
 db(await service.from('properties').delete().eq('id', property));
 for (const id of users) { db(await service.from('homeowner_subscriptions').delete().eq('homeowner_id', id)); db(await service.auth.admin.deleteUser(id)); }
}})().catch(error => { console.error(error.message); process.exitCode = 1; });
