import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const { PGlite } = await import(
  process.env.PGLITE_MODULE || '@electric-sql/pglite'
);
const db = new PGlite();
await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
CREATE TABLE jobs(id uuid PRIMARY KEY,contractor_id uuid,status text,category text,completion_confirmed_by_homeowner boolean DEFAULT false,completed_at timestamptz,updated_at timestamptz);
CREATE TABLE job_rework_requests(id uuid PRIMARY KEY,job_id uuid,created_at timestamptz);
CREATE TABLE job_photos_metadata(job_id uuid,photo_type text,verified boolean,created_at timestamptz,angle_type text);
CREATE TABLE escrow_transactions(id uuid PRIMARY KEY,job_id uuid,status text,created_at timestamptz,release_blocked_reason text,updated_at timestamptz,admin_hold_status text);
CREATE TABLE contracts(id uuid PRIMARY KEY,status text,updated_at timestamptz);
ALTER TABLE job_rework_requests ENABLE ROW LEVEL SECURITY;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;`);
await db.exec(
  readFileSync(
    new URL(
      '../supabase/migrations/20261116215658_rework_cycle_completion_guard.sql',
      import.meta.url
    ),
    'utf8'
  )
);
const job = '00000000-0000-4000-8000-000000000001',
  actor = '00000000-0000-4000-8000-000000000002',
  cycle = '00000000-0000-4000-8000-000000000003',
  escrow = '00000000-0000-4000-8000-000000000004',
  foreign = '00000000-0000-4000-8000-000000000005';
await db.query(
  `INSERT INTO jobs VALUES($1,$2,'in_progress','painting',false,NULL,now());`,
  [job, actor]
);
await db.query(
  `INSERT INTO job_rework_requests(id,job_id,created_at) VALUES($1,$2,'2026-11-16T10:00Z')`,
  [cycle, job]
);
await db.query(
  `INSERT INTO escrow_transactions VALUES($1,$2,'held',now(),'Rework requested; completion must be reviewed again',now(),'admin_hold')`,
  [escrow, job]
);
await db.query(
  `INSERT INTO job_photos_metadata SELECT $1,'after',true,'2026-11-15T10:00Z','wide' FROM generate_series(1,3)`,
  [job]
);
await db.exec('SET ROLE service_role');
const submit = (who = actor, id = cycle) =>
  db.query('SELECT submit_job_rework($1,$2,$3) AS applied', [job, who, id]);
await assert.rejects(submit(foreign), /Not assigned/);
await assert.rejects(submit(actor, foreign), /cycle changed/);
await assert.rejects(submit(), /evidence is incomplete/);
await assert.rejects(
  db.query(
    'UPDATE jobs SET completion_confirmed_by_homeowner=true WHERE id=$1',
    [job]
  ),
  /evidence is incomplete/
);
await db.query(
  `INSERT INTO job_photos_metadata VALUES($1,'after',true,'2026-11-16T11:00Z','wide')`,
  [job]
);
await assert.rejects(submit(), /evidence is incomplete/);
await db.query(
  `INSERT INTO job_photos_metadata SELECT $1,'after',true,'2026-11-16T11:01Z','wide' FROM generate_series(1,2)`,
  [job]
);
await assert.rejects(submit(), /evidence is incomplete/);
await db.query(
  `INSERT INTO job_photos_metadata VALUES($1,'after',true,'2026-11-16T11:02Z','close-up')`,
  [job]
);
await assert.rejects(
  db.query(`UPDATE jobs SET status='completed' WHERE id=$1`, [job]),
  /Explicit submission/
);
assert.equal((await submit()).rows[0].applied, true);
assert.equal((await submit()).rows[0].applied, false);
const payment = (await db.query('SELECT * FROM escrow_transactions')).rows[0];
assert.equal(payment.status, 'held');
assert.equal(payment.release_blocked_reason, null);
assert.equal(payment.admin_hold_status, 'admin_hold');
await db.exec('RESET ROLE; SET ROLE authenticated');
await assert.rejects(submit(), /permission denied/);
await assert.rejects(
  db.query('SELECT * FROM job_rework_requests'),
  /permission denied/
);
await db.exec('RESET ROLE');
await db.query(`INSERT INTO contracts(id,status) VALUES($1,'draft')`, [job]);
assert.equal(
  (await db.query('SELECT sent_at FROM contracts')).rows[0].sent_at,
  null
);
await db.query(`UPDATE contracts SET status='pending_homeowner' WHERE id=$1`, [
  job,
]);
const sent = (await db.query('SELECT sent_at FROM contracts')).rows[0].sent_at;
assert.ok(sent);
await db.query(
  `UPDATE contracts SET status='accepted',updated_at=now(),sent_at='2000-01-01' WHERE id=$1`,
  [job]
);
assert.deepEqual(
  (await db.query('SELECT sent_at FROM contracts')).rows[0].sent_at,
  sent
);
await db.close();
console.log(
  '19 disposable PostgreSQL assertions passed: fresh evidence, required views, cycle/actor fencing, explicit submission, retry, held payment, independent hold, privileges and immutable first-send timestamp.'
);
