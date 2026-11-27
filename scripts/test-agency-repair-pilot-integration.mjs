import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const { PGlite } = await import(
  process.env.PGLITE_MODULE || '@electric-sql/pglite'
);
const db = new PGlite();
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const [
  org,
  otherOrg,
  property,
  otherProperty,
  ticket,
  owner,
  manager,
  backup,
  reporter,
  outsideManager,
  inspectionOne,
  inspectionTwo,
  outsideInspection,
] = Array.from({ length: 13 }, (_, i) => id(i + 1));
let checks = 0;
const equal = (actual, expected) => {
  assert.deepEqual(actual, expected);
  checks++;
};
const reject = async (promise, code) => {
  await assert.rejects(promise, (e) => e.code === code);
  checks++;
};
const value = async (sql, params = []) =>
  (await db.query(sql, params)).rows[0]?.value;

try {
  await db.exec(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE ROLE service_role BYPASSRLS;
    CREATE TABLE public.organizations (id uuid PRIMARY KEY, organization_type text);
    CREATE TABLE public.profiles (id uuid PRIMARY KEY, first_name text, last_name text, deleted_at timestamptz);
    CREATE TABLE public.properties (id uuid PRIMARY KEY, org_id uuid, property_name text, address text);
    CREATE TABLE public.organization_memberships (
      org_id uuid, user_id uuid, status text, org_role text, UNIQUE (org_id, user_id)
    );
    CREATE TABLE public.maintenance_tickets (
      id uuid PRIMARY KEY, org_id uuid, property_id uuid, reported_by uuid, status text,
      title text
    );
    CREATE TABLE public.property_inspection_reports (id uuid PRIMARY KEY, property_id uuid);
    GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
    INSERT INTO organizations VALUES ('${org}', 'agency'), ('${otherOrg}', 'agency');
    INSERT INTO profiles VALUES
      ('${owner}', 'TEST', 'Owner', null), ('${manager}', 'TEST', 'Manager', null),
      ('${backup}', 'TEST', 'Backup', null), ('${reporter}', 'TEST', 'Resident', null),
      ('${outsideManager}', 'TEST', 'Other workspace manager', null);
    INSERT INTO organization_memberships VALUES
      ('${org}', '${owner}', 'active', 'owner'), ('${org}', '${manager}', 'active', 'manager'),
      ('${org}', '${backup}', 'active', 'maintenance_coordinator'),
      ('${org}', '${reporter}', 'active', 'tenant'),
      ('${otherOrg}', '${outsideManager}', 'active', 'manager');
    INSERT INTO properties VALUES
      ('${property}', '${org}', 'TEST ONLY Marsh House', null),
      ('${otherProperty}', '${otherOrg}', 'TEST ONLY Other House', null);
    INSERT INTO maintenance_tickets VALUES
      ('${ticket}', '${org}', '${property}', '${reporter}', 'open', 'TEST ONLY Kitchen leak');
  `);

  for (const migration of [
    '20261126230000_agency_document_branding.sql',
    '20261126232847_agency_repair_work_orders.sql',
    '20261126233143_agency_landlord_records.sql',
  ])
    await db.exec(
      readFileSync(
        new URL('../supabase/migrations/' + migration, import.meta.url),
        'utf8'
      )
    );

  const crm = (actor, changes = null, workspace = org) =>
    value('SELECT public.agency_landlord_directory($1,$2,NULL,$3) AS value', [
      workspace,
      actor,
      changes === null ? null : JSON.stringify(changes),
    ]);
  const order = (actor, changes = null) =>
    value('SELECT public.agency_repair_work_order($1,$2,$3) AS value', [
      ticket,
      actor,
      changes === null ? null : JSON.stringify(changes),
    ]);
  const brandSnapshot = (inspectionId) =>
    value(
      'SELECT document_branding AS value FROM public.property_inspection_reports WHERE id=$1',
      [inspectionId]
    );
  await db.exec('SET ROLE service_role');
  const { landlord } = await crm(owner, {
    displayName: 'TEST ONLY Marsh Landlord',
    approvalLimitPence: 15000,
    primaryManagerId: manager,
    backupManagerId: backup,
    propertyIds: [property],
  });
  equal(
    [landlord.approvalLimitPence, landlord.propertyIds],
    [15000, [property]]
  );
  const managerDirectory = await crm(manager);
  equal(managerDirectory.properties, [
    { id: property, name: 'TEST ONLY Marsh House', landlordId: landlord.id },
  ]);
  equal((await crm(backup)).canEdit, false);
  equal((await crm(outsideManager, null, otherOrg)).landlords, []);
  await reject(crm(outsideManager), 'P0002');
  await reject(crm(reporter), 'P0002');

  equal(await order(manager), null);
  const draft = {
    revision: 0,
    arrangement: 'agency_contractor',
    contractorName: 'TEST ONLY Regular Plumber',
    quotedPence: 24000,
    approvedPence: null,
    approvalReference: null,
    invoicedPence: null,
    invoiceReference: null,
    paidPence: null,
    paymentReference: null,
    completionNote: null,
  };
  const quote = await order(manager, draft);
  equal(
    [
      quote.quotedPence,
      quote.approvedPence,
      quote.invoicedPence,
      quote.paidPence,
    ],
    [24000, null, null, null]
  );
  equal(quote.quotedPence > landlord.approvalLimitPence, true);
  // Intentional boundary: no automated threshold enforcement or landlord-portal workflow.
  equal((await order(backup)).approvedPence, null);
  await reject(order(outsideManager), 'P0002');
  await reject(order(reporter), 'P0002');
  const approvedInput = {
    ...draft,
    revision: quote.revision,
    approvedPence: 24000,
    approvalReference: 'TEST ONLY: landlord approval recorded by manager',
  };
  const approved = await order(manager, approvedInput);
  equal(
    [approved.approvedPence, approved.invoicedPence, approved.paidPence],
    [24000, null, null]
  );
  const invoiceInput = {
    ...approvedInput,
    revision: approved.revision,
    invoicedPence: 24000,
    invoiceReference: 'TEST-INV-001',
    completionNote: 'TEST ONLY: agency checked repair.',
  };
  const invoiced = await order(manager, invoiceInput);
  equal([invoiced.invoicedPence, invoiced.paidPence], [24000, null]);
  const paid = await order(owner, {
    ...invoiceInput,
    revision: invoiced.revision,
    paidPence: 24000,
    paymentReference: 'TEST ONLY: recorded from reconciliation',
  });
  equal([paid.revision, paid.paidPence], [4, 24000]);
  equal(
    await value(
      'SELECT status AS value FROM public.maintenance_tickets WHERE id=$1',
      [ticket]
    ),
    'open'
  );
  await reject(order(backup, invoiceInput), '40001');

  await db.query(
    'INSERT INTO public.organization_document_branding (org_id, display_name, accent_colour) VALUES ($1,$2,$3)',
    [org, 'TEST ONLY Marsh Agency', '#0E5545']
  );
  await db.query(
    'INSERT INTO public.property_inspection_reports (id, property_id) VALUES ($1,$2)',
    [inspectionOne, property]
  );
  await db.query(
    'UPDATE public.organization_document_branding SET display_name=$1, accent_colour=$2 WHERE org_id=$3',
    ['TEST ONLY Marsh Updated', '#274B86', org]
  );
  await db.query(
    'INSERT INTO public.property_inspection_reports (id, property_id) VALUES ($1,$2), ($3,$4)',
    [inspectionTwo, property, outsideInspection, otherProperty]
  );
  equal(await brandSnapshot(inspectionOne), {
    displayName: 'TEST ONLY Marsh Agency',
    accentColour: '#0E5545',
    logoBase64: null,
  });
  equal(await brandSnapshot(inspectionTwo), {
    displayName: 'TEST ONLY Marsh Updated',
    accentColour: '#274B86',
    logoBase64: null,
  });
  equal(await brandSnapshot(outsideInspection), null);

  await db.exec('RESET ROLE');
  equal(
    (
      await db.query(
        'SELECT actor_id, snapshot FROM public.portfolio_ticket_work_order_revisions WHERE ticket_id=$1 ORDER BY revision',
        [ticket]
      )
    ).rows.map(({ actor_id, snapshot }) => [
      actor_id,
      snapshot.approvedPence,
      snapshot.invoicedPence,
      snapshot.paidPence,
    ]),
    [
      [manager, null, null, null],
      [manager, 24000, null, null],
      [manager, 24000, 24000, null],
      [owner, 24000, 24000, 24000],
    ]
  );
  console.log(
    `${checks} integrated agency pilot database checks passed on disposable fixtures.`
  );
} finally {
  await db.close();
}
