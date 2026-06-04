import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { OfflineManager } from '../../services/OfflineManager';

// NOTE: OfflineManager was consolidated onto AsyncStorage (see
// "OFFLINE QUEUE CONSOLIDATION FIX" in OfflineManager.ts — shouldUseAsyncStorage
// is hardwired to true). The previous version of this suite asserted against a
// LocalDatabase/SQLite backend that the service no longer touches, so every
// assertion drifted. These tests now exercise the real AsyncStorage-backed
// queue. The queue is persisted as a single JSON array under 'OFFLINE_QUEUE';
// action.data is stored as a plain object (not a per-field JSON string).

jest.mock('@react-native-async-storage/async-storage');
jest.mock('@react-native-community/netinfo');

jest.mock('../../lib/queryClient', () => ({
  queryClient: {
    invalidateQueries: jest.fn(),
  },
}));

jest.mock('../../config/sentry', () => ({
  addBreadcrumb: jest.fn(),
}));

// Mock services that OfflineManager (via ActionExecutor) calls
jest.mock('../../services/JobService', () => ({
  JobService: {
    createJob: jest.fn(),
    updateJobStatus: jest.fn(),
    submitBid: jest.fn(),
    acceptBid: jest.fn(),
    getJobById: jest.fn(),
    getBidsByJob: jest.fn(),
  },
}));

jest.mock('../../services/MessagingService', () => ({
  MessagingService: {
    sendMessage: jest.fn(),
  },
}));

jest.mock('../../services/UserService', () => ({
  UserService: {
    updateUserProfile: jest.fn(),
    getUserProfile: jest.fn(),
  },
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  },
}));

const mockNetInfo = NetInfo as jest.Mocked<typeof NetInfo>;
const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const { JobService } = require('../../services/JobService');

const QUEUE_KEY = 'OFFLINE_QUEUE';

