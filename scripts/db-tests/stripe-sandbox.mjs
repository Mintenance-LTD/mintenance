// Opt-in: node scripts/db-tests/stripe-sandbox.mjs <path-to-local-env>
// Runs the actual application service against Stripe TEST mode and loopback PG.
// Never loads production database credentials. No keys or client secrets logged.
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
const webRequire = createRequire(path.join(root, 'apps/web/package.json'));
const require = createRequire(path.join(root, 'package.json'));
const env = await fs.readFile(process.argv[2], 'utf8');
const key = env.match(
  /^STRIPE_TEST_SECRET_KEY\s*=\s*["']?(sk_test_[^\s"']+)/m
)?.[1];
if (!key) throw new Error('STRIPE_TEST_SECRET_KEY must be a sandbox secret');
process.env.STRIPE_SECRET_KEY = key;
const Stripe = webRequire('stripe');
const stripe = new Stripe(key, { maxNetworkRetries: 1 });
assert.equal(
  (await stripe.balance.retrieve()).livemode,
  false,
  'Must be Stripe test mode'
);

const spawn = childProcess.spawn;
childProcess.spawn = (cmd, args, options) =>
  spawn(cmd, args, { ...options, windowsHide: true });
syncBuiltinESMExports();
const { default: EmbeddedPostgres } = await import('embedded-postgres');
const directory = await fs.mkdtemp(
  path.join(os.tmpdir(), 'mintenance-stripe-')
);
const listener = net.createServer();
await new Promise((resolve) => listener.listen(0, '127.0.0.1', resolve));
const port = listener.address().port;
await new Promise((resolve) => listener.close(resolve));
const password = randomUUID();
const cluster = new EmbeddedPostgres({
  databaseDir: directory,
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
const customers = [];
const results = [];
const run = randomUUID();
let started = false,
  connected = false,
  failLinkOnce = false;

// Minimal PostgREST transport adapter. All reads/writes and the application's
// real synchronization RPC execute in PostgreSQL, not an in-memory mock.
function from(table) {
  assert(['profiles', 'homeowner_subscriptions'].includes(table));
  let action = 'select',
    value,
    filters = [],
    orders = [],
    limit;
  const q = {
    select: () => q,
    eq: (k, v) => {
      filters.push([k, '=', v]);
      return q;
    },
    in: (k, v) => {
      filters.push([k, '= ANY', v]);
      return q;
    },
    order: (k, o) => {
      orders.push([k, o.ascending ? 'ASC' : 'DESC']);
      return q;
    },
    limit: (n) => {
      limit = n;
      return q;
    },
    insert: (v) => {
      action = 'insert';
      value = v;
      return q;
    },
    update: (v) => {
      action = 'update';
      value = v;
      return q;
    },
    single: () => execute(true),
    maybeSingle: () => execute(true),
    then: (resolve, reject) => execute(false).then(resolve, reject),
  };
  const identifier = (s) => {
    assert(/^[a-z_]+$/.test(s));
    return '"' + s + '"';
  };
  async function execute(single) {
    try {
      if (
        failLinkOnce &&
        table === 'homeowner_subscriptions' &&
        value?.stripe_subscription_id
      ) {
        failLinkOnce = false;
        throw Error('Injected lost database write after Stripe success');
      }
      const params = [];
      const param = (v) => {
        params.push(v);
        return '$' + params.length;
      };
      let sql;
      if (action === 'insert')
        sql = `INSERT INTO ${table} (${Object.keys(value).map(identifier)}) VALUES (${Object.values(value).map(param)})`;
      else if (action === 'update')
        sql = `UPDATE ${table} SET ${Object.entries(value)
          .map(([k, v]) => identifier(k) + '=' + param(v))
          .join(',')}`;
      else sql = `SELECT * FROM ${table}`;
      if (filters.length)
        sql +=
          ' WHERE ' +
          filters
            .map(
              ([k, op, v]) =>
                identifier(k) +
                (op === '= ANY' ? '=ANY(' + param(v) + ')' : '=' + param(v))
            )
            .join(' AND ');
      if (action === 'select') {
        if (orders.length)
          sql +=
            ' ORDER BY ' +
            orders.map(([k, d]) => identifier(k) + ' ' + d).join(',');
        if (limit) sql += ' LIMIT ' + Number(limit);
      } else sql += ' RETURNING *';
      const result = await db.query(sql, params);
      return {
        data: single ? (result.rows[0] ?? null) : result.rows,
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error: { message: error.message, code: error.code },
      };
    }
  }
  return q;
}
globalThis.__betaSandboxDb = {
  from,
  async rpc(name, args) {
    assert.equal(name, 'sync_homeowner_subscription');
    try {
      const r = await db.query(
        'SELECT sync_homeowner_subscription($1,$2,$3,$4) AS result',
        [
          args.p_homeowner_id,
          args.p_subscription_id,
          args.p_customer_id,
          args.p_state,
        ]
      );
      return { data: r.rows[0].result, error: null };
    } catch (error) {
      return {
        data: null,
        error: { message: error.message, code: error.code },
      };
    }
  },
};
async function customer(label, method) {
  const owner = randomUUID();
  const c = await stripe.customers.create({
    name: 'Mintenance beta sandbox ' + label,
    metadata: { beta_audit_run: run, userId: owner },
  });
  customers.push(c.id);
  await db.query(
    "INSERT INTO profiles(id,role,stripe_customer_id) VALUES($1,'homeowner',$2)",
    [owner, c.id]
  );
  if (method) {
    const pm = await stripe.paymentMethods.attach(method, { customer: c.id });
    await stripe.customers.update(c.id, {
      invoice_settings: { default_payment_method: pm.id },
    });
  }
  return { owner, id: c.id };
}
async function check(name, fn) {
  const details = await fn();
  results.push({ name, passed: true, ...details });
  console.log('PASS ' + name);
}
async function snapshot(owner) {
  return (
    await db.query(
      'SELECT * FROM homeowner_subscriptions WHERE homeowner_id=$1 ORDER BY created_at DESC LIMIT 1',
      [owner]
    )
  ).rows[0];
}
async function current(sub) {
  return stripe.subscriptions.retrieve(sub, {
    expand: ['latest_invoice.confirmation_secret'],
  });
}
async function pay(result, method = 'pm_card_visa') {
  assert(result.clientSecret, 'Expected a first-invoice confirmation secret');
  const id = result.clientSecret.split('_secret_')[0];
  const intent = await stripe.paymentIntents.confirm(id, {
    payment_method: method,
    return_url: 'https://example.com/beta-sandbox-return',
  });
  return intent;
}
try {
  await cluster.initialise();
  await cluster.start();
  started = true;
  await db.connect();
  connected = true;
  await db.query(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role BYPASSRLS;
    CREATE TABLE profiles(id uuid PRIMARY KEY,role text,stripe_customer_id text,subscription_status text,updated_at timestamptz);
    CREATE TABLE homeowner_subscriptions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),homeowner_id uuid REFERENCES profiles(id),
      stripe_subscription_id text UNIQUE,stripe_customer_id text,stripe_price_id text,plan_type text CHECK(plan_type IN ('landlord','agency')),
      plan_name text,status text CHECK(status IN ('incomplete','active','past_due','unpaid','canceled','expired','trial')),amount numeric,currency text,
      current_period_start timestamptz,current_period_end timestamptz,cancel_at_period_end boolean,canceled_at timestamptz,
      metadata jsonb,created_at timestamptz DEFAULT clock_timestamp(),updated_at timestamptz);
    CREATE UNIQUE INDEX current_subscription ON homeowner_subscriptions(homeowner_id) WHERE status IN ('incomplete','active','past_due','unpaid','trial');
    ALTER TABLE homeowner_subscriptions ENABLE ROW LEVEL SECURITY;
    GRANT ALL ON profiles,homeowner_subscriptions TO service_role;`);
  await db.query(
    await fs.readFile(
      path.join(
        root,
        'supabase/migrations/20261007234517_homeowner_subscription_transitions.sql'
      ),
      'utf8'
    )
  );
  const bundle = path.join(root, 'apps/web/.cache/stripe-sandbox-service.cjs');
  await fs.mkdir(path.dirname(bundle), { recursive: true });
  await require('esbuild').build({
    stdin: {
      contents: `export {HomeownerSubscriptionService as service} from './apps/web/lib/services/subscription/HomeownerSubscriptionService';
    export {handleSubscriptionUpdated,handleSubscriptionDeleted} from './apps/web/lib/services/stripe-webhook/subscription-handlers';`,
      resolveDir: root,
    },
    bundle: true,
    platform: 'node',
    format: 'cjs',
    outfile: bundle,
    external: ['stripe'],
    tsconfig: path.join(root, 'apps/web/tsconfig.json'),
    plugins: [
      {
        name: 'sandbox-only-transport',
        setup(build) {
          build.onResolve({ filter: /^@\/lib\/api\/supabaseServer$/ }, () => ({
            path: 'db',
            namespace: 'sandbox',
          }));
          build.onResolve({ filter: /^@mintenance\/shared$/ }, () => ({
            path: 'logger',
            namespace: 'sandbox',
          }));
          build.onResolve({ filter: /^@\/lib\/errors\/api-error$/ }, () => ({
            path: 'errors',
            namespace: 'sandbox',
          }));
          build.onLoad({ filter: /.*/, namespace: 'sandbox' }, (args) => ({
            contents:
              args.path === 'db'
                ? 'export const serverSupabase=globalThis.__betaSandboxDb;'
                : args.path === 'logger'
                  ? 'export const logger={info(){},warn(){},error(){}};'
                  : 'export class ConflictError extends Error { statusCode=409; }',
            loader: 'js',
          }));
        },
      },
    ],
  });
  const { service, handleSubscriptionUpdated, handleSubscriptionDeleted } =
    webRequire(bundle);
  const notify = async () => {};
  const c = await customer('transitions');
  let initial;
  await check(
    'first purchase and duplicate request create one Stripe subscription',
    async () => {
      initial = await service.createSubscription(
        c.owner,
        c.id,
        'landlord',
        'monthly'
      );
      const retry = await service.createSubscription(
        c.owner,
        c.id,
        'landlord',
        'monthly'
      );
      assert.equal(retry.stripeSubscriptionId, initial.stripeSubscriptionId);
      assert.equal(
        (await stripe.subscriptions.list({ customer: c.id, status: 'all' }))
          .data.length,
        1
      );
      assert.equal((await snapshot(c.owner)).status, 'incomplete');
      const p = await current(initial.stripeSubscriptionId);
      assert.equal(p.latest_invoice.amount_due, 2499);
      assert.equal((await pay(initial)).status, 'succeeded');
      await handleSubscriptionUpdated(await current(p.id), notify);
      assert.equal((await snapshot(c.owner)).status, 'active');
      return { invoiceAmountPence: 2499 };
    }
  );
  for (const [plan, cycle, amount, total, due] of [
    ['agency', 'monthly', 4999, 2500, 2500],
    ['landlord', 'monthly', 2499, -2500, 0],
    ['landlord', 'yearly', 24900, 22401, 19901],
    ['landlord', 'monthly', 2499, -22401, 0],
  ]) {
    await check('paid transition ' + plan + ' ' + cycle, async () => {
      const result = await service.createSubscription(
        c.owner,
        c.id,
        plan,
        cycle
      );
      assert.equal(result.stripeSubscriptionId, initial.stripeSubscriptionId);
      const sub = await current(result.stripeSubscriptionId);
      assert.equal(sub.pending_update, null);
      assert.equal(sub.items.data[0].price.unit_amount, amount);
      const row = await snapshot(c.owner);
      assert.equal(row.plan_type, plan);
      assert.equal(row.metadata.billingCycle, cycle);
      assert.equal(Number(row.amount) * 100, amount);
      assert.equal(
        (await stripe.subscriptions.list({ customer: c.id })).data.length,
        1
      );
      assert.equal(sub.latest_invoice.currency, 'gbp');
      // Requests are seconds apart; allow at most 5p for time-based proration.
      // The annual invoice consumes the £25 account credit from the downgrade.
      assert(
        Math.abs(sub.latest_invoice.total - total) <= 5,
        'Unexpected prorated invoice total'
      );
      assert(
        Math.abs(sub.latest_invoice.amount_due - due) <= 5,
        'Unexpected invoice amount after account credit'
      );
      return {
        invoiceAmountDuePence: sub.latest_invoice.amount_due,
        invoiceTotalPence: sub.latest_invoice.total,
        status: sub.status,
      };
    });
  }
  await check(
    'cancel resubscribe and delayed old deletion preserve the new subscription',
    async () => {
      const old = await current(initial.stripeSubscriptionId);
      await service.cancelSubscription(c.owner, false);
      assert.equal((await snapshot(c.owner)).status, 'canceled');
      const replacement = await service.createSubscription(
        c.owner,
        c.id,
        'agency',
        'monthly'
      );
      if (replacement.clientSecret) await pay(replacement);
      await handleSubscriptionUpdated(
        await current(replacement.stripeSubscriptionId),
        notify
      );
      await handleSubscriptionDeleted(old, notify);
      await handleSubscriptionUpdated(old, notify);
      assert.equal(
        (await snapshot(c.owner)).stripe_subscription_id,
        replacement.stripeSubscriptionId
      );
      assert.equal((await snapshot(c.owner)).status, 'active');
      assert.equal(
        (await stripe.subscriptions.list({ customer: c.id })).data.length,
        1
      );
    }
  );
  await check(
    'provider success followed by lost database save recovers without duplicate billing',
    async () => {
      const x = await customer('lost-save');
      failLinkOnce = true;
      await assert.rejects(
        service.createSubscription(x.owner, x.id, 'landlord'),
        /link/
      );
      const retry = await service.createSubscription(x.owner, x.id, 'landlord');
      assert.equal(
        (await stripe.subscriptions.list({ customer: x.id, status: 'all' }))
          .data.length,
        1
      );
      assert(retry.clientSecret);
    }
  );
  await check(
    'declined and abandoned first payment never grants active entitlement',
    async () => {
      const x = await customer('decline');
      const r = await service.createSubscription(x.owner, x.id, 'landlord');
      await assert.rejects(
        pay(r, 'pm_card_chargeDeclined'),
        (e) => e.type === 'StripeCardError'
      );
      await handleSubscriptionUpdated(
        await current(r.stripeSubscriptionId),
        notify
      );
      assert.equal((await snapshot(x.owner)).status, 'incomplete');
      assert.equal(
        (await service.createSubscription(x.owner, x.id, 'landlord'))
          .stripeSubscriptionId,
        r.stripeSubscriptionId
      );
      await pay(r);
      await handleSubscriptionUpdated(
        await current(r.stripeSubscriptionId),
        notify
      );
      assert.equal((await snapshot(x.owner)).status, 'active');
    }
  );
  await check(
    '3DS action required leaves entitlement incomplete and is resumable',
    async () => {
      const x = await customer('3ds');
      const r = await service.createSubscription(x.owner, x.id, 'landlord');
      const intent = await pay(r, 'pm_card_authenticationRequired');
      assert.equal(intent.status, 'requires_action');
      assert(intent.next_action);
      await handleSubscriptionUpdated(
        await current(r.stripeSubscriptionId),
        notify
      );
      assert.equal((await snapshot(x.owner)).status, 'incomplete');
      assert.equal(
        (await service.createSubscription(x.owner, x.id, 'landlord'))
          .clientSecret,
        r.clientSecret
      );
      // Completing the interactive challenge itself is an exact-client F12 check.
      return {
        paymentIntentStatus: intent.status,
        interactiveChallengeCompleted: false,
      };
    }
  );
  await check(
    'failed upgrade keeps paid tier and recovery applies pending change',
    async () => {
      const x = await customer('upgrade-decline');
      const r = await service.createSubscription(x.owner, x.id, 'landlord');
      await pay(r);
      await handleSubscriptionUpdated(
        await current(r.stripeSubscriptionId),
        notify
      );
      const pm = await stripe.paymentMethods.attach(
        'pm_card_chargeCustomerFail',
        { customer: x.id }
      );
      await stripe.subscriptions.update(r.stripeSubscriptionId, {
        default_payment_method: pm.id,
      });
      const change = await service.createSubscription(x.owner, x.id, 'agency');
      const pending = await current(r.stripeSubscriptionId);
      assert(pending.pending_update);
      assert(change.clientSecret);
      assert.equal((await snapshot(x.owner)).plan_type, 'landlord');
      const again = await service.createSubscription(x.owner, x.id, 'agency');
      assert.equal(again.clientSecret, change.clientSecret);
      const good = await stripe.paymentMethods.attach('pm_card_visa', {
        customer: x.id,
      });
      await stripe.subscriptions.update(r.stripeSubscriptionId, {
        default_payment_method: good.id,
      });
      await stripe.invoices.pay(pending.latest_invoice.id, {
        payment_method: good.id,
      });
      await handleSubscriptionUpdated(pending, notify);
      assert.equal((await snapshot(x.owner)).plan_type, 'agency');
      assert.equal(
        (await stripe.subscriptions.list({ customer: x.id })).data.length,
        1
      );
    }
  );
} catch (error) {
  // Stripe errors may contain secrets/customer payloads: report only class/code.
  console.error(
    'FAIL sandbox suite:',
    error.name,
    error.code ?? '',
    error.type ?? ''
  );
  if (error.name === 'AssertionError') console.error(error.message);
  else if (!error.raw) console.error(error.message);
  process.exitCode = 1;
} finally {
  const cleanup = [];
  for (const id of customers) {
    try {
      await stripe.customers.del(id);
      cleanup.push(true);
    } catch {
      cleanup.push(false);
      process.exitCode = 1;
    }
  }
  if (connected) await db.end();
  if (started) await cluster.stop();
  if (
    path.dirname(path.resolve(directory)) === path.resolve(os.tmpdir()) &&
    path.basename(directory).startsWith('mintenance-stripe-')
  )
    await fs.rm(directory, { recursive: true, force: true });
  const report = {
    recordedOn: new Date().toISOString(),
    sandboxMode: true,
    productionUntouched: true,
    results,
    passed: !process.exitCode,
    testCustomersCreated: customers.length,
    testCustomersRemoved: cleanup.filter(Boolean).length,
  };
  await fs.writeFile(
    path.join(root, 'phase4-stripe-sandbox-results.json'),
    JSON.stringify(report, null, 2) + '\n'
  );
  console.log(
    JSON.stringify({
      passed: report.passed,
      checks: results.length,
      testCustomersRemoved: report.testCustomersRemoved,
    })
  );
}
