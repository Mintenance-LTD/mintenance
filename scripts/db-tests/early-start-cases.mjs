import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import pg from 'pg';

export async function testEarlyStart(db, config) {
  await db.query(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE TABLE profiles(id uuid PRIMARY KEY,email text);
    CREATE TABLE customer_policy_documents(version text PRIMARY KEY);
    INSERT INTO customer_policy_documents VALUES('2026-11-03');
    CREATE TABLE jobs(id uuid PRIMARY KEY,status text,payer_user_id uuid);
    CREATE TABLE contracts(id uuid PRIMARY KEY,job_id uuid,homeowner_id uuid,contractor_id uuid,status text,cancellation_deadline timestamptz,cancellation_requested_at timestamptz,updated_at timestamptz,created_at timestamptz DEFAULT now());
    CREATE TABLE contract_consents(contract_id uuid,signer_role text,early_start_requested boolean);
    CREATE TABLE customer_communication_outbox(event_key text UNIQUE,recipient_id uuid,recipient_email text,channel text,subject text,body text,action_url text);
    CREATE FUNCTION public.contract_review_snapshot(uuid) RETURNS jsonb LANGUAGE sql AS 'SELECT to_jsonb(c) FROM contracts c WHERE c.id=$1';
    GRANT USAGE ON SCHEMA public TO service_role;
    GRANT SELECT,UPDATE ON jobs,contracts TO service_role;
    GRANT SELECT ON profiles,contract_consents,customer_policy_documents TO service_role;
    GRANT INSERT,SELECT ON customer_communication_outbox TO service_role;`);
  await db.query(
    await fs.readFile(
      new URL(
        '../../supabase/migrations/20261116120000_post_signing_early_start.sql',
        import.meta.url
      ),
      'utf8'
    )
  );
  await db.query(
    'CREATE TRIGGER guard_customer_work_start BEFORE UPDATE OF status ON jobs FOR EACH ROW EXECUTE FUNCTION guard_customer_work_start()'
  );
  const homeowner = randomUUID(),
    contractor = randomUUID(),
    outsider = randomUUID(),
    job = randomUUID(),
    contract = randomUUID();
  await db.query(
    "INSERT INTO profiles VALUES($1,'homeowner@example.test'),($2,'contractor@example.test'),($3,'other@example.test')",
    [homeowner, contractor, outsider]
  );
  await db.query("INSERT INTO jobs VALUES($1,'assigned',$2)", [job, homeowner]);
  await db.query(
    "INSERT INTO contracts(id,job_id,homeowner_id,contractor_id,status,cancellation_deadline,updated_at) VALUES($1,$2,$3,$4,'accepted',now()+interval '14 days',now())",
    [contract, job, homeowner, contractor]
  );
  await db.query("INSERT INTO contract_consents VALUES($1,'homeowner',false)", [
    contract,
  ]);
  const original = (
    await db.query('SELECT to_jsonb(c) AS value FROM contracts c')
  ).rows[0].value;
  const review = (
    await db.query(
      'SELECT updated_at::text AS version,md5(contract_review_snapshot(id)::text) AS token FROM contracts WHERE id=$1',
      [contract]
    )
  ).rows[0];
  const legal = {
    termsVersion: '2026-11-03',
    termsAccepted: true,
    earlyStartRequested: true,
    fullPerformanceAcknowledged: false,
    expectedUpdatedAt: review.version,
    expectedReviewToken: review.token,
  };
  const request = (actor, choice = legal) =>
    db.query('SELECT request_contract_early_start($1,$2,$3)', [
      contract,
      actor,
      choice,
    ]);
  await assert.rejects(
    db.query("UPDATE jobs SET status='in_progress' WHERE id=$1", [job]),
    (e) => e.code === '23514'
  );
  await db.query('SET ROLE service_role');
  for (const actor of [contractor, outsider, null])
    await assert.rejects(request(actor), (e) => e.code === '42501');
  for (const override of [
    { earlyStartRequested: false },
    { termsAccepted: false },
    { termsVersion: 'old' },
    { fullPerformanceAcknowledged: null },
    { expectedReviewToken: 'stale' },
    { expectedUpdatedAt: null },
  ]) {
    await assert.rejects(
      request(homeowner, { ...legal, ...override }),
      (e) => e.code === '23514'
    );
  }
  const peer = new pg.Client(config);
  await peer.connect();
  try {
    await peer.query('SET ROLE service_role');
    await Promise.all([
      request(homeowner),
      peer.query('SELECT request_contract_early_start($1,$2,$3)', [
        contract,
        homeowner,
        legal,
      ]),
    ]);
  } finally {
    await peer.end();
  }
  assert.equal(
    (
      await db.query(
        'SELECT count(*)::int AS n FROM contract_early_start_requests'
      )
    ).rows[0].n,
    1
  );
  assert.equal(
    (
      await db.query(
        'SELECT count(*)::int AS n FROM customer_communication_outbox'
      )
    ).rows[0].n,
    2
  );
  assert.deepEqual(
    (await db.query('SELECT to_jsonb(c) AS value FROM contracts c')).rows[0]
      .value,
    original
  );
  assert.equal(
    (await db.query('SELECT early_start_requested FROM contract_consents'))
      .rows[0].early_start_requested,
    false
  );
  await assert.rejects(
    db.query('DELETE FROM contract_early_start_requests'),
    (e) => e.code === '42501'
  );
  await assert.rejects(
    db.query(
      'UPDATE contract_early_start_requests SET full_performance_acknowledged=true'
    ),
    (e) => e.code === '42501'
  );
  await db.query("UPDATE jobs SET status='in_progress' WHERE id=$1", [job]);
  await assert.rejects(request(homeowner), (e) => e.code === '23514');
  await db.query('RESET ROLE');
  for (const role of ['anon', 'authenticated']) {
    await db.query(`SET ROLE ${role}`);
    await assert.rejects(request(homeowner), (e) => e.code === '42501');
    await assert.rejects(
      db.query('SELECT * FROM contract_early_start_requests'),
      (e) => e.code === '42501'
    );
    await db.query('RESET ROLE');
  }
  await db.query("UPDATE jobs SET status='assigned'");
  await db.query('UPDATE contracts SET cancellation_requested_at=now()');
  await assert.rejects(request(homeowner), (e) => e.code === '23514');
  await assert.rejects(
    db.query("UPDATE jobs SET status='in_progress'"),
    (e) => e.code === '23514'
  );
  await db.query(
    "UPDATE contracts SET cancellation_requested_at=null,cancellation_deadline=now()-interval '1 second'"
  );
  await assert.rejects(request(homeowner), (e) => e.code === '23514');
  await db.query('DELETE FROM contract_early_start_requests');
  await db.query("UPDATE jobs SET status='in_progress'");
  console.log(
    'PASS early-start eligibility, customer-only access, stale-review refusal, explicit consent, concurrent retry idempotency, immutable original agreement/consent, append-only receipts, client-role denial, cancellation safeguard and deadline expiry'
  );
}
