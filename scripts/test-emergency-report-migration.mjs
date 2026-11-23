// Disposable in-memory PostgreSQL only. Never reads app credentials or DATABASE_URL.
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const { PGlite } = await import(
  process.env.PGLITE_MODULE || '@electric-sql/pglite'
);
const db = new PGlite();
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
let assertions = 0;
const eq = (actual, expected) => {
  assert.deepEqual(actual, expected);
  assertions++;
};
const rejects = async (promise, pattern) => {
  await assert.rejects(promise, pattern);
  assertions++;
};
const row = async (sql, params = []) => (await db.query(sql, params)).rows[0];
await db.exec(`
  CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
  CREATE TABLE profiles(id uuid PRIMARY KEY,deleted_at timestamptz,first_name text,last_name text);
  CREATE TABLE properties(id uuid PRIMARY KEY,owner_id uuid REFERENCES profiles,property_name text);
  CREATE TABLE anonymous_report_tokens(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), property_id uuid REFERENCES properties,
    owner_id uuid REFERENCES profiles, token text UNIQUE NOT NULL,
    is_active boolean DEFAULT true, total_reports int DEFAULT 0, last_report_at timestamptz
  );
  CREATE TABLE property_team_members(property_id uuid,user_id uuid,role text,status text);
  CREATE TABLE anonymous_reports(id uuid PRIMARY KEY,property_id uuid REFERENCES properties,urgency text,status text,description text,category text,acknowledged_at timestamptz,updated_at timestamptz);
  CREATE TABLE notification_queue(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid,notification_type text,priority text,title text,message text,action_url text,metadata jsonb,scheduled_for timestamptz,status text DEFAULT 'pending');
  CREATE TABLE operator_alerts(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),dedupe_key text UNIQUE,job_name text);
  GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
`);
for (let n = 1; n <= 7; n++)
  await db.query('INSERT INTO profiles(id,first_name) VALUES($1,$2)', [
    id(n),
    `Person ${n}`,
  ]);
await db.query('INSERT INTO properties VALUES($1,$2,$3)', [
  id(10),
  id(1),
  'Test property',
]);
for (const [n, role, status] of [
  [2, 'manager', 'accepted'],
  [3, 'viewer', 'accepted'],
  [4, 'admin', 'pending'],
  [5, 'admin', 'accepted'],
]) {
  await db.query('INSERT INTO property_team_members VALUES($1,$2,$3,$4)', [
    id(10),
    id(n),
    role,
    status,
  ]);
}
await db.query('UPDATE profiles SET deleted_at=now() WHERE id=$1', [id(5)]);
const insert = (n, urgency = 'emergency') =>
  db.query(
    `INSERT INTO anonymous_reports(id,property_id,urgency,status,description,category)
  VALUES($1,$2,$3,'new','Synthetic leak','plumbing')`,
    [id(n), id(10), urgency]
  );
await insert(99); // Existing missed report must be recovered by migration.
await db.exec(
  readFileSync(
    new URL(
      '../supabase/migrations/20261123120000_emergency_report_ownership.sql',
      import.meta.url
    ),
    'utf8'
  )
);
for (const migration of [
  '20261123141053_tenant_emergency_contact.sql',
  '20261123215732_emergency_report_coverage.sql',
]) {
  await db.exec(
    readFileSync(
      new URL('../supabase/migrations/' + migration, import.meta.url),
      'utf8'
    )
  );
}
await db.query('UPDATE properties SET tenant_emergency_phone=$1 WHERE id=$2', [
  '+442079460958',
  id(10),
]);
await db.query(
  "INSERT INTO anonymous_report_tokens(property_id,owner_id,token) VALUES($1,$2,'coverage-test-link')",
  [id(10), id(1)]
);
await db.exec('SET ROLE service_role');
const coverage = (actor) =>
  db.query('SELECT * FROM emergency_report_coverage($1)', [id(actor)]);
const expectedCoverage = {
  property_id: id(10),
  property_name: 'Test property',
  initial_responder: 'Person 1',
  fallback_responder: 'Person 2',
  emergency_phone: '+442079460958',
  has_active_link: true,
};
eq((await coverage(1)).rows, [expectedCoverage]);
eq((await coverage(2)).rows, [expectedCoverage]);
for (const actor of [3, 4, 5, 6]) eq((await coverage(actor)).rows, []);
const incident = (n) =>
  row('SELECT * FROM emergency_report_incidents WHERE report_id=$1', [id(n)]);
const due = (n) =>
  db.query(
    "UPDATE emergency_report_incidents SET due_at=now()-interval '1 minute' WHERE report_id=$1",
    [id(n)]
  );
