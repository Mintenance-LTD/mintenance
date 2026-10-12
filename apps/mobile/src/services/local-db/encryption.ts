/** Native SQLCipher startup and a recoverable plaintext-to-encrypted migration. */
import * as SQLite from 'expo-sqlite';
import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system/legacy';
import { getRandomBytesAsync } from 'expo-crypto';
import { Platform } from 'react-native';
import { logger } from '../../utils/logger';

const DB_KEY_STORE_KEY = 'mintenance.local_db.encryption_key.v1';
const READY_KEY = 'mintenance.local_db.encrypted.v1';
const LEGACY_NAME = 'mintenance_local.db';
const ENCRYPTED_NAME = 'mintenance_local.encrypted.db';
const KEY_PATTERN = /^[a-f0-9]{64}$/i;
const secureOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

// Encryption is required on native platforms; configuration flags cannot disable it.
export function isLocalDbEncryptionEnabled(): boolean {
  return Platform.OS !== 'web';
}

export async function getOrCreateDbKey(): Promise<string> {
  if (!(await SecureStore.isAvailableAsync())) {
    throw new Error(
      'Secure storage is unavailable. Local data remains closed.'
    );
  }
  // Never regenerate a key following a read error or a malformed stored value.
  const existing = await SecureStore.getItemAsync(DB_KEY_STORE_KEY);
  if (existing !== null) {
    if (!KEY_PATTERN.test(existing))
      throw new Error('Local database key is invalid.');
    return existing;
  }
  const ready = await SecureStore.getItemAsync(READY_KEY);
  if (ready !== null) throw new Error('Local database key is missing.');
  const bytes = await getRandomBytesAsync(32);
  const key = Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, '0')
  ).join('');
  await SecureStore.setItemAsync(DB_KEY_STORE_KEY, key, secureOptions);
  // A failed/unconfirmed write must never create a database with an ephemeral key.
  if ((await SecureStore.getItemAsync(DB_KEY_STORE_KEY)) !== key) {
    throw new Error('Local database key could not be saved.');
  }
  return key;
}

function databasePath(name: string): string {
  if (!SQLite.defaultDatabaseDirectory)
    throw new Error('Local database directory is unavailable.');
  return `${SQLite.defaultDatabaseDirectory.replace(/\/$/, '')}/${name}`;
}
function fileUri(path: string): string {
  return path.startsWith('file://') ? path : `file://${path}`;
}
function sqlString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}
async function databaseExists(name: string): Promise<boolean> {
  return (await FileSystem.getInfoAsync(fileUri(databasePath(name)))).exists;
}
async function deleteDatabaseFiles(name: string): Promise<void> {
  if (await databaseExists(name)) await SQLite.deleteDatabaseAsync(name);
  // SQLite's native delete API removes the main file only. Closed plaintext
  // journals can still contain personal data, so remove their sidecars too.
  for (const suffix of ['-wal', '-shm', '-journal']) {
    await FileSystem.deleteAsync(fileUri(databasePath(name) + suffix), {
      idempotent: true,
    });
  }
}
async function requireCipher(db: SQLite.SQLiteDatabase): Promise<void> {
  const version = await db.getFirstAsync<{ cipher_version: string }>(
    'PRAGMA cipher_version'
  );
  if (!version?.cipher_version) {
    throw new Error(
      'This app needs a native build with SQLCipher to store local data.'
    );
  }
}
async function verifyDatabase(db: SQLite.SQLiteDatabase): Promise<void> {
  const integrity = await db.getFirstAsync<{ integrity_check: string }>(
    'PRAGMA integrity_check'
  );
  const cipherErrors = await db.getAllAsync('PRAGMA cipher_integrity_check');
  if (integrity?.integrity_check !== 'ok' || cipherErrors.length !== 0) {
    throw new Error('Encrypted local database failed verification.');
  }
}
async function openEncrypted(key: string): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(ENCRYPTED_NAME, {
    useNewConnection: true,
  });
  try {
    await db.execAsync(`PRAGMA key = ${sqlString(key)}`);
    await requireCipher(db);
    await verifyDatabase(db);
    return db;
  } catch {
    await db.closeAsync();
    throw new Error(
      'Encrypted local data could not be opened. Its files were preserved.'
    );
  }
}

