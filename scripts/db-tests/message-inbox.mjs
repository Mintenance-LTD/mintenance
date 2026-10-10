import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
export async function testMessageInbox({ admin, as, check, uid, root }) {
  const owner = uid(1),
    contractor = uid(2),
    payer = uid(3),
    outsider = uid(4);
  await admin.query(`ALTER TABLE jobs ADD COLUMN title text,ADD COLUMN created_at timestamptz;
 CREATE VIEW profile_directory AS SELECT id,role FROM profiles;
 CREATE TABLE messages(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),job_id uuid,sender_id uuid,receiver_id uuid,content text,message_type text,created_at timestamptz,read boolean DEFAULT false);
 GRANT SELECT ON profile_directory,messages TO service_role;
 INSERT INTO jobs(id,title,homeowner_id,contractor_id,payer_user_id,created_at)
 SELECT ('00000000-0000-4000-9000-'||lpad(n::text,12,'0'))::uuid,'Conversation '||n,'${owner}','${contractor}','${payer}','2026-01-01' FROM generate_series(1,201)n;
 INSERT INTO messages(job_id,sender_id,receiver_id,content,message_type,created_at)
 SELECT id,'${owner}','${payer}','Latest','text','2026-01-02' FROM jobs WHERE title LIKE 'Conversation %';
 INSERT INTO messages(job_id,sender_id,receiver_id,content,message_type,created_at)
 SELECT '00000000-0000-4000-9000-000000000001','${owner}','${contractor}','Busy','text','2026-01-02' FROM generate_series(1,1001);`);
  await admin.query(
    await fs.readFile(
      path.join(
        root,
        'supabase/migrations/20261010165652_beta_message_inbox_pagination.sql'
      ),
      'utf8'
    )
  );
  const page = async (actor, at = null, id = null, snapshot = '2026-01-03') =>
    (
      await as(
        'service_role',
        `SELECT *,last_activity::text AS cursor_at FROM list_message_inbox('${actor}',50,'${snapshot}',${at ? `'${at}'` : 'NULL'},${id ? `'${id}'` : 'NULL'})`
      )
    ).rows;
  await check(
    'inbox: owner contractor and distinct payer see authorized conversations',
    async () => {
      for (const actor of [owner, contractor, payer])
        assert.equal((await page(actor)).length, 50);
      assert.equal((await page(outsider)).length, 0);
    }
  );
  await check(
    'inbox: every equal-timestamp conversation beyond 150 survives paging and a new message',
    async () => {
      const ids = [];
      let at, id;
      do {
        const rows = await page(payer, at, id);
        if (!rows.length) break;
        ids.push(...rows.map((r) => r.job.id));
        at = rows.at(-1).cursor_at;
        id = rows.at(-1).job.id;
        if (ids.length === 50)
          await admin.query(
            `INSERT INTO messages(job_id,sender_id,receiver_id,content,message_type,created_at)VALUES('00000000-0000-4000-9000-000000000001','${owner}','${payer}','Arrived while paging','text','2026-01-04')`
          );
      } while (true);
      assert.equal(ids.length, 201);
      assert.equal(new Set(ids).size, 201);
      const refreshed = await page(payer, null, null, '2026-01-05');
      assert.equal(refreshed[0].job.id, '00000000-0000-4000-9000-000000000001');
    }
  );
  await check(
    'inbox: busy thread does not hide other last messages or inflate payer unread count',
    async () => {
      const rows = await page(payer, null, null, '2026-01-05');
      assert.equal(rows[0].unread_count, '2');
      assert(rows.every((r) => r.last_message?.content));
      assert(!('key_safe_code' in rows[0].job));
    }
  );
  await check(
    'inbox: direct clients cannot supply another actor to projection',
    async () => {
      for (const role of ['anon', 'authenticated'])
        await assert.rejects(
          as(role, `SELECT * FROM list_message_inbox('${owner}')`),
          (e) => e.code === '42501'
        );
    }
  );
}
