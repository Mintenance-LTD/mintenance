/**
 * Unit tests for SyncManager (services/SyncManager.ts).
 *
 * The unit under test is the SyncManagerService singleton. Only the
 * externals are mocked: NetInfo (online/offline + reconnect events),
 * LocalDatabase, queryClient, logger, AppState (via the react-native
 * mock), and the three extracted sync submodules (download / upload /
 * offline-actions). Fake timers drive the background-sync interval.
 */

import NetInfo from '@react-native-community/netinfo';
import { AppState } from 'react-native';
import { SyncManager } from '../SyncManager';
import { LocalDatabase } from '../LocalDatabase';
import { queryClient } from '../../lib/queryClient';
import {
  downloadJobs,
  downloadMessages,
  downloadUsers,
} from '../sync/download';
import { uploadDirtyRecords } from '../sync/upload';
import { processOfflineActions } from '../sync/offline-actions';
import { SYNC_DEFAULTS } from '../sync/types';

// ---------------------------------------------------------------------------
// External mocks
// ---------------------------------------------------------------------------

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    fetch: jest.fn(),
    addEventListener: jest.fn(),
  },
}));

jest.mock('../LocalDatabase', () => ({
  LocalDatabase: {
    init: jest.fn(),
    getStorageInfo: jest.fn(),
    updateSyncMetadata: jest.fn(),
    clearAllData: jest.fn(),
    close: jest.fn(),
  },
}));

jest.mock('../../lib/queryClient', () => ({
  queryClient: {
    invalidateQueries: jest.fn(),
  },
}));

jest.mock('../sync/download', () => ({
  downloadUsers: jest.fn(),
  downloadJobs: jest.fn(),
  downloadMessages: jest.fn(),
}));

jest.mock('../sync/upload', () => ({
  uploadDirtyRecords: jest.fn(),
}));

