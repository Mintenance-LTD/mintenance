// Run with PGLITE_MODULE pointing to an installed @electric-sql/pglite module.
// Uses an isolated database; never connects to a project or payment provider.
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const { PGlite } = await import(
  process.env.PGLITE_MODULE || '@electric-sql/pglite'
);
const db = new PGlite();
const migration = readFileSync(
  new URL(
    '../supabase/migrations/20261011221000_preserve_completed_job_on_refund.sql',
    import.meta.url
  ),
  'utf8'
);
const legacySource = readFileSync(
  new URL(
    '../supabase/migrations/20260915200910_durable_job_exit_operations.sql',
    import.meta.url
  ),
  'utf8'
);
const legacyFunction = legacySource
  .slice(
    legacySource.indexOf(
      'CREATE OR REPLACE FUNCTION public.record_escrow_refund_outcome'
    )
  )
  .split('CREATE FUNCTION public.guard_job_exit_financial_claim')[0];
const transition = readFileSync(
  new URL(
    '../supabase/migrations/20260922145716_atomic_customer_job_dispute.sql',
    import.meta.url
  ),
  'utf8'
).split('CREATE OR REPLACE FUNCTION public.create_dispute_atomic')[0];
await db.exec(`
CREATE TABLE jobs(id uuid PRIMARY KEY,status text,payment_status text,updated_at timestamptz);
CREATE TABLE disputes(id uuid PRIMARY KEY,job_id uuid,status text);
CREATE TABLE dispute_escrow_links(dispute_id uuid,escrow_id uuid);
CREATE TABLE escrow_transactions(id uuid PRIMARY KEY,job_id uuid,status text,release_reason text,refunded_at timestamptz,updated_at timestamptz);
CREATE TABLE escrow_refund_operations(id uuid PRIMARY KEY,escrow_id uuid,actor_id uuid,job_exit_id uuid,cash_minor bigint,credit_minor bigint,provider_refund_id text,state text,updated_at timestamptz);
CREATE TABLE escrow_refund_balances(escrow_id uuid PRIMARY KEY,gross_minor bigint,cash_refunded_minor bigint DEFAULT 0,credit_returned_minor bigint DEFAULT 0,needs_review boolean DEFAULT false,remaining_minor bigint GENERATED ALWAYS AS (gross_minor-cash_refunded_minor-credit_returned_minor) STORED);
CREATE FUNCTION restore_user_credit(uuid,bigint,uuid) RETURNS boolean LANGUAGE sql AS 'SELECT true';
${transition}
CREATE TRIGGER validate_job_status BEFORE UPDATE ON jobs FOR EACH ROW EXECUTE FUNCTION validate_job_status_transition();
${migration}`);
const job = '00000000-0000-0000-0000-000000000001';
const escrow = '00000000-0000-0000-0000-000000000002';
const operation = '00000000-0000-0000-0000-000000000003';
for (const [initial, amount, expectedJob, expectedEscrow] of [
  ['completed', 190, 'completed', 'refunded'],
  ['in_progress', 190, 'cancelled', 'refunded'],
  ['completed', 95, 'completed', 'held'],
  ['cancelled', 190, 'cancelled', 'refunded'],
]) {
  await db.exec(
    'TRUNCATE jobs,escrow_transactions,escrow_refund_operations,escrow_refund_balances'
  );
  await db.query('INSERT INTO jobs VALUES ($1,$2,$3,now())', [
    job,
    initial,
    'paid',
  ]);
  await db.query(
    "INSERT INTO escrow_transactions VALUES ($1,$2,'release_pending','refund_pending',null,now())",
    [escrow, job]
  );
  await db.query(
    "INSERT INTO escrow_refund_operations VALUES ($1,$2,$3,null,$4,0,null,'reserved',now())",
    [operation, escrow, job, amount]
  );
  await db.query(
    'INSERT INTO escrow_refund_balances(escrow_id,gross_minor) VALUES ($1,190)',
    [escrow]
  );
  if (initial === 'completed' && amount === 190) {
    await db.exec(legacyFunction);
    await assert.rejects(
      db.query(
        "SELECT * FROM record_escrow_refund_outcome($1,'re_test','succeeded')",
        [operation]
      ),
      /Cannot transition from completed/
    );
    const {
      rows: [unchanged],
    } = await db.query(
      'SELECT cash_refunded_minor FROM escrow_refund_balances'
    );
    assert.equal(Number(unchanged.cash_refunded_minor), 0);
    await db.exec(migration);
    console.log('PASS reproduces original failure and transactional rollback');
  }
  await db.query(
    "SELECT * FROM record_escrow_refund_outcome($1,'re_test','succeeded')",
    [operation]
  );
  // A duplicate provider confirmation must not add the refund again.
  await db.query(
    "SELECT * FROM record_escrow_refund_outcome($1,'re_test','succeeded')",
    [operation]
  );
  const {
    rows: [result],
  } = await db.query(
    'SELECT j.status,j.payment_status,e.status AS escrow_status,b.cash_refunded_minor,r.state,r.provider_refund_id FROM jobs j CROSS JOIN escrow_transactions e CROSS JOIN escrow_refund_balances b CROSS JOIN escrow_refund_operations r'
  );
  assert.equal(result.status, expectedJob);
  assert.equal(result.escrow_status, expectedEscrow);
  assert.equal(Number(result.cash_refunded_minor), amount);
  assert.equal(result.state, 'succeeded');
  assert.equal(result.provider_refund_id, 're_test');
  assert.equal(result.payment_status, amount === 190 ? 'refunded' : 'paid');
  console.log(`PASS ${initial}, refund ${amount}/190, duplicate confirmation`);
}
await assert.rejects(
  db.exec("UPDATE jobs SET status='completed'"),
  /Cannot transition from cancelled/
);
console.log('PASS terminal job guard remains active');
await db.close();
