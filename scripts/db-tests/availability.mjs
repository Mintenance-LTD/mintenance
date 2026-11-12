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
  path.join(os.tmpdir(), 'mintenance-availability-')
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
    CREATE ROLE anon NOLOGIN;
    CREATE ROLE authenticated NOLOGIN;
    CREATE ROLE service_role NOLOGIN BYPASSRLS;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT current_user::text $$;
    GRANT USAGE ON SCHEMA public,auth TO anon,authenticated,service_role;
    CREATE TABLE profiles(id uuid PRIMARY KEY,role text NOT NULL);
    INSERT INTO profiles VALUES('${uid(1)}','contractor'),('${uid(2)}','contractor'),('${uid(3)}','homeowner');
    CREATE TABLE contractor_availability(contractor_id uuid REFERENCES profiles(id),day_of_week int,start_time time,end_time time,is_available boolean, UNIQUE(contractor_id,day_of_week,start_time));
    ALTER TABLE contractor_availability ENABLE ROW LEVEL SECURITY;
    CREATE POLICY own_availability ON contractor_availability TO authenticated USING(contractor_id=auth.uid()) WITH CHECK(contractor_id=auth.uid());
    GRANT SELECT ON profiles TO authenticated,service_role;
    GRANT SELECT,INSERT,DELETE ON contractor_availability TO authenticated,service_role;
  `);
  await db.query(
    await fs.readFile(
      path.join(
        root,
        'supabase/migrations/20261112185922_atomic_contractor_availability.sql'
      ),
      'utf8'
    )
  );
  const slot = (day) => ({
    day_of_week: day,
    start_time: '09:00',
    end_time: '17:00',
    is_available: true,
  });
  const replace = (owner, slots) => ({
    text: 'SELECT replace_contractor_availability($1,$2::jsonb)',
    values: [owner, JSON.stringify(slots)],
  });
  const rows = async () =>
    (
      await db.query(
        'SELECT day_of_week FROM contractor_availability ORDER BY day_of_week'
      )
    ).rows.map((r) => r.day_of_week);
  await check('contractor replaces own schedule', async () => {
    await as('authenticated', uid(1), replace(uid(1), [slot(1), slot(2)]));
    assert.deepEqual(await rows(), [1, 2]);
  });
  await check('another contractor cannot replace the schedule', async () => {
    await assert.rejects(as('authenticated', uid(2), replace(uid(1), [])), {
      code: '42501',
    });
    assert.deepEqual(await rows(), [1, 2]);
  });
  await check('homeowner cannot use contractor availability', async () => {
    await assert.rejects(
      as('authenticated', uid(3), replace(uid(3), [slot(1)])),
      { code: '42501' }
    );
  });
  await check('anonymous callers cannot execute the function', async () => {
    await assert.rejects(as('anon', '', replace(uid(1), [])), {
      code: '42501',
    });
  });
  await check('invalid times preserve existing availability', async () => {
    await assert.rejects(
      as(
        'authenticated',
        uid(1),
        replace(uid(1), [{ ...slot(3), end_time: '08:00' }])
      ),
      { code: '22023' }
    );
    assert.deepEqual(await rows(), [1, 2]);
  });
  await check('failed insert rolls back the preceding deletion', async () => {
    await assert.rejects(
      as('authenticated', uid(1), replace(uid(1), [slot(3), slot(3)])),
      { code: '23505' }
    );
    assert.deepEqual(await rows(), [1, 2]);
  });
  await check('simultaneous edits cannot interleave schedules', async () => {
    const other = new pg.Client(config);
    await other.connect();
    try {
      await db.query('BEGIN');
      await db.query(
        `SET LOCAL ROLE authenticated; SELECT set_config('request.jwt.claim.sub','${uid(1)}',true)`
      );
      await db.query(replace(uid(1), [slot(4)]));
      await other.query('BEGIN');
      await other.query(
        `SET LOCAL ROLE authenticated; SELECT set_config('request.jwt.claim.sub','${uid(1)}',true)`
      );
      const pending = other.query(replace(uid(1), [slot(5), slot(6)]));
      await db.query('COMMIT');
      await pending;
      await other.query('COMMIT');
      assert.deepEqual(await rows(), [5, 6]);
    } finally {
      await db.query('ROLLBACK');
      await other.query('ROLLBACK');
      await other.end();
    }
  });
  await check('contractor can clear availability', async () => {
    await as('authenticated', uid(1), replace(uid(1), []));
    assert.deepEqual(await rows(), []);
  });
  console.log(
    `PASS ${passed} availability database checks; production untouched.`
  );
} finally {
  if (connected) await db.end();
  if (started) await cluster.stop();
  const resolved = path.resolve(databaseDir);
  if (
    path.dirname(resolved) === path.resolve(os.tmpdir()) &&
    path.basename(resolved).startsWith('mintenance-availability-')
  )
    // Windows can retain a short-lived file handle after PostgreSQL exits.
    await fs.rm(resolved, {
      recursive: true,
      force: true,
      maxRetries: 5,
      retryDelay: 100,
    });
}
