// Isolated loopback database; never loads app environments or contacts Supabase.
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { randomUUID } from 'node:crypto';
import childProcess from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';
import pg from 'pg';
const spawn = childProcess.spawn;
childProcess.spawn = (command, args, options) =>
  spawn(command, args, { ...options, windowsHide: true });
syncBuiltinESMExports();
const { default: EmbeddedPostgres } = await import('embedded-postgres');
const databaseDir = await fs.mkdtemp(
  path.join(os.tmpdir(), 'mintenance-inspections-')
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
  connected = false;
const { testInspections } = await import('./property-inspections-cases.mjs');
try {
  await cluster.initialise();
  await cluster.start();
  started = true;
  await db.connect();
  connected = true;
  await testInspections(db);
} finally {
  if (connected) await db.end();
  if (started) await cluster.stop();
  const resolved = path.resolve(databaseDir);
  if (
    path.dirname(resolved) === path.resolve(os.tmpdir()) &&
    path.basename(resolved).startsWith('mintenance-inspections-')
  )
    // Windows can retain a short-lived file handle after PostgreSQL exits.
    await fs.rm(resolved, {
      recursive: true,
      force: true,
      maxRetries: 5,
      retryDelay: 100,
    });
}