const advance = () => row('SELECT advance_emergency_reports() AS n');
const inbox = (actor) =>
  row('SELECT emergency_report_inbox($1) AS items', [id(actor)]);
const ack = (n, actor = 1) =>
  db.query('SELECT acknowledge_emergency_report($1,$2)', [id(actor), id(n)]);
const deliver = (n, actor, cycle) =>
  row('SELECT should_deliver_emergency_report($1,$2,$3) AS allowed', [
    id(n),
    id(actor),
    cycle,
  ]);
eq((await incident(99)).assigned_to, id(1));
await advance();
eq((await incident(99)).assigned_to, id(2));
await ack(99, 2);

await db.query(
  "UPDATE property_team_members SET status='removed' WHERE user_id=$1",
  [id(2)]
);
eq((await coverage(1)).rows[0].fallback_responder, null);
eq((await coverage(2)).rows, []);
await db.query(
  "UPDATE property_team_members SET status='accepted' WHERE user_id=$1",
  [id(2)]
);

await insert(100, 'medium');
eq(await incident(100), undefined);
await insert(101);
const first = await incident(101);
eq(first.assigned_to, id(1));
eq(first.acknowledged_at, null);
eq(
  (
    await row(
      "SELECT count(*)::int AS n FROM notification_queue WHERE metadata->>'emergency_report_id'=$1",
      [id(101)]
    )
  ).n,
  1
);
eq(
  (
    await row(
      "SELECT scheduled_for<=now() AS ready FROM notification_queue WHERE metadata->>'emergency_report_id'=$1",
      [id(101)]
    )
  ).ready,
  true
);
eq((await deliver(101, 1, first.cycle)).allowed, true);
eq(
  (await inbox(2)).items.some((i) => i.report_id === id(101)),
  false
);
await rejects(ack(101, 2), /access denied/);
await rejects(ack(101, 3), /access denied/);
await rejects(ack(101, 6), /access denied/);

// Each delivery outcome, including success that nobody reads, must escalate.
for (const [index, status] of [
  'pending',
  'sent',
  'failed_push',
  'failed',
  'cancelled',
].entries()) {
  const n = 110 + index;
  await insert(n);
  await db.query(
    "UPDATE notification_queue SET status=$1 WHERE metadata->>'emergency_report_id'=$2",
    [status, id(n)]
  );
  await due(n);
  await advance();
  eq((await incident(n)).assigned_to, id(2));
  eq((await incident(n)).acknowledged_at, null);
  eq(
    (
      await row(
        "SELECT count(*)::int AS n FROM notification_queue WHERE metadata->>'emergency_report_id'=$1",
        [id(n)]
      )
    ).n,
    2
  );
  await advance(); // No duplicate escalation/outbox when cron is replayed.
  eq(
    (
      await row(
        "SELECT count(*)::int AS n FROM notification_queue WHERE metadata->>'emergency_report_id'=$1",
        [id(n)]
      )
    ).n,
    2
  );
  await ack(n, 2);
}

await due(101);
await advance();
eq((await incident(101)).assigned_to, id(2));
eq(
  (await inbox(2)).items.some((i) => i.report_id === id(101)),
  true
);
eq((await deliver(101, 1, first.cycle)).allowed, false); // stale primary push retry
eq((await deliver(101, 2, first.cycle)).allowed, true);
await due(101);
await advance(); // Fallback also missed it.
eq((await incident(101)).needs_attention, true);
eq((await row('SELECT count(*)::int AS n FROM operator_alerts')).n, 1);
await ack(101, 2);
const acknowledged = await incident(101);
eq(acknowledged.acknowledged_by, id(2));
eq(acknowledged.needs_attention, false);
eq(
  (await row('SELECT status FROM anonymous_reports WHERE id=$1', [id(101)]))
    .status,
  'acknowledged'
);
await ack(101, 1); // idempotent; owner does not steal an existing acknowledgment
eq((await incident(101)).acknowledged_by, id(2));
await due(101);
await advance();
eq((await incident(101)).assigned_to, id(2));
eq((await deliver(101, 2, first.cycle)).allowed, false);

// Reopening starts a fresh clock/cycle; old receipt/push delivery does not count.
await db.query("UPDATE anonymous_reports SET status='new' WHERE id=$1", [
  id(101),
]);
eq((await incident(101)).acknowledged_at, null);
eq((await incident(101)).assigned_to, id(1));
assert.notEqual((await incident(101)).cycle, first.cycle);
assertions++;
eq((await deliver(101, 1, first.cycle)).allowed, false);
await db.query(
  "UPDATE anonymous_reports SET status='acknowledged' WHERE id=$1",
  [id(101)]
);
assert.ok((await incident(101)).acknowledged_at);
assertions++;

