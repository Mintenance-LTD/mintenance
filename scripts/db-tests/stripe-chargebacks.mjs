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
const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'mint-chargeback-'));
const listener = net.createServer();
await new Promise((r) => listener.listen(0, '127.0.0.1', r));
const port = listener.address().port;
await new Promise((r) => listener.close(r));
const password = randomUUID();
const cluster = new EmbeddedPostgres({
  databaseDir: dir,
  user: 'postgres',
  password,
  port,
  persistent: true,
  postgresFlags: ['-h', '127.0.0.1'],
  onLog: () => {},
  onError: () => {},
});
const db = new pg.Client({
  host: '127.0.0.1',
  port,
  user: 'postgres',
  password,
  database: 'postgres',
});
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
let started = false,
  connected = false;
try {
  await cluster.initialise();
  await cluster.start();
  started = true;
  await db.connect();
  connected = true;
  await db.query(`create role anon;create role authenticated;create role service_role bypassrls;
 create table profiles(id uuid primary key);
 create table jobs(id uuid primary key);
 create table escrow_transactions(id uuid primary key,job_id uuid references jobs,payer_id uuid,payee_id uuid,status text,payment_intent_id text,admin_hold_status text,auto_release_enabled boolean,release_blocked_reason text,updated_at timestamptz);
 create table disputes(id uuid primary key default gen_random_uuid(),job_id uuid,raised_by uuid not null,against uuid not null,reason text not null,description text,status text check(status in('open','under_review','resolved','escalated','closed')),resolution text,resolved_at timestamptz,created_at timestamptz default now(),updated_at timestamptz);
 create table dispute_escrow_links(dispute_id uuid primary key references disputes,escrow_id uuid references escrow_transactions);
 create table escrow_transfer_attempts(escrow_id uuid references escrow_transactions);
 create table escrow_admin_release_operations(escrow_id uuid references escrow_transactions);
 create table escrow_refund_operations(escrow_id uuid references escrow_transactions,state text);
 create table escrow_dispute_resolutions(escrow_id uuid references escrow_transactions);
 insert into profiles values('${id(1)}'),('${id(2)}');`);
  await db.query(
    await fs.readFile(
      new URL(
        '../../supabase/migrations/20261030002100_stripe_chargeback_journal.sql',
        import.meta.url
      ),
      'utf8'
    )
  );
  await db.query(
    await fs.readFile(
      new URL(
        '../../supabase/migrations/20261030003100_stripe_chargeback_id_formats.sql',
        import.meta.url
      ),
      'utf8'
    )
  );
  const seed = async (n, status = 'held') => {
    await db.query('insert into jobs values($1)', [id(n)]);
    await db.query(
      'insert into escrow_transactions(id,job_id,payer_id,payee_id,status,payment_intent_id,admin_hold_status,auto_release_enabled) values($1,$1,$2,$3,$4,$5,$6,true)',
      [id(n), id(1), id(2), status, 'pi_' + n, 'none']
    );
  };
  const sync = async (n, status = 'needs_response', extra = {}) =>
    (
      await db.query('select sync_stripe_payment_dispute($1::jsonb) result', [
        JSON.stringify({
          id: 'dp_' + n,
          payment_intent: 'pi_' + n,
          charge: 'ch_' + n,
          amount: 12000,
          currency: 'gbp',
          status,
          reason: 'product_not_received',
          ...extra,
        }),
      ])
    ).rows[0].result;
  const escrow = async (n) =>
    (await db.query('select * from escrow_transactions where id=$1', [id(n)]))
      .rows[0];
  let checks = 0;
  const pass = (name) => {
    checks++;
    console.log('PASS ' + name);
  };
  await seed(10);
  await sync(10);
  assert.equal((await escrow(10)).status, 'disputed');
  assert.equal((await escrow(10)).auto_release_enabled, false);
  pass('atomic linked dispute and escrow freeze');
  await sync(10);
  assert.equal(
    (await db.query('select count(*)::int n from disputes')).rows[0].n,
    1
  );
  pass('duplicate delivery creates one dispute');
  for (const table of [
    'escrow_transfer_attempts',
    'escrow_admin_release_operations',
    'escrow_refund_operations',
    'escrow_dispute_resolutions',
  ]) {
    await assert.rejects(
      db.query('insert into ' + table + '(escrow_id) values($1)', [id(10)]),
      (e) => e.code === '23514'
    );
    pass('blocks new ' + table);
  }
  await sync(10, 'won');
  assert.equal((await escrow(10)).status, 'held');
  assert.equal((await escrow(10)).admin_hold_status, 'none');
  assert.equal((await escrow(10)).auto_release_enabled, true);
  pass('won outcome restores untouched held funds');
  await sync(10, 'needs_response');
  assert.equal((await escrow(10)).status, 'held');
  pass('late open event cannot reopen terminal outcome');
  await seed(11);
  await sync(11);
  await sync(11, 'lost');
  assert.equal((await escrow(11)).status, 'disputed');
  assert.equal((await escrow(11)).auto_release_enabled, false);
  await assert.rejects(
    db.query('insert into escrow_refund_operations(escrow_id) values($1)', [
      id(11),
    ]),
    (e) => e.code === '23514'
  );
  pass('lost outcome held for reconciliation without second refund');
  await seed(12, 'completed');
  await sync(12);
  await sync(12, 'won');
  assert.equal((await escrow(12)).status, 'completed');
  pass('paid balance is never restored to held');
  await seed(13);
  await sync(13);
  await db.query(
    "update escrow_transactions set admin_hold_status='admin_hold',release_blocked_reason='Separate operator hold' where id=$1",
    [id(13)]
  );
  await sync(13, 'won');
  assert.equal(
    (await escrow(13)).release_blocked_reason,
    'Separate operator hold'
  );
  pass('preserves independent admin hold');
  await seed(14);
  await sync(14);
  await sync(14, 'needs_response', { id: 'du_14second' });
  await sync(14, 'won');
  assert.equal((await escrow(14)).status, 'disputed');
  pass('another dispute prevents restoration');
  await seed(15);
  await sync(15, 'won');
  assert.equal((await escrow(15)).status, 'held');
  pass('closed event can arrive first');
  await seed(16);
  await sync(16, 'needs_response', { id: 'du_16' });
  assert.equal((await escrow(16)).status, 'disputed');
  pass('current Stripe du identifiers supported');
  const unmatched = await sync(99);
  assert.equal(unmatched.escrowId, null);
  assert.equal(unmatched.requiresReview, true);
  pass('unmatched payment retained for review');
  await assert.rejects(
    sync(10, 'won', { amount: 11900 }),
    (e) => e.code === '23514'
  );
  pass('identity mismatch rejected');
  for (const role of ['anon', 'authenticated']) {
    await db.query('begin;set local role ' + role);
    await assert.rejects(
      db.query('select * from stripe_payment_disputes'),
      (e) => e.code === '42501'
    );
    await db.query('rollback');
    await db.query('begin;set local role ' + role);
    await assert.rejects(
      db.query("select sync_stripe_payment_dispute('{}')"),
      (e) => e.code === '42501'
    );
    await db.query('rollback');
    pass(role + ' cannot access provider journal');
  }
  await db.query('begin;set local role service_role');
  await assert.rejects(
    db.query('delete from stripe_payment_disputes'),
    (e) => e.code === '42501'
  );
  await db.query('rollback');
  pass('service role cannot bypass mutation RPC');
  console.log(JSON.stringify({ passed: true, checks }));
} finally {
  if (connected) await db.end();
  if (started) await cluster.stop();
}
