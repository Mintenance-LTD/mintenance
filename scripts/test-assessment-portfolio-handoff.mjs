import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const { PGlite } = await import(
  process.env.PGLITE_MODULE || '@electric-sql/pglite'
);
const db = new PGlite();
try {
  await db.exec(`
    create role anon;
    create role authenticated;
    create role service_role;
    create table properties(id uuid primary key, owner_id uuid, org_id uuid);
    create table organization_memberships(org_id uuid,user_id uuid,status text,org_role text);
    create table property_team_members(property_id uuid,user_id uuid,status text,role text);
    create table building_assessments(id uuid primary key,property_id uuid,user_id uuid,updated_at timestamptz,validation_status text,validated_by uuid);
    create table assessment_expert_reviews(id uuid primary key, assessment_id uuid, property_id uuid);
    create table assessment_images(id uuid primary key, assessment_id uuid references building_assessments(id));
    create table maintenance_tickets(
      id uuid primary key default gen_random_uuid(),org_id uuid,property_id uuid,
      reported_by uuid,title text,description text,category text,priority text,status text
    );
  `);
  const migration = await readFile(
    new URL(
      '../supabase/migrations/20261126210000_assessment_portfolio_handoff.sql',
      import.meta.url
    ),
    'utf8'
  );
  await db.exec(migration);
  const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
  const [
    owner,
    property,
    org,
    assessment,
    pending,
    reviewer,
    outsider,
    review,
  ] = Array.from({ length: 8 }, (_, i) => id(i + 1));
  const snap = '2026-11-26T10:00:00Z';
  await db.query('insert into properties values ($1,$2,$3)', [
    property,
    owner,
    org,
  ]);
  await db.query(
    "insert into organization_memberships values ($1,$2,'active','owner'),($1,$3,'active','maintenance_coordinator')",
    [org, owner, outsider]
  );
  await db.query(
    "insert into building_assessments values ($1,$3,$4,$5,'validated',$6),($2,$3,$4,$5,null,null)",
    [assessment, pending, property, owner, snap, reviewer]
  );
  const run = (
    source,
    actor = owner,
    revision = snap,
    reviewRow = null,
    images = null
  ) =>
    db
      .query(
        "select create_assessment_portfolio_ticket($1,$2,$3,$4,$5,$6,'TEST ONLY','Kitchen: review visible marks and check leak.','medium') as result",
        [actor, property, source, revision, reviewRow, images]
      )
      .then(({ rows }) => rows[0].result);
  await assert.rejects(run(assessment, outsider), { code: '42501' });
  await assert.rejects(run(pending), { code: '23514' });
  await assert.rejects(run(assessment, owner, '2026-11-27T10:00:00Z'), {
    code: '23514',
  });
  const [one, two] = await Promise.all([run(assessment), run(assessment)]);
  assert.equal(one.ticket.id, two.ticket.id);
  assert.equal(Number(one.created) + Number(two.created), 1);
  assert.equal(one.ticket.category, 'inspection');
  assert.equal(
    one.ticket.description,
    'Kitchen: review visible marks and check leak.'
  );
  assert.equal(Object.hasOwn(one.ticket, 'assessment_id'), false);
  const {
    rows: [{ count }],
  } = await db.query('select count(*)::int as count from maintenance_tickets');
  assert.equal(count, 1);
  await db.query('insert into assessment_expert_reviews values($1,$2,$3)', [
    review,
    pending,
    property,
  ]);
  await db.query('insert into assessment_images values($1,$2)', [
    id(9),
    pending,
  ]);
  await assert.rejects(run(pending, owner, snap, review, []), {
    code: '23514',
  });
  assert.equal(
    (await run(pending, owner, snap, review, [id(9)])).created,
    true
  );
  const {
    rows: [acl],
  } = await db.query(`select
    has_table_privilege('authenticated','public.portfolio_assessment_sources','SELECT') as link_visible,
    has_function_privilege('authenticated','public.create_assessment_portfolio_ticket(uuid,uuid,uuid,timestamptz,uuid,uuid[],text,text,text)','EXECUTE') as callable`);
  assert.deepEqual(acl, { link_visible: false, callable: false });
  console.log('Assessment handoff database checks passed');
} finally {
  await db.close();
}
