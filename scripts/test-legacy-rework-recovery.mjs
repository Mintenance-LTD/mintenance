import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const { PGlite } = await import(
  process.env.PGLITE_MODULE || '@electric-sql/pglite'
);
const db = new PGlite();
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role BYPASSRLS;
CREATE TABLE profiles(id uuid PRIMARY KEY,role text,deleted_at timestamptz);
CREATE TABLE jobs(id uuid PRIMARY KEY,contractor_id uuid,status text,category text,completion_confirmed_by_homeowner boolean DEFAULT false,completed_at timestamptz,updated_at timestamptz);
CREATE TABLE job_rework_requests(id uuid PRIMARY KEY,job_id uuid,created_at timestamptz);
CREATE TABLE job_photos_metadata(job_id uuid,photo_type text,verified boolean,created_at timestamptz,angle_type text);
CREATE TABLE escrow_transactions(id uuid PRIMARY KEY,job_id uuid,status text,amount numeric,homeowner_approval boolean,admin_hold_status text,release_blocked_reason text,auto_approval_date timestamptz,auto_release_date timestamptz,cooling_off_ends_at timestamptz,created_at timestamptz,updated_at timestamptz);
CREATE TABLE disputes(id uuid,job_id uuid,status text);CREATE TABLE dispute_escrow_links(dispute_id uuid,escrow_id uuid);
CREATE TABLE escrow_dispute_resolutions(escrow_id uuid);CREATE TABLE escrow_transfer_attempts(escrow_id uuid);CREATE TABLE escrow_admin_release_operations(escrow_id uuid);CREATE TABLE escrow_refund_operations(escrow_id uuid,state text);CREATE TABLE escrow_refund_balances(escrow_id uuid,needs_review boolean);
CREATE TABLE contracts(id uuid PRIMARY KEY,status text,updated_at timestamptz);
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;`);
for (const name of [
  '20261116215658_rework_cycle_completion_guard',
  '20261117014742_legacy_rework_recovery',
])
  await db.exec(
    readFileSync(
      new URL(`../supabase/migrations/${name}.sql`, import.meta.url),
      'utf8'
    )
  );
const transitions = readFileSync(
  new URL(
    '../supabase/migrations/20260922145716_atomic_customer_job_dispute.sql',
    import.meta.url
  ),
  'utf8'
);
await db.exec(
  transitions.slice(
    0,
    transitions.indexOf('$$;', transitions.indexOf('AS $$')) + 3
  )
);
await db.exec(
  'CREATE TRIGGER validate_status BEFORE UPDATE OF status ON jobs FOR EACH ROW EXECUTE FUNCTION validate_job_status_transition()'
);
await db.query(
  `INSERT INTO profiles VALUES($1,'contractor',null),($2,'homeowner',null)`,
  [id(1), id(2)]
);
await db.query(
  `INSERT INTO jobs VALUES($1,$2,'completed','painting',false,'2026-11-16T12:00Z',now())`,
  [id(3), id(1)]
);
await db.query(
  `INSERT INTO job_rework_requests(id,job_id,created_at) VALUES($1,$2,'2026-11-16T10:00Z')`,
  [id(4), id(3)]
);
await db.query(
  `INSERT INTO escrow_transactions(id,job_id,status,amount,homeowner_approval,admin_hold_status,release_blocked_reason,auto_approval_date,auto_release_date,cooling_off_ends_at,created_at) VALUES($1,$2,'held',1.20,false,'admin_hold','Independent administrator hold',now(),now(),now(),now())`,
  [id(5), id(3)]
);
const recover = (actor = id(1), cycle = id(4)) =>
  db.query('SELECT recover_legacy_rework($1,$2,$3) AS applied', [
    actor,
    id(3),
    cycle,
  ]);
const submit = () =>
  db.query('SELECT submit_job_rework($1,$2,$3) AS applied', [
    id(3),
    id(1),
    id(4),
  ]);
let n = 0;
const eq = (a, b) => {
  assert.deepEqual(a, b);
  n++;
};
const rejects = async (p, re) => {
  await assert.rejects(p, re);
  n++;
};
await db.exec('SET ROLE authenticated');
await rejects(recover(), /permission denied/);
await db.exec('RESET ROLE;SET ROLE service_role');
await rejects(recover(id(2)), /contractor required/);
await rejects(recover(id(1), id(9)), /cycle changed/);
await db
  .exec('UPDATE jobs SET completion_confirmed_by_homeowner=true')
  .catch(() => {}); // Evidence guard may reject before the flag changes.
await db.exec(
  'RESET ROLE;ALTER TABLE jobs DISABLE TRIGGER guard_rework_completion_evidence;UPDATE jobs SET completion_confirmed_by_homeowner=true;ALTER TABLE jobs ENABLE TRIGGER guard_rework_completion_evidence;SET ROLE service_role'
);
await rejects(recover(), /unapproved legacy/);
await db.exec('UPDATE jobs SET completion_confirmed_by_homeowner=false');
await db.exec('UPDATE escrow_transactions SET homeowner_approval=true');
await rejects(recover(), /requires review/);
await db.exec('UPDATE escrow_transactions SET homeowner_approval=false');
await db.query(`INSERT INTO disputes VALUES($1,$2,'open')`, [id(6), id(3)]);
await rejects(recover(), /requires review/);
await db.exec('DELETE FROM disputes');
await db.query('INSERT INTO escrow_transfer_attempts VALUES($1)', [id(5)]);
await rejects(recover(), /requires review/);
await db.exec('DELETE FROM escrow_transfer_attempts');
eq((await recover()).rows[0].applied, true);
eq((await recover()).rows[0].applied, false);
eq((await db.query('SELECT status FROM jobs')).rows[0].status, 'in_progress');
const e = (await db.query('SELECT * FROM escrow_transactions')).rows[0];
eq(
  [
    e.amount,
    e.status,
    e.admin_hold_status,
    e.auto_approval_date,
    e.auto_release_date,
    e.cooling_off_ends_at,
  ],
  ['1.20', 'held', 'admin_hold', null, null, null]
);
eq(
  (await db.query('SELECT previous_completed_at FROM legacy_rework_recoveries'))
    .rows[0].previous_completed_at,
  new Date('2026-11-16T12:00Z')
);
await rejects(submit(), /evidence is incomplete/);
await db.query(
  `INSERT INTO job_photos_metadata SELECT $1,'after',true,'2026-11-16T13:00Z',angle FROM unnest(ARRAY['wide','close-up','wide']) angle`,
  [id(3)]
);
eq((await submit()).rows[0].applied, true);
eq((await recover()).rows[0].applied, false);
eq((await db.query('SELECT status FROM jobs')).rows[0].status, 'completed');
eq(
  (await db.query('SELECT release_blocked_reason FROM escrow_transactions'))
    .rows[0].release_blocked_reason,
  'Independent administrator hold'
);
await db.close();
console.log(
  `${n} PostgreSQL legacy-rework checks passed, including the real job transition and fresh-evidence triggers.`
);
