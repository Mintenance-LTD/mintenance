// Isolated PostgreSQL regressions. --deliver <env> sends ONE clearly labelled
// test alert to the user-approved operator inbox using the real EmailService.
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createRequire, syncBuiltinESMExports } from 'node:module';
import childProcess from 'node:child_process';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..'
);
const require = createRequire(import.meta.url);
const spawn = childProcess.spawn;
childProcess.spawn = (cmd, args, opts) =>
  spawn(cmd, args, { ...opts, windowsHide: true });
syncBuiltinESMExports();
const { default: EmbeddedPostgres } = await import('embedded-postgres');
const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'mintenance-alert-'));
const socket = net.createServer();
await new Promise((r) => socket.listen(0, '127.0.0.1', r));
const port = socket.address().port;
await new Promise((r) => socket.close(r));
const password = randomUUID();
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
const db = new pg.Client({
  host: '127.0.0.1',
  port,
  user: 'postgres',
  password,
  database: 'postgres',
});
const checks = [];
let started = false,
  connected = false,
  delivery;
const check = async (name, fn) => {
  await fn();
  checks.push(name);
  console.log('PASS ' + name);
};
let recipient = 'admin@mintenance.co.uk',
  sendOK = false;
const sends = [];
globalThis.__operatorDb = {
  from(table) {
    if (table === 'platform_settings')
      return {
        select() {
          return this;
        },
        eq() {
          return this;
        },
        async maybeSingle() {
          return { data: { setting_value: recipient }, error: null };
        },
      };
    assert.equal(table, 'operator_alerts');
    return {
      async upsert(row) {
        await db.query(
          'INSERT INTO operator_alerts(dedupe_key,job_name,run_id) VALUES($1,$2,$3) ON CONFLICT(dedupe_key) DO NOTHING',
          [row.dedupe_key, row.job_name, row.run_id]
        );
        return { error: null };
      },
    };
  },
  async rpc(name, args) {
    assert(['claim_operator_alert', 'finish_operator_alert'].includes(name));
    const sql =
      name === 'claim_operator_alert'
        ? 'SELECT claim_operator_alert() AS data'
        : 'SELECT finish_operator_alert($1,$2,$3) AS data';
    const values = args ? [args.p_id, args.p_token, args.p_sent] : [];
    return { data: (await db.query(sql, values)).rows[0].data, error: null };
  },
};
globalThis.__operatorSend = async (opts) => {
  sends.push(opts);
  return sendOK;
};
try {
  await cluster.initialise();
  await cluster.start();
  started = true;
  await db.connect();
  connected = true;
  await db.query(
    'CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role BYPASSRLS;'
  );
  await db.query(
    await fs.readFile(
      path.join(
        root,
        'supabase/migrations/20261029224939_operator_alert_delivery.sql'
      ),
      'utf8'
    )
  );
  const bundle = path.join(root, 'apps/web/.cache/operator-alert-test.cjs');
  await fs.mkdir(path.dirname(bundle), { recursive: true });
  await require('esbuild').build({
    stdin: {
      contents:
        "export {OperatorAlertService} from './apps/web/lib/services/admin/OperatorAlertService'; export {EmailService} from './apps/web/lib/email-service';",
      resolveDir: root,
    },
    bundle: true,
    platform: 'node',
    format: 'cjs',
    outfile: bundle,
    tsconfig: path.join(root, 'apps/web/tsconfig.json'),
    plugins: [
      {
        name: 'isolated-transports',
        setup(build) {
          build.onResolve({ filter: /^@\/lib\/api\/supabaseServer$/ }, () => ({
            path: 'db',
            namespace: 'test',
          }));
          build.onResolve(
            { filter: /^(\.\/env|@mintenance\/shared)$/ },
            (a) => ({ path: a.path, namespace: 'test' })
          );
          build.onLoad({ filter: /.*/, namespace: 'test' }, (a) => ({
            contents:
              a.path === 'db'
                ? 'export const serverSupabase=globalThis.__operatorDb;'
                : a.path === './env'
                  ? 'export const env=globalThis.__mailEnv;'
                  : 'export const logger={info(){},warn(){},error(){}};',
            loader: 'js',
          }));
        },
      },
    ],
  });
  const envPath = process.argv.includes('--deliver')
    ? process.argv[process.argv.indexOf('--deliver') + 1]
    : null;
  const envText = envPath ? await fs.readFile(envPath, 'utf8') : '';
  const value = (k) =>
    envText.match(
      new RegExp('^' + k + '\\s*=\\s*["\']?([^\\r\\n"\']+)', 'm')
    )?.[1];
  globalThis.__mailEnv = {
    BREVO_API_KEY: value('BREVO_API_KEY'),
    EMAIL_FROM: value('EMAIL_FROM') || 'noreply@mintenance.co.uk',
    EMAIL_FROM_NAME: 'Mintenance ltd',
  };
  const { OperatorAlertService: service, EmailService } = require(bundle);
  const realSend = EmailService.sendEmail.bind(EmailService);
  EmailService.sendEmail = globalThis.__operatorSend;
  await check(
    'anon and authenticated cannot read, write or execute alert queue',
    async () => {
      for (const role of ['anon', 'authenticated']) {
        const r = await db.query(
          "SELECT has_table_privilege($1,'operator_alerts','SELECT,INSERT,UPDATE,DELETE') AS access,has_function_privilege($1,'claim_operator_alert()','EXECUTE') AS claim,has_function_privilege($1,'finish_operator_alert(uuid,uuid,boolean)','EXECUTE') AS finish",
          [role]
        );
        assert.deepEqual(r.rows[0], {
          access: false,
          claim: false,
          finish: false,
        });
      }
    }
  );
  await db.query('SET ROLE service_role');
  await check('concurrent enqueue produces one hourly alert', async () => {
    await Promise.all(
      Array.from({ length: 10 }, () =>
        service.enqueue('payment-reconciliation', null)
      )
    );
    assert.equal(
      (await db.query('SELECT count(*)::int AS n FROM operator_alerts')).rows[0]
        .n,
      1
    );
  });
  await check(
    'exclusive lease and fencing reject duplicate and stale acknowledgement',
    async () => {
      const claimed = (await db.query('SELECT claim_operator_alert() AS data'))
        .rows[0].data;
      assert.equal(
        (await db.query('SELECT claim_operator_alert() AS data')).rows[0].data,
        null
      );
      assert.equal(
        (
          await db.query('SELECT finish_operator_alert($1,$2,true) AS ok', [
            claimed.id,
            randomUUID(),
          ])
        ).rows[0].ok,
        false
      );
      assert.equal(
        (
          await db.query('SELECT finish_operator_alert($1,$2,false) AS ok', [
            claimed.id,
            claimed.lease_token,
          ])
        ).rows[0].ok,
        true
      );
    }
  );
  await check(
    'provider rejection remains pending and is not retried in the same batch',
    async () => {
      await db.query(
        "UPDATE operator_alerts SET retry_after=now()-interval '1 second'"
      );
      assert.deepEqual(await service.deliverPending(), { sent: 0, failed: 1 });
      assert.equal(sends.length, 1);
      assert.equal(
        (await db.query('SELECT sent_at FROM operator_alerts')).rows[0].sent_at,
        null
      );
    }
  );
  await check('successful retry is acknowledged and never resent', async () => {
    sendOK = true;
    await db.query(
      "UPDATE operator_alerts SET retry_after=now()-interval '1 second'"
    );
    assert.deepEqual(await service.deliverPending(), { sent: 1, failed: 0 });
    assert.deepEqual(await service.deliverPending(), { sent: 0, failed: 0 });
    assert.equal(sends.length, 2);
  });
  await check('missing recipient fails closed without sending', async () => {
    recipient = '';
    await assert.rejects(service.deliverPending(), /not configured/);
    recipient = 'admin@mintenance.co.uk';
    assert.equal(sends.length, 2);
  });
  if (envPath) {
    assert(globalThis.__mailEnv.BREVO_API_KEY, 'Brevo configuration required');
    EmailService.sendEmail = realSend;
    const realFetch = globalThis.fetch;
    let messageId;
    globalThis.fetch = async (input, opts) => {
      const response = await realFetch(input, opts);
      if (input === 'https://api.brevo.com/v3/smtp/email' && response.ok)
        messageId = (await response.clone().json()).messageId;
      return response;
    };
    await service.enqueue('test-operator-delivery', null);
    // Labelled through the same queue/lease/provider/acknowledgement path.
    const result = await service.deliverPending();
    assert.deepEqual(result, { sent: 1, failed: 0 });
    delivery = { recipient, provider: 'brevo', accepted: true, events: [] };
    if (messageId) {
      const response = await realFetch(
        'https://api.brevo.com/v3/smtp/statistics/events?messageId=' +
          encodeURIComponent(messageId),
        {
          headers: { 'api-key': globalThis.__mailEnv.BREVO_API_KEY },
          signal: AbortSignal.timeout(8000),
        }
      );
      if (response.ok)
        delivery.events =
          (await response.json()).events?.map((e) => ({
            event: e.event,
            date: e.date,
          })) || [];
    }
    globalThis.fetch = realFetch;
    console.log('TEST_EMAIL ' + JSON.stringify(delivery));
  }
} catch (error) {
  console.error('FAIL', error.name, error.message);
  process.exitCode = 1;
} finally {
  if (connected) await db.end();
  if (started) await cluster.stop();
  if (
    path.dirname(path.resolve(directory)) === path.resolve(os.tmpdir()) &&
    path.basename(directory).startsWith('mintenance-alert-')
  )
    await fs.rm(directory, { recursive: true, force: true });
  await fs.writeFile(
    path.join(root, 'operator-alert-results.json'),
    JSON.stringify(
      {
        recordedOn: new Date().toISOString(),
        passed: !process.exitCode,
        checks,
        delivery,
      },
      null,
      2
    )
  );
}
