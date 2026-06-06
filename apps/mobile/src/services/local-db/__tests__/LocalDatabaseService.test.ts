/**
 * Coverage suite for LocalDatabaseService — the thin facade that opens the
 * local SQLite DB, creates tables/indexes, runs versioned migrations, and
 * delegates CRUD + sync operations to sibling stores.
 *
 * Strategy: the unit under test is NOT mocked. Only the externals are —
 * expo-sqlite (controllable in-memory fake db), the encryption helper, the
 * versioned-migration runner, the four sibling stores, and the logger.
 *
 * NOTE: jest.mock() factories may only reference out-of-scope variables when
 * those variables are prefixed with `mock` (case-insensitive), so every shared
 * mock holder below uses that prefix.
 */

// --- External mocks (must be declared before importing the unit) ---------

jest.mock('../../../utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const mockOpenDatabaseAsync = jest.fn();
jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: (...args: unknown[]) => mockOpenDatabaseAsync(...args),
}));

const mockGetDatabaseOpenOptions = jest.fn();
jest.mock('../encryption', () => ({
  getDatabaseOpenOptions: () => mockGetDatabaseOpenOptions(),
}));

const mockRunVersionedMigrations = jest.fn();
jest.mock('../migrations', () => ({
  runMigrations: (...args: unknown[]) => mockRunVersionedMigrations(...args),
}));

// Sibling stores — each method mocked so we can assert delegation.
const mockUserStore = {
  saveUser: jest.fn(),
  getUser: jest.fn(),
  getAllUsers: jest.fn(),
};
jest.mock('../UserStore', () => ({
  saveUser: (...a: unknown[]) => mockUserStore.saveUser(...a),
  getUser: (...a: unknown[]) => mockUserStore.getUser(...a),
  getAllUsers: (...a: unknown[]) => mockUserStore.getAllUsers(...a),
}));

const mockJobStore = {
  saveJob: jest.fn(),
  getJob: jest.fn(),
  getJobsByHomeowner: jest.fn(),
  getJobsByStatus: jest.fn(),
};
jest.mock('../JobStore', () => ({
  saveJob: (...a: unknown[]) => mockJobStore.saveJob(...a),
  getJob: (...a: unknown[]) => mockJobStore.getJob(...a),
  getJobsByHomeowner: (...a: unknown[]) =>
    mockJobStore.getJobsByHomeowner(...a),
  getJobsByStatus: (...a: unknown[]) => mockJobStore.getJobsByStatus(...a),
}));

const mockMessageStore = {
  saveMessage: jest.fn(),
  getMessagesByJob: jest.fn(),
};
jest.mock('../MessageStore', () => ({
  saveMessage: (...a: unknown[]) => mockMessageStore.saveMessage(...a),
  getMessagesByJob: (...a: unknown[]) =>
    mockMessageStore.getMessagesByJob(...a),
}));

const mockSyncStore = {
  getDirtyRecords: jest.fn(),
  markRecordSynced: jest.fn(),
  getSyncMetadata: jest.fn(),
  updateSyncMetadata: jest.fn(),
  queueOfflineAction: jest.fn(),
  getOfflineActions: jest.fn(),
  removeOfflineAction: jest.fn(),
  bumpOfflineActionRetry: jest.fn(),
  clearAllData: jest.fn(),
  getStorageInfo: jest.fn(),
};
jest.mock('../SyncStore', () => ({
  getDirtyRecords: (...a: unknown[]) => mockSyncStore.getDirtyRecords(...a),
  markRecordSynced: (...a: unknown[]) => mockSyncStore.markRecordSynced(...a),
  getSyncMetadata: (...a: unknown[]) => mockSyncStore.getSyncMetadata(...a),
  updateSyncMetadata: (...a: unknown[]) =>
    mockSyncStore.updateSyncMetadata(...a),
  queueOfflineAction: (...a: unknown[]) =>
    mockSyncStore.queueOfflineAction(...a),
  getOfflineActions: (...a: unknown[]) => mockSyncStore.getOfflineActions(...a),
  removeOfflineAction: (...a: unknown[]) =>
    mockSyncStore.removeOfflineAction(...a),
  bumpOfflineActionRetry: (...a: unknown[]) =>
    mockSyncStore.bumpOfflineActionRetry(...a),
  clearAllData: (...a: unknown[]) => mockSyncStore.clearAllData(...a),
  getStorageInfo: (...a: unknown[]) => mockSyncStore.getStorageInfo(...a),
}));

