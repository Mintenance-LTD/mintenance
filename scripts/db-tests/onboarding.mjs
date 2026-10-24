// Isolated loopback database; never loads app environments or contacts Supabase.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import childProcess from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';
import pg from 'pg';
const spawn = childProcess.spawn;
childProcess.spawn = (command, args, options) =>
  spawn(command, args, { ...options, windowsHide: true });
syncBuiltinESMExports();
const { default: EmbeddedPostgres } = await import('embedded-postgres');
const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..'
);
const databaseDir = await fs.mkdtemp(
  path.join(os.tmpdir(), 'mintenance-onboarding-')
);
const listener = net.createServer();
await new Promise((resolve) => listener.listen(0, '127.0.0.1', resolve));
const port = listener.address().port;
await new Promise((resolve) => listener.close(resolve));
const password = randomUUID();
const cluster = new EmbeddedPostgres({
  databaseDir,
  user: 'postgres',
  password,
  port,
  persistent: true,
  postgresFlags: ['-h', '127.0.0.1'],
  onLog: () => {},
  onError: () => {},
});
const config = {
  host: '127.0.0.1',
  port,
  user: 'postgres',
  password,
  database: 'postgres',
};
const db = new pg.Client(config);
let started = false,
  connected = false,
  passed = 0;
const uid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
async function check(name, fn) {
  await fn();
  passed++;
  console.log(`PASS ${name}`);
}
async function as(role, user, sql) {
  await db.query('BEGIN');
  try {
    await db.query(`SET LOCAL ROLE ${role}`);
    await db.query("SELECT set_config('request.jwt.claim.sub',$1,true)", [
      user,
    ]);
    const result = await db.query(sql);
    await db.query('COMMIT');
    return result;
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  }
}
try {
  await cluster.initialise();
  await cluster.start();
  started = true;
  await db.connect();
  connected = true;
  await db.query(`
    CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    GRANT USAGE ON SCHEMA public,auth TO anon,authenticated,service_role;
    CREATE TABLE profiles(id uuid PRIMARY KEY, role text NOT NULL);
    CREATE TABLE early_access_grants(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid REFERENCES profiles(id),role text,grant_type text,granted_by text,notes text, UNIQUE(user_id,grant_type));
    CREATE TABLE notifications(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid REFERENCES profiles(id),type varchar(50),title varchar(255),message text CHECK(length(message) BETWEEN 1 AND 1000),action_url text,metadata jsonb);
    INSERT INTO profiles VALUES('${uid(1)}','homeowner'),('${uid(2)}','contractor'),('${uid(3)}','admin'),('${uid(4)}','homeowner');
    INSERT INTO early_access_grants(user_id,role,grant_type) VALUES('${uid(1)}','homeowner','max_subscription_features'),('${uid(2)}','contractor','max_subscription_features'),('${uid(3)}','contractor','max_subscription_features');
  `);
  await db.query(
    await fs.readFile(
      path.join(
        root,
        'supabase/migrations/20261024142808_onboarding_journeys_and_early_access_notices.sql'
      ),
      'utf8'
    )
  );
  await check(
    'backfill only valid grants with role-specific benefits',
    async () => {
      const { rows } = await db.query(
        'SELECT * FROM notifications ORDER BY user_id'
      );
      assert.equal(rows.length, 2);
      assert.match(rows[0].message, /Agency/);
      assert.doesNotMatch(rows[0].message, /platform fee|5%/);
      assert.match(rows[1].message, /Business/);
    }
  );
  await check(
    'reconciliation is idempotent and does not grant benefits',
    async () => {
      assert.equal(
        (await db.query('SELECT reconcile_early_access_notices(NULL) n'))
          .rows[0].n,
        0
      );
      assert.equal(
        (await db.query('SELECT count(*)::int n FROM early_access_grants'))
          .rows[0].n,
        3
      );
    }
  );
  await check('new award atomically creates one notice', async () => {
    await db.query(
      `INSERT INTO early_access_grants(user_id,role,grant_type) VALUES('${uid(4)}','homeowner','max_subscription_features')`
    );
    assert.equal(
      (await db.query('SELECT count(*)::int n FROM notifications')).rows[0].n,
      3
    );
  });
  await check(
    'users cannot manufacture award notices or progress writes',
    async () => {
      for (const role of ['anon', 'authenticated']) {
        await assert.rejects(
          as(role, uid(1), 'SELECT reconcile_early_access_notices(NULL)'),
          (e) => e.code === '42501'
        );
        await assert.rejects(
          as(
            role,
            uid(1),
            `INSERT INTO onboarding_journeys(user_id,journey,platform,status) VALUES('${uid(1)}','intro-homeowner','web','completed')`
          ),
          (e) => e.code === '42501'
        );
      }
    }
  );
  await check(
    'progress is private and independent per platform and journey',
    async () => {
      await db.query(
        `INSERT INTO onboarding_journeys(user_id,journey,platform,status) VALUES('${uid(1)}','intro-homeowner','web','completed'),('${uid(1)}','intro-homeowner','mobile','skipped'),('${uid(2)}','intro-contractor','web','in_progress')`
      );
      const { rows } = await as(
        'authenticated',
        uid(1),
        'SELECT * FROM onboarding_journeys'
      );
      assert.equal(rows.length, 2);
      assert.ok(rows.every((r) => r.user_id === uid(1)));
      assert.deepEqual(
        new Set(rows.map((r) => r.status)),
        new Set(['completed', 'skipped'])
      );
    }
  );
  await check(
    'cohort slot 100 cannot be allocated twice concurrently',
    async () => {
      // Remove the mismatched fixture; seed 99 legitimate contractor awards.
      await db.query(`DELETE FROM early_access_grants WHERE user_id='${uid(3)}';
      INSERT INTO profiles SELECT ('00000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'contractor' FROM generate_series(100,197) n;
      INSERT INTO early_access_grants(user_id,role,grant_type) SELECT id,role,'max_subscription_features' FROM profiles WHERE id >= '${uid(100)}';
      CREATE TRIGGER profile_early_access AFTER INSERT ON profiles FOR EACH ROW EXECUTE FUNCTION fn_auto_grant_early_access();`);
      const a = new pg.Client(config),
        b = new pg.Client(config);
      await a.connect();
      await b.connect();
      try {
        await a.query('BEGIN');
        await a.query(
          `INSERT INTO profiles VALUES('${uid(200)}','contractor')`
        );
        await b.query('BEGIN');
        const pending = b.query(
          `INSERT INTO profiles VALUES('${uid(201)}','contractor')`
        );
        await a.query('COMMIT');
        await pending;
        await b.query('COMMIT');
        assert.equal(
          (
            await db.query(
              "SELECT count(*)::int n FROM early_access_grants WHERE role='contractor'"
            )
          ).rows[0].n,
          100
        );
        assert.equal(
          (
            await db.query(
              `SELECT count(*)::int n FROM notifications WHERE user_id IN('${uid(200)}','${uid(201)}')`
            )
          ).rows[0].n,
          1
        );
      } finally {
        await a.end();
        await b.end();
      }
    }
  );
  console.log(
    `PASS ${passed} onboarding database checks; production untouched.`
  );
} finally {
  if (connected) await db.end();
  if (started) await cluster.stop();
  const resolved = path.resolve(databaseDir);
  if (
    path.dirname(resolved) === path.resolve(os.tmpdir()) &&
    path.basename(resolved).startsWith('mintenance-onboarding-')
  )
    await fs.rm(resolved, { recursive: true, force: true });
}
