import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const { PGlite } = await import(
  process.env.PGLITE_MODULE || '@electric-sql/pglite'
);
const db = new PGlite();
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const [
  agency,
  other,
  property,
  ticket,
  owner,
  coordinator,
  tenant,
  outsider,
  suspended,
] = Array.from({ length: 9 }, (_, i) => id(i + 1));
let checks = 0;
const equal = (actual, expected) => {
  assert.deepEqual(actual, expected);
  checks++;
};
const rejects = async (promise, code) => {
  await assert.rejects(promise, (error) => error.code === code);
  checks++;
};

try {
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE TABLE properties (id uuid PRIMARY KEY, org_id uuid);
    CREATE TABLE maintenance_tickets (id uuid PRIMARY KEY, org_id uuid, property_id uuid, reported_by uuid);
    CREATE TABLE organization_memberships (org_id uuid, user_id uuid, status text, org_role text);
    GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
    INSERT INTO properties VALUES ('${property}', '${agency}');
    INSERT INTO maintenance_tickets VALUES ('${ticket}', '${agency}', '${property}', '${tenant}');
    INSERT INTO organization_memberships VALUES
      ('${agency}', '${owner}', 'active', 'owner'),
      ('${agency}', '${coordinator}', 'active', 'maintenance_coordinator'),
      ('${agency}', '${tenant}', 'active', 'tenant'),
      ('${other}', '${outsider}', 'active', 'manager'),
      ('${agency}', '${suspended}', 'suspended', 'manager');
  `);
  await db.exec(
    readFileSync(
      new URL(
        '../supabase/migrations/20261126232847_agency_repair_work_orders.sql',
        import.meta.url
      ),
      'utf8'
    )
  );

  const order = async (actor, changes = null, ticketId = ticket) => {
    const { rows } = await db.query(
      'SELECT public.agency_repair_work_order($1, $2, $3) AS work_order',
      [ticketId, actor, changes === null ? null : JSON.stringify(changes)]
    );
    return rows[0].work_order;
  };

  const draft = {
    revision: 0,
    arrangement: 'agency_contractor',
    contractorName: ' TEST ONLY Plumber ',
    quotedPence: 24000,
    approvedPence: null,
    approvalReference: null,
    invoicedPence: null,
    invoiceReference: null,
    paidPence: null,
    paymentReference: null,
    completionNote: null,
  };
  await db.exec('SET ROLE anon');
  await rejects(order(owner), '42501');
  await rejects(
    db.query('SELECT * FROM public.portfolio_ticket_work_orders'),
    '42501'
  );
  await db.exec('SET ROLE authenticated');
  await rejects(order(owner), '42501');
  await rejects(
    db.query('SELECT * FROM public.portfolio_ticket_work_order_revisions'),
    '42501'
  );
  await db.exec('SET ROLE service_role');
  equal(await order(owner), null);
  for (const actor of [tenant, outsider, suspended, id(10)]) {
    await rejects(order(actor), 'P0002');
    await rejects(order(actor, draft), 'P0002');
  }
  await rejects(order(owner, draft, id(11)), 'P0002');
  await rejects(
    order(owner, { ...draft, arrangement: 'marketplace' }),
    '23514'
  );
  await rejects(
    order(owner, { ...draft, paidPence: 24000, paymentReference: 'TEST' }),
    '23514'
  );
  const quoted = await order(owner, draft);
  equal(
    [
      quoted.revision,
      quoted.contractorName,
      quoted.quotedPence,
      quoted.approvedPence,
      quoted.paidPence,
    ],
    [1, 'TEST ONLY Plumber', 24000, null, null]
  );
  const revisionOne = { ...draft, revision: 1 };
  await rejects(order(coordinator, draft), '40001');
  await rejects(
    order(coordinator, {
      ...revisionOne,
      approvedPence: 25000,
      approvalReference: 'TEST',
    }),
    '23514'
  );
  await rejects(
    order(coordinator, { ...revisionOne, approvedPence: 24000 }),
    '23514'
  );
  const approved = await order(coordinator, {
    ...revisionOne,
    approvedPence: 24000,
    approvalReference: 'TEST owner approved by phone',
  });
  equal(
    [
      approved.revision,
      approved.approvedPence,
      approved.invoicedPence,
      approved.paidPence,
    ],
    [2, 24000, null, null]
  );
  const invoice = {
    ...revisionOne,
    revision: 2,
    arrangement: 'arranged_outside',
    approvedPence: 24000,
    approvalReference: 'TEST owner approved by phone',
    invoicedPence: 26000,
    invoiceReference: 'TEST-INV-1',
    completionNote: 'TEST ONLY: contractor confirmed repair by phone.',
  };
  const invoiced = await order(coordinator, invoice);
  equal(
    [
      invoiced.revision,
      invoiced.arrangement,
      invoiced.invoicedPence,
      invoiced.paidPence,
    ],
    [3, 'arranged_outside', 26000, null]
  );
  await rejects(
    order(owner, {
      ...invoice,
      revision: 3,
      paidPence: 27000,
      paymentReference: 'TEST',
    }),
    '23514'
  );
  const paid = await order(owner, {
    ...invoice,
    revision: 3,
    paidPence: 20000,
    paymentReference: 'TEST bank reconciliation',
  });
  equal([paid.revision, paid.invoicedPence, paid.paidPence], [4, 26000, 20000]);
  equal((await order(owner)).revision, 4);
  await db.exec('RESET ROLE');
  equal(
    (
      await db.query(
        'SELECT revision, actor_id, snapshot FROM public.portfolio_ticket_work_order_revisions ORDER BY revision'
      )
    ).rows.map(({ revision, actor_id, snapshot }) => [
      revision,
      actor_id,
      snapshot.paidPence,
    ]),
    [
      [1, owner, null],
      [2, coordinator, null],
      [3, coordinator, null],
      [4, owner, 20000],
    ]
  );
  await db.query('UPDATE properties SET org_id = $1 WHERE id = $2', [
    other,
    property,
  ]);
  await db.exec('SET ROLE service_role');
  await rejects(order(owner), 'P0002');
  await rejects(order(outsider), 'P0002');
  console.log(`${checks} private agency work-order database checks passed.`);
} finally {
  await db.close();
}