import { LocalDatabase } from '../LocalDatabaseService';
import { logger } from '../../../utils/logger';

// --- Fake controllable SQLite db -----------------------------------------

type FakeDb = {
  execAsync: jest.Mock;
  runAsync: jest.Mock;
  getAllAsync: jest.Mock;
  getFirstAsync: jest.Mock;
  closeAsync: jest.Mock;
};

function makeFakeDb(): FakeDb {
  return {
    execAsync: jest.fn().mockResolvedValue(undefined),
    runAsync: jest.fn().mockResolvedValue({ changes: 1 }),
    getAllAsync: jest.fn().mockResolvedValue([]),
    getFirstAsync: jest.fn().mockResolvedValue(null),
    closeAsync: jest.fn().mockResolvedValue(undefined),
  };
}

// Reach into the singleton to read/reset its private state between tests.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const svc = LocalDatabase as any;

function resetSingleton(): void {
  svc.db = null;
  svc.isInitialized = false;
}

let fakeDb: FakeDb;

beforeEach(() => {
  jest.clearAllMocks();
  resetSingleton();
  fakeDb = makeFakeDb();
  mockOpenDatabaseAsync.mockResolvedValue(fakeDb);
  mockGetDatabaseOpenOptions.mockResolvedValue({});
  mockRunVersionedMigrations.mockResolvedValue(undefined);
});

// -------------------------------------------------------------------------
// init / createTables / runMigrations
// -------------------------------------------------------------------------

describe('init', () => {
  it('opens the db with encryption options, creates tables + indexes, runs migrations', async () => {
    mockGetDatabaseOpenOptions.mockResolvedValue({ key: 'abc' });

    await LocalDatabase.init();

    expect(mockGetDatabaseOpenOptions).toHaveBeenCalledTimes(1);
    expect(mockOpenDatabaseAsync).toHaveBeenCalledWith('mintenance_local.db', {
      key: 'abc',
    });

    // 6 CREATE TABLE + 12 CREATE INDEX = 18 execAsync calls.
    expect(fakeDb.execAsync).toHaveBeenCalledTimes(18);

    const sql = fakeDb.execAsync.mock.calls.map((c) => c[0] as string);
    expect(
      sql.some((s) => s.includes('CREATE TABLE IF NOT EXISTS users'))
    ).toBe(true);
    expect(sql.some((s) => s.includes('CREATE TABLE IF NOT EXISTS jobs'))).toBe(
      true
    );
    expect(
      sql.some((s) => s.includes('CREATE TABLE IF NOT EXISTS messages'))
    ).toBe(true);
    expect(sql.some((s) => s.includes('CREATE TABLE IF NOT EXISTS bids'))).toBe(
      true
    );
    expect(
      sql.some((s) => s.includes('CREATE TABLE IF NOT EXISTS sync_metadata'))
    ).toBe(true);
    expect(
      sql.some((s) => s.includes('CREATE TABLE IF NOT EXISTS offline_actions'))
    ).toBe(true);
    expect(
      sql.some((s) => s.includes('CREATE INDEX IF NOT EXISTS idx_users_email'))
    ).toBe(true);
    expect(
      sql.some((s) =>
        s.includes('idx_dirty_messages ON messages(is_dirty) WHERE is_dirty')
      )
    ).toBe(true);

    expect(mockRunVersionedMigrations).toHaveBeenCalledWith(fakeDb);
    expect(logger.info).toHaveBeenCalledWith(
      'Local database initialized successfully'
    );
    expect(svc.isInitialized).toBe(true);
    expect(svc.db).toBe(fakeDb);
  });

  it('is idempotent — second call short-circuits when already initialized', async () => {
    await LocalDatabase.init();
    mockOpenDatabaseAsync.mockClear();

    await LocalDatabase.init();

    expect(mockOpenDatabaseAsync).not.toHaveBeenCalled();
  });

  it('logs and rethrows when openDatabaseAsync fails; stays uninitialized', async () => {
    const boom = new Error('open failed');
    mockOpenDatabaseAsync.mockRejectedValue(boom);

    await expect(LocalDatabase.init()).rejects.toThrow('open failed');

    expect(logger.error).toHaveBeenCalledWith(
      'Failed to initialize local database:',
      boom
    );
    expect(svc.isInitialized).toBe(false);
  });

  it('propagates failures from the migration runner', async () => {
    const boom = new Error('migration failed');
    mockRunVersionedMigrations.mockRejectedValue(boom);

    await expect(LocalDatabase.init()).rejects.toThrow('migration failed');
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to initialize local database:',
      boom
    );
    expect(svc.isInitialized).toBe(false);
  });
});

