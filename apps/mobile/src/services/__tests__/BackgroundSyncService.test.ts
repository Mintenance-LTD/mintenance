/**
 * BackgroundSyncService — background offline-queue drain via
 * expo-task-manager + expo-background-fetch. Registered at app cold start
 * from App.tsx (`BackgroundSyncService.register()`); coverage gap flagged
 * during the 2026-06 dead-code sweep (the file was wrongly suspected dead
 * because App.tsx lives outside apps/mobile/src and escaped the grep).
 *
 * Pins the module-load task definition, the registration status gate
 * (Denied / Restricted / Available), the idempotent register() flag, the
 * unregister round-trip, and the TaskManager executor's network +
 * pending-actions branches.
 */

const mockGetStatusAsync = jest.fn();
const mockRegisterTaskAsync = jest.fn();
const mockUnregisterTaskAsync = jest.fn();

// Constants mirror the runtime enums the service compares against / returns.
const BackgroundFetchStatus = {
  Denied: 1,
  Restricted: 2,
  Available: 3,
} as const;
const BackgroundFetchResult = {
  NoData: 1,
  NewData: 2,
  Failed: 3,
} as const;

jest.mock('expo-background-fetch', () => ({
  __esModule: true,
  getStatusAsync: (...a: unknown[]) => mockGetStatusAsync(...a),
  registerTaskAsync: (...a: unknown[]) => mockRegisterTaskAsync(...a),
  unregisterTaskAsync: (...a: unknown[]) => mockUnregisterTaskAsync(...a),
  BackgroundFetchStatus,
  BackgroundFetchResult,
}));

const mockIsTaskRegisteredAsync = jest.fn();
jest.mock('expo-task-manager', () => ({
  __esModule: true,
  defineTask: jest.fn(),
  isTaskRegisteredAsync: (...a: unknown[]) => mockIsTaskRegisteredAsync(...a),
}));

const mockNetInfoFetch = jest.fn();
jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: { fetch: (...a: unknown[]) => mockNetInfoFetch(...a) },
}));

const mockHasPendingActions = jest.fn();
const mockSyncQueue = jest.fn();
jest.mock('../OfflineManager', () => ({
  __esModule: true,
  OfflineManager: {
    hasPendingActions: (...a: unknown[]) => mockHasPendingActions(...a),
    syncQueue: (...a: unknown[]) => mockSyncQueue(...a),
  },
}));

import * as TaskManager from 'expo-task-manager';
import { BackgroundSyncService } from '../BackgroundSyncService';

type TaskExecutor = () => Promise<number>;

// The module registers its task at load — pull the executor it handed to
// TaskManager.defineTask so we can drive it directly.
const taskExecutor = (TaskManager.defineTask as jest.Mock).mock.calls[0]?.[1] as
  | TaskExecutor
  | undefined;

beforeEach(() => {
  jest.clearAllMocks();
  // register() short-circuits on a private static flag once it succeeds;
  // reset it so each test starts from an unregistered state.
  (BackgroundSyncService as unknown as { registered: boolean }).registered =
    false;
  mockGetStatusAsync.mockResolvedValue(BackgroundFetchStatus.Available);
  mockRegisterTaskAsync.mockResolvedValue(undefined);
  mockUnregisterTaskAsync.mockResolvedValue(undefined);
  mockIsTaskRegisteredAsync.mockResolvedValue(true);
  mockNetInfoFetch.mockResolvedValue({
    isConnected: true,
    isInternetReachable: true,
  });
  mockHasPendingActions.mockResolvedValue(false);
  mockSyncQueue.mockResolvedValue(undefined);
});

describe('BackgroundSyncService.register', () => {
  it('registers the task when background fetch is available', async () => {
    await BackgroundSyncService.register();
    expect(mockRegisterTaskAsync).toHaveBeenCalledTimes(1);
    const [taskName, opts] = mockRegisterTaskAsync.mock.calls[0];
    expect(taskName).toBe('MINTENANCE_BACKGROUND_SYNC');
    expect(opts).toEqual(
      expect.objectContaining({
        minimumInterval: 15 * 60,
        stopOnTerminate: false,
        startOnBoot: true,
      })
    );
  });

  it('is idempotent — a second call after success does not re-register', async () => {
    await BackgroundSyncService.register();
    await BackgroundSyncService.register();
    expect(mockRegisterTaskAsync).toHaveBeenCalledTimes(1);
    // Short-circuits before even querying status on the second call.
    expect(mockGetStatusAsync).toHaveBeenCalledTimes(1);
  });

  it('does not register when the OS has denied background fetch', async () => {
    mockGetStatusAsync.mockResolvedValueOnce(BackgroundFetchStatus.Denied);
    await BackgroundSyncService.register();
    expect(mockRegisterTaskAsync).not.toHaveBeenCalled();
  });

  it('does not register when background fetch is restricted', async () => {
    mockGetStatusAsync.mockResolvedValueOnce(BackgroundFetchStatus.Restricted);
    await BackgroundSyncService.register();
    expect(mockRegisterTaskAsync).not.toHaveBeenCalled();
  });

  it('fails soft when registration throws and leaves itself re-registerable', async () => {
    mockRegisterTaskAsync.mockRejectedValueOnce(new Error('boom'));
    await expect(BackgroundSyncService.register()).resolves.toBeUndefined();
    // The flag was never set, so a later retry will attempt again.
    mockRegisterTaskAsync.mockResolvedValueOnce(undefined);
    await BackgroundSyncService.register();
    expect(mockRegisterTaskAsync).toHaveBeenCalledTimes(2);
  });
});

