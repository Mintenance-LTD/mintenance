import { ConflictManager } from '../ConflictManager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../../../utils/logger';
import type {
  OfflineAction,
  DataConflict,
  ConflictResolutionStrategy,
} from '../types';
import type { EntityVersionTracker } from '../EntityVersionTracker';
import type { DataMerger } from '../DataMerger';

// ---- Externals mocked: logger, AsyncStorage, JobService, UserService ----
jest.mock('../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
}));

// fetchServerData uses require('../JobService') and require('../UserService')
const mockGetJobById = jest.fn();
const mockGetUserProfile = jest.fn();
jest.mock(
  '../../JobService',
  () => ({
    JobService: { getJobById: (...a: unknown[]) => mockGetJobById(...a) },
  }),
  { virtual: true }
);
jest.mock(
  '../../UserService',
  () => ({
    UserService: {
      getUserProfile: (...a: unknown[]) => mockGetUserProfile(...a),
    },
  }),
  { virtual: true }
);

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const QUEUE_KEY = 'CONFLICT_QUEUE';

// ---- Test doubles for collaborators (NOT the unit under test) ----
let versionTracker: jest.Mocked<Pick<EntityVersionTracker, 'getEntityVersion'>>;
let dataMerger: jest.Mocked<
  Pick<DataMerger, 'mergeJobData' | 'mergeBidData' | 'mergeProfileData'>
>;
let queueAction: jest.Mock;
let manager: ConflictManager;

function makeManager() {
  versionTracker = {
    getEntityVersion: jest.fn().mockResolvedValue(1),
  } as unknown as jest.Mocked<Pick<EntityVersionTracker, 'getEntityVersion'>>;
  dataMerger = {
    mergeJobData: jest.fn((c) => ({ merged: 'job', ...(c as object) })),
    mergeBidData: jest.fn((c) => ({ merged: 'bid', ...(c as object) })),
    mergeProfileData: jest.fn((c) => ({ merged: 'profile', ...(c as object) })),
  } as unknown as jest.Mocked<
    Pick<DataMerger, 'mergeJobData' | 'mergeBidData' | 'mergeProfileData'>
  >;
  queueAction = jest.fn().mockResolvedValue('queued-id');
  return new ConflictManager(
    versionTracker as unknown as EntityVersionTracker,
    dataMerger as unknown as DataMerger,
    queueAction as unknown as (
      action: Omit<OfflineAction, 'id' | 'timestamp' | 'retryCount'>
    ) => Promise<string>
  );
}

function makeAction(over: Partial<OfflineAction> = {}): OfflineAction {
  return {
    id: 'action-1',
    type: 'UPDATE',
    entity: 'job',
    data: { title: 'client title' },
    timestamp: 1000,
    retryCount: 0,
    maxRetries: 3,
    entityId: 'entity-1',
    version: 5,
    baseVersion: 1,
    ...over,
  };
}

function makeConflict(over: Partial<DataConflict> = {}): DataConflict {
  return {
    id: 'conflict-1',
    actionId: 'action-1',
    entity: 'job',
    entityId: 'entity-1',
    clientVersion: 5,
    serverVersion: 2,
    clientData: { title: 'client' },
    serverData: { title: 'server' },
    clientTimestamp: 2000,
    serverTimestamp: 1000,
    detectedAt: 3000,
    strategy: 'last-write-wins',
    resolved: false,
    ...over,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockAsyncStorage.getItem.mockResolvedValue(null);
  mockAsyncStorage.setItem.mockResolvedValue(undefined);
  manager = makeManager();
});

