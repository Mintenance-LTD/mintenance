import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import pg from 'pg';

export async function testJobRetries(db, config, actor) {
  await db.query(`ALTER ROLE service_role BYPASSRLS;
    ALTER TABLE jobs ALTER COLUMN id SET DEFAULT gen_random_uuid();
    CREATE TABLE job_attachments(job_id uuid REFERENCES jobs(id) ON DELETE CASCADE,file_url text NOT NULL CHECK(file_url LIKE 'https://%'),file_type text,uploaded_by uuid);
    GRANT SELECT,INSERT ON jobs,job_attachments TO service_role;`);
  await db.query(
    await fs.readFile(
      new URL(
        '../../supabase/migrations/20261115183000_atomic_job_creation_retry.sql',
        import.meta.url
      ),
      'utf8'
    )
  );
  const peer = new pg.Client(config);
  await peer.connect();
  const request = randomUUID(),
    fingerprint = 'a'.repeat(64);
  const payload = {
    homeowner_id: actor,
    title: 'Retry safe repair',
    status: 'posted',
  };
  const query = 'SELECT create_job_once($1,$2,$3,$4,$5) AS result';
  const params = [
    actor,
    request,
    fingerprint,
    payload,
    ['https://example.test/photo.jpg'],
  ];
  let job;
  try {
    await db.query('SET ROLE service_role');
    await peer.query('SET ROLE service_role');
    const results = await Promise.all([
      db.query(query, params),
      peer.query(query, params),
    ]);
    assert.deepEqual(results.map((r) => r.rows[0].result.created).sort(), [
      false,
      true,
    ]);
    job = results[0].rows[0].result.job.id;
    assert.equal(results[1].rows[0].result.job.id, job);
    assert.equal(
      (
        await db.query('SELECT count(*) FROM job_attachments WHERE job_id=$1', [
          job,
        ])
      ).rows[0].count,
      '1'
    );
    assert.equal((await db.query(query, params)).rows[0].result.created, false);
    await assert.rejects(
      db.query(query, [actor, request, 'b'.repeat(64), payload, []]),
      (e) => e.code === '22023'
    );
    const failed = randomUUID();
    await assert.rejects(
      db.query(query, [actor, failed, fingerprint, payload, ['invalid-url']]),
      (e) => e.code === '23514'
    );
    assert.equal(
      (
        await db.query(
          'SELECT count(*) FROM job_creation_requests WHERE request_id=$1',
          [failed]
        )
      ).rows[0].count,
      '0'
    );
    assert.equal(
      (
        await db.query(
          "SELECT count(*) FROM jobs WHERE title='Retry safe repair'"
        )
      ).rows[0].count,
      '1'
    );
  } finally {
    await db.query('RESET ROLE');
    await peer.end();
  }
  for (const role of ['anon', 'authenticated']) {
    await db.query('SET ROLE ' + role);
    await assert.rejects(db.query(query, params), (e) => e.code === '42501');
    await assert.rejects(
      db.query('SELECT * FROM job_creation_requests'),
      (e) => e.code === '42501'
    );
    await db.query('RESET ROLE');
  }
  await db.query('DELETE FROM jobs WHERE id=$1', [job]);
  await assert.rejects(db.query(query, params), (e) => e.code === 'P0002');
  console.log(
    'PASS concurrent/lost-response job retries create once; attachment failure rolls back; changed requests and direct clients are denied; deleted jobs stay deleted'
  );
}
