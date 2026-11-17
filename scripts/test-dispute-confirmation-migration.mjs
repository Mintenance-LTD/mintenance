import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const { PGlite } = await import(
  process.env.PGLITE_MODULE || '@electric-sql/pglite'
);
const db = new PGlite();
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role BYPASSRLS;
CREATE TABLE profiles(id uuid PRIMARY KEY,role text,deleted_at timestamptz);
CREATE TABLE jobs(id uuid PRIMARY KEY);
CREATE TABLE escrow_transactions(id uuid PRIMARY KEY,job_id uuid,amount numeric,status text,payer_id uuid,payee_id uuid,admin_hold_status text,admin_hold_by uuid,admin_hold_reason text,admin_hold_at timestamptz,updated_at timestamptz);
CREATE TABLE disputes(id uuid PRIMARY KEY,job_id uuid,status text);
CREATE TABLE dispute_escrow_links(dispute_id uuid,escrow_id uuid);
CREATE TABLE escrow_transfer_attempts(escrow_id uuid);
CREATE TABLE escrow_refund_operations(id uuid PRIMARY KEY,escrow_id uuid,state text);
CREATE TABLE escrow_admin_release_operations(id uuid PRIMARY KEY,escrow_id uuid);
CREATE TABLE escrow_refund_balances(escrow_id uuid,gross_minor integer,remaining_minor integer,needs_review boolean);
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;`);
for (const name of [
  '20260916015424_reserve_dispute_resolution_decisions',
  '20261117012131_dispute_settlement_confirmation',
])
  await db.exec(
    readFileSync(
      new URL(`../supabase/migrations/${name}.sql`, import.meta.url),
      'utf8'
    )
  );
await db.query(
  `INSERT INTO profiles VALUES($1,'admin',null),($2,'homeowner',null),($3,'contractor',null)`,
  [id(1), id(2), id(3)]
);
await db.query('INSERT INTO jobs VALUES($1)', [id(4)]);
await db.query(
  `INSERT INTO escrow_transactions(id,job_id,amount,status,payer_id,payee_id) VALUES($1,$2,1.20,'disputed',$3,$4)`,
  [id(5), id(4), id(2), id(3)]
);
await db.query(`INSERT INTO disputes VALUES($1,$2,'open')`, [id(6), id(4)]);
await db.query(`INSERT INTO dispute_escrow_links VALUES($1,$2)`, [
  id(6),
  id(5),
]);
await db.query(`INSERT INTO escrow_refund_balances VALUES($1,120,100,false)`, [
  id(5),
]);
const reserve = (
  principal = 100,
  fee = 0.1,
  payer = id(2),
  payee = id(3),
  decision = 'pay_contractor'
) =>
  db.query(
    'SELECT * FROM reserve_confirmed_dispute_resolution($1,$2,$3,$4,$5,$6,$7,$8,$9)',
    [
      id(1),
      id(5),
      decision,
      'Reviewed test case',
      0.1,
      principal,
      fee,
      payer,
      payee,
    ]
  );
await db.exec('SET ROLE authenticated');
await assert.rejects(reserve(), /permission denied/);
await db.exec('RESET ROLE;SET ROLE service_role');
for (const args of [
  [120, 0.1, id(2), id(3)],
  [100, 0.2, id(2), id(3)],
  [100, 0.1, id(3), id(2)],
]) {
  await assert.rejects(reserve(...args), /preview changed/);
  assert.equal(
    (
      await db.query(
        'SELECT count(*)::int AS n FROM escrow_dispute_resolutions'
      )
    ).rows[0].n,
    0
  );
  assert.equal(
    (await db.query('SELECT admin_hold_status FROM escrow_transactions'))
      .rows[0].admin_hold_status,
    null
  );
}
const result = (await reserve()).rows[0];
assert.equal(result.principal_minor, 100);
assert.equal(result.fee_rate, '0.1');
assert.equal((await reserve()).rows[0].id, result.id);
await assert.rejects(
  reserve(100, 0.1, id(2), id(3), 'refund_homeowner'),
  /decision changed/
);
await db.exec('UPDATE escrow_refund_balances SET remaining_minor=50');
assert.equal((await reserve()).rows[0].principal_minor, 100); // A saved decision is recovered, not repriced.
await db.close();
console.log(
  '15 PostgreSQL settlement-confirmation assertions passed: role gate, stale balance/fee/recipients rollback, retry and frozen decision.'
);