// ===================================================================
// getDefaultStrategy
// ===================================================================
describe('getDefaultStrategy', () => {
  it.each<[string, OfflineAction['type'], ConflictResolutionStrategy]>([
    ['payment', 'UPDATE', 'server-wins'],
    ['escrow', 'UPDATE', 'server-wins'],
    ['profile', 'UPDATE', 'client-wins'],
    ['profile', 'CREATE', 'last-write-wins'], // profile non-UPDATE falls through
    ['message', 'UPDATE', 'last-write-wins'],
    ['job', 'UPDATE', 'merge'],
    ['bid', 'UPDATE', 'merge'],
    ['unknown', 'UPDATE', 'last-write-wins'],
  ])('entity=%s type=%s => %s', (entity, type, expected) => {
    expect(manager.getDefaultStrategy(entity, type)).toBe(expected);
  });
});

// ===================================================================
// detectConflict
// ===================================================================
describe('detectConflict', () => {
  it('returns null for non-UPDATE actions', async () => {
    const r = await manager.detectConflict(makeAction({ type: 'CREATE' }));
    expect(r).toBeNull();
    expect(mockGetJobById).not.toHaveBeenCalled();
  });

  it('returns null when entityId is missing', async () => {
    const r = await manager.detectConflict(makeAction({ entityId: undefined }));
    expect(r).toBeNull();
  });

  it('returns null when server returns no data', async () => {
    mockGetJobById.mockResolvedValue(null);
    const r = await manager.detectConflict(makeAction());
    expect(r).toBeNull();
  });

  it('returns null when server has no version field', async () => {
    mockGetJobById.mockResolvedValue({ id: 'entity-1' });
    const r = await manager.detectConflict(makeAction());
    expect(r).toBeNull();
  });

  it('returns null when server version <= baseVersion', async () => {
    mockGetJobById.mockResolvedValue({ id: 'entity-1', version: 1 });
    const r = await manager.detectConflict(makeAction({ baseVersion: 1 }));
    expect(r).toBeNull();
  });

  it('detects a conflict and builds the full record (with updatedAt)', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(9999);
    mockGetJobById.mockResolvedValue({
      id: 'entity-1',
      version: 7,
      updatedAt: '2023-01-01T00:00:00.000Z',
    });
    const action = makeAction({ baseVersion: 2, version: 5, timestamp: 555 });
    const c = await manager.detectConflict(action);
    expect(c).not.toBeNull();
    expect(c!.actionId).toBe('action-1');
    expect(c!.entity).toBe('job');
    expect(c!.entityId).toBe('entity-1');
    expect(c!.clientVersion).toBe(5); // action.version
    expect(c!.serverVersion).toBe(7);
    expect(c!.clientData).toEqual({ title: 'client title' });
    expect(c!.clientTimestamp).toBe(555);
    expect(c!.serverTimestamp).toBe(
      new Date('2023-01-01T00:00:00.000Z').getTime()
    );
    expect(c!.detectedAt).toBe(9999);
    expect(c!.strategy).toBe('merge'); // default for job
    expect(c!.resolved).toBe(false);
    expect(c!.id).toContain('conflict_9999_');
    expect(logger.warn).toHaveBeenCalledWith(
      'Conflict detected',
      expect.objectContaining({ entity: 'job', serverVersion: 7 })
    );
    (Date.now as jest.Mock).mockRestore();
  });

  it('uses currentVersion when action.version is absent and updated_at fallback', async () => {
    (versionTracker.getEntityVersion as jest.Mock).mockResolvedValue(42);
    mockGetJobById.mockResolvedValue({
      id: 'entity-1',
      version: 3,
      updated_at: '2022-06-01T00:00:00.000Z',
    });
    const c = await manager.detectConflict(
      makeAction({ version: undefined, baseVersion: 0 })
    );
    expect(c!.clientVersion).toBe(42);
    expect(c!.serverTimestamp).toBe(
      new Date('2022-06-01T00:00:00.000Z').getTime()
    );
  });

  it('uses action.strategy override when supplied', async () => {
    mockGetJobById.mockResolvedValue({ id: 'entity-1', version: 9 });
    const c = await manager.detectConflict(
      makeAction({ strategy: 'manual', baseVersion: 0 })
    );
    expect(c!.strategy).toBe('manual');
  });

  it('falls back to Date.now for serverTimestamp when no timestamps present', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(123456);
    mockGetJobById.mockResolvedValue({ id: 'entity-1', version: 9 });
    const c = await manager.detectConflict(makeAction({ baseVersion: 0 }));
    expect(c!.serverTimestamp).toBe(123456);
    (Date.now as jest.Mock).mockRestore();
  });

  it('returns null and logs on thrown error', async () => {
    mockGetJobById.mockRejectedValue(new Error('boom'));
    // version tracker resolves fine; the throw is inside fetchServerData's
    // own try/catch which returns null -> detectConflict returns null without
    // hitting the outer catch. Force outer catch via versionTracker throw.
    (versionTracker.getEntityVersion as jest.Mock).mockRejectedValue(
      new Error('vt fail')
    );
    mockGetJobById.mockResolvedValue({ id: 'entity-1', version: 9 });
    const r = await manager.detectConflict(makeAction({ baseVersion: 0 }));
    expect(r).toBeNull();
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to detect conflict:',
      expect.any(Error)
    );
  });
});

