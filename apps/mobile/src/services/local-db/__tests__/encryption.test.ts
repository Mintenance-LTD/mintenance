import { Platform } from 'react-native';
import { getOrCreateDbKey, openLocalDatabase } from '../encryption';
const mockStore = new Map<string, string>();
const mockFiles = new Set<string>();
const mockGetInfo = jest.fn();
const mockDeleteFile = jest.fn();
const mockRandom = jest.fn();
const mockGetKey = jest.fn();
const mockSetKey = jest.fn();
const mockOpen = jest.fn();
const mockDelete = jest.fn();
const mockAvailable = jest.fn();
jest.mock('expo-secure-store', () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'unlocked',
  isAvailableAsync: () => mockAvailable(),
  getItemAsync: (...args: unknown[]) => mockGetKey(...args),
  setItemAsync: (...args: unknown[]) => mockSetKey(...args),
}));
jest.mock('expo-crypto', () => ({
  getRandomBytesAsync: (...args: unknown[]) => mockRandom(...args),
}));
jest.mock('expo-file-system/legacy', () => ({
  getInfoAsync: (...args: unknown[]) => mockGetInfo(...args),
  deleteAsync: (...args: unknown[]) => mockDeleteFile(...args),
}));
jest.mock('expo-sqlite', () => ({
  defaultDatabaseDirectory: '/data/SQLite',
  openDatabaseAsync: (...args: unknown[]) => mockOpen(...args),
  deleteDatabaseAsync: (...args: unknown[]) => mockDelete(...args),
}));
jest.mock('../../../utils/logger', () => ({ logger: { error: jest.fn() } }));
const KEY = 'mintenance.local_db.encryption_key.v1';
const READY = 'mintenance.local_db.encrypted.v1';
const LEGACY = 'mintenance_local.db';
const ENCRYPTED = 'mintenance_local.encrypted.db';
const key = '07'.repeat(32);
const schema = [
  {
    type: 'table',
    name: 'offline_actions',
    sql: 'CREATE TABLE offline_actions(id TEXT)',
  },
];
function database() {
  return {
    execAsync: jest.fn(async (_sql: string) => undefined),
    closeAsync: jest.fn(async () => undefined),
    getFirstAsync: jest.fn(
      async (sql: string): Promise<Record<string, unknown> | null> => {
        if (sql === 'PRAGMA cipher_version') return { cipher_version: '4.6' };
        if (sql === 'PRAGMA integrity_check') return { integrity_check: 'ok' };
        if (sql === 'PRAGMA user_version') return { user_version: 2 };
        if (sql === 'PRAGMA application_id') return { application_id: 0 };
        if (sql.includes('sqlcipher_export')) {
          mockFiles.add(ENCRYPTED);
          return {};
        }
        return { count: 3 };
      }
    ),
    getAllAsync: jest.fn(async (sql: string) =>
      sql.includes('sqlite_master') ? schema : []
    ),
  };
}
let source: ReturnType<typeof database>;
let encrypted: ReturnType<typeof database>;
beforeEach(() => {
  jest.resetAllMocks();
  mockStore.clear();
  mockFiles.clear();
  mockFiles.add(LEGACY);
  source = database();
  encrypted = database();
  mockAvailable.mockResolvedValue(true);
  mockGetKey.mockImplementation(
    async (name: string) => mockStore.get(name) ?? null
  );
  mockSetKey.mockImplementation(async (name: string, value: string) => {
    mockStore.set(name, value);
  });
  mockRandom.mockResolvedValue(new Uint8Array(32).fill(7));
  mockGetInfo.mockImplementation(async (uri: string) => ({
    exists: mockFiles.has(uri.split('/').pop()!),
  }));
  mockDeleteFile.mockResolvedValue(undefined);
  mockDelete.mockImplementation(async (name: string) => {
    mockFiles.delete(name);
  });
  mockOpen.mockImplementation(async (name: string) =>
    name === LEGACY ? source : encrypted
  );
});
it('keys the encrypted database, preserves queued rows and schema version, then removes plaintext and journals', async () => {
  expect(await openLocalDatabase()).toBe(encrypted);
  expect(encrypted.execAsync.mock.calls[0][0]).toBe(`PRAGMA key = '${key}'`);
  expect(source.execAsync).toHaveBeenCalledWith('BEGIN IMMEDIATE');
  expect(source.execAsync).toHaveBeenCalledWith(
    'PRAGMA encrypted.user_version = 2; PRAGMA encrypted.application_id = 0'
  );
  expect(source.getFirstAsync).toHaveBeenCalledWith(
    'SELECT COUNT(*) AS count FROM encrypted."offline_actions"'
  );
  expect(mockStore.get(READY)).toBe('ready');
  expect(mockFiles.has(LEGACY)).toBe(false);
  expect(mockDeleteFile).toHaveBeenCalledWith(
    'file:///data/SQLite/mintenance_local.db-wal',
    { idempotent: true }
  );
  expect(mockSetKey.mock.invocationCallOrder[1]).toBeLessThan(
    mockDelete.mock.invocationCallOrder.at(-1)!
  );
});
it('opens an existing encrypted database without re-exporting or creating a key', async () => {
  mockStore.set(KEY, key);
  mockStore.set(READY, 'ready');
  mockFiles.add(ENCRYPTED);
  mockFiles.delete(LEGACY);
  await openLocalDatabase();
  expect(mockOpen).toHaveBeenCalledTimes(1);
  expect(mockOpen).toHaveBeenCalledWith(ENCRYPTED, { useNewConnection: true });
  expect(mockRandom).not.toHaveBeenCalled();
  expect(mockDelete).not.toHaveBeenCalled();
});
it('retries a partial export from the preserved source', async () => {
  mockStore.set(KEY, key);
  mockFiles.add(ENCRYPTED);
  await openLocalDatabase();
  expect(mockDelete.mock.calls.map((c) => c[0])).toEqual([ENCRYPTED, LEGACY]);
});
it('keeps plaintext if native SQLCipher is absent', async () => {
  source.getFirstAsync.mockResolvedValue(null);
  await expect(openLocalDatabase()).rejects.toThrow('native build');
  expect(mockDelete).not.toHaveBeenCalled();
  expect(mockStore.has(READY)).toBe(false);
});
it('does not discard source data after a row-count mismatch', async () => {
  const get = source.getFirstAsync.getMockImplementation()!;
  source.getFirstAsync.mockImplementation(async (sql: string) =>
    sql.includes('COUNT(*) AS count FROM encrypted') ? { count: 2 } : get(sql)
  );
  await expect(openLocalDatabase()).rejects.toThrow(
    'Local data is unavailable'
  );
  expect(source.execAsync).toHaveBeenCalledWith('ROLLBACK');
  expect(mockFiles.has(LEGACY)).toBe(true);
  expect(mockStore.has(READY)).toBe(false);
});
it('preserves source when verification of the reopened encrypted file fails', async () => {
  encrypted.getFirstAsync.mockResolvedValue({
    cipher_version: '4.6',
    integrity_check: 'corrupt',
  });
  await expect(openLocalDatabase()).rejects.toThrow();
  expect(mockFiles.has(LEGACY)).toBe(true);
  expect(mockStore.has(READY)).toBe(false);
});
it('keeps the source if the migration marker cannot be persisted', async () => {
  mockSetKey.mockImplementation(async (name: string, value: string) => {
    if (name === READY) throw new Error('write failed');
    mockStore.set(name, value);
  });
  await expect(openLocalDatabase()).rejects.toThrow();
  expect(mockFiles.has(LEGACY)).toBe(true);
  expect(encrypted.closeAsync).toHaveBeenCalled();
});
it('fails closed after a key read error without generating a replacement', async () => {
  mockGetKey.mockRejectedValue(new Error('locked'));
  await expect(openLocalDatabase()).rejects.toThrow();
  expect(mockRandom).not.toHaveBeenCalled();
  expect(mockOpen).not.toHaveBeenCalled();
});
it('never opens a database if the new key cannot be saved', async () => {
  mockSetKey.mockRejectedValue(new Error('disk full'));
  await expect(openLocalDatabase()).rejects.toThrow();
  expect(mockOpen).not.toHaveBeenCalled();
});
it('rejects malformed stored keys without replacement', async () => {
  mockStore.set(KEY, 'z'.repeat(64));
  await expect(getOrCreateDbKey()).rejects.toThrow('invalid');
  expect(mockRandom).not.toHaveBeenCalled();
});
it('does not recreate an empty database when the ready file or its key is missing', async () => {
  mockStore.set(READY, 'ready');
  await expect(openLocalDatabase()).rejects.toThrow();
  mockStore.set(KEY, key);
  await expect(openLocalDatabase()).rejects.toThrow();
  expect(mockOpen).not.toHaveBeenCalled();
});
it('preserves an encrypted file if its migration marker and source are missing', async () => {
  mockStore.set(KEY, key);
  mockFiles.add(ENCRYPTED);
  mockFiles.delete(LEGACY);
  await expect(openLocalDatabase()).rejects.toThrow();
  expect(mockDelete).not.toHaveBeenCalled();
  expect(mockOpen).not.toHaveBeenCalled();
});
it('does not expose native SQL or key material in an error', async () => {
  source.execAsync.mockRejectedValue(new Error(`ATTACH KEY '${key}'`));
  const error = await openLocalDatabase().catch((e: Error) => e);
  expect(String(error)).not.toContain(key);
});
it('uses the browser database only on web', async () => {
  const original = Platform.OS;
  Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
  try {
    await openLocalDatabase();
    expect(mockOpen).toHaveBeenCalledWith(LEGACY);
    expect(mockGetKey).not.toHaveBeenCalled();
  } finally {
    Object.defineProperty(Platform, 'OS', {
      value: original,
      configurable: true,
    });
  }
});
