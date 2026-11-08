// Disposable PGlite only: synthetic fixtures, no app environment or hosted connection.
import { readFileSync, readdirSync } from 'node:fs';
import assert from 'node:assert/strict';
const { PGlite } = await import(
  process.env.PGLITE_MODULE || '@electric-sql/pglite'
);
const db = new PGlite();
const sql = (name) =>
  readFileSync(
    new URL(`../supabase/migrations/${name}`, import.meta.url),
    'utf8'
  ).replace(/\r\n/g, '\n');
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const sources = [
  [
    '20260915143719_durable_account_deletion_recovery.sql',
    'finish_account_cleanup_step',
  ],
  [
    '20260922202042_add_evidence_retention_review.sql',
    'review_retained_evidence',
  ],
  [
    '20260924084212_add_retained_evidence_disposal_queue.sql',
    'schedule_retained_evidence_disposal',
  ],
  [
    '20260930115354_issue_conversations_and_visit_confirmation.sql',
    'respond_to_visit',
  ],
  [
    '20261030223935_property_tenancy_inspection_reports.sql',
    'update_property_tenancy_folder',
  ],
  [
    '20261102121225_customer_terms_cancellation_support.sql',
    'update_support_case',
  ],
];
const originalFunction = (file, name) => {
  const s = sql(file);
  const start = s.indexOf(`CREATE FUNCTION public.${name}(`);
  const grant = s.indexOf('GRANT EXECUTE', s.indexOf('$$;', start));
  assert.ok(start >= 0 && grant > start);
  return s.slice(start, s.indexOf(';', grant) + 1);
};
await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
 CREATE TABLE profiles(id uuid PRIMARY KEY,role text,deleted_at timestamptz);
 CREATE TABLE properties(id uuid PRIMARY KEY,owner_id uuid);
 CREATE TABLE property_team_members(property_id uuid,user_id uuid,role text,status text);
 CREATE TABLE property_room_photos(id uuid PRIMARY KEY,property_id uuid,room_type text,file_name text,created_at timestamptz);
 CREATE TABLE appointments(id uuid PRIMARY KEY,client_id uuid,contractor_id uuid,status text,appointment_date date,start_time time,end_time time,client_response text,client_response_at timestamptz);
 CREATE TABLE notification_queue(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid,notification_type text,priority text,title text,message text,action_url text,metadata jsonb,scheduled_for timestamptz);
 CREATE TABLE account_deletion_cleanup_steps(id uuid PRIMARY KEY,status text,completed_at timestamptz,last_outcome text,lease_token uuid,lease_expires_at timestamptz,next_attempt_at timestamptz,attempts integer);
 CREATE TABLE retained_contract_records(contract_id uuid PRIMARY KEY,requires_retention_review boolean,review_due_at timestamptz,retention_until timestamptz);
 CREATE TABLE retained_dispute_records(dispute_id uuid PRIMARY KEY,requires_retention_review boolean,review_due_at timestamptz);
 CREATE TABLE support_tickets(id uuid PRIMARY KEY,status text,assigned_to uuid,priority text,revision integer,updated_at timestamptz);
 CREATE TABLE support_operator_settings(admin_id uuid,available boolean);
 CREATE TABLE support_case_events(id uuid DEFAULT gen_random_uuid(),ticket_id uuid,actor_id uuid,action text,details jsonb);
 GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;`);
await db.exec(sql('20261030223935_property_tenancy_inspection_reports.sql'));
await db.exec(sql(sources[1][0]));
const disposal = sql(sources[2][0]);
await db.exec(
  disposal.slice(
    0,
    disposal.indexOf('CREATE FUNCTION public.cancel_retained_evidence_disposal')
  )
);
for (const i of [0, 3, 5]) await db.exec(originalFunction(...sources[i]));
const names = sources.map((s) => s[1]);
const state = async () =>
  (
    await db.query(
      `SELECT proname,prosrc,proacl::text AS acl,prosecdef,proconfig,
 pg_get_function_identity_arguments(oid) AS arguments FROM pg_proc
 WHERE pronamespace='public'::regnamespace AND proname=ANY($1::text[]) ORDER BY proname`,
      [names]
    )
  ).rows;
const before = await state();
assert.equal(before.length, 6);
assert.equal(
  before.reduce((n, f) => n + (f.prosrc.match(/'40001'/g) || []).length, 0),
  7
);
await db.exec(
  `BEGIN; ${sql('20261108103023_remaining_business_conflicts.sql')} COMMIT;`
);
assert.deepEqual(
  await state(),
  before.map((f) => ({
    ...f,
    prosrc: f.prosrc.replaceAll("'40001'", "'PT409'"),
  }))
);
const privileges = (
  await db.query(
    `SELECT proname,has_function_privilege('anon',oid,'EXECUTE') AS anon,
 has_function_privilege('authenticated',oid,'EXECUTE') AS authenticated,
 has_function_privilege('service_role',oid,'EXECUTE') AS service FROM pg_proc
 WHERE pronamespace='public'::regnamespace AND proname=ANY($1::text[])`,
    [names]
  )
).rows;
for (const p of privileges)
  assert.deepEqual(
    [p.anon, p.authenticated, p.service],
    [false, false, true],
    p.proname
  );
await db.exec(`INSERT INTO profiles VALUES('${id(1)}','admin',NULL),('${id(2)}','homeowner',NULL),('${id(3)}','admin',now());
 INSERT INTO properties VALUES('${id(10)}','${id(2)}');
 INSERT INTO property_tenancy_folders(id,property_id,label,starts_on,created_by) VALUES('${id(11)}','${id(10)}','Original','2026-01-01','${id(2)}');
 INSERT INTO appointments VALUES('${id(12)}','${id(2)}','${id(1)}','scheduled','2026-11-09','09:00','10:00',NULL,NULL);
 INSERT INTO account_deletion_cleanup_steps(id,status,lease_token,lease_expires_at,attempts) VALUES('${id(13)}','pending','${id(14)}',now()+interval '1 hour',1);
 INSERT INTO retained_contract_records VALUES('${id(15)}',true,NULL,now()-interval '1 day');
 INSERT INTO retained_dispute_records VALUES('${id(16)}',true,NULL);
 INSERT INTO support_tickets VALUES('${id(17)}','open',NULL,'normal',1,NULL);
 INSERT INTO support_operator_settings VALUES('${id(1)}',true);`);
let cases = 0;
const one = async (q, p = []) => (await db.query(q, p)).rows[0];
async function test(name, run) {
  await db.exec('BEGIN; SET LOCAL ROLE service_role');
  try {
    await run();
    cases++;
    console.log('PASS ' + name);
  } finally {
    await db.exec('ROLLBACK');
  }
}
async function rejects(run, code) {
  await db.exec('SAVEPOINT expected');
  await assert.rejects(run, { code });
  await db.exec('ROLLBACK TO SAVEPOINT expected');
}
const finish = (token = id(14), outcome = 'completed') =>
  db.query('SELECT finish_account_cleanup_step($1,$2,$3)', [
    id(13),
    token,
    outcome,
  ]);
const visit = (
  actor = id(2),
  date = '2026-11-09',
  start = '09:00',
  end = '10:00',
  response = 'confirmed'
) =>
  db.query('SELECT respond_to_visit($1,$2,$3,$4,$5,$6)', [
    actor,
    id(12),
    date,
    start,
    end,
    response,
  ]);
const review = (revision = 0, actor = id(1), hold = false, kind = 'contract') =>
  db.query(
    "SELECT review_retained_evidence($1,$2,$3,$4,$5,'Local retention review',now()+interval '7 days')",
    [actor, kind, kind === 'contract' ? id(15) : id(16), revision, hold]
  );
const dispose = (
  revision = 1,
  reason = 'Local disposal decision',
  actor = id(1)
) =>
  db.query(
    "SELECT schedule_retained_evidence_disposal($1,'contract',$2,$3,now()+interval '2 days',$4,'inventory-local') AS id",
    [actor, id(15), revision, reason]
  );
const folder = (revision = 0, actor = id(2), property = id(10)) =>
  db.query(
    "SELECT update_property_tenancy_folder($1,$2,$3,$4,'Updated','2026-01-01',NULL)",
    [actor, property, id(11), revision]
  );
const support = (revision = 1, actor = id(1), assigned = null) =>
  db.query(
    "SELECT update_support_case($1,$2,$3,'in_progress',$4,'normal','Local case review')",
    [id(17), actor, revision, assigned]
  );
for (const outcome of ['completed', 'retry', 'needs_review'])
  await test('cleanup ' + outcome + ' still persists', async () => {
    await finish(id(14), outcome);
    const s = await one('SELECT * FROM account_deletion_cleanup_steps');
    assert.equal(s.status, outcome === 'retry' ? 'pending' : outcome);
    assert.equal(s.lease_token, null);
  });
for (const mode of ['wrong-token', 'expired', 'completed'])
  await test(
    'cleanup ' + mode + ' conflicts without a checkpoint',
    async () => {
      if (mode === 'expired')
        await db.exec(
          "UPDATE account_deletion_cleanup_steps SET lease_expires_at=now()-interval '1 minute'"
        );
      if (mode === 'completed')
        await db.exec(
          "UPDATE account_deletion_cleanup_steps SET status='completed'"
        );
      const before = await one('SELECT * FROM account_deletion_cleanup_steps');
      await rejects(
        () => finish(mode === 'wrong-token' ? id(99) : id(14)),
        'PT409'
      );
      assert.deepEqual(
        await one('SELECT * FROM account_deletion_cleanup_steps'),
        before
      );
    }
  );
await test('invalid cleanup outcome remains rejected', async () => {
  await rejects(() => finish(id(14), 'invented'), '23514');
});
await test('visit replay sends only one notification', async () => {
  await visit();
  await visit();
  assert.equal(
    (await one('SELECT count(*)::int AS n FROM notification_queue')).n,
    1
  );
});
for (const mode of ['date', 'start', 'end', 'status'])
  await test(
    'changed visit ' + mode + ' does not acknowledge or notify',
    async () => {
      if (mode === 'status')
        await db.exec("UPDATE appointments SET status='cancelled'");
      await rejects(
        () =>
          visit(
            id(2),
            mode === 'date' ? '2026-11-10' : '2026-11-09',
            mode === 'start' ? '08:00' : '09:00',
            mode === 'end' ? '11:00' : '10:00'
          ),
        'PT409'
      );
      assert.equal(
        (await one('SELECT client_response FROM appointments')).client_response,
        null
      );
      assert.equal(
        (await one('SELECT count(*)::int AS n FROM notification_queue')).n,
        0
      );
    }
  );
await test('visit identity and response validation remain enforced', async () => {
  await rejects(() => visit(id(1)), '42501');
  await rejects(
    () => visit(id(2), '2026-11-09', '09:00', '10:00', 'invented'),
    '22023'
  );
});
for (const kind of ['contract', 'dispute'])
  await test(
    'stale ' + kind + ' review appends no duplicate decision',
    async () => {
      await review(0, id(1), false, kind);
      await rejects(() => review(0, id(1), false, kind), 'PT409');
      assert.equal(
        (
          await one(
            'SELECT count(*)::int AS n FROM evidence_retention_review_log'
          )
        ).n,
        1
      );
      await review(1, id(1), true, kind);
      assert.equal(
        (await one('SELECT revision FROM evidence_retention_reviews')).revision,
        2
      );
    }
  );
await test('review admin and deleted-admin checks remain enforced', async () => {
  for (const actor of [id(2), id(3)])
    await rejects(() => review(0, actor), '42501');
});
for (const mode of ['missing', 'stale', 'held', 'unclassified'])
  await test('disposal ' + mode + ' conflicts without scheduling', async () => {
    if (mode !== 'missing') await review(0, id(1), mode === 'held');
    if (mode === 'unclassified')
      await db.exec(
        'UPDATE retained_contract_records SET requires_retention_review=true'
      );
    await rejects(() => dispose(mode === 'stale' ? 2 : 1), 'PT409');
    assert.equal(
      (await one('SELECT count(*)::int AS n FROM evidence_disposal_requests'))
        .n,
      0
    );
  });
await test('disposal exact replay and conflicting decision', async () => {
  await review();
  const first = (await dispose()).rows[0].id;
  assert.equal((await dispose()).rows[0].id, first);
  await rejects(() => dispose(1, 'A changed disposal decision'), 'PT409');
  assert.equal(
    (await one('SELECT count(*)::int AS n FROM evidence_disposal_requests')).n,
    1
  );
});
await test('disposal admin and retention safeguards remain enforced', async () => {
  await review();
  await rejects(() => dispose(1, 'Local disposal decision', id(2)), '42501');
  await db.exec(
    "UPDATE retained_contract_records SET retention_until=now()+interval '3 days'"
  );
  await rejects(() => dispose(), '22023');
});
await test('tenancy stale update preserves the successful edit', async () => {
  await folder();
  const saved = await one('SELECT * FROM property_tenancy_folders');
  await rejects(() => folder(), 'PT409');
  assert.deepEqual(await one('SELECT * FROM property_tenancy_folders'), saved);
});
await test('tenancy editor and property boundary checks remain enforced', async () => {
  await rejects(() => folder(0, id(1)), '42501');
  await db.query('INSERT INTO properties VALUES($1,$2)', [id(20), id(2)]);
  await rejects(() => folder(0, id(2), id(20)), 'PT409');
  assert.equal(
    (await one('SELECT revision FROM property_tenancy_folders')).revision,
    0
  );
});
await test('support stale update appends no duplicate event', async () => {
  await support();
  const saved = await one('SELECT * FROM support_tickets');
  await rejects(() => support(), 'PT409');
  assert.deepEqual(await one('SELECT * FROM support_tickets'), saved);
  assert.equal(
    (await one('SELECT count(*)::int AS n FROM support_case_events')).n,
    1
  );
});
await test('support administrator and assignee checks remain enforced', async () => {
  for (const actor of [id(2), id(3)])
    await rejects(() => support(1, actor), '42501');
  await rejects(() => support(1, id(1), id(2)), '23514');
});
// Historical migrations stay immutable; audit the final definition of every known
// business-conflict function, including fixes already pending from earlier batches.
const effective = new Map();
const known = [
  ...names,
  'save_property_action_followup',
  'propose_quote_amendment',
  'transition_quote_amendment',
  'review_quote_amendment_email',
];
for (const file of readdirSync(
  new URL('../supabase/migrations/', import.meta.url)
)
  .filter((f) => f.endsWith('.sql'))
  .sort()) {
  const source = sql(file);
  for (const name of known) {
    const match = new RegExp(
      'CREATE (?:OR REPLACE )?FUNCTION public\\.' + name + '\\(',
      'i'
    ).exec(source);
    if (match) {
      const end = source.indexOf('$$;', match.index);
      assert.ok(end > match.index, name);
      effective.set(name, source.slice(match.index, end));
    }
  }
}
assert.equal(effective.size, known.length);
for (const [name, body] of effective)
  assert.doesNotMatch(body, /ERRCODE\s*=\s*'40001'/i, name);
console.log(
  'All ten known business-conflict functions have terminal codes in the final migration definitions.'
);
await db.close();
console.log(
  `${cases} remaining-conflict SQL scenarios plus six-function body/security/grant equivalence checks passed.`
);