// ===================================================================
// fetchServerData (exercised via detectConflict)
// ===================================================================
describe('fetchServerData (via detectConflict)', () => {
  it('job entity calls JobService.getJobById', async () => {
    mockGetJobById.mockResolvedValue({ id: 'entity-1', version: 9 });
    await manager.detectConflict(makeAction({ entity: 'job', baseVersion: 0 }));
    expect(mockGetJobById).toHaveBeenCalledWith('entity-1');
  });

  it('bid entity returns null and warns (not implemented)', async () => {
    const r = await manager.detectConflict(
      makeAction({ entity: 'bid', baseVersion: 0 })
    );
    expect(r).toBeNull();
    expect(logger.warn).toHaveBeenCalledWith(
      'Bid conflict detection skipped — getBidById not yet implemented',
      { entityId: 'entity-1' }
    );
  });

  it('profile entity calls UserService.getUserProfile', async () => {
    mockGetUserProfile.mockResolvedValue({ id: 'entity-1', version: 9 });
    await manager.detectConflict(
      makeAction({ entity: 'profile', baseVersion: 0 })
    );
    expect(mockGetUserProfile).toHaveBeenCalledWith('entity-1');
  });

  it('message entity returns null', async () => {
    const r = await manager.detectConflict(
      makeAction({ entity: 'message', baseVersion: 0 })
    );
    expect(r).toBeNull();
  });

  it('unknown entity returns null and warns', async () => {
    const r = await manager.detectConflict(
      makeAction({ entity: 'widget', baseVersion: 0 })
    );
    expect(r).toBeNull();
    expect(logger.warn).toHaveBeenCalledWith(
      'Unknown entity type for conflict detection:',
      'widget'
    );
  });

  it('logs and returns null when the service throws (inner catch)', async () => {
    mockGetJobById.mockRejectedValue(new Error('svc down'));
    const r = await manager.detectConflict(
      makeAction({ entity: 'job', baseVersion: 0 })
    );
    expect(r).toBeNull();
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to fetch server data:',
      expect.any(Error)
    );
  });
});

