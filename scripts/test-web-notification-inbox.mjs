// Disposable PostgreSQL only. No application credentials or hosted records.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const { PGlite } = await import(
  process.env.PGLITE_MODULE || '@electric-sql/pglite'
);
const db = new PGlite();
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const excluded = [
  'post_liked',
  'comment_added',
  'comment_replied',
  'new_follower',
];
const cursorDate = '2026-11-23T20:00:00Z';
const queue = async (limit, after) =>
  (
    await db.query('SELECT * FROM web_notification_inbox($1,$2,$3,$4,$5)', [
      id(1),
      excluded,
      limit,
      after ? cursorDate : null,
      after ?? null,
    ])
  ).rows;
const unread = async () =>
  Number(
    (
      await db.query('SELECT web_notification_unread_count($1,$2) AS count', [
        id(1),
        excluded,
      ])
    ).rows[0].count
  );
const mutate = async (ids, remove = false) =>
  (
    await db.query(
      'SELECT update_web_notification_group($1,$2,$3) AS changed',
      [id(1), ids, remove]
    )
  ).rows[0].changed;
const insert = (n, actor, type, job, read, metadata = null) =>
  db.query('INSERT INTO notifications VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)', [
    id(n),
    id(actor),
    'Synthetic notice',
    'Synthetic text',
    type,
    read,
    job ? `/jobs/${id(job)}` : null,
    cursorDate,
    metadata,
  ]);

try {
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE TABLE notifications(
      id uuid PRIMARY KEY, user_id uuid, title varchar(255), message text, type varchar(50),
      read boolean, action_url text, created_at timestamptz, metadata jsonb
    );
    GRANT SELECT,UPDATE,DELETE ON notifications TO service_role;
  `);
  await db.exec(
    readFileSync(
      new URL(
        '../supabase/migrations/20261123221707_web_notification_inbox.sql',
        import.meta.url
      ),
      'utf8'
    )
  );
  await insert(9, 1, 'job_completed', 41, true);
  await insert(3, 1, 'job_update', 41, false, {
    jobId: id(41),
    event: 'job_completed',
  });
  await insert(8, 1, 'job_completed', 42, false);
  await insert(7, 1, 'message', null, false);
  await insert(6, 1, 'new_follower', null, false);
  await insert(4, 2, 'job_completed', 41, false);
  await insert(5, 1, 'job_completed', null, false);
  await db.exec('SET ROLE service_role');

  const initial = await queue(2);
  assert.deepEqual(
    initial.map((item) => item.id),
    [id(9), id(8)]
  );
  assert.equal(initial[0].read, false);
  assert.deepEqual(
    (await queue(2, id(8))).map((item) => item.id),
    [id(7), id(5)]
  );
  assert.equal(await unread(), 4);
  assert.equal(await mutate([id(9)]), true);
  assert.equal(await unread(), 3);
  assert.equal(await mutate([id(4)]), false);
  assert.equal(await mutate([id(9), id(8), id(4)], true), true);
  assert.deepEqual(
    (await queue(10)).map((item) => item.id),
    [id(7), id(5)]
  );
  assert.equal(
    (await db.query('SELECT read FROM notifications WHERE id=$1', [id(4)]))
      .rows[0].read,
    false
  );

  for (const role of ['anon', 'authenticated']) {
    await db.exec(`RESET ROLE; SET ROLE ${role}`);
    await assert.rejects(queue(10), { code: '42501' });
    await assert.rejects(unread(), { code: '42501' });
    await assert.rejects(mutate([id(7)]), { code: '42501' });
  }
  console.log(
    'PASS notification grouping, cursor pagination, unread counts, group actions and grants'
  );
} finally {
  await db.close();
}
