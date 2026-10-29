// Disposable local Postgres only; no production credentials or network.
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const { PGlite } = await import(
  process.env.PGLITE_MODULE || '@electric-sql/pglite'
);
const db = new PGlite();
await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
CREATE TABLE profiles(id uuid PRIMARY KEY); CREATE TABLE building_assessments(id uuid PRIMARY KEY);
CREATE TABLE assessment_images(id uuid PRIMARY KEY, assessment_id uuid);
GRANT SELECT ON assessment_images TO service_role;`);
await db.exec(
  readFileSync(
    new URL(
      '../supabase/migrations/20261025124025_assessment_inspection_events.sql',
      import.meta.url
    ),
    'utf8'
  )
);
const actor = '00000000-0000-4000-8000-000000000001',
  assessment = '00000000-0000-4000-8000-000000000002',
  photo = '00000000-0000-4000-8000-000000000003',
  foreign = '00000000-0000-4000-8000-000000000004';
await db.query('INSERT INTO profiles VALUES ($1)', [actor]);
await db.query('INSERT INTO building_assessments VALUES ($1)', [assessment]);
await db.query('INSERT INTO assessment_images VALUES ($1,$2),($3,NULL)', [
  photo,
  assessment,
  foreign,
]);
await db.exec('SET ROLE service_role');
async function insert(
  kind,
  outcome,
  photos,
  request = '00000000-0000-4000-8000-000000000005'
) {
  return db.query(
    `INSERT INTO assessment_inspection_events(assessment_id,actor_id,actor_role,request_id,occurred_on,kind,notes,outcome,evidence_image_ids,source_fingerprint,source_snapshot)
    VALUES ($1,$2,'owner',$3,'2026-10-25',$4,'Observed on site',$5,$6,$7,'{}') RETURNING id`,
    [assessment, actor, request, kind, outcome, photos, 'a'.repeat(64)]
  );
}
await insert('correction', 'visible_defect', [photo]);
await assert.rejects(insert('correction', 'visible_defect', [photo]), /unique/);
await assert.rejects(insert('follow_up', 'resolved', [foreign]), /Evidence/);
await assert.rejects(
  insert('correction', 'visible_defect', [photo, photo]),
  /Evidence/
);
await assert.rejects(insert('correction', null, [photo]), /check constraint/);
await assert.rejects(insert('follow_up', 'resolved', []), /check constraint/);
await assert.rejects(
  db.exec("UPDATE assessment_inspection_events SET notes='Silently rewritten'"),
  /permission denied/
);
await assert.rejects(
  db.exec('DELETE FROM assessment_inspection_events'),
  /permission denied/
);
await insert('repair', null, [], '00000000-0000-4000-8000-000000000006');
await insert(
  'follow_up',
  'improved',
  [photo],
  '00000000-0000-4000-8000-000000000007'
);
assert.equal(
  (
    await db.query(
      'SELECT count(*)::int AS n FROM assessment_inspection_events'
    )
  ).rows[0].n,
  3
);
await db.exec('RESET ROLE');
for (const role of ['anon', 'authenticated']) {
  await db.exec(`SET ROLE ${role}`);
  await assert.rejects(
    db.exec('SELECT * FROM assessment_inspection_events'),
    /permission denied/
  );
  await assert.rejects(insert('repair', null, []), /permission denied/);
  await db.exec('RESET ROLE');
}
assert.equal(
  (
    await db.query(
      "SELECT relrowsecurity FROM pg_class WHERE relname='assessment_inspection_events'"
    )
  ).rows[0].relrowsecurity,
  true
);
console.log(
  'PASS activity constraints, evidence ownership, idempotency, append-only grants, RLS and client denial'
);
await db.close();
