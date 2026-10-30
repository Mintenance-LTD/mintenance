import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { randomUUID } from 'node:crypto';
import childProcess from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';
import pg from 'pg';
const spawn = childProcess.spawn;
childProcess.spawn = (c, a, o) => spawn(c, a, { ...o, windowsHide: true });
syncBuiltinESMExports();
const { default: EmbeddedPostgres } = await import('embedded-postgres');
const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'mint-transfer-recovery-'));
const socket = net.createServer();
await new Promise((r) => socket.listen(0, '127.0.0.1', r));
const port = socket.address().port;
await new Promise((r) => socket.close(r));
const password = randomUUID();
const cluster = new EmbeddedPostgres({
  databaseDir: dir,
  user: 'postgres',
  password,
  port,
  persistent: true,
  postgresFlags: ['-h', '127.0.0.1'],
  onLog() {},
  onError() {},
});
const options = {
  host: '127.0.0.1',
  port,
  user: 'postgres',
  password,
  database: 'postgres',
};
const db = new pg.Client(options),
  peer = new pg.Client(options);
let started = false,
  connected = false,
  peerConnected = false;
const escrow = randomUUID(),
  payee = randomUUID();
try {
  await cluster.initialise();
  await cluster.start();
  started = true;
  await db.connect();
  connected = true;
  await peer.connect();
  peerConnected = true;
  await db.query(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE TABLE profiles(id uuid PRIMARY KEY,stripe_connect_account_id text);
    CREATE TABLE escrow_transactions(id uuid PRIMARY KEY,status text,release_reason text,transfer_id text,amount numeric,payee_id uuid,payer_id uuid,job_id uuid);`);
  for (const file of [
    '20260908191850_durable_escrow_transfer_attempts.sql',
    '20260913191656_serialize_refund_and_transfer_claims.sql',
    '20261030114500_escrow_transfer_balance_recovery.sql',
  ])
    await db.query(
      await fs.readFile(
        new URL('../../supabase/migrations/' + file, import.meta.url),
        'utf8'
      )
    );
  await db.query('INSERT INTO profiles VALUES($1,$2)', [payee, 'acct_test']);
  await db.query(
    "INSERT INTO escrow_transactions(id,status,amount,payee_id) VALUES($1,'release_pending',120,$2)",
    [escrow, payee]
  );
  const original = (
    await db.query('SELECT * FROM reserve_escrow_transfer($1,11400,$2)', [
      escrow,
      'acct_test',
    ])
  ).rows[0];
  const call = (
    client,
    key = original.idempotency_key,
    request = 'req_declined'
  ) =>
    client.query(
      'SELECT record_escrow_transfer_balance_rejection($1,$2,$3) AS changed',
      [escrow, key, request]
    );
  for (const role of ['anon', 'authenticated']) {
    await db.query('SET ROLE ' + role);
    await assert.rejects(call(db), (e) => e.code === '42501');
    await db.query('RESET ROLE');
  }
  console.log('PASS only service role may journal provider rejections');
  await db.query('SET ROLE service_role');
  await peer.query('SET ROLE service_role');
  const racing = await Promise.all([call(db), call(peer)]);
  assert.deepEqual(racing.map((r) => r.rows[0].changed).sort(), [false, true]);
  await db.query('RESET ROLE');
  await peer.query('RESET ROLE');
  let row = (await db.query('SELECT * FROM escrow_transfer_attempts')).rows[0];
  assert.notEqual(row.idempotency_key, original.idempotency_key);
  assert.deepEqual(row.stripe_parameters, original.stripe_parameters);
  assert.deepEqual(row.created_at, original.created_at);
  assert.equal(row.rejected_attempts.length, 1);
  assert.equal(
    row.rejected_attempts[0].idempotency_key,
    original.idempotency_key
  );
  assert.equal(row.rejected_attempts[0].request_id, 'req_declined');
  assert.ok(row.provider_attempt_started_at);
  console.log(
    'PASS concurrent failures create one replacement and preserve frozen terms and audit history'
  );
  assert.equal((await call(db)).rows[0].changed, false);
  await assert.rejects(
    call(db, row.idempotency_key, 'not-a-provider-reference'),
    (e) => e.code === '23514'
  );
  console.log(
    'PASS stale failures and invalid provider references cannot rotate the key'
  );
  for (const status of [null, 'held', 'disputed', 'completed', 'refunded']) {
    await db.query('UPDATE escrow_transactions SET status=$1 WHERE id=$2', [
      status,
      escrow,
    ]);
    assert.equal((await call(db, row.idempotency_key)).rows[0].changed, false);
  }
  await db.query(
    "UPDATE escrow_transactions SET status='release_pending' WHERE id=$1",
    [escrow]
  );
  await db.query(
    "UPDATE escrow_transfer_attempts SET transfer_id='tr_completed'"
  );
  assert.equal((await call(db, row.idempotency_key)).rows[0].changed, false);
  console.log(
    'PASS held, terminal and already-transferred payments cannot rotate'
  );
  await db.query(
    "UPDATE escrow_transfer_attempts SET transfer_id=NULL,provider_attempt_started_at=now()-interval '24 hours'"
  );
  await assert.rejects(
    call(db, row.idempotency_key),
    (e) => e.code === '23514'
  );
  assert.equal(
    (await db.query('SELECT idempotency_key FROM escrow_transfer_attempts'))
      .rows[0].idempotency_key,
    row.idempotency_key
  );
  console.log('PASS expired unresolved keys require reconciliation');
  await db.query(
    "UPDATE escrow_transfer_attempts SET provider_attempt_started_at=now(),rejected_attempts=(SELECT jsonb_agg('{}'::jsonb) FROM generate_series(1,10))"
  );
  await assert.rejects(
    call(db, row.idempotency_key),
    (e) => e.code === '23514'
  );
  console.log('PASS repeated provider rejection is bounded');
} finally {
  if (peerConnected) await peer.end();
  if (connected) await db.end();
  if (started) await cluster.stop();
  const resolved = path.resolve(dir),
    temporary = path.resolve(os.tmpdir()) + path.sep;
  if (
    !resolved.startsWith(temporary) ||
    !path.basename(resolved).startsWith('mint-transfer-recovery-')
  )
    throw Error('Unexpected test directory');
  await fs.rm(resolved, { recursive: true, force: true });
}