// ===================================================================
// resolveConflict + strategy resolvers
// ===================================================================
describe('resolveConflict', () => {
  it('last-write-wins: client newer => resolution client', async () => {
    const c = makeConflict({
      strategy: 'last-write-wins',
      clientTimestamp: 2000,
      serverTimestamp: 1000,
    });
    expect(await manager.resolveConflict(c)).toBe(true);
    expect(c.resolved).toBe(true);
    expect(c.resolution).toBe('client');
    expect(logger.info).toHaveBeenCalledWith(
      'Conflict resolved: client write is newer',
      { entity: 'job' }
    );
  });

  it('last-write-wins: server newer (or equal) => resolution server', async () => {
    const c = makeConflict({
      strategy: 'last-write-wins',
      clientTimestamp: 1000,
      serverTimestamp: 2000,
    });
    expect(await manager.resolveConflict(c)).toBe(true);
    expect(c.resolution).toBe('server');
    expect(logger.info).toHaveBeenCalledWith(
      'Conflict resolved: server write is newer',
      { entity: 'job' }
    );
  });

  it('server-wins => resolution server, true', async () => {
    const c = makeConflict({ strategy: 'server-wins' });
    expect(await manager.resolveConflict(c)).toBe(true);
    expect(c.resolved).toBe(true);
    expect(c.resolution).toBe('server');
  });

  it('client-wins => resolution client, true', async () => {
    const c = makeConflict({ strategy: 'client-wins' });
    expect(await manager.resolveConflict(c)).toBe(true);
    expect(c.resolved).toBe(true);
    expect(c.resolution).toBe('client');
  });

  it('manual => false (needs user)', async () => {
    const c = makeConflict({ strategy: 'manual' });
    expect(await manager.resolveConflict(c)).toBe(false);
    expect(c.resolved).toBe(false);
  });

  it('unknown strategy => defaults to last-write-wins', async () => {
    const c = makeConflict({
      strategy: 'bogus' as ConflictResolutionStrategy,
      clientTimestamp: 5000,
      serverTimestamp: 1,
    });
    expect(await manager.resolveConflict(c)).toBe(true);
    expect(c.resolution).toBe('client');
  });

  describe('merge strategy', () => {
    it('job => mergeJobData, resolution merged with mergedData', async () => {
      const c = makeConflict({
        strategy: 'merge',
        entity: 'job',
        clientData: { a: 1 },
        serverData: { b: 2 },
      });
      expect(await manager.resolveConflict(c)).toBe(true);
      expect(dataMerger.mergeJobData).toHaveBeenCalledWith({ a: 1 }, { b: 2 });
      expect(c.resolution).toBe('merged');
      expect(c.mergedData).toEqual({ merged: 'job', a: 1 });
      expect(c.resolved).toBe(true);
    });

    it('bid => mergeBidData', async () => {
      const c = makeConflict({
        strategy: 'merge',
        entity: 'bid',
        clientData: { x: 1 },
        serverData: { y: 2 },
      });
      expect(await manager.resolveConflict(c)).toBe(true);
      expect(dataMerger.mergeBidData).toHaveBeenCalledWith({ x: 1 }, { y: 2 });
      expect(c.mergedData).toEqual({ merged: 'bid', x: 1 });
    });

    it('profile => mergeProfileData', async () => {
      const c = makeConflict({
        strategy: 'merge',
        entity: 'profile',
        clientData: { p: 1 },
        serverData: { q: 2 },
      });
      expect(await manager.resolveConflict(c)).toBe(true);
      expect(dataMerger.mergeProfileData).toHaveBeenCalledWith(
        { p: 1 },
        { q: 2 }
      );
      expect(c.mergedData).toEqual({ merged: 'profile', p: 1 });
    });

    it('unmergeable entity => falls back to last-write-wins', async () => {
      const c = makeConflict({
        strategy: 'merge',
        entity: 'message',
        clientTimestamp: 9000,
        serverTimestamp: 1,
      });
      expect(await manager.resolveConflict(c)).toBe(true);
      expect(c.resolution).toBe('client'); // lww, client newer
      expect(dataMerger.mergeJobData).not.toHaveBeenCalled();
    });

    it('merge throws => returns false and logs', async () => {
      (dataMerger.mergeJobData as jest.Mock).mockImplementation(() => {
        throw new Error('merge fail');
      });
      const c = makeConflict({ strategy: 'merge', entity: 'job' });
      expect(await manager.resolveConflict(c)).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to merge data:',
        expect.any(Error)
      );
    });
  });
});