// -------------------------------------------------------------------------
// requireDb guard (exercised through every delegating method)
// -------------------------------------------------------------------------

describe('requireDb guard', () => {
  it('throws "Database not initialized" when a method is called before init', async () => {
    await expect(LocalDatabase.getUser('u1')).rejects.toThrow(
      'Database not initialized'
    );
  });

  it('createTables throws when db is null (defensive guard)', async () => {
    // db is null pre-init; call the private createTables directly.
    await expect(svc.createTables()).rejects.toThrow(
      'Database not initialized'
    );
  });

  it('runMigrations throws when db is null (defensive guard)', async () => {
    await expect(svc.runMigrations()).rejects.toThrow(
      'Database not initialized'
    );
  });
});

// -------------------------------------------------------------------------
// Delegating methods (after init)
// -------------------------------------------------------------------------

describe('delegations', () => {
  beforeEach(async () => {
    await LocalDatabase.init();
  });

  // --- User operations ---
  it('saveUser delegates to UserStore.saveUser with db, user, markDirty', async () => {
    const user = { id: 'u1' } as never;
    mockUserStore.saveUser.mockResolvedValue(undefined);

    await LocalDatabase.saveUser(user, true);

    expect(mockUserStore.saveUser).toHaveBeenCalledWith(fakeDb, user, true);
  });

  it('saveUser defaults markDirty to false', async () => {
    const user = { id: 'u1' } as never;
    await LocalDatabase.saveUser(user);
    expect(mockUserStore.saveUser).toHaveBeenCalledWith(fakeDb, user, false);
  });

  it('getUser delegates and returns the store result', async () => {
    mockUserStore.getUser.mockResolvedValue({ id: 'u1' });
    const out = await LocalDatabase.getUser('u1');
    expect(mockUserStore.getUser).toHaveBeenCalledWith(fakeDb, 'u1');
    expect(out).toEqual({ id: 'u1' });
  });

  it('getUser returns null passthrough', async () => {
    mockUserStore.getUser.mockResolvedValue(null);
    expect(await LocalDatabase.getUser('missing')).toBeNull();
  });

  it('getAllUsers delegates and returns the array', async () => {
    mockUserStore.getAllUsers.mockResolvedValue([{ id: 'u1' }, { id: 'u2' }]);
    const out = await LocalDatabase.getAllUsers();
    expect(mockUserStore.getAllUsers).toHaveBeenCalledWith(fakeDb);
    expect(out).toHaveLength(2);
  });

  // --- Job operations ---
  it('saveJob delegates with markDirty true', async () => {
    const job = { id: 'j1' } as never;
    await LocalDatabase.saveJob(job, true);
    expect(mockJobStore.saveJob).toHaveBeenCalledWith(fakeDb, job, true);
  });

  it('saveJob defaults markDirty to false', async () => {
    const job = { id: 'j1' } as never;
    await LocalDatabase.saveJob(job);
    expect(mockJobStore.saveJob).toHaveBeenCalledWith(fakeDb, job, false);
  });

  it('getJob delegates and returns result', async () => {
    mockJobStore.getJob.mockResolvedValue({ id: 'j1' });
    const out = await LocalDatabase.getJob('j1');
    expect(mockJobStore.getJob).toHaveBeenCalledWith(fakeDb, 'j1');
    expect(out).toEqual({ id: 'j1' });
  });

  it('getJobsByHomeowner delegates', async () => {
    mockJobStore.getJobsByHomeowner.mockResolvedValue([{ id: 'j1' }]);
    const out = await LocalDatabase.getJobsByHomeowner('home-1');
    expect(mockJobStore.getJobsByHomeowner).toHaveBeenCalledWith(
      fakeDb,
      'home-1'
    );
    expect(out).toHaveLength(1);
  });

  it('getJobsByStatus delegates with status + userId', async () => {
    mockJobStore.getJobsByStatus.mockResolvedValue([{ id: 'j1' }]);
    const out = await LocalDatabase.getJobsByStatus('posted', 'user-1');
    expect(mockJobStore.getJobsByStatus).toHaveBeenCalledWith(
      fakeDb,
      'posted',
      'user-1'
    );
    expect(out).toHaveLength(1);
  });

  it('getJobsByStatus delegates with status only (userId undefined)', async () => {
    mockJobStore.getJobsByStatus.mockResolvedValue([]);
    await LocalDatabase.getJobsByStatus('completed');
    expect(mockJobStore.getJobsByStatus).toHaveBeenCalledWith(
      fakeDb,
      'completed',
      undefined
    );
  });

  // --- Message operations ---
  it('saveMessage delegates with markDirty true', async () => {
    const message = { id: 'm1' } as never;
    await LocalDatabase.saveMessage(message, true);
    expect(mockMessageStore.saveMessage).toHaveBeenCalledWith(
      fakeDb,
      message,
      true
    );
  });

  it('saveMessage defaults markDirty to false', async () => {
    const message = { id: 'm1' } as never;
    await LocalDatabase.saveMessage(message);
    expect(mockMessageStore.saveMessage).toHaveBeenCalledWith(
      fakeDb,
      message,
      false
    );
  });

  it('getMessagesByJob delegates with explicit limit', async () => {
    mockMessageStore.getMessagesByJob.mockResolvedValue([{ id: 'm1' }]);
    const out = await LocalDatabase.getMessagesByJob('job-1', 10);
    expect(mockMessageStore.getMessagesByJob).toHaveBeenCalledWith(
      fakeDb,
      'job-1',
      10
    );
    expect(out).toHaveLength(1);
  });

  it('getMessagesByJob defaults limit to 50', async () => {
    mockMessageStore.getMessagesByJob.mockResolvedValue([]);
    await LocalDatabase.getMessagesByJob('job-1');
    expect(mockMessageStore.getMessagesByJob).toHaveBeenCalledWith(
      fakeDb,
      'job-1',
      50
    );
  });

  // --- Sync operations ---
  it('getDirtyRecords delegates with table', async () => {
    mockSyncStore.getDirtyRecords.mockResolvedValue([{ id: 'u1' }]);
    const out = await LocalDatabase.getDirtyRecords('users');
    expect(mockSyncStore.getDirtyRecords).toHaveBeenCalledWith(fakeDb, 'users');
    expect(out).toHaveLength(1);
  });

  it('markRecordSynced delegates with table + id', async () => {
    await LocalDatabase.markRecordSynced('jobs', 'j1');
    expect(mockSyncStore.markRecordSynced).toHaveBeenCalledWith(
      fakeDb,
      'jobs',
      'j1'
    );
  });

  it('getSyncMetadata delegates and returns metadata', async () => {
    const meta = { tableName: 'jobs', lastSyncTimestamp: 1 };
    mockSyncStore.getSyncMetadata.mockResolvedValue(meta);
    const out = await LocalDatabase.getSyncMetadata('jobs');
    expect(mockSyncStore.getSyncMetadata).toHaveBeenCalledWith(fakeDb, 'jobs');
    expect(out).toBe(meta);
  });

  it('getSyncMetadata returns null passthrough', async () => {
    mockSyncStore.getSyncMetadata.mockResolvedValue(null);
    expect(await LocalDatabase.getSyncMetadata('jobs')).toBeNull();
  });

  it('updateSyncMetadata delegates with metadata', async () => {
    const meta = {
      tableName: 'jobs',
      lastSyncTimestamp: 5,
      recordCount: 3,
      isDirty: false,
    } as never;
    await LocalDatabase.updateSyncMetadata(meta);
    expect(mockSyncStore.updateSyncMetadata).toHaveBeenCalledWith(fakeDb, meta);
  });

  it('queueOfflineAction delegates with the action object', async () => {
    const action = {
      id: 'a1',
      type: 'create',
      entity: 'jobs',
      data: { foo: 'bar' },
      maxRetries: 3,
      queryKey: ['jobs'],
    };
    await LocalDatabase.queueOfflineAction(action);
    expect(mockSyncStore.queueOfflineAction).toHaveBeenCalledWith(
      fakeDb,
      action
    );
  });

  it('getOfflineActions delegates and returns rows', async () => {
    mockSyncStore.getOfflineActions.mockResolvedValue([{ id: 'a1' }]);
    const out = await LocalDatabase.getOfflineActions();
    expect(mockSyncStore.getOfflineActions).toHaveBeenCalledWith(fakeDb);
    expect(out).toHaveLength(1);
  });

  it('removeOfflineAction delegates with id', async () => {
    await LocalDatabase.removeOfflineAction('a1');
    expect(mockSyncStore.removeOfflineAction).toHaveBeenCalledWith(
      fakeDb,
      'a1'
    );
  });

  it('bumpOfflineActionRetry delegates and returns the retry envelope', async () => {
    mockSyncStore.bumpOfflineActionRetry.mockResolvedValue({
      retryCount: 2,
      maxRetries: 3,
    });
    const out = await LocalDatabase.bumpOfflineActionRetry('a1');
    expect(mockSyncStore.bumpOfflineActionRetry).toHaveBeenCalledWith(
      fakeDb,
      'a1'
    );
    expect(out).toEqual({ retryCount: 2, maxRetries: 3 });
  });

  it('bumpOfflineActionRetry returns null passthrough', async () => {
    mockSyncStore.bumpOfflineActionRetry.mockResolvedValue(null);
    expect(await LocalDatabase.bumpOfflineActionRetry('missing')).toBeNull();
  });

  it('clearAllData delegates', async () => {
    await LocalDatabase.clearAllData();
    expect(mockSyncStore.clearAllData).toHaveBeenCalledWith(fakeDb);
  });

  it('getStorageInfo delegates and returns the info object', async () => {
    const info = { totalRecords: 10, dirtyRecords: 2, pendingActions: 1 };
    mockSyncStore.getStorageInfo.mockResolvedValue(info);
    const out = await LocalDatabase.getStorageInfo();
    expect(mockSyncStore.getStorageInfo).toHaveBeenCalledWith(fakeDb);
    expect(out).toBe(info);
  });
});

// -------------------------------------------------------------------------
// close
// -------------------------------------------------------------------------

describe('close', () => {
  it('closes the db, nulls state, and logs when a connection exists', async () => {
    await LocalDatabase.init();
    expect(svc.db).toBe(fakeDb);

    await LocalDatabase.close();

    expect(fakeDb.closeAsync).toHaveBeenCalledTimes(1);
    expect(svc.db).toBeNull();
    expect(svc.isInitialized).toBe(false);
    expect(logger.info).toHaveBeenCalledWith(
      'Local database connection closed'
    );
  });

  it('is a no-op when there is no open connection', async () => {
    // never initialized
    await LocalDatabase.close();
    expect(fakeDb.closeAsync).not.toHaveBeenCalled();
    expect(logger.info).not.toHaveBeenCalledWith(
      'Local database connection closed'
    );
  });
});