/** Export all tables, indexes and triggers; keep the source until verification and a durable marker. */
export async function migrateToEncrypted(
  key: string
): Promise<SQLite.SQLiteDatabase> {
  if (!KEY_PATTERN.test(key)) throw new Error('Local database key is invalid.');
  if (
    (await databaseExists(ENCRYPTED_NAME)) &&
    !(await databaseExists(LEGACY_NAME))
  ) {
    throw new Error(
      'Local database migration state is missing. Existing encrypted data was preserved.'
    );
  }
  const source = await SQLite.openDatabaseAsync(LEGACY_NAME, {
    useNewConnection: true,
  });
  let attached = false;
  let transaction = false;
  let encrypted: SQLite.SQLiteDatabase | null = null;
  try {
    await requireCipher(source);
    // A crash before READY_KEY leaves the source authoritative. Discard only
    // that unfinished encrypted candidate, then retry from the untouched source.
    await deleteDatabaseFiles(ENCRYPTED_NAME);
    await source.execAsync(
      `ATTACH DATABASE ${sqlString(databasePath(ENCRYPTED_NAME))} AS encrypted KEY ${sqlString(key)}`
    );
    attached = true;
    await source.execAsync('BEGIN IMMEDIATE');
    transaction = true;
    await source.getFirstAsync("SELECT sqlcipher_export('encrypted')");
    const version = await source.getFirstAsync<{ user_version: number }>(
      'PRAGMA user_version'
    );
    const application = await source.getFirstAsync<{ application_id: number }>(
      'PRAGMA application_id'
    );
    await source.execAsync(
      `PRAGMA encrypted.user_version = ${Number(version?.user_version ?? 0)}; PRAGMA encrypted.application_id = ${Number(application?.application_id ?? 0)}`
    );
    const schemaSql =
      "SELECT type, name, sql FROM SCHEMA.sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY type, name";
    const originalSchema = await source.getAllAsync<{
      type: string;
      name: string;
      sql: string;
    }>(schemaSql.replace('SCHEMA', 'main'));
    const copiedSchema = await source.getAllAsync(
      schemaSql.replace('SCHEMA', 'encrypted')
    );
    if (JSON.stringify(originalSchema) !== JSON.stringify(copiedSchema)) {
      throw new Error('Local database schema was not preserved.');
    }
    for (const table of originalSchema.filter((row) => row.type === 'table')) {
      const name = `"${table.name.replace(/"/g, '""')}"`;
      const original = await source.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) AS count FROM main.${name}`
      );
      const copied = await source.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) AS count FROM encrypted.${name}`
      );
      if (original?.count !== copied?.count)
        throw new Error('Local database rows were not preserved.');
    }
    await source.execAsync('COMMIT');
    transaction = false;
    await source.execAsync('DETACH DATABASE encrypted');
    attached = false;
    encrypted = await openEncrypted(key);
    await source.closeAsync();
    // Only after this marker succeeds may the plaintext source be removed.
    await SecureStore.setItemAsync(READY_KEY, 'ready', secureOptions);
    if ((await SecureStore.getItemAsync(READY_KEY)) !== 'ready') {
      throw new Error('Local database migration could not be confirmed.');
    }
    return encrypted;
  } catch {
    if (transaction) await source.execAsync('ROLLBACK').catch(() => undefined);
    if (attached)
      await source
        .execAsync('DETACH DATABASE encrypted')
        .catch(() => undefined);
    await source.closeAsync().catch(() => undefined);
    await encrypted?.closeAsync().catch(() => undefined);
    // Native errors may include the SQL statement and key. Do not log/rethrow them.
    throw new Error(
      'Local data encryption could not complete. Existing data was preserved; retry after restarting.'
    );
  }
}

export async function openLocalDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!isLocalDbEncryptionEnabled())
    return SQLite.openDatabaseAsync(LEGACY_NAME);
  try {
    const key = await getOrCreateDbKey();
    const ready = await SecureStore.getItemAsync(READY_KEY);
    if (ready !== null && ready !== 'ready')
      throw new Error('Invalid migration state.');
    let db: SQLite.SQLiteDatabase;
    if (ready === 'ready') {
      if (!(await databaseExists(ENCRYPTED_NAME)))
        throw new Error('Encrypted local database is missing.');
      db = await openEncrypted(key);
    } else {
      db = await migrateToEncrypted(key);
    }
    // Deletion is retryable after a crash. Never fall back to this old file.
    try {
      await deleteDatabaseFiles(LEGACY_NAME);
    } catch {
      await db.closeAsync();
      throw new Error('The old local database could not be removed.');
    }
    return db;
  } catch {
    logger.error(
      'Encrypted local database is unavailable; no plaintext fallback was used.'
    );
    throw new Error(
      'Local data is unavailable. Restart the app to retry. A native build with SQLCipher and secure storage is required.'
    );
  }
}
