import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const { PGlite } = await import(
  process.env.PGLITE_MODULE || '@electric-sql/pglite'
);
const db = new PGlite();
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const [
  org,
  other,
  propertyA,
  propertyB,
  propertyOther,
  owner,
  manager,
  coordinator,
  tenant,
  outsider,
  suspended,
  deleted,
] = Array.from({ length: 12 }, (_, i) => id(i + 1));
let checks = 0;
const equal = (a, b) => {
  assert.deepEqual(a, b);
  checks++;
};
const denied = async (promise, code) => {
  await assert.rejects(promise, (e) => e.code === code);
  checks++;
};
try {
  await db.exec(`
  CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
  CREATE TABLE organizations (id uuid PRIMARY KEY, organization_type text);
  CREATE TABLE profiles (id uuid PRIMARY KEY, first_name text, last_name text, deleted_at timestamptz);
  CREATE TABLE properties (id uuid PRIMARY KEY, org_id uuid, property_name text, address text);
  CREATE TABLE organization_memberships (org_id uuid, user_id uuid, status text, org_role text);
  GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
  INSERT INTO organizations VALUES ('${org}', 'agency'), ('${other}', 'agency');
  INSERT INTO properties VALUES ('${propertyA}','${org}','TEST A',null), ('${propertyB}','${org}',null,'TEST street'), ('${propertyOther}','${other}','Outside',null);
  INSERT INTO profiles VALUES
    ('${owner}','TEST','Owner',null), ('${manager}','TEST','Manager',null),
    ('${coordinator}','TEST','Coordinator',null), ('${tenant}','TEST','Tenant',null),
    ('${outsider}','TEST','Outside',null), ('${suspended}','TEST','Suspended',null),
    ('${deleted}','TEST','Deleted',now());
  INSERT INTO organization_memberships VALUES
    ('${org}','${owner}','active','owner'), ('${org}','${manager}','active','manager'),
    ('${org}','${coordinator}','active','maintenance_coordinator'), ('${org}','${tenant}','active','tenant'),
    ('${other}','${outsider}','active','owner'), ('${org}','${suspended}','suspended','manager'),
    ('${org}','${deleted}','active','manager');
  `);
  await db.exec(
    readFileSync(
      new URL(
        '../supabase/migrations/20261126233143_agency_landlord_records.sql',
        import.meta.url
      ),
      'utf8'
    )
  );

  const call = async (actor, recordId = null, changes = null, orgId = org) => {
    const { rows } = await db.query(
      'SELECT public.agency_landlord_directory($1,$2,$3,$4) AS result',
      [orgId, actor, recordId, changes ? JSON.stringify(changes) : null]
    );
    return rows[0].result;
  };
  const one = {
    displayName: ' TEST Landlord ',
    approvalLimitPence: 15000,
    primaryManagerId: manager,
    backupManagerId: coordinator,
    propertyIds: [propertyA],
  };
  await db.exec('SET ROLE anon');
  await denied(call(owner), '42501');
  await denied(db.query('SELECT * FROM public.agency_landlords'), '42501');
  await db.exec('SET ROLE authenticated');
  await denied(call(owner), '42501');
  await denied(
    db.query('SELECT * FROM public.agency_landlord_property_allocations'),
    '42501'
  );
  await db.exec('SET ROLE service_role');
  for (const actor of [tenant, outsider, suspended, deleted]) {
    await denied(call(actor), 'P0002');
    await denied(call(actor, null, one), 'P0002');
  }
  const empty = await call(owner);
  equal(empty.canEdit, true);
  equal(empty.landlords, []);
  equal(
    empty.staff.map((s) => s.id).sort(),
    [owner, manager, coordinator].sort()
  );
  equal(empty.properties.map((p) => p.id).sort(), [propertyA, propertyB]);
  equal((await call(coordinator)).canEdit, false);
  await denied(call(coordinator, null, one), '42501');
  for (const invalid of [
    { backupManagerId: manager },
    { backupManagerId: deleted },
    { backupManagerId: tenant },
    { backupManagerId: suspended },
    { primaryManagerId: outsider },
    { propertyIds: [propertyOther] },
    { propertyIds: [propertyA, propertyA] },
  ])
    await denied(call(owner, null, { ...one, ...invalid }), '22023');
  const { landlord: created } = await call(manager, null, one);
  equal(
    [
      created.displayName,
      created.approvalLimitPence,
      created.primaryManagerId,
      created.backupManagerId,
      created.revision,
      created.propertyIds,
    ],
    ['TEST Landlord', 15000, manager, coordinator, 1, [propertyA]]
  );
  const list = await call(coordinator);
  equal(list.landlords[0].id, created.id);
  equal(list.properties.find((p) => p.id === propertyA).landlordId, created.id);
  await denied(call(owner, null, { ...one, displayName: 'TEST Two' }), '23505');
  await denied(call(owner, created.id, { ...one, revision: 0 }), '40001');
  await denied(
    call(
      outsider,
      created.id,
      {
        ...one,
        primaryManagerId: null,
        backupManagerId: null,
        propertyIds: [],
        revision: 1,
      },
      other
    ),
    'P0002'
  );
  const { landlord: updated } = await call(owner, created.id, {
    ...one,
    revision: 1,
    approvalLimitPence: 0,
    propertyIds: [propertyB],
  });
  equal(
    [updated.revision, updated.approvalLimitPence, updated.propertyIds],
    [2, 0, [propertyB]]
  );
  equal(
    (await call(owner)).properties.find((p) => p.id === propertyA).landlordId,
    null
  );
  await denied(call(owner, created.id, { ...one, revision: 1 }), '40001');
  await db.exec('RESET ROLE');
  await db.query('UPDATE properties SET org_id=$1 WHERE id=$2', [
    other,
    propertyB,
  ]);
  await db.exec('SET ROLE service_role');
  equal((await call(owner)).landlords[0].propertyIds, []);
  equal(
    (await call(outsider, null, null, other)).properties.find(
      (p) => p.id === propertyB
    ).landlordId,
    null
  );
  equal((await call(outsider, null, null, other)).landlords, []);
  console.log(`${checks} private agency landlord CRM database checks passed.`);
} finally {
  await db.close();
}