// ===================================================================
// addToConflictQueue
// ===================================================================
describe('addToConflictQueue', () => {
  it('appends to an existing queue and notifies listeners', async () => {
    const existing = [makeConflict({ id: 'old' })];
    mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(existing));
    const cb = jest.fn();
    manager.onConflictDetected(cb);

    const fresh = makeConflict({ id: 'new' });
    await manager.addToConflictQueue(fresh);

    const saved = JSON.parse(
      (mockAsyncStorage.setItem as jest.Mock).mock.calls[0][1]
    );
    expect(saved).toHaveLength(2);
    expect(saved[1].id).toBe('new');
    expect(cb).toHaveBeenCalledWith(saved);
    expect(logger.info).toHaveBeenCalledWith(
      'Conflict added to queue for manual resolution',
      { conflictId: 'new' }
    );
  });

  it('starts a new queue when storage empty', async () => {
    mockAsyncStorage.getItem.mockResolvedValue(null);
    await manager.addToConflictQueue(makeConflict({ id: 'first' }));
    const saved = JSON.parse(
      (mockAsyncStorage.setItem as jest.Mock).mock.calls[0][1]
    );
    expect(saved).toEqual([expect.objectContaining({ id: 'first' })]);
  });

  it('resets the queue when existing JSON is corrupt', async () => {
    mockAsyncStorage.getItem.mockResolvedValue('{not valid json');
    await manager.addToConflictQueue(makeConflict({ id: 'after-corrupt' }));
    expect(logger.error).toHaveBeenCalledWith(
      'Conflict queue JSON corrupt in addToConflictQueue; resetting',
      expect.objectContaining({ parseError: expect.any(Error) })
    );
    const saved = JSON.parse(
      (mockAsyncStorage.setItem as jest.Mock).mock.calls[0][1]
    );
    expect(saved).toEqual([expect.objectContaining({ id: 'after-corrupt' })]);
  });

  it('swallows and logs storage errors (outer catch)', async () => {
    mockAsyncStorage.getItem.mockRejectedValue(new Error('storage down'));
    await expect(
      manager.addToConflictQueue(makeConflict())
    ).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to add conflict to queue:',
      expect.any(Error)
    );
  });
});

// ===================================================================
// getConflicts
// ===================================================================
describe('getConflicts', () => {
  it('returns [] when storage empty', async () => {
    mockAsyncStorage.getItem.mockResolvedValue(null);
    expect(await manager.getConflicts()).toEqual([]);
  });

  it('parses and returns stored conflicts', async () => {
    const list = [makeConflict({ id: 'a' }), makeConflict({ id: 'b' })];
    mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(list));
    const r = await manager.getConflicts();
    expect(r.map((c) => c.id)).toEqual(['a', 'b']);
  });

  it('returns [] and logs when JSON corrupt', async () => {
    mockAsyncStorage.getItem.mockResolvedValue('!!!');
    expect(await manager.getConflicts()).toEqual([]);
    expect(logger.error).toHaveBeenCalledWith(
      'Conflict queue JSON corrupt in getConflicts; returning empty',
      expect.objectContaining({ parseError: expect.any(Error) })
    );
  });

  it('returns [] and logs on storage error', async () => {
    mockAsyncStorage.getItem.mockRejectedValue(new Error('boom'));
    expect(await manager.getConflicts()).toEqual([]);
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to get conflicts:',
      expect.any(Error)
    );
  });
});