await insert(120);
await db.query(
  "UPDATE property_team_members SET status='revoked' WHERE user_id=$1",
  [id(2)]
);
await due(120);
await advance();
eq((await incident(120)).assigned_to, id(1));
eq((await incident(120)).needs_attention, true); // neither viewer, pending nor deleted admin
eq((await row('SELECT count(*)::int AS n FROM operator_alerts')).n, 1); // hourly dedupe
await db.query(
  "UPDATE property_team_members SET status='accepted' WHERE user_id=$1",
  [id(2)]
);
await due(120);
await advance(); // Coverage added after the missed deadline.
eq((await incident(120)).assigned_to, id(2));
await db.query(
  "UPDATE property_team_members SET status='revoked' WHERE user_id=$1",
  [id(2)]
);
eq((await inbox(2)).items.length, 0);
await rejects(ack(120, 2), /access denied/);
eq((await deliver(120, 2, (await incident(120)).cycle)).allowed, false);
await advance();
eq((await incident(120)).assigned_to, null);
eq((await incident(120)).needs_attention, true);
await ack(120, 1); // Owner can take responsibility when fallback is revoked.

await insert(121);
await db.query("UPDATE anonymous_reports SET status='resolved' WHERE id=$1", [
  id(121),
]);
await due(121);
await advance();
assert.ok((await incident(121)).closed_at);
assertions++;
await rejects(ack(121), /no longer awaiting/);

// Ownership changes cannot leave a former owner authorized by assignment alone.
await insert(125);
const oldCycle = (await incident(125)).cycle;
await db.query('UPDATE properties SET owner_id=$1 WHERE id=$2', [
  id(7),
  id(10),
]);
await rejects(ack(125, 1), /access denied/);
eq((await deliver(125, 1, oldCycle)).allowed, false);
eq(
  (await inbox(7)).items.some((i) => i.report_id === id(125)),
  true
);
await ack(125, 7);
eq((await incident(125)).acknowledged_by, id(7));
await db.query('UPDATE properties SET owner_id=$1 WHERE id=$2', [
  id(1),
  id(10),
]);

// A deleted owner produces durable uncovered work and an operator alert;
// an eligible team responder can still take over on the next cron run.
await db.query('UPDATE profiles SET deleted_at=now() WHERE id=$1', [id(1)]);
await insert(126);
eq((await incident(126)).assigned_to, null);
eq((await row('SELECT count(*)::int AS n FROM operator_alerts')).n, 1);
await rejects(ack(126, 1), /access denied/);
await db.query(
  "UPDATE property_team_members SET status='accepted' WHERE user_id=$1",
  [id(2)]
);
await advance();
eq((await incident(126)).assigned_to, id(2));
await ack(126, 2);
await db.query('UPDATE profiles SET deleted_at=NULL WHERE id=$1', [id(1)]);

// Force durable outbox failure: the entire report insert must roll back.
await db.exec(
  "RESET ROLE; ALTER TABLE notification_queue ADD CONSTRAINT reject_emergency_test CHECK(notification_type<>'emergency_report') NOT VALID; SET ROLE service_role"
);
await rejects(insert(130), /reject_emergency_test/);
eq(await incident(130), undefined);
eq(
  await row('SELECT id FROM anonymous_reports WHERE id=$1', [id(130)]),
  undefined
);
await db.exec(
  'RESET ROLE; ALTER TABLE notification_queue DROP CONSTRAINT reject_emergency_test; SET ROLE service_role'
);
for (const role of ['authenticated', 'anon']) {
  await db.exec(`RESET ROLE; SET ROLE ${role}`);
  await rejects(ack(101), /permission denied/);
  await rejects(inbox(1), /permission denied/);
  await rejects(advance(), /permission denied/);
  await rejects(
    db.query('SELECT * FROM emergency_report_incidents'),
    /permission denied/
  );
}
console.log(
  `Emergency report migration: ${assertions} assertions passed (disposable local PostgreSQL).`
);

