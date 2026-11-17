import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const { PGlite } = await import(
  process.env.PGLITE_MODULE || '@electric-sql/pglite'
);
const db = new PGlite();
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
await db.exec(`
CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
CREATE TABLE profiles(id uuid PRIMARY KEY,role text,deleted_at timestamptz);
CREATE TABLE jobs(id uuid PRIMARY KEY,status text);
CREATE TABLE escrow_transactions(id uuid PRIMARY KEY,job_id uuid,status text,amount numeric,admin_hold_status text,admin_hold_by uuid,admin_hold_at timestamptz,admin_hold_reason text,release_blocked_reason text,auto_release_enabled boolean,auto_approval_date timestamptz,auto_release_date timestamptz,cooling_off_ends_at timestamptz,updated_at timestamptz);
CREATE TABLE disputes(id uuid PRIMARY KEY,job_id uuid,status text CHECK(status IN('open','under_review','escalated','closed','resolved')),resolution text,resolved_at timestamptz,updated_at timestamptz);
CREATE TABLE dispute_escrow_links(dispute_id uuid,escrow_id uuid);
CREATE TABLE escrow_dispute_resolutions(escrow_id uuid);
CREATE TABLE escrow_transfer_attempts(escrow_id uuid);
CREATE TABLE escrow_admin_release_operations(escrow_id uuid);
CREATE TABLE escrow_refund_operations(escrow_id uuid,state text);
CREATE TABLE escrow_refund_balances(escrow_id uuid,needs_review boolean,remaining_minor integer);
CREATE TABLE admin_dispute_tasks(dispute_id uuid,status text,completed_at timestamptz);
CREATE TABLE contracts(id uuid PRIMARY KEY,status text,terms text);
CREATE TABLE notifications(id uuid);
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
`);
await db.exec(
  readFileSync(
    new URL(
      '../supabase/migrations/20261117011123_dispute_case_nonfinancial_closure.sql',
      import.meta.url
    ),
    'utf8'
  )
);
await db.query(
  `INSERT INTO profiles VALUES($1,'admin',null),($2,'homeowner',null),($3,'admin',now())`,
  [id(1), id(2), id(3)]
);
await db
  .query(
    `INSERT INTO jobs VALUES($1,'disputed'); INSERT INTO contracts VALUES('${id(4)}','accepted','Original signed terms')`,
    [id(4)]
  )
  .catch(async () => {
    await db.query(`INSERT INTO jobs VALUES($1,'disputed')`, [id(4)]);
    await db.query(
      `INSERT INTO contracts VALUES($1,'accepted','Original signed terms')`,
      [id(4)]
    );
  });
await db.query(
  `INSERT INTO escrow_transactions(id,job_id,status,amount,admin_hold_status,auto_release_enabled,auto_approval_date,auto_release_date,cooling_off_ends_at) VALUES($1,$2,'disputed',1.20,'pending_review',true,now(),now(),now()),($3,$2,'held',1,'none',true,now(),now(),now())`,
  [id(5), id(4), id(6)]
);
await db.query(
  `INSERT INTO disputes(id,job_id,status) VALUES($1,$2,'open'),($3,$2,'open')`,
  [id(7), id(4), id(8)]
);
await db.query(`INSERT INTO dispute_escrow_links VALUES($1,$2),($3,$4)`, [
  id(7),
  id(5),
  id(8),
  id(6),
]);
await db.query(`INSERT INTO admin_dispute_tasks VALUES($1,'open',null)`, [
  id(7),
]);
await db.query(`INSERT INTO escrow_refund_balances VALUES($1,false,120)`, [
  id(5),
]);
const close = (
  admin = id(1),
  escrow = id(5),
  dispute = id(7),
  reason = 'Withdrawn test complaint'
) =>
  db.query('SELECT * FROM close_dispute_without_settlement($1,$2,$3,$4)', [
    admin,
    escrow,
    dispute,
    reason,
  ]);