// ===================================================================
// resolveConflictManually
// ===================================================================
describe('resolveConflictManually', () => {
  it('throws when conflict not found', async () => {
    mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify([]));
    await expect(
      manager.resolveConflictManually('missing', 'client')
    ).rejects.toThrow('Conflict not found');
  });

  it('client resolution: removes from queue, re-queues clientData', async () => {
    const c = makeConflict({
      id: 'c1',
      clientData: { title: 'mine' },
      serverVersion: 4,
      entity: 'job',
      entityId: 'e1',
    });
    mockAsyncStorage.getItem.mockResolvedValue(
      JSON.stringify([c, makeConflict({ id: 'other' })])
    );
    const cb = jest.fn();
    manager.onConflictDetected(cb);

    await manager.resolveConflictManually('c1', 'client');

    const remaining = JSON.parse(
      (mockAsyncStorage.setItem as jest.Mock).mock.calls[0][1]
    );
    expect(remaining.map((x: DataConflict) => x.id)).toEqual(['other']);
    expect(queueAction).toHaveBeenCalledWith({
      type: 'UPDATE',
      entity: 'job',
      entityId: 'e1',
      data: { title: 'mine' },
      baseVersion: 4,
      maxRetries: 3,
      strategy: 'client-wins',
    });
    expect(cb).toHaveBeenCalledWith(remaining);
    expect(logger.info).toHaveBeenCalledWith('Conflict resolved manually', {
      conflictId: 'c1',
      resolution: 'client',
      entity: 'job',
    });
  });

  it('merged resolution: re-queues the provided mergedData', async () => {
    const c = makeConflict({ id: 'c2', entity: 'job', entityId: 'e2' });
    mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify([c]));
    await manager.resolveConflictManually('c2', 'merged', { merged: true });
    expect(queueAction).toHaveBeenCalledWith(
      expect.objectContaining({ data: { merged: true }, entityId: 'e2' })
    );
  });

  it('server resolution: does NOT re-queue anything', async () => {
    const c = makeConflict({ id: 'c3' });
    mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify([c]));
    await manager.resolveConflictManually('c3', 'server');
    expect(queueAction).not.toHaveBeenCalled();
  });

  it('merged with no mergedData arg still re-queues (mergedData undefined)', async () => {
    const c = makeConflict({ id: 'c4', entity: 'job', entityId: 'e4' });
    mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify([c]));
    await manager.resolveConflictManually('c4', 'merged');
    expect(queueAction).toHaveBeenCalledWith(
      expect.objectContaining({ data: undefined })
    );
  });
});

// ===================================================================
// clearResolvedConflicts
// ===================================================================
describe('clearResolvedConflicts', () => {
  it('keeps only unresolved conflicts and notifies', async () => {
    const list = [
      makeConflict({ id: 'r', resolved: true }),
      makeConflict({ id: 'u', resolved: false }),
    ];
    mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(list));
    const cb = jest.fn();
    manager.onConflictDetected(cb);

    await manager.clearResolvedConflicts();

    const saved = JSON.parse(
      (mockAsyncStorage.setItem as jest.Mock).mock.calls[0][1]
    );
    expect(saved.map((c: DataConflict) => c.id)).toEqual(['u']);
    expect(cb).toHaveBeenCalledWith(saved);
  });

  it('logs on storage error', async () => {
    mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify([]));
    mockAsyncStorage.setItem.mockRejectedValue(new Error('write fail'));
    await manager.clearResolvedConflicts();
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to clear resolved conflicts:',
      expect.any(Error)
    );
  });
});

// ===================================================================
// onConflictDetected / notifyConflictListeners
// ===================================================================
describe('listeners', () => {
  it('subscribe receives notifications and unsubscribe stops them', async () => {
    const cb = jest.fn();
    const unsub = manager.onConflictDetected(cb);

    manager.notifyConflictListeners([makeConflict()]);
    expect(cb).toHaveBeenCalledTimes(1);

    unsub();
    manager.notifyConflictListeners([makeConflict()]);
    expect(cb).toHaveBeenCalledTimes(1); // no further calls
  });

  it('unsubscribe is a no-op when callback already removed', () => {
    const cb = jest.fn();
    const unsub = manager.onConflictDetected(cb);
    unsub();
    expect(() => unsub()).not.toThrow();
  });

  it('isolates errors thrown by a listener and logs them', () => {
    const good = jest.fn();
    const bad = jest.fn(() => {
      throw new Error('listener boom');
    });
    manager.onConflictDetected(bad);
    manager.onConflictDetected(good);

    expect(() =>
      manager.notifyConflictListeners([makeConflict()])
    ).not.toThrow();
    expect(good).toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(
      'Error in conflict callback:',
      expect.any(Error)
    );
  });
});
