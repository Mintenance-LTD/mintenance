import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { syncBuiltinESMExports } from 'node:module';
import childProcess from 'node:child_process';
import pg from 'pg';

const spawn = childProcess.spawn;
childProcess.spawn = (cmd, args, opts) =>
  spawn(cmd, args, { ...opts, windowsHide: true });
syncBuiltinESMExports();
const { default: EmbeddedPostgres } = await import('embedded-postgres');
const databaseDir = await fs.mkdtemp(
  path.join(os.tmpdir(), 'mintenance-archives-')
);
const socket = net.createServer();
await new Promise((resolve) => socket.listen(0, '127.0.0.1', resolve));
const port = socket.address().port;
await new Promise((resolve) => socket.close(resolve));
const password = randomUUID();
const cluster = new EmbeddedPostgres({
  databaseDir,
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
const names = [
  'rls_cross_role_dedup_backup_20260716',
  'rls_cross_role_merge_backup_20260716',
  'rls_dead_sr_policy_backup_20260716',
  'rls_structural_split_backup_20260716',
];
const migration = await fs.readFile(
  new URL(
    '../../supabase/migrations/20261113012837_archive_policy_primary_keys.sql',
    import.meta.url
  ),
  'utf8'
);
let started = false,
  connected = false;
try {
  await cluster.initialise();
  await cluster.start();
  started = true;
  await db.connect();
  connected = true;
  await db.query(
    'CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS'
  );
  await db.query(migration);
  console.log('PASS fresh environments without historical archives');
  for (const name of names) {
    await db.query(`CREATE TABLE public.${name} (policyname name, qual text, roles name[]);
      ALTER TABLE public.${name} ENABLE ROW LEVEL SECURITY;
      GRANT ALL ON public.${name} TO service_role;
      INSERT INTO public.${name} VALUES ('same', NULL, ARRAY['authenticated']::name[]),
        ('same', NULL, ARRAY['authenticated']::name[]), (NULL, 'owner = auth.uid()', NULL)`);
  }
  const before = await Promise.all(
    names.map(
      async (name) =>
        (await db.query(`SELECT to_jsonb(t) AS row FROM public.${name} t`)).rows
    )
  );
  await db.query(migration);
  for (const [i, name] of names.entries()) {
    const rows = (
      await db.query(
        `SELECT to_jsonb(t) - 'archive_id' AS row FROM public.${name} t ORDER BY archive_id`
      )
    ).rows;
    assert.deepEqual(rows, before[i]);
    const info = (
      await db.query(
        `SELECT c.relrowsecurity,
      has_table_privilege('anon', c.oid, 'SELECT') AS anon_read,
      has_table_privilege('authenticated', c.oid, 'SELECT') AS auth_read,
      has_sequence_privilege('authenticated', pg_get_serial_sequence(c.oid::regclass::text, 'archive_id'), 'USAGE') AS auth_sequence,
      EXISTS (SELECT FROM pg_constraint WHERE conrelid=c.oid AND contype='p') AS primary_key
      FROM pg_class c WHERE c.oid=$1::regclass`,
        [`public.${name}`]
      )
    ).rows[0];
    assert.deepEqual(info, {
      relrowsecurity: true,
      anon_read: false,
      auth_read: false,
      auth_sequence: false,
      primary_key: true,
    });
    await db.query('SET ROLE service_role');
    const inserted = await db.query(
      `INSERT INTO public.${name}(policyname) VALUES ('new') RETURNING archive_id`
    );
    assert.equal(inserted.rows[0].archive_id, '4');
    await db.query('RESET ROLE');
    console.log(
      `PASS ${name}: duplicate/null snapshots preserved, access unchanged, identity works`
    );
  }
  await db.query(migration);
  for (const name of names)
    assert.equal(
      (await db.query(`SELECT count(*) FROM public.${name}`)).rows[0].count,
      '4'
    );
  console.log('PASS replay leaves keys and records unchanged');
} finally {
  if (connected) await db.end();
  if (started) await cluster.stop();
  const resolved = path.resolve(databaseDir);
  if (
    path.dirname(resolved) === path.resolve(os.tmpdir()) &&
    path.basename(resolved).startsWith('mintenance-archives-')
  )
    await fs.rm(resolved, {
      recursive: true,
      force: true,
      maxRetries: 5,
      retryDelay: 100,
    });
}