let checks = 0;
const rejects = async (promise, pattern) => {
  await assert.rejects(promise, pattern);
  checks++;
};
const equal = (a, b) => {
  assert.deepEqual(a, b);
  checks++;
};
await db.exec('SET ROLE authenticated');
await rejects(close(), /permission denied/);
await rejects(
  db.query('SELECT * FROM dispute_nonfinancial_closures'),
  /permission denied/
);
await db.exec('RESET ROLE; SET ROLE service_role');
await rejects(close(id(2)), /administrator required/);
await rejects(close(id(3)), /administrator required/);
await rejects(close(id(1), id(6)), /does not belong/);
await rejects(close(id(1), id(5), id(8)), /does not belong/);
await rejects(close(id(1), id(5), id(7), 'short'), /10-1000/);
for (const table of [
  'escrow_dispute_resolutions',
  'escrow_transfer_attempts',
  'escrow_admin_release_operations',
]) {
  await db.query(`INSERT INTO ${table} VALUES($1)`, [id(5)]);
  await rejects(close(), /already started/);
  await db.query(`DELETE FROM ${table}`);
}
for (const state of [
  'reserved',
  'pending',
  'requires_action',
  'reconciliation_required',
]) {
  await db.query(`INSERT INTO escrow_refund_operations VALUES($1,$2)`, [
    id(5),
    state,
  ]);
  await rejects(close(), /already started/);
  await db.exec('DELETE FROM escrow_refund_operations');
}
await db.exec('UPDATE escrow_refund_balances SET needs_review=true');
await rejects(close(), /already started/);
await db.exec('UPDATE escrow_refund_balances SET needs_review=false');
await db.query('INSERT INTO dispute_escrow_links VALUES($1,$2)', [
  id(8),
  id(5),
]);
await rejects(close(), /Multiple open/);
await db.query(
  'DELETE FROM dispute_escrow_links WHERE dispute_id=$1 AND escrow_id=$2',
  [id(8), id(5)]
);
equal(
  (
    await db.query(
      'SELECT count(*)::int AS n FROM dispute_nonfinancial_closures'
    )
  ).rows[0].n,
  0
);
equal(
  (await db.query('SELECT status FROM disputes WHERE id=$1', [id(7)])).rows[0]
    .status,
  'open'
);
const first = (await close()).rows[0];
equal(first.escrow_id, id(5));
equal((await close()).rows[0].id, first.id);
await rejects(
  close(id(1), id(5), id(7), 'A different closure reason'),
  /already recorded/
);
const payment = (
  await db.query('SELECT * FROM escrow_transactions WHERE id=$1', [id(5)])
).rows[0];
equal(
  [
    payment.status,
    payment.admin_hold_status,
    payment.auto_release_enabled,
    payment.auto_approval_date,
    payment.auto_release_date,
    payment.cooling_off_ends_at,
  ],
  ['held', 'admin_hold', false, null, null, null]
);
equal(payment.amount, '1.20');
equal(
  (await db.query('SELECT status FROM disputes WHERE id=$1', [id(7)])).rows[0]
    .status,
  'closed'
);
equal(
  (await db.query('SELECT status FROM admin_dispute_tasks')).rows[0].status,
  'completed'
);
equal((await db.query('SELECT status FROM jobs')).rows[0].status, 'disputed');
equal(
  (await db.query('SELECT terms FROM contracts')).rows[0].terms,
  'Original signed terms'
);
equal(
  (await db.query('SELECT remaining_minor FROM escrow_refund_balances')).rows[0]
    .remaining_minor,
  120
);
equal(
  (
    await db.query('SELECT status FROM escrow_transactions WHERE id=$1', [
      id(6),
    ])
  ).rows[0].status,
  'held'
);
for (const table of [
  'escrow_dispute_resolutions',
  'escrow_transfer_attempts',
  'escrow_admin_release_operations',
  'escrow_refund_operations',
  'notifications',
])
  equal(
    (await db.query(`SELECT count(*)::int AS n FROM ${table}`)).rows[0].n,
    0
  );
await db.query(`UPDATE escrow_transactions SET status='refunded' WHERE id=$1`, [
  id(5),
]);
await close();
equal(
  (
    await db.query('SELECT status FROM escrow_transactions WHERE id=$1', [
      id(5),
    ])
  ).rows[0].status,
  'refunded'
);
await rejects(
  db.query(
    'INSERT INTO dispute_nonfinancial_closures(dispute_id,escrow_id,closed_by,reason) VALUES($1,$2,$3,$4)',
    [id(8), id(6), id(1), 'Direct table write']
  ),
  /permission denied/
);
await db.close();
console.log(
  `${checks} disposable PostgreSQL closure assertions passed; no provider calls or production data used.`
);