describe('OfflineManager - Simple Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset internal state so concurrent-sync guard etc. don't leak across tests
    (OfflineManager as any).syncInProgress = false;
    (OfflineManager as any).retryTimer = null;
    (OfflineManager as any).syncListeners = [];

    mockAsyncStorage.getItem.mockResolvedValue('[]');
    mockAsyncStorage.setItem.mockResolvedValue(undefined);
    mockAsyncStorage.removeItem.mockResolvedValue(undefined);

    mockNetInfo.fetch.mockResolvedValue({
      isConnected: true,
      isInternetReachable: true,
    } as any);
    mockNetInfo.addEventListener.mockReturnValue(() => {});
  });

  afterEach(() => {
    if ((OfflineManager as any).retryTimer) {
      clearTimeout((OfflineManager as any).retryTimer);
      (OfflineManager as any).retryTimer = null;
    }
  });

  describe('queueAction', () => {
    it('should queue an action successfully', async () => {
      const action = {
        type: 'CREATE' as const,
        entity: 'job',
        data: { title: 'Fix faucet', description: 'Leaky kitchen faucet' },
      };

      // Offline so queueAction does not immediately drain the queue
      mockNetInfo.fetch.mockResolvedValue({
        isConnected: false,
        isInternetReachable: false,
      } as any);

      const actionId = await OfflineManager.queueAction(action);

      expect(actionId).toBeDefined();
      expect(typeof actionId).toBe('string');

      // The queue is persisted back to AsyncStorage with the new action
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        QUEUE_KEY,
        expect.any(String)
      );
      const persisted = JSON.parse(
        mockAsyncStorage.setItem.mock.calls[0][1] as string
      );
      expect(persisted).toHaveLength(1);
      expect(persisted[0]).toMatchObject({
        id: actionId,
        type: 'CREATE',
        entity: 'job',
        data: action.data,
        retryCount: 0,
        maxRetries: 3,
      });
    });

    it('should add to existing queue', async () => {
      mockNetInfo.fetch.mockResolvedValue({
        isConnected: false,
        isInternetReachable: false,
      } as any);

      const action1 = {
        type: 'CREATE' as const,
        entity: 'job',
        data: { title: 'Existing job' },
      };
      const action2 = {
        type: 'CREATE' as const,
        entity: 'message',
        data: { jobId: 'job-1', message: 'Hello' },
      };

      // First queueAction sees an empty queue; second sees the first action
      const actionId1 = await OfflineManager.queueAction(action1);
      const firstWrite = mockAsyncStorage.setItem.mock.calls[0][1] as string;
      mockAsyncStorage.getItem.mockResolvedValue(firstWrite);

      const actionId2 = await OfflineManager.queueAction(action2);

      expect(actionId1).toBeDefined();
      expect(actionId2).toBeDefined();
      expect(actionId1).not.toBe(actionId2);

      const lastWrite = mockAsyncStorage.setItem.mock.calls[
        mockAsyncStorage.setItem.mock.calls.length - 1
      ][1] as string;
      const persisted = JSON.parse(lastWrite);
      expect(persisted).toHaveLength(2);
    });

    it('should handle queue storage errors gracefully', async () => {
      const action = {
        type: 'CREATE' as const,
        entity: 'job',
        data: {},
      };

      mockAsyncStorage.setItem.mockRejectedValue(new Error('Storage full'));

      await expect(OfflineManager.queueAction(action)).rejects.toThrow(
        'Storage full'
      );
    });
  });

  describe('getQueue', () => {
    it('should return empty array when no queue exists', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);

      const queue = await OfflineManager.getQueue();

      expect(queue).toEqual([]);
      expect(mockAsyncStorage.getItem).toHaveBeenCalledWith(QUEUE_KEY);
    });

    it('should return the parsed queue when it exists', async () => {
      const stored = [
        {
          id: 'action-1',
          type: 'CREATE',
          entity: 'job',
          data: { title: 'Test job' },
          timestamp: 1234567890,
          retryCount: 0,
          maxRetries: 3,
        },
      ];
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(stored));

      const queue = await OfflineManager.getQueue();

      expect(queue).toEqual(stored);
    });

    it('should handle storage errors gracefully', async () => {
      mockAsyncStorage.getItem.mockRejectedValue(new Error('Database error'));

      const queue = await OfflineManager.getQueue();

      expect(queue).toEqual([]);
    });
  });

  describe('syncQueue', () => {
    it('should sync pending actions when online', async () => {
      const stored = [
        {
          id: 'action-1',
          type: 'CREATE',
          entity: 'job',
          data: { title: 'Test job', homeownerId: 'user-1' },
          timestamp: 1234567890,
          retryCount: 0,
          maxRetries: 3,
        },
      ];
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(stored));

      mockNetInfo.fetch.mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
      } as any);

      JobService.createJob.mockResolvedValue({
        id: 'job-1',
        title: 'Test job',
      });

      await OfflineManager.syncQueue();

      expect(JobService.createJob).toHaveBeenCalledWith({
        title: 'Test job',
        homeownerId: 'user-1',
      });
      // After a successful sync the queue is rewritten with only failed actions
      // (none here), so the final persisted queue is empty.
      const lastWrite = mockAsyncStorage.setItem.mock.calls[
        mockAsyncStorage.setItem.mock.calls.length - 1
      ][1] as string;
      expect(JSON.parse(lastWrite)).toEqual([]);
    });

    it('should not sync when offline', async () => {
      mockNetInfo.fetch.mockResolvedValue({
        isConnected: false,
        isInternetReachable: false,
      } as any);

      await OfflineManager.syncQueue();

      // Offline gate short-circuits before reading the queue
      expect(mockAsyncStorage.getItem).not.toHaveBeenCalled();
      expect(JobService.createJob).not.toHaveBeenCalled();
    });

    it('should keep failed actions in the queue for retry', async () => {
      const stored = [
        {
          id: 'action-1',
          type: 'CREATE',
          entity: 'job',
          data: { title: 'Test job' },
          timestamp: 1234567890,
          retryCount: 0,
          maxRetries: 3,
        },
      ];
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(stored));

      mockNetInfo.fetch.mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
      } as any);

      JobService.createJob.mockRejectedValue(new Error('Network error'));

      await OfflineManager.syncQueue();

      // The failed action must be persisted back (not dropped) so it can retry.
      const lastWrite = mockAsyncStorage.setItem.mock.calls[
        mockAsyncStorage.setItem.mock.calls.length - 1
      ][1] as string;
      const persisted = JSON.parse(lastWrite);
      expect(persisted).toHaveLength(1);
      expect(persisted[0].id).toBe('action-1');
      expect(persisted[0].retryCount).toBe(1);
    });
  });

  describe('getPendingActionsCount', () => {
    it('should return count of pending actions', async () => {
      const stored = [{ id: 'action-1' }, { id: 'action-2' }];
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(stored));

      const count = await OfflineManager.getPendingActionsCount();

      expect(count).toBe(2);
      expect(mockAsyncStorage.getItem).toHaveBeenCalledWith(QUEUE_KEY);
    });

    it('should return 0 on error', async () => {
      mockAsyncStorage.getItem.mockRejectedValue(new Error('Database error'));

      const count = await OfflineManager.getPendingActionsCount();

      expect(count).toBe(0);
    });
  });

  describe('clearQueue', () => {
    it('should clear the queue', async () => {
      await OfflineManager.clearQueue();

      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith(QUEUE_KEY);
    });

    it('should handle clear errors gracefully', async () => {
      mockAsyncStorage.removeItem.mockRejectedValue(new Error('Clear failed'));

      // clearQueue swallows storage errors (logs, does not throw)
      await expect(OfflineManager.clearQueue()).resolves.not.toThrow();
    });
  });

  describe('hasPendingActions', () => {
    it('should return true when there are pending actions', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(
        JSON.stringify([{ id: 'action-1' }])
      );

      const hasPending = await OfflineManager.hasPendingActions();

      expect(hasPending).toBe(true);
    });

    it('should return false when there are no pending actions', async () => {
      mockAsyncStorage.getItem.mockResolvedValue('[]');

      const hasPending = await OfflineManager.hasPendingActions();

      expect(hasPending).toBe(false);
    });

    it('should return false on error', async () => {
      mockAsyncStorage.getItem.mockRejectedValue(new Error('Database error'));

      const hasPending = await OfflineManager.hasPendingActions();

      expect(hasPending).toBe(false);
    });
  });
});
