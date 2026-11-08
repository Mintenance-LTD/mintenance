// Disposable local database only. No app environment, network or hosted records.
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const { PGlite } = await import(
  process.env.PGLITE_MODULE || '@electric-sql/pglite'
);
const db = new PGlite();
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const sql = (name) =>
  readFileSync(
    new URL(`../supabase/migrations/${name}`, import.meta.url),
    'utf8'
  );
let cases = 0;
async function test(name, run) {
  await db.exec('BEGIN');
  try {
    await run();
    cases++;
    console.log(`PASS ${name}`);
  } finally {
    await db.exec('ROLLBACK');
  }
}
async function rejects(run, code) {
  await db.exec('SAVEPOINT expected_error');
  await assert.rejects(run, { code });
  await db.exec('ROLLBACK TO SAVEPOINT expected_error');
}
const one = async (query, params = []) =>
  (await db.query(query, params)).rows[0];
const queue = async (actor = 2, scope = 'team', offset = 0, limit = 25) =>
  (
    await one('SELECT portfolio_team_action_queue($1,$2,$3,$4) AS result', [
      id(actor),
      offset,
      limit,
      scope,
    ])
  ).result;
const save = async (overrides = {}) => {
  const p = {
    actor: 2,
    property: 10,
    kind: 'job',
    source: 11,
    revision: 1,
    assignee: 1,
    waiting: 'manager',
    note: 'Local follow-up verification',
    ...overrides,
  };
  return (
    await one(
      'SELECT save_property_action_followup($1,$2,$3,$4,$5,$6,NULL,$7,$8) AS result',
      [
        p.actor === null ? null : id(p.actor),
        id(p.property),
        p.kind,
        id(p.source),
        p.revision,
        p.assignee === null ? null : id(p.assignee),
        p.waiting,
        p.note,
      ]
    )
  ).result;
};
const snapshot = () =>
  one(`SELECT
 (SELECT jsonb_agg(to_jsonb(f) ORDER BY kind,source_id) FROM property_action_followups f) AS followups,
 (SELECT jsonb_agg(to_jsonb(u) ORDER BY id) FROM property_action_updates u) AS updates,
 (SELECT jsonb_agg(to_jsonb(n) ORDER BY id) FROM notification_queue n) AS notifications`);
