import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const { PGlite } = await import(
  process.env.PGLITE_MODULE || '@electric-sql/pglite'
);
const db = new PGlite();
const id = (n) => '00000000-0000-4000-8000-' + String(n).padStart(12, '0');
const [job, contractor, homeowner, stranger] = [1, 2, 3, 4].map(id);
await db.exec(`
  CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
  CREATE TABLE jobs (
    id uuid PRIMARY KEY, homeowner_id uuid, payer_user_id uuid, contractor_id uuid, title text, status text,
    scheduled_start_date timestamptz, scheduled_end_date timestamptz, scheduled_duration_hours integer, updated_at timestamptz
  );
  CREATE TABLE contracts (job_id uuid, status text, homeowner_signed_at timestamptz, contractor_signed_at timestamptz, start_date date, end_date date);
  CREATE TABLE appointments (job_id uuid, appointment_date date);
  CREATE TABLE notification_queue (
    user_id uuid, notification_type text, priority text, title text, message text, action_url text, metadata jsonb, scheduled_for timestamptz
  );
  GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
`);
await db.exec(
  readFileSync(
    new URL(
      '../supabase/migrations/20261124140523_confirm_job_work_windows.sql',
      import.meta.url
    ),
    'utf8'
  )
);
await db.query(
  `INSERT INTO jobs VALUES ($1,$2,NULL,$3,'Garden work','assigned','2099-05-01 08:00Z','2099-05-01 13:00Z',5,now())`,
  [job, homeowner, contractor]
);
await db.query(
  `INSERT INTO contracts VALUES ($1,'accepted',now(),now(),'2099-05-01','2099-05-01')`,
  [job]
);
await db.query(`INSERT INTO appointments VALUES ($1,'2099-05-01')`, [job]);
await db.exec('SET ROLE service_role');
const apply = async (actor, action, start = null, proposal = null) =>
  (
    await db.query(
      'SELECT apply_job_work_window_action($1,$2,$3,$4,$5,$6,$7) AS result',
      [actor, job, start, null, null, proposal, action]
    )
  ).rows[0].result;
const window = async () =>
  (
    await db.query('SELECT scheduled_start_date FROM jobs WHERE id=$1', [job])
  ).rows[0].scheduled_start_date.toISOString();
const count = async () =>
  (await db.query('SELECT count(*)::int AS n FROM notification_queue')).rows[0]
    .n;

await assert.rejects(apply(stranger, 'propose', '2099-05-02 08:00Z'), {
  code: '42501',
});
const proposal = await apply(contractor, 'propose', '2099-05-02 08:00Z');
assert.equal(proposal.response_by, homeowner);
assert.equal(await window(), '2099-05-01T08:00:00.000Z');
assert.equal(
  (await apply(contractor, 'propose', '2099-05-02 08:00Z')).id,
  proposal.id
);
assert.equal(await count(), 1);
await assert.rejects(apply(homeowner, 'propose', '2099-05-03 08:00Z'), {
  code: '40001',
});
await assert.rejects(apply(contractor, 'accepted', null, proposal.id), {
  code: '42501',
});
assert.equal(
  (await apply(homeowner, 'declined', null, proposal.id)).state,
  'declined'
);
assert.equal(await window(), '2099-05-01T08:00:00.000Z');

const replacement = await apply(homeowner, 'propose', '2099-05-04 08:00Z');
await db.exec(
  "RESET ROLE; ALTER TABLE notification_queue ADD CHECK (title <> 'Work-window proposal accepted'); SET ROLE service_role"
);
await assert.rejects(apply(contractor, 'accepted', null, replacement.id), {
  code: '23514',
});
assert.equal(await window(), '2099-05-01T08:00:00.000Z');
assert.equal(
  (
    await db.query('SELECT state FROM job_work_window_proposals WHERE id=$1', [
      replacement.id,
    ])
  ).rows[0].state,
  'pending'
);
await db.exec(
  'RESET ROLE; ALTER TABLE notification_queue DROP CONSTRAINT notification_queue_title_check; SET ROLE service_role'
);
assert.equal(
  (await apply(contractor, 'accepted', null, replacement.id)).state,
  'accepted'
);
assert.equal(await window(), '2099-05-04T08:00:00.000Z');
assert.equal(await count(), 4);
assert.equal(
  (await apply(contractor, 'accepted', null, replacement.id)).state,
  'accepted'
);
assert.equal(await count(), 4);
assert.equal(
  (await db.query('SELECT start_date::text AS date FROM contracts')).rows[0]
    .date,
  '2099-05-01'
);
assert.equal(
  (await db.query('SELECT appointment_date::text AS date FROM appointments'))
    .rows[0].date,
  '2099-05-01'
);
await db.exec('RESET ROLE; SET ROLE authenticated');
await assert.rejects(apply(homeowner, 'propose', '2099-05-08 08:00Z'), {
  code: '42501',
});
await db.close();
console.log('Work-window migration checks passed');
