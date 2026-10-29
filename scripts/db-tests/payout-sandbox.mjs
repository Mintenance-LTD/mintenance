// Opt-in real Stripe TEST transfers + actual payout migration on loopback PostgreSQL.
// Usage: node scripts/db-tests/payout-sandbox.mjs <env-file> <owned-test-account-json>
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import net from 'node:net';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createRequire, syncBuiltinESMExports } from 'node:module';
import { fileURLToPath } from 'node:url';
import childProcess from 'node:child_process';
import pg from 'pg';
const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..'
);
const require = createRequire(path.join(root, 'apps/web/package.json'));
const key = (await fs.readFile(process.argv[2], 'utf8')).match(
  /^STRIPE_TEST_SECRET_KEY\s*=\s*["']?(sk_test_[^\s"']+)/m
)?.[1];
assert(key, 'Sandbox key required');
const stripe = new (require('stripe'))(key, { maxNetworkRetries: 1 });
assert.equal((await stripe.balance.retrieve()).livemode, false);
const destination = JSON.parse(await fs.readFile(process.argv[3], 'utf8')).id;
const account = await stripe.accounts.retrieve(destination);
assert.equal(account.metadata.beta_audit, 'F06-isolated');
assert.equal(
  account.capabilities.transfers,
  'active',
  'Wait for synthetic account verification'
);
const spawn = childProcess.spawn;
childProcess.spawn = (c, a, o) => spawn(c, a, { ...o, windowsHide: true });
syncBuiltinESMExports();
const { default: EmbeddedPostgres } = await import('embedded-postgres');
const directory = await fs.mkdtemp(
  path.join(os.tmpdir(), 'mintenance-payout-')
);
const listener = net.createServer();
await new Promise((r) => listener.listen(0, '127.0.0.1', r));
const port = listener.address().port;
await new Promise((r) => listener.close(r));
const password = randomUUID();
const config = {
  host: '127.0.0.1',
  port,
  user: 'postgres',
  password,
  database: 'postgres',
};
const cluster = new EmbeddedPostgres({
  databaseDir: directory,
  user: 'postgres',
  password,
  port,
  persistent: true,
  postgresFlags: ['-h', '127.0.0.1'],
  onLog() {},
  onError() {},
});
const db = new pg.Pool(config);
let started = false,
  failComplete = false,
  failBefore = false,
  failAfter = false;
const results = [],
  transfers = [];
const realCreate = stripe.transfers.create.bind(stripe.transfers);
stripe.transfers.create = async (...args) => {
  if (failBefore) {
    failBefore = false;
    throw Error('Injected before provider');
  }
  const t = await realCreate(...args);
  if (!transfers.includes(t.id)) transfers.push(t.id);
  if (failAfter) {
    failAfter = false;
    throw Error('Injected lost response');
  }
  return t;
};
const rpcNames = {
  reserve_weekly_payout: ['p_contractor_id', 'p_currency'],
  begin_weekly_payout: ['p_operation_id'],
  complete_weekly_payout: ['p_operation_id', 'p_transfer_id'],
};
const adapter = {
  async rpc(name, args) {
    try {
      assert(rpcNames[name]);
      if (name === 'complete_weekly_payout' && failComplete) {
        failComplete = false;
        throw Error('Injected completion failure');
      }
      const keys = rpcNames[name];
      const r = await db.query(
        `SELECT * FROM ${name}(${keys.map((_, i) => '$' + (i + 1)).join(',')})`,
        keys.map((k) => args[k])
      );
      const data = r.rows[0];
      if (data?.amount_minor !== undefined)
        data.amount_minor = Number(data.amount_minor);
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },
  from(table) {
    assert(
      ['contractor_payout_balances', 'contractor_payout_operations'].includes(
        table
      )
    );
    let filters = [],
      update;
    const q = {
      select: () => q,
      gte: (k, v) => (filters.push([k, '>=', v]), q),
      eq: (k, v) => (filters.push([k, '=', v]), q),
      neq: (k, v) => (filters.push([k, '<>', v]), q),
      update: (v) => ((update = v), q),
      then: async (resolve, reject) => {
        try {
          const values = [];
          let sql = update
            ? `UPDATE ${table} SET state=$1`
            : `SELECT * FROM ${table}`;
          if (update) values.push(update.state);
          sql +=
            ' WHERE ' +
            filters
              .map(([k, op, v]) => {
                assert(/^[a-z_]+$/.test(k));
                values.push(v);
                return `${k}${op}$${values.length}`;
              })
              .join(' AND ');
          const r = await db.query(sql, values);
          return resolve({ data: r.rows, error: null });
        } catch (error) {
          return resolve({ data: null, error });
        }
      },
    };
    return q;
  },
};
globalThis.__payoutDb = adapter;
globalThis.__payoutStripe = stripe;
async function check(name, fn) {
  await fn();
  results.push({ name, passed: true });
  console.log('PASS ' + name);
}
async function fixture(amount = 10, ready = true, dest = destination) {
  const id = randomUUID();
  await db.query('INSERT INTO profiles VALUES($1,NULL,$2,$3,$3)', [
    id,
    dest,
    ready,
  ]);
  await db.query(
    "INSERT INTO contractor_payout_balances(contractor_id,currency,pending_amount_minor) VALUES($1,'GBP',$2)",
    [id, amount]
  );
  return id;
}
async function balance(id) {
  return (
    await db.query(
      'SELECT * FROM contractor_payout_balances WHERE contractor_id=$1',
      [id]
    )
  ).rows[0];
}
async function op(id) {
  return (
    await db.query(
      'SELECT * FROM contractor_payout_operations WHERE contractor_id=$1 ORDER BY created_at DESC',
      [id]
    )
  ).rows[0];
}
async function count(id) {
  const a = [];
  for await (const t of stripe.transfers.list({ destination, limit: 100 }))
    if (t.metadata.mintenance_payout_operation === id) a.push(t);
  return a.length;
}
try {
  await cluster.initialise();
  await cluster.start();
  started = true;
  await db.query(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role BYPASSRLS;
CREATE TABLE profiles(id uuid PRIMARY KEY,deleted_at timestamptz,stripe_connect_account_id text,stripe_payouts_enabled boolean,stripe_transfers_active boolean);
CREATE TABLE contractor_payout_balances(contractor_id uuid REFERENCES profiles(id) ON DELETE CASCADE,currency text,pending_amount_minor bigint DEFAULT 0,lifetime_paid_out_minor bigint DEFAULT 0,last_payout_at timestamptz,last_payout_transfer_id text,updated_at timestamptz,PRIMARY KEY(contractor_id,currency));
CREATE TABLE contractor_payout_transfers(contractor_id uuid,stripe_transfer_id text UNIQUE,stripe_destination_account text,amount_minor bigint,currency text,status text);
CREATE TABLE jobs(homeowner_id uuid,contractor_id uuid,payer_user_id uuid,status text);
CREATE TABLE escrow_transactions(payer_id uuid,payee_id uuid,status text,admin_hold_status text);
CREATE TABLE payments(payer_id uuid,payee_id uuid,status text);
CREATE TABLE disputes(raised_by uuid,against uuid,status text);
CREATE TABLE contracts(homeowner_id uuid,contractor_id uuid,status text,homeowner_signed_at timestamptz,contractor_signed_at timestamptz);`);
  await db.query(
    await fs.readFile(
      path.join(
        root,
        'supabase/migrations/20261007142344_durable_weekly_payout_operations.sql'
      ),
      'utf8'
    )
  );
  const bundle = path.join(root, 'apps/web/.cache/payout-sandbox.cjs');
  await fs.mkdir(path.dirname(bundle), { recursive: true });
  await require('esbuild').build({
    entryPoints: [path.join(root, 'apps/web/lib/stripe/connect/payouts.ts')],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    outfile: bundle,
    tsconfig: path.join(root, 'apps/web/tsconfig.json'),
    plugins: [
      {
        name: 'isolated-transport',
        setup(b) {
          b.onResolve(
            {
              filter:
                /^(@\/lib\/stripe|@\/lib\/api\/supabaseServer|@mintenance\/shared)$/,
            },
            (a) => ({ path: a.path, namespace: 'fixture' })
          );
          b.onLoad({ filter: /.*/, namespace: 'fixture' }, (a) => ({
            contents:
              a.path === '@/lib/stripe'
                ? 'export const stripe=globalThis.__payoutStripe;'
                : a.path === '@/lib/api/supabaseServer'
                  ? 'export const serverSupabase=globalThis.__payoutDb;'
                  : 'export const logger={info(){},warn(){},error(){}};',
            loader: 'js',
          }));
        },
      },
    ],
  });
  const { processEligiblePayouts: process } = require(bundle);
  await check('normal transfer, replay and exactly one debit', async () => {
    const id = await fixture();
    assert.equal((await process()).processed, 1);
    assert.equal((await balance(id)).pending_amount_minor, '0');
    assert.equal((await balance(id)).lifetime_paid_out_minor, '10');
    await process();
    assert.equal(await count((await op(id)).id), 1);
  });
  await check(
    'crash before provider preserves reservation and retries',
    async () => {
      const id = await fixture();
      failBefore = true;
      assert.equal((await process()).failed, 1);
      assert.equal((await balance(id)).pending_amount_minor, '10');
      await process();
      assert.equal(await count((await op(id)).id), 1);
    }
  );
  await check(
    'lost provider response retries the same Stripe operation',
    async () => {
      const id = await fixture();
      failAfter = true;
      assert.equal((await process()).failed, 1);
      await process();
      assert.equal(await count((await op(id)).id), 1);
      assert.equal((await balance(id)).lifetime_paid_out_minor, '10');
    }
  );
  await check(
    'lost database completion preserves concurrent earnings',
    async () => {
      const id = await fixture();
      failComplete = true;
      await process();
      await db.query(
        'UPDATE contractor_payout_balances SET pending_amount_minor=pending_amount_minor+5 WHERE contractor_id=$1',
        [id]
      );
      await process();
      assert.equal((await balance(id)).pending_amount_minor, '5');
      assert.equal((await balance(id)).lifetime_paid_out_minor, '10');
      assert.equal(await count((await op(id)).id), 1);
      await process();
    }
  );
  await check(
    'aged operation reconciles provider metadata without new transfer',
    async () => {
      const id = await fixture();
      failComplete = true;
      await process();
      await db.query(
        "UPDATE contractor_payout_operations SET first_attempt_at='2000-01-01' WHERE contractor_id=$1",
        [id]
      );
      await process();
      assert.equal(await count((await op(id)).id), 1);
    }
  );
  await check(
    'duplicate cron calls produce one transfer and one ledger debit',
    async () => {
      const id = await fixture();
      const [a, b] = await Promise.all([process(), process()]);
      assert.equal(a.failed + b.failed, 0);
      assert.equal(await count((await op(id)).id), 1);
      assert.equal((await balance(id)).lifetime_paid_out_minor, '10');
    }
  );
  await check('account not ready is skipped without reservation', async () => {
    const id = await fixture(10, false);
    await process();
    assert.equal(await op(id), undefined);
    assert.equal((await balance(id)).pending_amount_minor, '10');
  });
  await check(
    'aged missing provider operation is held for review',
    async () => {
      const id = await fixture();
      await adapter.rpc('reserve_weekly_payout', {
        p_contractor_id: id,
        p_currency: 'GBP',
      });
      const o = await op(id);
      await adapter.rpc('begin_weekly_payout', { p_operation_id: o.id });
      await db.query(
        "UPDATE contractor_payout_operations SET first_attempt_at='2000-01-01' WHERE id=$1",
        [o.id]
      );
      await process();
      assert.equal((await op(id)).state, 'needs_review');
      assert.equal(await count(o.id), 0);
      assert.equal((await balance(id)).pending_amount_minor, '10');
    }
  );
  await check(
    'insufficient provider balance leaves ledger untouched',
    async () => {
      const available = (await stripe.balance.retrieve()).available.find(
        (x) => x.currency === 'gbp'
      ).amount;
      const id = await fixture(available + 10000);
      await process();
      assert.equal(
        (await balance(id)).pending_amount_minor,
        String(available + 10000)
      );
      assert.equal((await balance(id)).lifetime_paid_out_minor, '0');
      assert.equal(await count((await op(id)).id), 0);
    }
  );
  await check(
    'unavailable provider destination does not debit earnings',
    async () => {
      const id = await fixture(10, true, 'acct_beta_unavailable');
      await process();
      assert.equal((await balance(id)).pending_amount_minor, '10');
      assert.equal((await balance(id)).lifetime_paid_out_minor, '0');
    }
  );
} catch (e) {
  console.error(e.name, e.code ?? '', e.message);
  process.exitCode = 1;
} finally {
  // Reverse only transfers created by this runner, returning synthetic funds.
  let reversed = 0;
  for (const id of transfers) {
    try {
      await stripe.transfers.createReversal(id);
      reversed++;
    } catch {
      process.exitCode = 1;
    }
  }
  await db.end();
  if (started) await cluster.stop();
  if (
    path.dirname(path.resolve(directory)) === path.resolve(os.tmpdir()) &&
    path.basename(directory).startsWith('mintenance-payout-')
  )
    await fs.rm(directory, { recursive: true, force: true });
  const report = {
    recordedOn: new Date().toISOString(),
    sandboxMode: true,
    productionUntouched: true,
    passed: !process.exitCode,
    results,
    transfersCreated: transfers.length,
    transfersReversed: reversed,
  };
  await fs.writeFile(
    path.join(root, 'phase6-payout-sandbox-results.json'),
    JSON.stringify(report, null, 2) + '\n'
  );
  console.log(
    JSON.stringify({
      passed: report.passed,
      checks: results.length,
      transfersCreated: transfers.length,
      transfersReversed: reversed,
    })
  );
}
