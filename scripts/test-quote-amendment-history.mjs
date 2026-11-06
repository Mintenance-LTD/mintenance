// Disposable embedded PostgreSQL; synthetic data only, no hosted connection.
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const { PGlite } = await import(
  process.env.PGLITE_MODULE || '@electric-sql/pglite'
);
const db = new PGlite();
const owner = '00000000-0000-4000-8000-000000000001';
const other = '00000000-0000-4000-8000-000000000002';
const quote = '00000000-0000-4000-8000-000000000003';
const draft = '00000000-0000-4000-8000-000000000004';
const linked = '00000000-0000-4000-8000-000000000005';
const request = '00000000-0000-4000-8000-000000000006';
const version = '2026-11-06T12:00:00.123456Z';
await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
CREATE TABLE public.contractor_quotes (
 id uuid PRIMARY KEY, contractor_id uuid NOT NULL, job_id uuid, client_email text,
 title text NOT NULL, description text, line_items jsonb, subtotal numeric(10,2), tax_rate numeric(5,2),
 tax_amount numeric(10,2), total_amount numeric(10,2), terms text, notes text, valid_until date,
 status text NOT NULL, updated_at timestamptz, viewed_at timestamptz, accepted_at timestamptz);
CREATE TABLE public.bids(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), quote_id uuid REFERENCES public.contractor_quotes(id) ON DELETE SET NULL, status text);
GRANT ALL ON public.contractor_quotes, public.bids TO service_role;`);
await db.query(
  `INSERT INTO contractor_quotes(id,contractor_id,title,total_amount,status,updated_at)
 VALUES ($1,$2,'Existing agreed scope',100,'accepted',$3)`,
  [quote, owner, version]
);
await db.exec(
  readFileSync(
    new URL(
      '../supabase/migrations/20261106132613_quote_amendment_history.sql',
      import.meta.url
    ),
    'utf8'
  )
);
assert.equal(
  (await db.query('SELECT * FROM quote_revisions')).rows.length,
  0,
  'no invented historical backfill'
);
await db.exec('SET ROLE service_role');
const pricing = {
  line_items: [
    {
      description: 'Replacement work',
      quantity: 1.5,
      unitPrice: 10.01,
      total: 15.02,
    },
  ],
  subtotal: 15.02,
  tax_rate: 20,
  tax_amount: 3,
  total_amount: 18.02,
};
const propose = (overrides = {}) => {
  const input = {
    quote,
    actor: owner,
    request,
    version,
    reason: 'Change requested for review',
    pricing,
    ...overrides,
  };
  return db.query('SELECT * FROM propose_quote_amendment($1,$2,$3,$4,$5,$6)', [
    input.quote,
    input.actor,
    input.request,
    input.version,
    input.reason,
    JSON.stringify(input.pricing),
  ]);
};
const original = (
  await db.query('SELECT * FROM contractor_quotes WHERE id=$1', [quote])
).rows[0];
const first = (await propose()).rows[0];
assert.equal(first.revision_number, 1);
assert.equal(first.actor_id, owner);
assert.equal(first.before_snapshot.total_amount, 100);
assert.equal(first.after_snapshot.total_amount, 18.02);
assert.equal(first.after_snapshot.status, 'proposal');
assert.deepEqual(
  (await db.query('SELECT * FROM contractor_quotes WHERE id=$1', [quote]))
    .rows[0],
  original
);
assert.equal(
  (await propose()).rows[0].id,
  first.id,
  'identical retry returns the original event'
);
await assert.rejects(
  propose({ reason: 'Different request with reused key' }),
  /already used/
);
await assert.rejects(propose({ actor: other }), /not found/);
await assert.rejects(
  propose({ request: other, version: '2026-11-06T12:00:00.123455Z' }),
  /changed/
);
await assert.rejects(propose({ request: other, reason: ' ' }), /reason/);
await assert.rejects(
  propose({ request: other, pricing: { ...pricing, total_amount: 500 } }),
  /totals/
);
await assert.rejects(
  propose({ request: other, pricing: { ...pricing, line_items: [] } }),
  /items/
);
await assert.rejects(
  propose({
    request: other,
    pricing: {
      ...pricing,
      line_items: [{ ...pricing.line_items[0], quantity: -1 }],
    },
  }),
  /item/
);
await assert.rejects(
  propose({ request: other, pricing: { ...pricing, tax_rate: null } }),
  /totals/
);
await db.query('UPDATE contractor_quotes SET updated_at=now() WHERE id=$1', [
  quote,
]);
assert.equal(
  (await propose()).rows[0].id,
  first.id,
  'lost response can be recovered after a telemetry refresh'
);
assert.equal(
  (await db.query('SELECT * FROM quote_revisions')).rows.length,
  1,
  'timestamp-only writes are not revisions'
);
await assert.rejects(
  db.query('UPDATE contractor_quotes SET total_amount=1 WHERE id=$1', [quote]),
  /separate amendment/
);
await assert.rejects(
  db.query("UPDATE contractor_quotes SET status='draft' WHERE id=$1", [quote]),
  /separate amendment/
);
await assert.rejects(
  db.query('UPDATE contractor_quotes SET contractor_id=$1 WHERE id=$2', [
    other,
    quote,
  ]),
  /separate amendment/
);
await assert.rejects(
  db.query('UPDATE contractor_quotes SET terms=$1 WHERE id=$2', [
    'New terms',
    quote,
  ]),
  /separate amendment/
);
await assert.rejects(
  db.query('DELETE FROM contractor_quotes WHERE id=$1', [quote]),
  /cannot be deleted/
);
await assert.rejects(
  db.exec("UPDATE quote_revisions SET reason='tampered'"),
  /permission denied/
);
await assert.rejects(
  db.exec('DELETE FROM quote_revisions'),
  /permission denied/
);
await assert.rejects(db.exec('TRUNCATE quote_revisions'), /permission denied/);
await assert.rejects(
  db.exec('INSERT INTO quote_revisions DEFAULT VALUES'),
  /permission denied/
);
await db.query(
  `INSERT INTO contractor_quotes(id,contractor_id,title,total_amount,status,updated_at)
 VALUES ($1,$2,'Draft',10,'draft',NULL), ($3,$2,'Accepted bid, not yet synced',20,'sent',NULL)`,
  [draft, owner, linked]
);
await assert.rejects(propose({ quote: draft, version: null }), /Only accepted/);
await db.query("INSERT INTO bids(quote_id,status) VALUES ($1,'accepted')", [
  linked,
]);
await assert.rejects(
  db.query('UPDATE contractor_quotes SET total_amount=99 WHERE id=$1', [
    linked,
  ]),
  /separate amendment/
);
await assert.rejects(
  db.query('DELETE FROM contractor_quotes WHERE id=$1', [linked]),
  /cannot be deleted/
);
await db.query("UPDATE contractor_quotes SET status='accepted' WHERE id=$1", [
  linked,
]);
const linkedProposal = (await propose({ quote: linked, version: null }))
  .rows[0];
assert.equal(linkedProposal.revision_number, 3);
assert.equal(linkedProposal.before_snapshot.total_amount, 20);
await db.query(
  'UPDATE contractor_quotes SET total_amount=11, notes=$1 WHERE id=$2',
  ['Changed scope', draft]
);
await db.query('DELETE FROM contractor_quotes WHERE id=$1', [draft]);
const history = (
  await db.query(
    'SELECT * FROM quote_revisions WHERE quote_id=$1 ORDER BY revision_number',
    [draft]
  )
).rows;
assert.deepEqual(
  history.map((r) => r.kind),
  ['created', 'updated', 'deleted']
);
assert.equal(history[1].before_snapshot.total_amount, 10);
assert.equal(history[1].after_snapshot.total_amount, 11);
assert.equal(
  history[1].actor_id,
  null,
  'no invented human identity for service writes'
);
assert.equal(history[2].after_snapshot, null);
await db.exec('RESET ROLE');
await assert.rejects(
  db.exec("UPDATE quote_revisions SET reason='tampered'"),
  /append-only/
);
assert.equal(
  (
    await db.query(
      "SELECT relrowsecurity FROM pg_class WHERE relname='quote_revisions'"
    )
  ).rows[0].relrowsecurity,
  true
);
for (const role of ['anon', 'authenticated']) {
  await db.exec(`SET ROLE ${role}`);
  await assert.rejects(
    db.exec('SELECT * FROM quote_revisions'),
    /permission denied/
  );
  await assert.rejects(propose(), /permission denied/);
  await db.exec('RESET ROLE');
}
await db.close();
console.log(
  'Quote amendment/history SQL checks passed: ownership, rounding, versions, idempotency, immutability, prospective snapshots, role grants and RLS.'
);