try {
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE TABLE profiles(id uuid PRIMARY KEY,first_name text,last_name text,deleted_at timestamptz);
    CREATE TABLE properties(id uuid PRIMARY KEY,property_name text,owner_id uuid);
    CREATE TABLE property_team_members(property_id uuid,user_id uuid,status text,role text);
    CREATE TABLE jobs(id uuid PRIMARY KEY,property_id uuid,homeowner_id uuid,contractor_id uuid,title text,status text,scheduled_start_date timestamptz,scheduled_end_date timestamptz);
    CREATE TABLE anonymous_reports(id uuid PRIMARY KEY,property_id uuid,description text,status text,urgency text,created_at timestamptz);
    CREATE TABLE recurring_schedules(id uuid PRIMARY KEY,property_id uuid,title text,next_due_date date,is_active boolean);
    CREATE TABLE compliance_certificates(id uuid PRIMARY KEY,property_id uuid,cert_type text,status text,expiry_date date);
    CREATE TABLE notification_queue(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid,notification_type text,priority text,title text,message text,action_url text,metadata jsonb,scheduled_for timestamptz);
    GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO service_role;`);
  await db.exec(sql('20260930105440_property_action_followups.sql'));
  for (const n of [1, 2, 3, 4, 5, 6, 7, 8])
    await db.query('INSERT INTO profiles VALUES($1,$2,$3,$4)', [
      id(n),
      `Person ${n}`,
      'Test',
      n === 8 ? '2026-01-01' : null,
    ]);
  await db.query('INSERT INTO properties VALUES($1,$2,$3),($4,$5,$6)', [
    id(10),
    'Shared property',
    id(1),
    id(20),
    'Private property',
    id(4),
  ]);
  for (const [n, status, role] of [
    [2, 'accepted', 'manager'],
    [3, 'accepted', 'viewer'],
    [5, 'removed', 'manager'],
    [6, 'accepted', 'admin'],
    [7, 'pending', 'manager'],
    [8, 'accepted', 'manager'],
  ])
    await db.query('INSERT INTO property_team_members VALUES($1,$2,$3,$4)', [
      id(10),
      id(n),
      status,
      role,
    ]);
  for (const n of [11, 12, 13, 14, 15, 16, 17])
    await db.query(
      `INSERT INTO jobs VALUES($1,$2,$3,NULL,$4,$5,NULL,now()-interval '1 day')`,
      [
        id(n),
        id(n === 15 ? 20 : 10),
        id(n === 15 ? 4 : 1),
        `Job ${n}`,
        n === 16 ? 'completed' : 'posted',
      ]
    );
  await db.query(
    `INSERT INTO anonymous_reports VALUES($1,$2,'Private tenant report','new','emergency',now());`,
    [id(21), id(10)]
  );
  await db.query(
    `INSERT INTO recurring_schedules VALUES($1,$2,'Boiler service',current_date+10,true)`,
    [id(22), id(10)]
  );
  await db.query(
    `INSERT INTO compliance_certificates VALUES($1,$2,'gas_safety','uploaded',current_date+10)`,
    [id(23), id(10)]
  );
  for (const [source, assigned] of [
    [11, 2],
    [13, 1],
    [14, 5],
    [17, 8],
  ])
    await db.query(
      `INSERT INTO property_action_followups(kind,source_id,property_id,assigned_to,revision) VALUES('job',$1,$2,$3,1)`,
      [id(source), id(10), id(assigned)]
    );
  const beforeMigration = await snapshot();
  const migration = sql(
    '20261108005044_property_followup_conflicts_team_queue.sql'
  );
  await db.exec(`BEGIN; ${migration} COMMIT;`);
  assert.deepEqual(await snapshot(), beforeMigration);
  console.log(
    'PASS migration preserves all existing follow-ups, updates and notifications'
  );
  cases++;
  await db.exec('SET ROLE service_role');
  await test('team scope respects membership and owner-only tenant reports', async () => {
    const manager = await queue();
    assert.equal(manager.total, 7);
    assert.equal(manager.scope, 'team');
    assert.equal(
      manager.items.some((x) => x.id === id(15) || x.kind === 'report'),
      false
    );
    assert.equal((await queue(1)).total, 8);
    assert.equal((await queue(6)).total, 7);
    assert.equal((await queue(4)).total, 1);
    assert.equal((await queue(7)).total, 0);
    assert.equal((await queue(8)).total, 0);
  });
  await test('mine filters before totals and pagination', async () => {
    const result = await queue(2, 'mine', 0, 1);
    assert.equal(result.total, 1);
    assert.equal(result.overdue, 1);
    assert.equal(result.hasMore, false);
    assert.equal(result.items[0].id, id(11));
    assert.equal(result.items[0].assignee_name, 'Person 2 Test');
    assert.equal((await queue(2, 'mine', 1, 1)).items.length, 0);
  });
  await test('unassigned includes removed and deleted assignees without exposing their names', async () => {
    const result = await queue(2, 'unassigned', 0, 2);
    assert.equal(result.total, 5);
    assert.equal(result.overdue, 3);
    assert.equal(result.hasMore, true);
    const all = await queue(2, 'unassigned');
    for (const n of [14, 17]) {
      const item = all.items.find((x) => x.id === id(n));
      assert.equal(item.assignment_status, 'needs_reassignment');
      assert.equal(item.assigned_to, null);
      assert.equal(item.assignee_name, null);
    }
    assert.equal((await queue(2, 'unassigned', 4, 2)).hasMore, false);
  });
  await test('viewer can read but never gets management or unauthorized job navigation', async () => {
    const result = await queue(3);
    assert.equal(result.total, 7);
    assert.ok(
      result.items.every(
        (x) => x.can_manage_followup === false && x.can_open_job === false
      )
    );
    assert.equal((await queue(3, 'mine')).total, 0);
    await rejects(() => save({ actor: 3 }), '42501');
    await rejects(() => save({ actor: 4 }), '42501');
    await rejects(
      () => save({ actor: 2, kind: 'report', source: 21, revision: 0 }),
      '42501'
    );
  });
  await test('old signature retains team results; unknown scope is rejected', async () => {
    const old = (
      await one('SELECT portfolio_action_queue($1,0,25) AS result', [id(2)])
    ).result;
    assert.deepEqual(old, await queue());
    await rejects(() => queue(2, 'other'), '22023');
    await rejects(() => queue(2, null), '22023');
  });
  await test('stale save returns terminal PT409 without history or notification side effects', async () => {
    const first = await save();
    assert.equal(first.revision, 2);
    const committed = await snapshot();
    await rejects(() => save(), 'PT409');
    assert.deepEqual(await snapshot(), committed);
    const latest = await save({ revision: 2, assignee: 2 });
    assert.equal(latest.revision, 3);
    assert.equal((await queue(2, 'mine')).total, 1);
  });
  await test('invalid/null revisions and ineligible assignees fail without mutations', async () => {
    const before = await snapshot();
    for (const revision of [null, -1])
      await rejects(() => save({ revision }), '22023');
    for (const assignee of [3, 4, 5, 7, 8])
      await rejects(() => save({ assignee }), '22023');
    await rejects(() => save({ actor: null }), '42501');
    await rejects(() => save({ actor: 8 }), '42501');
    assert.deepEqual(await snapshot(), before);
  });
  await test('a failed first save does not leave a placeholder follow-up', async () => {
    const before = await snapshot();
    await rejects(() => save({ source: 12, revision: 8 }), 'PT409');
    assert.deepEqual(await snapshot(), before);
  });
  await test('source moves cannot overwrite another property follow-up', async () => {
    await db.query('UPDATE jobs SET property_id=$1 WHERE id=$2', [
      id(20),
      id(11),
    ]);
    const before = await snapshot();
    await rejects(() => save({ actor: 4, property: 20, assignee: 4 }), 'PT409');
    assert.deepEqual(await snapshot(), before);
  });
  await db.exec('RESET ROLE');
  for (const role of ['anon', 'authenticated']) {
    await db.exec(`SET ROLE ${role}`);
    await assert.rejects(() => queue(), { code: '42501' });
    await assert.rejects(() => save(), { code: '42501' });
    await assert.rejects(
      () => db.query('SELECT * FROM property_action_followups'),
      { code: '42501' }
    );
    await db.exec('RESET ROLE');
  }
  assert.equal(
    (
      await one(
        "SELECT relrowsecurity FROM pg_class WHERE oid='property_action_followups'::regclass"
      )
    ).relrowsecurity,
    true
  );
  console.log(
    `${cases} property team queue/follow-up scenarios plus anon/authenticated grants and RLS checks passed.`
  );
} finally {
  await db.close();
}