describe('BackgroundSyncService.unregister', () => {
  it('unregisters when the task is currently registered', async () => {
    mockIsTaskRegisteredAsync.mockResolvedValueOnce(true);
    await BackgroundSyncService.unregister();
    expect(mockUnregisterTaskAsync).toHaveBeenCalledWith(
      'MINTENANCE_BACKGROUND_SYNC'
    );
  });

  it('is a no-op when the task was never registered', async () => {
    mockIsTaskRegisteredAsync.mockResolvedValueOnce(false);
    await BackgroundSyncService.unregister();
    expect(mockUnregisterTaskAsync).not.toHaveBeenCalled();
  });

  it('fails soft when unregister throws', async () => {
    mockIsTaskRegisteredAsync.mockRejectedValueOnce(new Error('boom'));
    await expect(BackgroundSyncService.unregister()).resolves.toBeUndefined();
    expect(mockUnregisterTaskAsync).not.toHaveBeenCalled();
  });
});

describe('BackgroundSyncService.isAvailable', () => {
  it('returns true when status is Available', async () => {
    mockGetStatusAsync.mockResolvedValueOnce(BackgroundFetchStatus.Available);
    await expect(BackgroundSyncService.isAvailable()).resolves.toBe(true);
  });

  it('returns false for any non-Available status', async () => {
    mockGetStatusAsync.mockResolvedValueOnce(BackgroundFetchStatus.Denied);
    await expect(BackgroundSyncService.isAvailable()).resolves.toBe(false);
  });

  it('returns false when the status query throws', async () => {
    mockGetStatusAsync.mockRejectedValueOnce(new Error('boom'));
    await expect(BackgroundSyncService.isAvailable()).resolves.toBe(false);
  });
});

describe('background task executor', () => {
  it('was registered at module load', () => {
    expect(taskExecutor).toBeInstanceOf(Function);
  });

  it('skips sync and returns NoData when offline', async () => {
    mockNetInfoFetch.mockResolvedValueOnce({
      isConnected: false,
      isInternetReachable: false,
    });
    const result = await taskExecutor!();
    expect(result).toBe(BackgroundFetchResult.NoData);
    expect(mockSyncQueue).not.toHaveBeenCalled();
  });

  it('returns NoData when connected but nothing is pending', async () => {
    mockHasPendingActions.mockResolvedValueOnce(false);
    const result = await taskExecutor!();
    expect(result).toBe(BackgroundFetchResult.NoData);
    expect(mockSyncQueue).not.toHaveBeenCalled();
  });

  it('syncs and returns NewData when the queue drains fully', async () => {
    mockHasPendingActions
      .mockResolvedValueOnce(true) // pre-sync check
      .mockResolvedValueOnce(false); // post-sync check
    const result = await taskExecutor!();
    expect(mockSyncQueue).toHaveBeenCalledTimes(1);
    expect(result).toBe(BackgroundFetchResult.NewData);
  });

  it('returns Failed when actions remain pending after sync', async () => {
    mockHasPendingActions
      .mockResolvedValueOnce(true) // pre-sync check
      .mockResolvedValueOnce(true); // still pending post-sync
    const result = await taskExecutor!();
    expect(mockSyncQueue).toHaveBeenCalledTimes(1);
    expect(result).toBe(BackgroundFetchResult.Failed);
  });

  it('returns Failed when the sync throws', async () => {
    mockHasPendingActions.mockResolvedValueOnce(true);
    mockSyncQueue.mockRejectedValueOnce(new Error('network blip'));
    const result = await taskExecutor!();
    expect(result).toBe(BackgroundFetchResult.Failed);
  });
});