// Exercise the next intake migration with the real emergency trigger installed.
assertions = 0;
await db.exec(`
  RESET ROLE;
  ALTER TABLE anonymous_reports ALTER COLUMN id SET DEFAULT gen_random_uuid(),
    ADD COLUMN token_id uuid REFERENCES anonymous_report_tokens,
    ADD COLUMN reporter_name text, ADD COLUMN reporter_email text, ADD COLUMN reporter_phone text,
    ADD COLUMN reporter_unit text, ADD COLUMN photos text[], ADD COLUMN conversation_key_hash text;
`);
await db.query('INSERT INTO properties VALUES($1,$2,$3)', [
  id(200),
  id(1),
  'Recovery test',
]);
await db.query(
  `INSERT INTO anonymous_report_tokens(id, property_id, owner_id, token)
  VALUES ($1,$3,$4,'test-link'), ($2,$3,$4,'different-link')`,
  [id(201), id(202), id(200), id(1)]
);
await db.exec(
  readFileSync(
    new URL(
      '../supabase/migrations/20261123130318_recover_tenant_report_submission.sql',
      import.meta.url
    ),
    'utf8'
  )
);
const keyHash = 'a'.repeat(64);
const receiptHash = 'b'.repeat(64);
const payloadHash = 'c'.repeat(64);
const report = {
  reporter_name: 'Synthetic tenant',
  description: 'Synthetic emergency leak',
  category: 'plumbing',
  urgency: 'emergency',
};
const send = (link, key, receipt, fingerprint, data) =>
  row('SELECT public.submit_tenant_report_once($1,$2,$3,$4,$5) AS result', [
    link,
    key,
    receipt,
    fingerprint,
    data,
  ]).then(({ result }) => result);
const submit = (key = keyHash) =>
  send('test-link', key, receiptHash, payloadHash, report);
const recover = (link = 'test-link') =>
  send(link, keyHash, receiptHash, null, null);
await db.exec('SET ROLE service_role');
await rejects(recover(), { code: 'P0002' });
const saved = await submit();
eq(saved.created, true);
eq(await submit(), {
  id: saved.id,
  urgency: 'emergency',
  status: 'new',
  created: false,
});
eq(await recover(), {
  id: saved.id,
  urgency: 'emergency',
  status: 'new',
  created: false,
});
eq(
  await row('SELECT total_reports FROM anonymous_report_tokens WHERE id=$1', [
    id(201),
  ]),
  { total_reports: 1 }
);
eq(
  await row(
    "SELECT count(*)::int AS count FROM notification_queue WHERE metadata->>'emergency_report_id' = $1",
    [saved.id]
  ),
  { count: 1 }
);
await rejects(
  send('test-link', keyHash, receiptHash, 'd'.repeat(64), {
    ...report,
    description: 'Changed',
  }),
  { code: 'PT409' }
);
await rejects(recover('different-link'), { code: 'P0002' });
await rejects(recover('invalid-link'), { code: 'PT404' });
await db.query(
  'UPDATE anonymous_report_tokens SET is_active=false WHERE id=$1',
  [id(201)]
);
await rejects(recover(), { code: 'PT410' });
await rejects(submit(), { code: 'PT410' });
await db.query(
  'UPDATE anonymous_report_tokens SET is_active=true WHERE id=$1',
  [id(201)]
);
await db.query(
  'UPDATE anonymous_reports SET conversation_key_hash=$1 WHERE id=$2',
  ['d'.repeat(64), saved.id]
);
await rejects(recover(), { code: 'PT410' });
await db.query(
  'UPDATE anonymous_reports SET conversation_key_hash=$1 WHERE id=$2',
  [receiptHash, saved.id]
);
await db.exec(`RESET ROLE; UPDATE tenant_report_submissions SET created_at=now()-interval '2 hours';
  ALTER TABLE notification_queue ADD CONSTRAINT reject_emergency_test CHECK(notification_type<>'emergency_report') NOT VALID;
  SET ROLE service_role`);
await rejects(recover(), { code: 'PT410' });
const retryKey = 'e'.repeat(64);
await rejects(submit(retryKey), /reject_emergency_test/);
eq(
  await row(
    'SELECT report_id FROM tenant_report_submissions WHERE key_hash=$1',
    [retryKey]
  ),
  undefined
);
eq(
  await row('SELECT total_reports FROM anonymous_report_tokens WHERE id=$1', [
    id(201),
  ]),
  { total_reports: 1 }
);
await db.exec(
  'RESET ROLE; ALTER TABLE notification_queue DROP CONSTRAINT reject_emergency_test; SET ROLE service_role'
);
eq((await submit(retryKey)).created, true);
await db.query('DELETE FROM anonymous_reports WHERE id=$1', [saved.id]);
await rejects(submit(), { code: 'PT410' });
for (const role of ['anon', 'authenticated']) {
  await db.exec(`RESET ROLE; SET ROLE ${role}`);
  await rejects(recover(), { code: '42501' });
  await rejects(db.query('SELECT * FROM tenant_report_submissions'), {
    code: '42501',
  });
}
await db.close();
console.log(
  `Tenant report recovery: ${assertions} assertions passed (disposable local PostgreSQL).`
);
