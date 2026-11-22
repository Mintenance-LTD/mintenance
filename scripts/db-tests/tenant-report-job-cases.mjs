import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import pg from 'pg';

export async function testTenantReportJobCreation(db, config, actor, property) {
  await db.query(`
    CREATE TABLE anonymous_report_tokens(id uuid PRIMARY KEY, owner_id uuid NOT NULL);
    ALTER TABLE anonymous_reports ADD COLUMN token_id uuid REFERENCES anonymous_report_tokens(id),
      ADD COLUMN job_id uuid REFERENCES jobs(id), ADD COLUMN updated_at timestamptz;
    GRANT SELECT,UPDATE ON anonymous_report_tokens,anonymous_reports TO service_role;
  `);
  await db.query(
    await fs.readFile(
      new URL(
        '../../supabase/migrations/20261122212544_link_tenant_report_on_job_creation.sql',
        import.meta.url
      ),
      'utf8'
    )
  );

  const token = randomUUID();
  const report = randomUUID();
  const failedReport = randomUUID();
  const closedReport = randomUUID();
  const outsider = randomUUID();
  await db.query('INSERT INTO anonymous_report_tokens VALUES ($1,$2)', [
    token,
    actor,
  ]);
  await db.query(
    `INSERT INTO anonymous_reports(id,property_id,token_id,status)
     VALUES ($1,$4,$5,'new'), ($2,$4,$5,'acknowledged'), ($3,$4,$5,'resolved')`,
    [report, failedReport, closedReport, property, token]
  );

  const query =
    'SELECT create_job_from_tenant_report_once($1,$2,$3,$4,$5,$6) AS result';
  const request = randomUUID();
  const fingerprint = 'f'.repeat(64);
  const payload = {
    homeowner_id: actor,
    property_id: property,
    title: 'Tenant report repair',
    status: 'posted',
  };
  const args = [
    actor,
    request,
    fingerprint,
    payload,
    ['https://example.test/repair.jpg'],
    report,
  ];
  const peer = new pg.Client(config);
  await peer.connect();
  try {
    await db.query('SET ROLE service_role');
    await peer.query('SET ROLE service_role');
    await assert.rejects(
      db.query(query, [outsider, ...args.slice(1)]),
      (error) => error.code === '42501'
    );
    await assert.rejects(
      db.query(query, [
        actor,
        request,
        fingerprint,
        { ...payload, property_id: randomUUID() },
        [],
        report,
      ]),
      (error) => error.code === '23514'
    );
    await assert.rejects(
      db.query(query, [actor, request, fingerprint, payload, [], closedReport]),
      (error) => error.code === '23514'
    );

    const outcomes = await Promise.all([
      db.query(query, args),
      peer.query(query, args),
    ]);
    const results = outcomes.map((response) => response.rows[0].result);
    assert.deepEqual(results.map((result) => result.created).sort(), [
      false,
      true,
    ]);
    assert.equal(results[0].job.id, results[1].job.id);
    const jobId = results[0].job.id;
    const linked = await db.query(
      'SELECT job_id,status FROM anonymous_reports WHERE id=$1',
      [report]
    );
    assert.deepEqual(linked.rows[0], { job_id: jobId, status: 'converted' });
    assert.equal(
      (
        await db.query('SELECT count(*) FROM job_attachments WHERE job_id=$1', [
          jobId,
        ])
      ).rows[0].count,
      '1'
    );
    await assert.rejects(
      db.query(query, [actor, randomUUID(), fingerprint, payload, [], report]),
      (error) => error.code === '23514'
    );

    const failingRequest = randomUUID();
    await assert.rejects(
      db.query(query, [
        actor,
        failingRequest,
        fingerprint,
        payload,
        ['invalid'],
        failedReport,
      ]),
      (error) => error.code === '23514'
    );
    const retained = await db.query(
      'SELECT job_id,status FROM anonymous_reports WHERE id=$1',
      [failedReport]
    );
    assert.deepEqual(retained.rows[0], {
      job_id: null,
      status: 'acknowledged',
    });
    assert.equal(
      (
        await db.query(
          'SELECT count(*) FROM job_creation_requests WHERE request_id=$1',
          [failingRequest]
        )
      ).rows[0].count,
      '0'
    );
    assert.equal(
      (
        await db.query('SELECT count(*) FROM jobs WHERE title=$1', [
          payload.title,
        ])
      ).rows[0].count,
      '1'
    );
  } finally {
    await db.query('RESET ROLE');
    await peer.end();
  }
  for (const role of ['anon', 'authenticated']) {
    const privileges = await db.query(
      'SELECT has_function_privilege($1, $2, $3) AS allowed',
      [
        role,
        'public.create_job_from_tenant_report_once(uuid,uuid,text,jsonb,text[],uuid)',
        'EXECUTE',
      ]
    );
    assert.equal(privileges.rows[0].allowed, false);
  }
  console.log(
    'PASS tenant report conversion links once, rejects stale or mismatched requests, and rolls back failed job creation'
  );
}
