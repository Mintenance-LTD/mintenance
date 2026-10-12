// Isolated Postgres regression; never connects to live services.
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const { PGlite } = await import(
  process.env.PGLITE_MODULE || '@electric-sql/pglite'
);
const db = new PGlite();
await db.exec(`
CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
CREATE TABLE profiles(id uuid PRIMARY KEY, role text);
CREATE TABLE properties(id uuid PRIMARY KEY,owner_id uuid);
CREATE TABLE jobs(homeowner_id uuid,contractor_id uuid,status text);
CREATE TABLE property_team_members(property_id uuid,user_id uuid,status text,role text);
CREATE TABLE recurring_schedules(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),property_id uuid,owner_id uuid,title text,description text,task_type text,category text,frequency text,next_due_date date,auto_create_job boolean,is_active boolean);
CREATE TABLE recurring_schedule_requests(actor_id uuid,property_id uuid,request_id uuid,request_payload jsonb,schedule_id uuid,PRIMARY KEY(actor_id,property_id,request_id));
CREATE TABLE push_dispatch_attempts(id uuid PRIMARY KEY,status text CONSTRAINT push_dispatch_attempts_status_check CHECK(status IN ('started','recorded','needs_review')));
`);
await db.exec(
  readFileSync(
    new URL(
      '../supabase/migrations/20261012104314_recurring_audience_and_push_review.sql',
      import.meta.url
    ),
    'utf8'
  )
);
const owner = '00000000-0000-4000-8000-000000000001',
  contractor = '00000000-0000-4000-8000-000000000002',
  outsider = '00000000-0000-4000-8000-000000000003',
  property = '00000000-0000-4000-8000-000000000004',
  request = '00000000-0000-4000-8000-000000000005';
await db.query(
  `INSERT INTO profiles VALUES ($1,'homeowner'),($2,'contractor'),($3,'contractor')`,
  [owner, contractor, outsider]
);
await db.query('INSERT INTO properties VALUES ($1,$2)', [property, owner]);
await db.query(`INSERT INTO jobs VALUES ($1,$2,'completed')`, [
  owner,
  contractor,
]);
const details = {
  title: 'Garden care',
  description: 'Test',
  task_type: 'Garden Maintenance',
  category: 'gardening',
  frequency: 'monthly',
  next_due_date: '2026-11-01',
  auto_create_job: true,
  notification_audience: 'preferred',
  preferred_contractor_id: contractor,
};
const create = (actor, body) =>
  db.query('SELECT create_recurring_schedule_once($1,$2,$3,$4) as schedule', [
    actor,
    property,
    request,
    JSON.stringify(body),
  ]);
await assert.rejects(create(outsider, details), /Property not found/);
await assert.rejects(
  create(owner, { ...details, preferred_contractor_id: outsider }),
  /previously hired/
);
const first = (await create(owner, details)).rows[0].schedule;
assert.equal(first.preferred_contractor_id, contractor);
assert.equal((await create(owner, details)).rows[0].schedule.id, first.id);
await assert.rejects(
  create(owner, { ...details, title: 'Changed' }),
  /different details/
);
await db.query('DELETE FROM profiles WHERE id=$1', [contractor]);
const remaining = (await db.query('SELECT * FROM recurring_schedules')).rows[0];
assert.equal(remaining.preferred_contractor_id, null);
assert.equal(remaining.notification_audience, 'preferred');
await db.query(
  "INSERT INTO push_dispatch_attempts(id,status,review_note,reviewed_at,reviewed_by) VALUES ($1,'reviewed_unknown','Receipt unavailable; outcome unknown',now(),$2)",
  [request, owner]
);
assert.equal(
  (await db.query('SELECT status FROM push_dispatch_attempts')).rows[0].status,
  'reviewed_unknown'
);
assert.equal(
  (
    await db.query(
      "SELECT has_function_privilege('authenticated','create_recurring_schedule_once(uuid,uuid,uuid,jsonb)','EXECUTE') allowed"
    )
  ).rows[0].allowed,
  false
);
console.log(
  'PASS ownership, contractor relationship, idempotency, deleted contractor fail-closed scope, push review status and RPC permissions'
);
await db.close();
