import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const uid = (n) => '00000000-0000-4000-8000-' + String(n).padStart(12, '0');
export async function testInspections(db, connectPeer) {
  const exec = (sql) => (db.exec ? db.exec(sql) : db.query(sql));
  await exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role BYPASSRLS;
 CREATE TABLE profiles(id uuid PRIMARY KEY);
 CREATE TABLE properties(id uuid PRIMARY KEY, owner_id uuid);
 CREATE TABLE property_team_members(property_id uuid,user_id uuid,role text,status text);
 CREATE TABLE property_room_photos(id uuid PRIMARY KEY,property_id uuid,room_type text,file_name text,created_at timestamptz,storage_path text);
 GRANT ALL ON properties,property_team_members,property_room_photos TO service_role;
 GRANT SELECT ON profiles TO service_role;`);
  await exec(
    readFileSync(
      new URL(
        '../../supabase/migrations/20261030223935_property_tenancy_inspection_reports.sql',
        import.meta.url
      ),
      'utf8'
    )
  );
  await db.query('INSERT INTO profiles VALUES($1),($2),($3),($4),($5)', [
    uid(1),
    uid(2),
    uid(3),
    uid(4),
    uid(5),
  ]);
  await db.query('INSERT INTO properties VALUES($1,$2),($3,$4)', [
    uid(10),
    uid(1),
    uid(11),
    uid(5),
  ]);
  await db.query(
    "INSERT INTO property_team_members VALUES($1,$2,'manager','accepted'),($1,$3,'viewer','accepted'),($1,$4,'admin','pending')",
    [uid(10), uid(2), uid(3), uid(4)]
  );
  await db.query(
    "INSERT INTO property_room_photos(id,property_id,room_type,file_name,created_at) VALUES($1,$2,'kitchen','Kitchen.jpg','2026-10-01'),($3,$4,'bedroom','Other.jpg','2026-10-02')",
    [uid(20), uid(10), uid(21), uid(11)]
  );
  await exec('SET ROLE service_role');
  const folder = async (actor = uid(1), property = uid(10), ends = null) =>
    (
      await db.query(
        "SELECT create_property_tenancy_folder($1,$2,'Tenancy 2026','2026-01-01',$3) id",
        [actor, property, ends]
      )
    ).rows[0].id;
  const ownerFolder = await folder();
  const managerFolder = await folder(uid(2));
  const foreignFolder = await folder(uid(5), uid(11));
  assert.ok(ownerFolder && managerFolder);
  for (const actor of [uid(3), uid(4), uid(5), null])
    await assert.rejects(folder(actor), /access denied/);
  await assert.rejects(
    folder(uid(1), uid(10), '2025-01-01'),
    /check constraint/
  );
  const report = async ({
    actor = uid(1),
    parent = ownerFolder,
    photos = [uid(20)],
    kind = 'check_in',
    date = '2026-10-01',
  } = {}) =>
    (
      await db.query(
        "SELECT create_property_inspection_report($1,$2,$3,'Inspection',$4,$5,'Observed condition',$6::uuid[]) id",
        [actor, uid(10), parent, date, kind, photos]
      )
    ).rows[0].id;
  const saved = await report();
  assert.ok(saved);
  await report({ actor: uid(2), parent: managerFolder, photos: [] });
  for (const actor of [uid(3), uid(4), uid(5), null])
    await assert.rejects(report({ actor }), /access denied/);
  await assert.rejects(report({ parent: foreignFolder }), /Folder not found/);
  await assert.rejects(
    report({ photos: [uid(21)] }),
    /belong to this property/
  );
  await assert.rejects(
    report({ photos: [uid(20), uid(20)] }),
    /Invalid photo selection/
  );
  await assert.rejects(
    report({ photos: Array.from({ length: 51 }, (_, n) => uid(100 + n)) }),
    /Invalid photo selection/
  );
  await assert.rejects(report({ kind: 'certified' }), /check constraint/);
  await assert.rejects(
    report({ date: '2026-02-30' }),
    /date\/time|out of range/
  );
  assert.equal(
    (await db.query('SELECT count(*)::int n FROM property_inspection_reports'))
      .rows[0].n,
    2
  );
  const snapshot = (
    await db.query(
      'SELECT * FROM property_inspection_photos WHERE report_id=$1',
      [saved]
    )
  ).rows[0];
  assert.equal(snapshot.room_type, 'kitchen');
  assert.equal(snapshot.file_name, 'Kitchen.jpg');
  await assert.rejects(
    db.query("UPDATE property_inspection_reports SET notes='Rewritten'"),
    /permission denied/
  );
  await assert.rejects(
    db.query('DELETE FROM property_inspection_reports'),
    /permission denied/
  );
  await db.query(
    "SELECT update_property_tenancy_folder($1,$2,$3,0,'Closed tenancy','2026-01-01','2026-10-30')",
    [uid(2), uid(10), ownerFolder]
  );
  await assert.rejects(
    db.query(
      "SELECT update_property_tenancy_folder($1,$2,$3,0,'Stale change','2026-01-01',NULL)",
      [uid(1), uid(10), ownerFolder]
    ),
    /Folder changed/
  );
  assert.equal(
    (
      await db.query(
        'SELECT revision FROM property_tenancy_folders WHERE id=$1',
        [ownerFolder]
      )
    ).rows[0].revision,
    1
  );
  await db.query('DELETE FROM property_room_photos WHERE id=$1', [uid(20)]);
  assert.equal(
    (
      await db.query(
        'SELECT source_photo_id FROM property_inspection_photos WHERE report_id=$1',
        [saved]
      )
    ).rows[0].source_photo_id,
    null
  );
  await db.query(
    "UPDATE property_team_members SET status='declined' WHERE user_id=$1",
    [uid(2)]
  );
  await assert.rejects(folder(uid(2)), /access denied/);
  await exec('RESET ROLE');
  for (const role of ['anon', 'authenticated']) {
    await exec('SET ROLE ' + role);
    for (const table of [
      'property_tenancy_folders',
      'property_inspection_reports',
      'property_inspection_photos',
    ]) {
      await assert.rejects(
        db.query('SELECT * FROM ' + table),
        /permission denied/
      );
      await assert.rejects(
        db.query('TRUNCATE ' + table + ' CASCADE'),
        /permission denied/
      );
    }
    await assert.rejects(folder(), /permission denied/);
    await assert.rejects(report(), /permission denied/);
    await exec('RESET ROLE');
  }
  assert.equal(
    (
      await db.query(
        "SELECT count(*)::int n FROM pg_class WHERE relname IN ('property_tenancy_folders','property_inspection_reports','property_inspection_photos') AND relrowsecurity"
      )
    ).rows[0].n,
    3
  );
  console.log(
    'PASS inspection roles, membership revocation, folder/photo isolation, bounds, dates, atomic rollback, immutable reports, deleted-photo history, RLS and client denial'
  );
  for (const migration of [
    '20261124201142_tenancy_inspection_context',
    '20261124213555_tenancy_turnover_review',
    '20261124223631_tenancy_inspection_save_retries',
  ]) {
    await exec(
      readFileSync(
        new URL(
          '../../supabase/migrations/' + migration + '.sql',
          import.meta.url
        ),
        'utf8'
      )
    );
  }
  await db.query(
    "INSERT INTO property_room_photos(id,property_id,room_type,file_name,created_at,storage_path) VALUES($1,$2,'kitchen','Retry.jpg',now(),'test-only/retry.jpg')",
    [uid(22), uid(10)]
  );
  const submit = (connection, title = 'Retry fixture', actor = uid(1)) =>
    connection
      .query(
        "SELECT save_property_inspection_report($1,$2,$3,$4,'2026-10-01','check_out','Observed',$5,NULL,NULL,NULL,$6) id",
        [actor, uid(10), ownerFolder, title, [uid(22)], uid(6)]
      )
      .then(({ rows }) => rows[0].id);
  await exec('SET ROLE service_role');
  const peer = await connectPeer();
  try {
    await peer.query('SET ROLE service_role');
    const [first, simultaneous] = await Promise.all([submit(db), submit(peer)]);
    assert.equal(first, simultaneous);
    assert.equal(await submit(db), first);
    await assert.rejects(submit(peer, 'Edited after lost response'), {
      code: 'PT409',
      detail: first,
    });
    await assert.rejects(submit(db, 'Retry fixture', uid(3)), {
      code: '42501',
    });
    assert.equal(
      (
        await db.query(
          "SELECT count(*)::int n FROM property_inspection_reports WHERE title='Retry fixture'"
        )
      ).rows[0].n,
      1
    );
    assert.equal(
      (
        await db.query(
          'SELECT count(*)::int n FROM property_inspection_photos WHERE report_id = $1',
          [first]
        )
      ).rows[0].n,
      1
    );
    await assert.rejects(
      db.query('SELECT begin_property_room_photo_delete($1,$2)', [
        uid(10),
        uid(22),
      ]),
      { code: 'PT409' }
    );
    await assert.rejects(
      db.query(
        "SELECT update_property_tenancy_folder_with_confirmation($1,$2,$3,1,'Edited','2026-10-02',NULL,false)",
        [uid(1), uid(10), ownerFolder]
      ),
      (error) =>
        error.code === 'PT422' &&
        JSON.parse(error.detail).reports.some(
          (report) => report.id === first && report.title === 'Retry fixture'
        )
    );
  } finally {
    await peer.end();
    await exec('RESET ROLE');
  }
  for (const role of ['anon', 'authenticated']) {
    await exec('SET ROLE ' + role);
    await assert.rejects(submit(db), { code: '42501' });
    await assert.rejects(
      db.query('SELECT * FROM property_inspection_save_receipts'),
      { code: '42501' }
    );
    await exec('RESET ROLE');
  }
  console.log(
    'PASS concurrent inspection retries, protected evidence, named date warnings and receipt authorization'
  );
}
