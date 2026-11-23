// Runs migrations against disposable in-memory PostgreSQL.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';

const { PGlite } = await import(
  process.env.PGLITE_MODULE || '@electric-sql/pglite'
);
const db = new PGlite();
const [
  owner,
  manager,
  admin,
  viewer,
  pending,
  outsider,
  inactive,
  transferredOwner,
] = Array.from({ length: 8 }, randomUUID);
const property = randomUUID();
const otherProperty = randomUUID();
const token = randomUUID();
const report = randomUUID();
const fingerprint = 'a'.repeat(64);
const query = 'SELECT public.create_job_once($1,$2,$3,$4,$5) AS result';
const data = {
  homeowner_id: owner,
  property_id: property,
  title: 'Repair pipe',
  status: 'posted',
};
const photos = ['https://example.test/photo.jpg'];
const post = async (actor, job = data, request = randomUUID(), urls = photos) =>
  (await db.query(query, [actor, request, fingerprint, job, urls])).rows[0]
    .result;
const expectDenied = (call) => assert.rejects(call, { code: '42501' });
const migrate = (file) =>
  db.exec(
    readFileSync(
      new URL(`../supabase/migrations/${file}.sql`, import.meta.url),
      'utf8'
    )
  );

try {
  await db.exec(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE ROLE service_role BYPASSRLS;
    CREATE TABLE profiles(id uuid PRIMARY KEY, deleted_at timestamptz);
    CREATE TABLE properties(id uuid PRIMARY KEY, owner_id uuid NOT NULL REFERENCES profiles);
    CREATE TABLE property_team_members(property_id uuid REFERENCES properties,
      user_id uuid REFERENCES profiles, role text, status text);
    CREATE TABLE jobs(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), homeowner_id uuid REFERENCES profiles,
      property_id uuid REFERENCES properties, title text, status text, payer_user_id uuid REFERENCES profiles,
      tenancy_metadata jsonb, deleted_at timestamptz);
    CREATE TABLE job_attachments(job_id uuid REFERENCES jobs, file_url text CHECK(file_url LIKE 'https://%'),
      file_type text, uploaded_by uuid REFERENCES profiles);
    CREATE TABLE anonymous_report_tokens(id uuid PRIMARY KEY, owner_id uuid REFERENCES profiles);
    CREATE TABLE anonymous_reports(id uuid PRIMARY KEY, property_id uuid REFERENCES properties,
      token_id uuid REFERENCES anonymous_report_tokens, job_id uuid REFERENCES jobs, status text, updated_at timestamptz);
    GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
  `);
  await db.query('INSERT INTO profiles(id) SELECT unnest($1::uuid[])', [
    [
      owner,
      manager,
      admin,
      viewer,
      pending,
      outsider,
      inactive,
      transferredOwner,
    ],
  ]);
  await db.query('UPDATE profiles SET deleted_at = now() WHERE id = $1', [
    inactive,
  ]);
  await db.query('INSERT INTO properties VALUES ($1,$3),($2,$3)', [
    property,
    otherProperty,
    owner,
  ]);
  await db.query(
    `INSERT INTO property_team_members VALUES
    ($1,$2,'manager','accepted'), ($1,$3,'admin','accepted'), ($1,$4,'viewer','accepted'),
    ($1,$5,'manager','pending'), ($1,$6,'manager','accepted'), ($7,$8,'manager','accepted')`,
    [
      property,
      manager,
      admin,
      viewer,
      pending,
      inactive,
      otherProperty,
      outsider,
    ]
  );
  await db.query('INSERT INTO anonymous_report_tokens VALUES ($1,$2)', [
    token,
    owner,
  ]);
  await db.query(
    "INSERT INTO anonymous_reports(id, property_id, token_id, status) VALUES ($1,$2,$3,'new')",
    [report, property, token]
  );
  await migrate('20261115183000_atomic_job_creation_retry');
  await migrate('20261122212544_link_tenant_report_on_job_creation');

  await db.exec('SET ROLE service_role');
  const legacyRequest = randomUUID();
  const legacyJob = await post(owner, data, legacyRequest);
  await db.exec('RESET ROLE');
  await migrate('20261123121306_delegated_property_job_creation');
  await db.exec('SET ROLE service_role');
  assert.equal(
    (await post(owner, data, legacyRequest)).job.id,
    legacyJob.job.id
  );
  const direct = await post(owner, { ...data, property_id: null });
  assert.equal(direct.job.homeowner_id, owner);
  const ownerDesignatesPayer = await post(owner, {
    ...data,
    payer_user_id: manager,
  });
  assert.equal(ownerDesignatesPayer.job.payer_user_id, manager);
  await expectDenied(post(owner, { ...data, payer_user_id: viewer }));

  const request = randomUUID();
  const created = await post(manager, data, request);
  assert.equal(created.created, true);
  assert.equal(created.job.homeowner_id, owner);
  assert.equal(created.job.payer_user_id, null);
  assert.equal(created.job.property_id, property);
  assert.deepEqual(await post(manager, data, request), {
    ...created,
    created: false,
  });
  assert.deepEqual(
    (
      await db.query(
        'SELECT user_id FROM job_creation_requests WHERE job_id = $1',
        [created.job.id]
      )
    ).rows,
    [{ user_id: manager }]
  );
  assert.deepEqual(
    (
      await db.query(
        'SELECT uploaded_by FROM job_attachments WHERE job_id = $1',
        [created.job.id]
      )
    ).rows,
    [{ uploaded_by: manager }]
  );
  assert.equal((await post(admin)).job.homeowner_id, owner);

  for (const actor of [viewer, pending, outsider, inactive])
    await expectDenied(post(actor));
  await expectDenied(post(manager, { ...data, homeowner_id: manager }));
  await expectDenied(post(manager, { ...data, property_id: otherProperty }));
  await expectDenied(post(manager, { ...data, payer_user_id: manager }));
  await expectDenied(
    post(manager, {
      ...data,
      tenancy_metadata: { payer_email: 'test@example.test' },
    })
  );
  await expectDenied(post(manager, { ...data, status: 'completed' }));
  await db.query('UPDATE profiles SET deleted_at = now() WHERE id = $1', [
    owner,
  ]);
  await expectDenied(post(admin));
  await db.query('UPDATE profiles SET deleted_at = null WHERE id = $1', [
    owner,
  ]);

  const failedRequest = randomUUID();
  await assert.rejects(post(manager, data, failedRequest, ['invalid']), {
    code: '23514',
  });
  assert.equal(
    (
      await db.query(
        'SELECT job_id FROM job_creation_requests WHERE request_id = $1',
        [failedRequest]
      )
    ).rows.length,
    0
  );
  assert.equal((await post(manager, data, failedRequest)).created, true);

  const convert =
    'SELECT public.create_job_from_tenant_report_once($1,$2,$3,$4,$5,$6) AS result';
  await expectDenied(
    db.query(convert, [
      manager,
      randomUUID(),
      fingerprint,
      data,
      photos,
      report,
    ])
  );
  const converted = (
    await db.query(convert, [
      owner,
      randomUUID(),
      fingerprint,
      data,
      photos,
      report,
    ])
  ).rows[0].result;
  assert.deepEqual(
    (
      await db.query(
        'SELECT status, job_id FROM anonymous_reports WHERE id = $1',
        [report]
      )
    ).rows,
    [{ status: 'converted', job_id: converted.job.id }]
  );

  await db.query('DELETE FROM property_team_members WHERE user_id = $1', [
    manager,
  ]);
  await expectDenied(post(manager, data, request));
  await expectDenied(post(manager));
  await db.query('UPDATE properties SET owner_id = $1 WHERE id = $2', [
    transferredOwner,
    property,
  ]);
  await expectDenied(post(admin));
  assert.equal(
    (await post(admin, { ...data, homeowner_id: transferredOwner })).job
      .homeowner_id,
    transferredOwner
  );
  await db.exec('RESET ROLE');
  for (const role of ['anon', 'authenticated']) {
    await db.exec(`SET ROLE ${role}`);
    await expectDenied(post(admin));
    await db.exec('RESET ROLE');
  }
  console.log(
    'PASS delegated posting, owner and payer integrity, creator records, replay, access revocation, transfer, and tenant conversion'
  );

  await db.exec(`
    ALTER TABLE profiles ADD COLUMN role text NOT NULL DEFAULT 'homeowner';
    ALTER TABLE jobs ADD COLUMN archived_at timestamptz, ADD COLUMN location text,
      ADD COLUMN latitude numeric, ADD COLUMN longitude numeric, ADD COLUMN city text, ADD COLUMN required_skills text[];
    CREATE TABLE property_rooms(id uuid PRIMARY KEY, property_id uuid REFERENCES properties, name text, room_type text, size_sqm numeric);
    CREATE TABLE job_rooms(job_id uuid REFERENCES jobs ON DELETE CASCADE, property_room_id uuid REFERENCES property_rooms,
      name text CHECK(name <> 'Blocked snapshot'), room_type text, size_sqm_at_post numeric);
    CREATE TABLE notification_queue(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid REFERENCES profiles,
      notification_type text, title text NOT NULL, message text, action_url text, metadata jsonb, scheduled_for timestamptz,
      priority text, status text);
    GRANT SELECT ON property_rooms TO service_role;
    GRANT SELECT, INSERT ON job_rooms,notification_queue TO service_role;
  `);
  const room = randomUUID();
  const unrelated = randomUUID();
  const blocked = randomUUID();
  await db.query(
    `INSERT INTO property_rooms VALUES
    ($1,$4,'Kitchen','kitchen',10), ($2,$5,'Other kitchen','kitchen',11),
    ($3,$4,'Blocked snapshot','kitchen',12)`,
    [room, unrelated, blocked, property, otherProperty]
  );
  await db.query("UPDATE profiles SET role='contractor' WHERE id=$1", [
    outsider,
  ]);
  await migrate('20261123134645_durable_job_dispatch');
  const queryDispatch =
    'SELECT public.create_job_with_dispatch_once($1,$2,$3,$4,$5,$6,$7,$8) AS result';
  const roomsRequest = randomUUID();
  const createWithRooms = (roomIds, id = roomsRequest) =>
    db
      .query(queryDispatch, [
        admin,
        id,
        fingerprint,
        { ...data, homeowner_id: transferredOwner },
        photos,
        null,
        roomIds,
        {},
      ])
      .then((response) => response.rows[0].result);
  const claim = () =>
    db
      .query('SELECT public.claim_job_dispatch() AS result')
      .then((response) => response.rows[0].result);
  const finish = (dispatch, invites) =>
    db
      .query('SELECT public.finish_job_dispatch($1,$2,$3) AS result', [
        dispatch.job_id,
        dispatch.lease_token,
        invites === null ? null : JSON.stringify(invites),
      ])
      .then((response) => response.rows[0].result);

  await db.exec('SET ROLE service_role');
  const failedScope = randomUUID();
  await assert.rejects(createWithRooms([blocked], failedScope), {
    code: '23514',
  });
  assert.equal(
    (
      await db.query(
        'SELECT job_id FROM job_creation_requests WHERE request_id=$1',
        [failedScope]
      )
    ).rows.length,
    0
  );
  assert.equal(await claim(), null);
  const persisted = await createWithRooms([room, unrelated]);
  assert.equal(persisted.dispatch_status, 'pending');
  assert.deepEqual(
    (
      await db.query('SELECT name FROM job_rooms WHERE job_id=$1', [
        persisted.job.id,
      ])
    ).rows,
    [{ name: 'Kitchen' }]
  );
  assert.equal((await createWithRooms([room, unrelated])).created, false);
  const original = await claim();
  assert.equal(original.job_id, persisted.job.id);
  assert.equal(await claim(), null);

  await db.query(
    "UPDATE job_dispatch SET lease_until=now()-interval '1 second' WHERE job_id=$1",
    [persisted.job.id]
  );
  const replacement = await claim();
  assert.notEqual(replacement.lease_token, original.lease_token);
  const preferred = {
    user_id: outsider,
    type: 'job_invitation_from_repeat_client',
    title: 'Invitation',
    message: 'Bid on a job',
  };
  const nearby = { ...preferred, type: 'job_nearby' };
  assert.equal(await finish(original, [preferred]), false);
  await assert.rejects(finish(replacement, [{ ...preferred, title: null }]), {
    code: '23502',
  });
  assert.equal(
    (await db.query('SELECT id FROM notification_queue')).rows.length,
    0
  );
  assert.equal(await finish(replacement, [nearby, preferred]), true);
  assert.equal(await finish(replacement, [nearby, preferred]), false);
  assert.deepEqual(
    (await db.query('SELECT notification_type FROM notification_queue')).rows,
    [{ notification_type: 'job_invitation_from_repeat_client' }]
  );
  assert.equal(
    (await createWithRooms([room, unrelated])).dispatch_status,
    'queued'
  );

  const closed = await createWithRooms([], randomUUID());
  const closedLease = await claim();
  await db.exec('RESET ROLE');
  await db.query("UPDATE jobs SET status='cancelled' WHERE id=$1", [
    closed.job.id,
  ]);
  await db.exec('SET ROLE service_role');
  assert.equal(await finish(closedLease, [preferred]), true);
  assert.equal(
    (
      await db.query('SELECT status FROM job_dispatch WHERE job_id=$1', [
        closed.job.id,
      ])
    ).rows[0].status,
    'cancelled'
  );
  const failing = await createWithRooms([], randomUUID());
  await db.query('UPDATE job_dispatch SET attempts=4 WHERE job_id=$1', [
    failing.job.id,
  ]);
  const failedLease = await claim();
  assert.equal(await finish(failedLease, null), true);
  assert.equal(
    (
      await db.query('SELECT status FROM job_dispatch WHERE job_id=$1', [
        failing.job.id,
      ])
    ).rows[0].status,
    'needs_attention'
  );
  await db.exec('RESET ROLE; SET ROLE authenticated');
  await expectDenied(claim());
  await db.exec('RESET ROLE');
  console.log(
    'PASS atomic room snapshot and dispatch, lease recovery, stale claims, one delivery intent and operator escalation'
  );
} catch (error) {
  console.error(error.stack);
  process.exitCode = 1;
} finally {
  await db.close();
}
