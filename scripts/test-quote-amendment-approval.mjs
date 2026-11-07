// Local disposable PostgreSQL only. Never run these synthetic mutations on hosted data.
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const { PGlite } = await import(
  process.env.PGLITE_MODULE || '@electric-sql/pglite'
);
const db = new PGlite();
const sql = (name) =>
  readFileSync(
    new URL(`../supabase/migrations/${name}`, import.meta.url),
    'utf8'
  );
const snapshot = sql('20260805194939_uk_earnings_statement_bookkeeping.sql');
const table = (name) =>
  snapshot.match(
    new RegExp(
      `CREATE TABLE IF NOT EXISTS "public"\\."${name}" \\([\\s\\S]*?\\n\\);`
    )
  )[0];
await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
 CREATE SCHEMA auth; CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS 'SELECT NULL::uuid';
 ${table('contractor_quotes')} ${table('contracts')} ${table('notification_queue')}
 ALTER TABLE notification_queue ADD PRIMARY KEY(id);
 ALTER TABLE contractor_quotes ADD PRIMARY KEY(id); ALTER TABLE contracts ADD PRIMARY KEY(id);
 ALTER TABLE contracts ADD COLUMN agreement_formed_at timestamptz,ADD COLUMN cancellation_requested_at timestamptz,ADD COLUMN cancellation_deadline timestamptz;
 CREATE TABLE jobs(id uuid PRIMARY KEY,homeowner_id uuid,payer_user_id uuid,contractor_id uuid,status text,budget numeric);
 CREATE TABLE bids(id uuid PRIMARY KEY,job_id uuid,quote_id uuid,contractor_id uuid,amount numeric,status text,updated_at timestamptz);
 CREATE TABLE escrow_transactions(id uuid DEFAULT gen_random_uuid(),job_id uuid);
 CREATE TABLE payment_funding_reservations(job_id uuid);
 CREATE TABLE invoices(job_id uuid); CREATE TABLE payments(job_id uuid); CREATE TABLE escrow_payments(job_id uuid);
 CREATE TABLE payment_tracking(job_id uuid); CREATE TABLE tax_payment_records(job_id uuid); CREATE TABLE contractor_payout_credit_events(job_id uuid);
 CREATE TABLE contract_signatories(contract_id uuid,signed_at timestamptz);
 CREATE TABLE contract_signatures(contract_id uuid);
 CREATE TABLE contract_acceptance_evidence(contract_id uuid);
 CREATE TABLE contract_cosignature_evidence(contract_id uuid);
 CREATE TABLE contract_consents(contract_id uuid);
 GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO service_role;`);
await db.exec(sql('20260908082735_protect_bid_financial_terms.sql'));
await db.exec(sql('20261103122146_freeze_signed_bid_scope.sql'));
await db.exec(`CREATE TRIGGER freeze_signed_bid BEFORE UPDATE OR DELETE ON bids FOR EACH ROW EXECUTE FUNCTION freeze_signed_proposal();
 CREATE TRIGGER freeze_signed_quote BEFORE UPDATE OR DELETE ON contractor_quotes FOR EACH ROW EXECUTE FUNCTION freeze_signed_proposal();`);
await db.exec(sql('20261106132613_quote_amendment_history.sql'));
await db.exec(
  `BEGIN; ${sql('20261106135704_quote_amendment_approval.sql')} COMMIT;`
);
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
await db.exec(
  `BEGIN; ${sql('20261106202654_quote_amendment_notifications.sql')} COMMIT;`
);
const owner = id(1),
  customer = id(2),
  payer = id(3),
  job = id(4),
  quote = id(5),
  bid = id(6),
  contract = id(7),
  outsider = id(8);
await db.exec(
  `BEGIN; ${sql('20261107143626_quote_amendment_email_outbox.sql')} COMMIT;`
);
const operator = id(90);
await db.exec(`CREATE TABLE profiles(id uuid PRIMARY KEY,role text,deleted_at timestamptz);
 INSERT INTO profiles VALUES('${operator}','admin',NULL);
 BEGIN; ${sql('20261107150444_quote_amendment_email_review.sql')} COMMIT;`);
await db.exec(
  `BEGIN; ${sql('20261107213241_quote_amendment_email_conflict_code.sql')} COMMIT;`
);
const version = '2026-11-06T12:00:00Z';
let revision;
async function seed(hasPayer = false) {
  await db.exec('BEGIN');
  await db.query(`INSERT INTO jobs VALUES($1,$2,$3,$4,'assigned',100)`, [
    job,
    customer,
    hasPayer ? payer : null,
    owner,
  ]);
  await db.query(
    `INSERT INTO contractor_quotes(id,contractor_id,job_id,client_name,client_email,title,subtotal,tax_rate,tax_amount,total_amount,status,updated_at,notes)
 VALUES($1,$2,$3,'Synthetic','synthetic@example.test','Repair',100,0,0,100,'accepted',$4,'PRIVATE NOTE')`,
    [quote, owner, job, version]
  );
  await db.query(`INSERT INTO bids VALUES($1,$2,$3,$4,100,'accepted',$5)`, [
    bid,
    job,
    quote,
    owner,
    version,
  ]);
  await db.query(
    `INSERT INTO contracts(id,job_id,contractor_id,homeowner_id,quote_id,amount,status,terms) VALUES($1,$2,$3,$4,$5,100,'pending_homeowner',$6)`,
    [contract, job, owner, customer, quote, JSON.stringify({ bid_id: bid })]
  );
  await db.exec('SET LOCAL ROLE service_role');
  const pricing = {
    line_items: [
      { description: 'Revised repair', quantity: 2, unitPrice: 60, total: 120 },
    ],
    subtotal: 120,
    tax_rate: 0,
    tax_amount: 0,
    total_amount: 120,
  };
  revision = (
    await db.query('SELECT * FROM propose_quote_amendment($1,$2,$3,$4,$5,$6)', [
      quote,
      owner,
      id(20),
      version,
      'Extra part',
      JSON.stringify(pricing),
    ])
  ).rows[0].id;
}
const transition = async (
  action,
  actor = owner,
  expected = 0,
  note = '',
  jobId = job
) =>
  (
    await db.query(
      'SELECT transition_quote_amendment($1,$2,$3,$4,$5,$6) AS result',
      [jobId, revision, actor, action, expected, note]
    )
  ).rows[0].result;
const read = async (actor = customer) =>
  (
    await db.query('SELECT read_job_quote_amendments($1,$2) AS result', [
      job,
      actor,
    ])
  ).rows[0].result;
const approve = async () => {
  await transition('publish');
  await transition('approve', customer, 1);
};
const one = async (query, params = []) =>
  (await db.query(query, params)).rows[0];
// Recover expected errors without aborting the surrounding synthetic transaction.
async function rejects(fn, pattern) {
  await db.exec('SAVEPOINT expected_error');
  await assert.rejects(fn, pattern);
  await db.exec('ROLLBACK TO SAVEPOINT expected_error');
}
let cases = 0;
async function test(name, run, payerMode = false) {
  await seed(payerMode);
  try {
    await run();
    cases++;
    console.log(`PASS ${name}`);
  } finally {
    await db.exec('ROLLBACK');
  }
}
await test('publish, approve, apply, original preservation and exact retry', async () => {
  const original = await one('SELECT * FROM contractor_quotes WHERE id=$1', [
    quote,
  ]);
  assert.equal(
    (await read()).amendments.length,
    0,
    'internal proposals are not shared'
  );
  const published = await transition('publish');
  assert.equal(published.status, 'published');
  assert.equal((await transition('publish')).id, published.id);
  const review = await read();
  assert.equal(review.can_approve, true);
  assert.equal(review.amendments[0].before_snapshot.notes, undefined);
  assert.equal(review.amendments[0].after_snapshot.notes, undefined);
  await transition('approve', customer, 1, 'Reviewed the extra part');
  assert.equal(
    (await one('SELECT amount FROM bids WHERE id=$1', [bid])).amount,
    '100'
  );
  await rejects(
    () => db.query('UPDATE bids SET amount=120 WHERE id=$1', [bid]),
    /approved amendment/
  );
  const applied = await transition('apply', owner, 2);
  assert.equal(applied.status, 'applied');
  assert.equal(
    (await transition('apply', owner, 2)).applied_quote_id,
    applied.applied_quote_id
  );
  assert.deepEqual(
    await one('SELECT * FROM contractor_quotes WHERE id=$1', [quote]),
    original
  );
  const currentBid = await one('SELECT * FROM bids WHERE id=$1', [bid]);
  assert.equal(Number(currentBid.amount), 120);
  assert.equal(currentBid.quote_id, applied.applied_quote_id);
  const currentContract = await one('SELECT * FROM contracts WHERE id=$1', [
    contract,
  ]);
  assert.equal(currentContract.amount, '120.00');
  assert.equal(currentContract.status, 'draft');
  assert.equal(currentContract.contract_version, 2);
  assert.equal(currentContract.homeowner_signed_at, null);
  assert.equal(currentContract.quote_id, applied.applied_quote_id);
  assert.equal(
    (await one('SELECT budget FROM jobs WHERE id=$1', [job])).budget,
    '100'
  );
  assert.equal((await read()).amendments[0].events.length, 3);
  assert.equal(
    (await one('SELECT count(*)::int AS n FROM contractor_quotes')).n,
    2
  );
  assert.equal(
    (await one('SELECT count(*)::int AS n FROM current_contractor_quotes')).n,
    1
  );
  assert.equal(
    Number(
      (
        await one(
          'SELECT sum(total_amount) AS amount FROM current_contractor_quotes'
        )
      ).amount
    ),
    120
  );
});
await test(
  'only designated payer approves; owner, occupant and outsiders cannot substitute',
  async () => {
    await transition('publish');
    assert.equal((await read(customer)).can_approve, false);
    assert.equal((await read(payer)).can_approve, true);
    for (const actor of [owner, customer, outsider])
      await rejects(() => transition('approve', actor, 1), /access denied/);
    await rejects(
      () => transition('approve', payer, 1, '', id(99)),
      /access denied/
    );
    await transition('approve', payer, 1);
  },
  true
);
await test('read access, version binding, decision note binding and conflicting actions', async () => {
  await rejects(() => read(outsider), /access denied/);
  await rejects(() => transition('publish', customer), /access denied/);
  await transition('publish');
  await rejects(() => transition('approve', customer, 0), /changed/);
  await transition('approve', customer, 1, 'Agreed');
  await rejects(
    () => transition('approve', customer, 1, 'Different'),
    /changed/
  );
  await rejects(() => transition('reject', customer, 1), /changed/);
  await transition('withdraw', owner, 2);
  await rejects(() => transition('apply', owner, 3), /no longer/);
});
await test('reject preserves originals and prevents application', async () => {
  await transition('publish');
  await transition('reject', customer, 1, 'Not agreed');
  await rejects(() => transition('apply', owner, 2), /no longer/);
  assert.equal(
    (await one('SELECT amount FROM bids WHERE id=$1', [bid])).amount,
    '100'
  );
});
for (const [name, change] of [
  ['homeowner signature', `UPDATE contracts SET homeowner_signed_at=now()`],
  ['contractor signature', `UPDATE contracts SET contractor_signed_at=now()`],
  ['formed agreement', `UPDATE contracts SET agreement_formed_at=now()`],
  ['null contract state', `UPDATE contracts SET status=NULL`],
  [
    'escrow even without successful funding',
    `INSERT INTO escrow_transactions(job_id) VALUES('${job}')`,
  ],
  [
    'funding reservation',
    `INSERT INTO payment_funding_reservations VALUES('${job}')`,
  ],
  ...[
    'invoices',
    'payments',
    'escrow_payments',
    'payment_tracking',
    'tax_payment_records',
    'contractor_payout_credit_events',
  ].map((table) => [table, `INSERT INTO ${table} VALUES('${job}')`]),
  [
    'co-signature',
    `INSERT INTO contract_signatories VALUES('${contract}',now())`,
  ],
  [
    'signature evidence',
    `INSERT INTO contract_signatures VALUES('${contract}')`,
  ],
  [
    'acceptance evidence',
    `INSERT INTO contract_acceptance_evidence VALUES('${contract}')`,
  ],
  [
    'cosignature evidence',
    `INSERT INTO contract_cosignature_evidence VALUES('${contract}')`,
  ],
  ['legal consent', `INSERT INTO contract_consents VALUES('${contract}')`],
  ['contract price mismatch', `UPDATE contracts SET amount=90`],
])
  await test(`blocks ${name} without partial writes`, async () => {
    await approve();
    await db.exec(change);
    await rejects(() => transition('apply', owner, 2), /required|variation/);
    assert.equal(
      (await one('SELECT status FROM quote_amendments')).status,
      'approved'
    );
    assert.equal(
      (await one('SELECT count(*)::int AS n FROM contractor_quotes')).n,
      1
    );
    assert.equal(
      (await one('SELECT count(*)::int AS n FROM quote_amendment_events')).n,
      2
    );
    assert.equal(
      (await one('SELECT amount FROM bids WHERE id=$1', [bid])).amount,
      '100'
    );
  });
await test('payer reassignment invalidates approval before application', async () => {
  await approve();
  await db.query('UPDATE jobs SET payer_user_id=$1', [payer]);
  await rejects(
    () => transition('apply', owner, 2),
    /responsible customer changed/
  );
  await transition('withdraw', owner, 2);
});
await test('event immutability and restricted direct application writes', async () => {
  await db.query('UPDATE contractor_quotes SET updated_at=now() WHERE id=$1', [
    quote,
  ]);
  await transition('publish');
  await rejects(
    () => db.exec("UPDATE quote_amendments SET status='applying'"),
    /permission denied/
  );
  await rejects(
    () => db.exec('DELETE FROM quote_amendment_events'),
    /permission denied/
  );
  await db.exec('RESET ROLE');
  await rejects(
    () => db.exec("UPDATE quote_amendment_events SET note='tamper'"),
    /append-only/
  );
});
await test('discrepant historical bid amount is rejected without reconciliation', async () => {
  await db.exec(
    "UPDATE bids SET status='pending'; UPDATE bids SET amount=90; UPDATE bids SET status='accepted';"
  );
  await rejects(() => transition('publish'), /matching accepted bid/);
  assert.equal(
    (await one('SELECT amount FROM bids WHERE id=$1', [bid])).amount,
    '90'
  );
});
await test('late contract failure rolls back the new quote, bid and application marker', async () => {
  await approve();
  await db.exec('RESET ROLE');
  await db.exec(`CREATE FUNCTION test_reject_contract() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic contract failure'; END $$;
 CREATE TRIGGER test_reject_contract BEFORE UPDATE ON contracts FOR EACH ROW EXECUTE FUNCTION test_reject_contract();`);
  await db.exec('SET LOCAL ROLE service_role');
  await rejects(
    () => transition('apply', owner, 2),
    /synthetic contract failure/
  );
  assert.equal(
    (await one('SELECT count(*)::int AS n FROM contractor_quotes')).n,
    1
  );
  assert.equal(
    Number((await one('SELECT amount FROM bids WHERE id=$1', [bid])).amount),
    100
  );
  const state = await one(
    'SELECT status,applied_quote_id FROM quote_amendments'
  );
  assert.equal(state.status, 'approved');
  assert.equal(state.applied_quote_id, null);
});
await test('one open proposal per source quote', async () => {
  await transition('publish');
  const second = (
    await db.query('SELECT * FROM propose_quote_amendment($1,$2,$3,$4,$5,$6)', [
      quote,
      owner,
      id(21),
      version,
      'Alternative',
      JSON.stringify({
        line_items: [
          { description: 'Repair', quantity: 1, unitPrice: 130, total: 130 },
        ],
        subtotal: 130,
        tax_rate: 0,
        tax_amount: 0,
        total_amount: 130,
      }),
    ])
  ).rows[0].id;
  const first = revision;
  revision = second;
  await rejects(() => transition('publish'), /unique/);
  revision = first;
  assert.equal((await read()).amendments.length, 1);
});
for (const role of ['anon', 'authenticated']) {
  await db.exec(`SET ROLE ${role}`);
  await assert.rejects(
    () => db.exec('SELECT * FROM quote_amendments'),
    /permission denied/
  );
  await assert.rejects(
    () => db.exec('SELECT * FROM current_contractor_quotes'),
    /permission denied/
  );
  await assert.rejects(() => read(), /permission denied/);
  await assert.rejects(() => transition('publish'), /permission denied/);
  await db.exec('RESET ROLE');
}
const flags = (
  await db.query(
    "SELECT relrowsecurity FROM pg_class WHERE relname IN ('quote_amendments','quote_amendment_events')"
  )
).rows;
assert.equal(flags.length, 2);
assert.ok(flags.every((row) => row.relrowsecurity));
await test(
  'notification recipients, exact retries, metadata and no financial disclosure',
  async () => {
    await transition('publish');
    await transition('publish');
    let queued = (await db.query('SELECT * FROM notification_queue')).rows;
    assert.equal(queued.length, 1);
    assert.equal(queued[0].user_id, payer);
    assert.equal(queued[0].notification_type, 'quote_amendment_update');
    assert.equal(queued[0].action_url, `/jobs/${job}/amendments`);
    assert.deepEqual(queued[0].metadata, {
      jobId: job,
      quote_amendment_id: revision,
      amendment_version: 1,
    });
    assert.ok(!JSON.stringify(queued).includes('PRIVATE NOTE'));
    assert.ok(!JSON.stringify(queued).includes('Extra part'));
    await transition('approve', payer, 1);
    await transition('approve', payer, 1);
    assert.equal(
      (
        await one(
          "SELECT user_id FROM notification_queue WHERE metadata->>'amendment_version'='2'"
        )
      ).user_id,
      owner
    );
    await transition('apply', owner, 2);
    assert.equal(
      (
        await one(
          "SELECT user_id FROM notification_queue WHERE metadata->>'amendment_version'='3'"
        )
      ).user_id,
      payer
    );
    assert.equal(
      Number((await one('SELECT count(*) AS n FROM notification_queue')).n),
      3
    );
  },
  true
);
await test('rejection and withdrawal queue the opposite participant only', async () => {
  await transition('publish');
  await transition('reject', customer, 1);
  assert.equal(
    (
      await one(
        "SELECT user_id FROM notification_queue WHERE metadata->>'amendment_version'='2'"
      )
    ).user_id,
    owner
  );
});
await test('withdrawal queues the customer', async () => {
  await transition('publish');
  await transition('withdraw', owner, 1);
  assert.equal(
    (
      await one(
        "SELECT user_id FROM notification_queue WHERE metadata->>'amendment_version'='2'"
      )
    ).user_id,
    customer
  );
});
await test('queue failure rolls back decision, event, new quote, bid and contract', async () => {
  await approve();
  await db.exec(`RESET ROLE; CREATE FUNCTION fail_amendment_notice() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'queue unavailable'; END $$;
    CREATE TRIGGER fail_amendment_notice BEFORE INSERT ON notification_queue FOR EACH ROW EXECUTE FUNCTION fail_amendment_notice(); SET LOCAL ROLE service_role;`);
  await rejects(() => transition('apply', owner, 2), /queue unavailable/);
  assert.equal(
    (await one('SELECT status FROM quote_amendments')).status,
    'approved'
  );
  assert.equal(
    Number((await one('SELECT count(*) AS n FROM contractor_quotes')).n),
    1
  );
  assert.equal(
    Number((await one('SELECT count(*) AS n FROM quote_amendment_events')).n),
    2
  );
  assert.equal(Number((await one('SELECT amount FROM bids')).amount), 100);
  assert.equal((await one('SELECT quote_id FROM contracts')).quote_id, quote);
});
const triggerPrivileges = (
  await db.query(
    "SELECT has_function_privilege('service_role','public.queue_quote_amendment_event()','EXECUTE') AS service, has_function_privilege('authenticated','public.queue_quote_amendment_event()','EXECUTE') AS client"
  )
).rows[0];
assert.equal(triggerPrivileges.service, false);
assert.equal(triggerPrivileges.client, false);
await test(
  'email outbox records each event once with authoritative recipients',
  async () => {
    await transition('publish');
    await transition('publish');
    await transition('approve', payer, 1);
    await transition('apply', owner, 2);
    await transition('apply', owner, 2);
    const rows = (
      await db.query(
        'SELECT * FROM quote_amendment_email_outbox ORDER BY version'
      )
    ).rows;
    assert.deepEqual(
      rows.map((row) => [
        row.version,
        row.action,
        row.user_id,
        row.status,
        row.attempts,
      ]),
      [
        [1, 'publish', payer, 'pending', 0],
        [2, 'approve', owner, 'pending', 0],
        [3, 'apply', payer, 'pending', 0],
      ]
    );
    assert.ok(
      rows.every((row) => row.job_id === job && row.amendment_id === revision)
    );
    assert.ok(!JSON.stringify(rows).includes('PRIVATE NOTE'));
    assert.ok(!JSON.stringify(rows).includes('synthetic@example.test'));
  },
  true
);
await test('email rejection and withdrawal route correctly', async () => {
  await transition('publish');
  await transition('reject', customer, 1);
  assert.equal(
    (
      await one(
        "SELECT user_id FROM quote_amendment_email_outbox WHERE action='reject'"
      )
    ).user_id,
    owner
  );
});
await test('email withdrawal routes to the customer', async () => {
  await transition('publish');
  await transition('withdraw', owner, 1);
  assert.equal(
    (
      await one(
        "SELECT user_id FROM quote_amendment_email_outbox WHERE action='withdraw'"
      )
    ).user_id,
    customer
  );
});
await test('email outbox failure rolls back application and notification enqueue', async () => {
  await approve();
  await db.exec(`RESET ROLE; CREATE FUNCTION fail_amendment_email() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'email queue unavailable'; END $$;
    CREATE TRIGGER fail_amendment_email BEFORE INSERT ON quote_amendment_email_outbox FOR EACH ROW EXECUTE FUNCTION fail_amendment_email(); SET LOCAL ROLE service_role;`);
  await rejects(() => transition('apply', owner, 2), /email queue unavailable/);
  assert.equal(
    (await one('SELECT status FROM quote_amendments')).status,
    'approved'
  );
  assert.equal(
    Number((await one('SELECT count(*) AS n FROM contractor_quotes')).n),
    1
  );
  assert.equal(Number((await one('SELECT amount FROM bids')).amount), 100);
  assert.equal((await one('SELECT quote_id FROM contracts')).quote_id, quote);
  for (const tableName of [
    'quote_amendment_events',
    'quote_amendment_email_outbox',
    'notification_queue',
  ]) {
    assert.equal(
      Number((await one(`SELECT count(*) AS n FROM ${tableName}`)).n),
      2
    );
  }
});
await test('email service role can checkpoint but cannot rewrite routing or insert notices', async () => {
  await transition('publish');
  await db.exec(
    "UPDATE quote_amendment_email_outbox SET status='sending',attempts=1,scheduled_for=now()+interval '5 minutes'"
  );
  assert.equal(
    (await one('SELECT status FROM quote_amendment_email_outbox')).status,
    'sending'
  );
  await rejects(
    () =>
      db.exec(`UPDATE quote_amendment_email_outbox SET user_id='${outsider}'`),
    /permission denied/
  );
  await rejects(
    () => db.exec('DELETE FROM quote_amendment_email_outbox'),
    /permission denied/
  );
  await rejects(
    () =>
      db.exec(
        'INSERT INTO quote_amendment_email_outbox OVERRIDING SYSTEM VALUE SELECT * FROM quote_amendment_email_outbox'
      ),
    /permission denied/
  );
});
for (const role of ['anon', 'authenticated']) {
  await db.exec(`SET ROLE ${role}`);
  await assert.rejects(
    () => db.exec('SELECT * FROM quote_amendment_email_outbox'),
    /permission denied/
  );
  await assert.rejects(
    () => db.exec("UPDATE quote_amendment_email_outbox SET status='sent'"),
    /permission denied/
  );
  await db.exec('RESET ROLE');
}
assert.equal(
  (
    await one(
      "SELECT relrowsecurity FROM pg_class WHERE relname='quote_amendment_email_outbox'"
    )
  ).relrowsecurity,
  true
);
for (const role of ['anon', 'authenticated', 'service_role']) {
  assert.equal(
    (
      await one(
        "SELECT has_function_privilege($1,'public.queue_quote_amendment_email()','EXECUTE') AS allowed",
        [role]
      )
    ).allowed,
    false
  );
}
const reviewEmail = async (overrides = {}) => {
  const p = {
    actor: operator,
    request: id(91),
    amendment: revision,
    version: 1,
    expected: 0,
    action: 'retry',
    evidence: 'not_accepted',
    note: 'Provider log REF-123 confirms request was not accepted.',
    ...overrides,
  };
  return (
    await one(
      'SELECT review_quote_amendment_email($1,$2,$3,$4,$5,$6,$7,$8) AS result',
      [
        p.actor,
        p.request,
        p.amendment,
        p.version,
        p.expected,
        p.action,
        p.evidence,
        p.note,
      ]
    )
  ).result;
};
const failedEmail = async (status = 'failed') => {
  await transition('publish');
  await db.exec(
    `UPDATE quote_amendment_email_outbox SET status='${status}',attempts=6,error_code='provider_rejected'`
  );
};
await test('operator retry is atomic, idempotent and preserves prior delivery evidence', async () => {
  await failedEmail();
  const first = await reviewEmail();
  const again = await reviewEmail();
  assert.deepEqual(first, again);
  assert.equal(first.previous_attempts, 6);
  assert.equal(first.previous_error_code, 'provider_rejected');
  assert.equal(first.actor_id, operator);
  const row = await one('SELECT * FROM quote_amendment_email_outbox');
  assert.equal(row.status, 'pending');
  assert.equal(row.attempts, 0);
  assert.equal(row.review_version, 1);
  assert.equal(row.sent_at, null);
  assert.equal(
    Number(
      (await one('SELECT count(*) AS n FROM quote_amendment_email_reviews')).n
    ),
    1
  );
  assert.equal(Number((await one('SELECT amount FROM bids')).amount), 100);
  assert.equal(
    Number(
      (
        await one('SELECT total_amount FROM contractor_quotes WHERE id=$1', [
          quote,
        ])
      ).total_amount
    ),
    100
  );
});
for (const [action, evidence, target] of [
  ['close_unknown', 'unknown', 'reviewed_unknown'],
  ['confirm_accepted', 'accepted', 'reviewed_accepted'],
]) {
  await test(`${action} records evidence without claiming delivery or scheduling a send`, async () => {
    await failedEmail('needs_review');
    const before = await one('SELECT * FROM quote_amendment_email_outbox');
    await reviewEmail({ action, evidence });
    const after = await one('SELECT * FROM quote_amendment_email_outbox');
    assert.equal(after.status, target);
    assert.equal(after.sent_at, null);
    assert.equal(after.attempts, 6);
    assert.equal(String(after.scheduled_for), String(before.scheduled_for));
  });
}
await test('competing reviews and changed request-id reuse are rejected', async () => {
  await failedEmail();
  await reviewEmail();
  await rejects(() => reviewEmail({ request: id(92) }), {
    code: 'PT409',
    message: /changed/,
  });
  await rejects(
    () =>
      reviewEmail({
        note: 'Different evidence must not reuse an existing request.',
      }),
    { code: 'PT409', message: /already used/ }
  );
  assert.equal(
    Number(
      (await one('SELECT count(*) AS n FROM quote_amendment_email_reviews')).n
    ),
    1
  );
});
await test('repeat recovery cycles retain immutable history', async () => {
  await failedEmail();
  await reviewEmail();
  await db.exec(
    "UPDATE quote_amendment_email_outbox SET status='needs_review',attempts=2"
  );
  await reviewEmail({
    request: id(92),
    expected: 1,
    action: 'close_unknown',
    evidence: 'unknown',
  });
  const rows = (
    await db.query(
      'SELECT review_version,previous_attempts FROM quote_amendment_email_reviews ORDER BY review_version'
    )
  ).rows;
  assert.deepEqual(rows, [
    { review_version: 1, previous_attempts: 6 },
    { review_version: 2, previous_attempts: 2 },
  ]);
  await rejects(
    () => db.exec("UPDATE quote_amendment_email_reviews SET note='tamper'"),
    /permission denied/
  );
  await db.exec('RESET ROLE');
  await rejects(
    () => db.exec('DELETE FROM quote_amendment_email_reviews'),
    /immutable|append.only/i
  );
});
await test('non-admin and deleted admins cannot review or replay', async () => {
  await failedEmail();
  await rejects(() => reviewEmail({ actor: owner }), /Admin required/);
  await reviewEmail();
  await db.exec(
    `RESET ROLE; UPDATE profiles SET deleted_at=now() WHERE id='${operator}'; SET LOCAL ROLE service_role;`
  );
  await rejects(() => reviewEmail(), /Admin required/);
});
await test('mismatched evidence and short notes cannot authorize retries', async () => {
  await failedEmail('needs_review');
  for (const input of [
    { evidence: 'unknown' },
    { evidence: 'accepted' },
    { note: 'short' },
    { action: 'confirm_accepted', evidence: 'unknown' },
  ]) {
    await rejects(() => reviewEmail(input), /evidence required/);
  }
});
for (const status of [
  'pending',
  'sending',
  'sent',
  'cancelled',
  'reviewed_unknown',
  'reviewed_accepted',
]) {
  await test(`cannot recover ${status} mail`, async () => {
    await failedEmail(status);
    await rejects(() => reviewEmail(), { code: 'PT409', message: /changed/ });
  });
}
await test('stale amendment or changed payer cannot be retried', async () => {
  await failedEmail();
  await db.exec(
    `UPDATE jobs SET payer_user_id='${outsider}' WHERE id='${job}'`
  );
  await rejects(() => reviewEmail(), {
    code: 'PT409',
    message: /no longer current/,
  });
  await db.exec(`UPDATE jobs SET payer_user_id=NULL WHERE id='${job}'`);
  await transition('withdraw', owner, 1);
  await rejects(() => reviewEmail(), {
    code: 'PT409',
    message: /no longer current/,
  });
});
await test('review audit failure rolls back the queue reset', async () => {
  await failedEmail();
  await db.exec(`RESET ROLE; CREATE FUNCTION fail_email_review() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'review unavailable'; END $$;
    CREATE TRIGGER fail_email_review BEFORE INSERT ON quote_amendment_email_reviews FOR EACH ROW EXECUTE FUNCTION fail_email_review(); SET LOCAL ROLE service_role;`);
  await rejects(() => reviewEmail(), /review unavailable/);
  assert.equal(
    (await one('SELECT status FROM quote_amendment_email_outbox')).status,
    'failed'
  );
});
for (const role of ['anon', 'authenticated']) {
  await db.exec(`SET ROLE ${role}`);
  await assert.rejects(() => reviewEmail(), /permission denied/);
  await assert.rejects(
    () => db.exec('SELECT * FROM quote_amendment_email_reviews'),
    /permission denied/
  );
  await db.exec('RESET ROLE');
}
assert.equal(
  (
    await one(
      "SELECT relrowsecurity FROM pg_class WHERE relname='quote_amendment_email_reviews'"
    )
  ).relrowsecurity,
  true
);
await db.close();
console.log(
  `${cases} approval/application scenarios plus role and RLS checks passed.`
);