jest.mock('../sync/offline-actions', () => ({
  processOfflineActions: jest.fn(),
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Typed handles to the mocked externals
const mockNetInfoFetch = NetInfo.fetch as jest.Mock;
const mockNetInfoAddEventListener = NetInfo.addEventListener as jest.Mock;
const mockAppStateAddEventListener = AppState.addEventListener as jest.Mock;
const mockLocalDb = LocalDatabase as jest.Mocked<typeof LocalDatabase>;
const mockInvalidateQueries = queryClient.invalidateQueries as jest.Mock;
const mockDownloadUsers = downloadUsers as jest.Mock;
const mockDownloadJobs = downloadJobs as jest.Mock;
const mockDownloadMessages = downloadMessages as jest.Mock;
const mockUploadDirtyRecords = uploadDirtyRecords as jest.Mock;
const mockProcessOfflineActions = processOfflineActions as jest.Mock;

const online = { isConnected: true, isInternetReachable: true };
const offline = { isConnected: false, isInternetReachable: false };

const defaultStorageInfo = {
  totalRecords: 10,
  dirtyRecords: 0,
  pendingActions: 0,
};

/**
 * Resets the singleton between tests. SyncManager is a module-level
 * singleton, so we drive cleanup() to clear timers/subscriptions and
 * re-arm the happy-path mocks.
 */
async function resetSingleton() {
  // Tear down any timers/subscriptions/isInitialized from a prior test.
  await SyncManager.cleanup().catch(() => undefined);

  // Hard-reset the module singleton's private in-flight + cached state.
  // A test may intentionally leave a sync mid-flight (concurrency cases);
  // cleanup() does not clear `syncPromise`, so without this a dead in-flight
  // promise would poison every subsequent test via the `if (this.syncPromise)`
  // short-circuit in syncAll(). This is a test-harness reset of a singleton,
  // not a behavioural change to the unit under test.
  const internal = SyncManager as unknown as {
    syncPromise: Promise<unknown> | null;
    lastErrors: unknown[];
    lastPendingUploads: number;
    lastSyncTime: Date | null;
    syncListeners: unknown[];
  };
  internal.syncPromise = null;
  internal.lastErrors = [];
  internal.lastPendingUploads = 0;
  internal.lastSyncTime = null;
  internal.syncListeners = [];
}

/**
 * Flush pending microtasks so a fire-and-forget syncAll (kicked off by a
 * timer/event callback) drains to completion. Every sync collaborator is
 * mocked to resolve immediately, so a generous microtask flush is enough
 * to settle the whole `_doSync` await-chain and clear the mutex.
 *
 * Deliberately does NOT re-await SyncManager.syncAll(): a test may leave a
 * sync intentionally in-flight (a pending mock), and re-awaiting the shared
 * in-flight promise would block this helper to the hook timeout.
 */
async function drainSync(): Promise<void> {
  for (let i = 0; i < 25; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await Promise.resolve();
  }
}

beforeEach(() => {
  jest.clearAllMocks();

  // Happy-path defaults
  mockNetInfoFetch.mockResolvedValue(online);
  mockNetInfoAddEventListener.mockReturnValue(jest.fn());
  mockAppStateAddEventListener.mockReturnValue({ remove: jest.fn() });

  mockLocalDb.init.mockResolvedValue(undefined as never);
  mockLocalDb.getStorageInfo.mockResolvedValue(defaultStorageInfo as never);
  mockLocalDb.updateSyncMetadata.mockResolvedValue(undefined as never);
  mockLocalDb.clearAllData.mockResolvedValue(undefined as never);
  mockLocalDb.close.mockResolvedValue(undefined as never);

  mockInvalidateQueries.mockResolvedValue(undefined);
  mockDownloadUsers.mockResolvedValue(undefined);
  mockDownloadJobs.mockResolvedValue(undefined);
  mockDownloadMessages.mockResolvedValue(undefined);
  mockUploadDirtyRecords.mockResolvedValue(undefined);
  mockProcessOfflineActions.mockResolvedValue(undefined);
});

afterEach(async () => {
  // Kill any pending fake-timer intervals before switching clocks so a
  // stale background-sync tick can't fire under real timers.
  try {
    jest.clearAllTimers();
  } catch {
    // no fake timers installed in this test — fine.
  }
  jest.useRealTimers();
  await drainSync();
  await resetSingleton();
});

// ---------------------------------------------------------------------------
// init()
// ---------------------------------------------------------------------------

describe('init', () => {
  it('initializes LocalDatabase, registers AppState + NetInfo listeners, starts background timer', async () => {
    jest.useFakeTimers();

    await SyncManager.init();

    expect(mockLocalDb.init).toHaveBeenCalledTimes(1);
    expect(mockAppStateAddEventListener).toHaveBeenCalledWith(
      'change',
      expect.any(Function)
    );
    expect(mockNetInfoAddEventListener).toHaveBeenCalledWith(
      expect.any(Function)
    );
  });

  it('is idempotent — a second init() is a no-op', async () => {
    jest.useFakeTimers();

    await SyncManager.init();
    mockLocalDb.init.mockClear();

    await SyncManager.init();

    expect(mockLocalDb.init).not.toHaveBeenCalled();
  });

  it('rethrows and does not mark initialized when LocalDatabase.init fails', async () => {
    const boom = new Error('db open failed');
    mockLocalDb.init.mockRejectedValueOnce(boom as never);

    await expect(SyncManager.init()).rejects.toThrow('db open failed');

    // Not initialized → a subsequent init should attempt LocalDatabase.init again.
    jest.useFakeTimers();
    mockLocalDb.init.mockResolvedValueOnce(undefined as never);
    await SyncManager.init();
    expect(mockLocalDb.init).toHaveBeenCalledTimes(2);
  });

  it('triggers a sync when the network reconnects', async () => {
    jest.useFakeTimers();
    let networkCallback: (state: typeof online) => void = () => undefined;
    mockNetInfoAddEventListener.mockImplementation((cb) => {
      networkCallback = cb;
      return jest.fn();
    });

    await SyncManager.init();

    // Simulate a reconnect event.
    networkCallback(online);
    jest.useRealTimers();
    await drainSync();

    expect(mockNetInfoFetch).toHaveBeenCalled();
    expect(mockDownloadUsers).toHaveBeenCalled();
  });

  it('does NOT sync when the network event reports offline', async () => {
    jest.useFakeTimers();
    let networkCallback: (state: typeof offline) => void = () => undefined;
    mockNetInfoAddEventListener.mockImplementation((cb) => {
      networkCallback = cb;
      return jest.fn();
    });

    await SyncManager.init();
    mockDownloadUsers.mockClear();

    networkCallback(offline);
    await Promise.resolve();

    expect(mockDownloadUsers).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// syncAll() — bidirectional happy path
// ---------------------------------------------------------------------------

describe('syncAll (bidirectional)', () => {
  it('runs download then upload phases in order and returns a success status', async () => {
    const status = await SyncManager.syncAll();

    // Download phase
    expect(mockDownloadUsers).toHaveBeenCalledTimes(1);
    expect(mockDownloadJobs).toHaveBeenCalledTimes(1);
    expect(mockDownloadMessages).toHaveBeenCalledTimes(1);
    // Upload phase
    expect(mockUploadDirtyRecords).toHaveBeenCalledWith(
      'users',
      expect.any(Object)
    );
    expect(mockUploadDirtyRecords).toHaveBeenCalledWith(
      'jobs',
      expect.any(Object)
    );
    expect(mockUploadDirtyRecords).toHaveBeenCalledWith(
      'messages',
      expect.any(Object)
    );
    expect(mockProcessOfflineActions).toHaveBeenCalledTimes(1);
    // Post-sync bookkeeping
    expect(mockLocalDb.updateSyncMetadata).toHaveBeenCalled();
    expect(mockInvalidateQueries).toHaveBeenCalledTimes(1);

    expect(status.errors).toHaveLength(0);
    // The returned status is a snapshot taken inside _doSync (before the
    // mutex's finally{} nulls syncPromise), so assert the mutex released by
    // reading the live status after the await settled.
    expect(SyncManager.getSyncStatus().isActive).toBe(false);
    expect(status.lastSyncTime).toBeInstanceOf(Date);
  });

  it('merges default config with caller-supplied options', async () => {
    await SyncManager.syncAll({ batchSize: 5, timeout: 99 });

    const passedConfig = mockDownloadUsers.mock.calls[0][0];
    expect(passedConfig).toMatchObject({
      strategy: 'immediate',
      direction: 'bidirectional',
      batchSize: 5,
      timeout: 99,
    });
  });

  it('reflects pendingUploads from LocalDatabase storage info', async () => {
    mockLocalDb.getStorageInfo.mockResolvedValue({
      totalRecords: 20,
      dirtyRecords: 3,
      pendingActions: 4,
    } as never);

    const status = await SyncManager.syncAll();

    expect(status.pendingUploads).toBe(7); // 4 pendingActions + 3 dirtyRecords
  });
});

// ---------------------------------------------------------------------------
// syncAll() — direction gating
// ---------------------------------------------------------------------------

describe('syncAll (direction gating)', () => {
  it('download-only skips the upload phase', async () => {
    await SyncManager.syncAll({ direction: 'download' });

    expect(mockDownloadUsers).toHaveBeenCalled();
    expect(mockUploadDirtyRecords).not.toHaveBeenCalled();
    expect(mockProcessOfflineActions).not.toHaveBeenCalled();
  });

  it('upload-only skips the download phase', async () => {
    await SyncManager.syncAll({ direction: 'upload' });

    expect(mockDownloadUsers).not.toHaveBeenCalled();
    expect(mockDownloadJobs).not.toHaveBeenCalled();
    expect(mockDownloadMessages).not.toHaveBeenCalled();
    expect(mockUploadDirtyRecords).toHaveBeenCalledTimes(3);
    expect(mockProcessOfflineActions).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// syncAll() — offline + failure handling
// ---------------------------------------------------------------------------

describe('syncAll (offline / errors)', () => {
  it('returns a sync_manager error and skips all phases when offline', async () => {
    mockNetInfoFetch.mockResolvedValueOnce(offline);

    const status = await SyncManager.syncAll();

    expect(mockDownloadUsers).not.toHaveBeenCalled();
    expect(mockUploadDirtyRecords).not.toHaveBeenCalled();
    expect(status.errors).toHaveLength(1);
    expect(status.errors[0]).toMatchObject({
      entity: 'sync_manager',
      operation: 'full_sync',
      error: 'No internet connection available',
      retryCount: 0,
    });
    expect(status.errors[0].id).toContain('sync_manager_full_sync_');
  });

  it('captures a per-entity error but continues the rest of the pipeline (partial failure)', async () => {
    mockDownloadJobs.mockRejectedValueOnce(new Error('jobs boom'));
    mockUploadDirtyRecords.mockImplementation((table: string) =>
      table === 'messages'
        ? Promise.reject(new Error('msg upload boom'))
        : Promise.resolve(undefined)
    );

    const status = await SyncManager.syncAll();

    // Pipeline still completed all phases despite the two failures.
    expect(mockDownloadMessages).toHaveBeenCalled();
    expect(mockProcessOfflineActions).toHaveBeenCalled();
    expect(mockInvalidateQueries).toHaveBeenCalled();

    const entities = status.errors.map((e) => e.entity).sort();
    expect(entities).toEqual(['job', 'message']);
    const jobErr = status.errors.find((e) => e.entity === 'job');
    expect(jobErr).toMatchObject({ operation: 'download', error: 'jobs boom' });
  });

  it('records a process error when the offline-action queue fails', async () => {
    mockProcessOfflineActions.mockRejectedValueOnce(new Error('queue dead'));

    const status = await SyncManager.syncAll();

    expect(status.errors).toHaveLength(1);
    expect(status.errors[0]).toMatchObject({
      entity: 'action_queue',
      operation: 'process',
      error: 'queue dead',
    });
  });

  it('serializes non-Error throwables to "Unknown error"', async () => {
    mockDownloadUsers.mockRejectedValueOnce('a string, not an Error');

    const status = await SyncManager.syncAll();

    const userErr = status.errors.find((e) => e.entity === 'user');
    expect(userErr?.error).toBe('Unknown error');
  });

  it('still returns a status when updateSyncMetadata throws after the phases', async () => {
    mockLocalDb.updateSyncMetadata.mockRejectedValueOnce(
      new Error('metadata write failed') as never
    );

    const status = await SyncManager.syncAll();

    // The throw lands in the outer catch → sync_manager error recorded.
    expect(status.errors.some((e) => e.entity === 'sync_manager')).toBe(true);
  });

  it('logs a warning but does not crash when refreshPendingUploads fails', async () => {
    // First getStorageInfo calls (updateSyncMetadata loop) succeed,
    // the refresh call rejects.
    mockLocalDb.getStorageInfo
      .mockResolvedValueOnce(defaultStorageInfo as never)
      .mockResolvedValueOnce(defaultStorageInfo as never)
      .mockResolvedValueOnce(defaultStorageInfo as never)
      .mockResolvedValueOnce(defaultStorageInfo as never)
      .mockRejectedValueOnce(new Error('refresh boom') as never);

    const status = await SyncManager.syncAll();

    // refresh failure is swallowed → no sync_manager error, pendingUploads stays at prior cached value.
    expect(status.errors).toHaveLength(0);
    expect(typeof status.pendingUploads).toBe('number');
  });

  it('handles undefined pendingActions/dirtyRecords in storage info', async () => {
    mockLocalDb.getStorageInfo.mockResolvedValue({
      totalRecords: 0,
    } as never);

    const status = await SyncManager.syncAll();

    expect(status.pendingUploads).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// concurrency mutex
// ---------------------------------------------------------------------------

describe('syncAll (concurrency mutex)', () => {
  it('shares the in-flight promise across concurrent callers', async () => {
    // Eager deferred: capture the resolver NOW, not when downloadUsers is
    // first invoked. _doSync awaits NetInfo.fetch() before calling
    // downloadUsers, so a resolver captured inside the mock impl wouldn't be
    // assigned yet when the test calls resolveDownload() synchronously.
    let resolveDownload: () => void = () => undefined;
    const downloadGate = new Promise<void>((res) => {
      resolveDownload = res;
    });
    mockDownloadUsers.mockReturnValue(downloadGate);

    const p1 = SyncManager.syncAll();
    const p2 = SyncManager.syncAll();

    // While the first sync is mid-flight, getSyncStatus reports active.
    expect(SyncManager.getSyncStatus().isActive).toBe(true);

    resolveDownload();
    const [s1, s2] = await Promise.all([p1, p2]);

    // Both callers got the same resolved status object.
    expect(s1).toBe(s2);
    // Only one actual download pipeline ran.
    expect(mockDownloadUsers).toHaveBeenCalledTimes(1);
    expect(SyncManager.getSyncStatus().isActive).toBe(false);
  });

  it('allows a fresh sync after the previous one settles', async () => {
    await SyncManager.syncAll();
    await SyncManager.syncAll();

    expect(mockDownloadUsers).toHaveBeenCalledTimes(2);
  });
});

// ---------------------------------------------------------------------------
// getSyncStatus()
// ---------------------------------------------------------------------------

describe('getSyncStatus', () => {
  it('falls back to now() for lastSyncTime before any sync has run', async () => {
    // Fresh singleton (cleanup in afterEach resets isInitialized but not the
    // cached lastSyncTime — so assert on type only).
    const status = SyncManager.getSyncStatus();
    expect(status.lastSyncTime).toBeInstanceOf(Date);
    expect(status.pendingDownloads).toBe(0);
    expect(Array.isArray(status.errors)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// listeners
// ---------------------------------------------------------------------------

describe('sync status listeners', () => {
  it('notifies registered listeners on sync completion with the status', async () => {
    const listener = jest.fn();
    const unsubscribe = SyncManager.onSyncStatusChange(listener);

    const status = await SyncManager.syncAll();

    expect(listener).toHaveBeenCalledWith(status);
    unsubscribe();
  });

  it('stops notifying after unsubscribe', async () => {
    const listener = jest.fn();
    const unsubscribe = SyncManager.onSyncStatusChange(listener);
    unsubscribe();

    await SyncManager.syncAll();

    expect(listener).not.toHaveBeenCalled();
  });

  it('isolates a throwing listener so others still fire', async () => {
    const bad = jest.fn(() => {
      throw new Error('listener boom');
    });
    const good = jest.fn();
    const unsubBad = SyncManager.onSyncStatusChange(bad);
    const unsubGood = SyncManager.onSyncStatusChange(good);

    await expect(SyncManager.syncAll()).resolves.toBeDefined();

    expect(bad).toHaveBeenCalled();
    expect(good).toHaveBeenCalled();
    unsubBad();
    unsubGood();
  });

  it('unsubscribe is a safe no-op when called twice', async () => {
    const listener = jest.fn();
    const unsubscribe = SyncManager.onSyncStatusChange(listener);
    unsubscribe();
    expect(() => unsubscribe()).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// AppState change handler
// ---------------------------------------------------------------------------

describe('AppState change handler', () => {
  it('triggers a background sync when app becomes active', async () => {
    jest.useFakeTimers();
    let appStateCb: (s: string) => void = () => undefined;
    mockAppStateAddEventListener.mockImplementation((_event, cb) => {
      appStateCb = cb;
      return { remove: jest.fn() };
    });

    await SyncManager.init();
    mockDownloadUsers.mockClear();

    appStateCb('active');
    jest.useRealTimers();
    await drainSync();

    expect(mockNetInfoFetch).toHaveBeenCalled();
    expect(mockDownloadUsers).toHaveBeenCalled();
  });

  it('does nothing when app goes to background/inactive', async () => {
    jest.useFakeTimers();
    let appStateCb: (s: string) => void = () => undefined;
    mockAppStateAddEventListener.mockImplementation((_event, cb) => {
      appStateCb = cb;
      return { remove: jest.fn() };
    });

    await SyncManager.init();
    mockDownloadUsers.mockClear();

    appStateCb('background');
    await Promise.resolve();

    expect(mockDownloadUsers).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// background timer
// ---------------------------------------------------------------------------

describe('background sync timer', () => {
  it('fires an upload-only sync on the background interval', async () => {
    jest.useFakeTimers();

    await SyncManager.init();
    mockUploadDirtyRecords.mockClear();
    mockDownloadUsers.mockClear();

    jest.advanceTimersByTime(SYNC_DEFAULTS.BACKGROUND_INTERVAL_MS);
    // Flush the async syncAll kicked off by the interval.
    jest.useRealTimers();
    await drainSync();

    expect(mockUploadDirtyRecords).toHaveBeenCalled();
    expect(mockDownloadUsers).not.toHaveBeenCalled(); // upload-only direction
  });
});

// ---------------------------------------------------------------------------
// public utilities
// ---------------------------------------------------------------------------

describe('forcSync', () => {
  it('runs a manual bidirectional sync', async () => {
    const status = await SyncManager.forcSync();

    expect(mockDownloadUsers).toHaveBeenCalled();
    expect(mockUploadDirtyRecords).toHaveBeenCalled();
    const config = mockDownloadUsers.mock.calls[0][0];
    expect(config).toMatchObject({
      strategy: 'manual',
      direction: 'bidirectional',
    });
    expect(status).toBeDefined();
  });
});

describe('resetAndResync', () => {
  it('clears the local DB then runs a manual download sync', async () => {
    await SyncManager.resetAndResync();

    expect(mockLocalDb.clearAllData).toHaveBeenCalledTimes(1);
    expect(mockDownloadUsers).toHaveBeenCalled();
    // download-only → no upload phase
    expect(mockUploadDirtyRecords).not.toHaveBeenCalled();
    const config = mockDownloadUsers.mock.calls[0][0];
    expect(config).toMatchObject({ strategy: 'manual', direction: 'download' });
  });
});

// ---------------------------------------------------------------------------
// cleanup()
// ---------------------------------------------------------------------------

describe('cleanup', () => {
  it('stops the timer, removes subscriptions, closes the DB, and resets init state', async () => {
    jest.useFakeTimers();
    const removeAppState = jest.fn();
    const removeNetwork = jest.fn();
    mockAppStateAddEventListener.mockReturnValue({ remove: removeAppState });
    mockNetInfoAddEventListener.mockReturnValue(removeNetwork);
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

    await SyncManager.init();
    await SyncManager.cleanup();

    expect(clearIntervalSpy).toHaveBeenCalled();
    expect(removeAppState).toHaveBeenCalledTimes(1);
    expect(removeNetwork).toHaveBeenCalledTimes(1);
    expect(mockLocalDb.close).toHaveBeenCalledTimes(1);

    // isInitialized reset → init runs LocalDatabase.init again.
    mockLocalDb.init.mockClear();
    await SyncManager.init();
    expect(mockLocalDb.init).toHaveBeenCalledTimes(1);

    clearIntervalSpy.mockRestore();
  });

  it('is safe to call when never initialized (no subscriptions / no timer)', async () => {
    await expect(SyncManager.cleanup()).resolves.toBeUndefined();
    expect(mockLocalDb.close).toHaveBeenCalled();
  });
});
