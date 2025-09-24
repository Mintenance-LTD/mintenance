import NetInfo from '@react-native-community/netinfo';
import { OfflineManager, OfflineAction } from '../../services/OfflineManager';

// Mock external dependencies only
jest.mock('@react-native-community/netinfo');
jest.mock('../../lib/queryClient', () => ({
  queryClient: {
    invalidateQueries: jest.fn(),
  },
}));

// Mock LocalDatabase since OfflineManager uses SQLite, not AsyncStorage
jest.mock('../../services/LocalDatabase', () => ({
  LocalDatabase: {
    init: jest.fn(),
    queueOfflineAction: jest.fn(),
    getOfflineActions: jest.fn(),
    removeOfflineAction: jest.fn(),
  },
}));

// Mock services that OfflineManager calls
jest.mock('../../services/JobService', () => ({
  JobService: {
    createJob: jest.fn(),
    updateJobStatus: jest.fn(),
    submitBid: jest.fn(),
    acceptBid: jest.fn(),
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
  },
}));

jest.mock('../../utils/logger', () => ({
  logger: { error: jest.fn(), info: jest.fn(), debug: jest.fn(), warn: jest.fn() },
}));

const mockNetInfo = NetInfo as jest.Mocked<typeof NetInfo>;
const { LocalDatabase } = require('../../services/LocalDatabase');
const { JobService } = require('../../services/JobService');
const { MessagingService } = require('../../services/MessagingService');
const { UserService } = require('../../services/UserService');

describe('OfflineManager - Simple Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    LocalDatabase.init.mockResolvedValue();
    LocalDatabase.queueOfflineAction.mockResolvedValue();
    LocalDatabase.getOfflineActions.mockResolvedValue([]);
    LocalDatabase.removeOfflineAction.mockResolvedValue();
    mockNetInfo.fetch.mockResolvedValue({
      isConnected: true,
      isInternetReachable: true,
    } as any);
  });

  describe('queueAction', () => {
    it('should queue an action successfully', async () => {
      const action = {
        type: 'CREATE' as const,
        entity: 'job',
        data: { title: 'Fix faucet', description: 'Leaky kitchen faucet' },
      };

      mockNetInfo.fetch.mockResolvedValue({
        isConnected: false,
        isInternetReachable: false,
      } as any);
      
      const actionId = await OfflineManager.queueAction(action);

      expect(LocalDatabase.init).toHaveBeenCalled();
      expect(LocalDatabase.queueOfflineAction).toHaveBeenCalledWith({
        id: actionId,
        type: action.type,
        entity: action.entity,
        data: action.data,
        maxRetries: 3,
        queryKey: undefined,
      });
      expect(actionId).toBeDefined();
      expect(typeof actionId).toBe('string');
    });

    it('should add to existing queue', async () => {
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

      mockNetInfo.fetch.mockResolvedValue({
        isConnected: false,
        isInternetReachable: false,
      } as any);

      const actionId1 = await OfflineManager.queueAction(action1);
      const actionId2 = await OfflineManager.queueAction(action2);

      expect(LocalDatabase.queueOfflineAction).toHaveBeenCalledTimes(2);
      expect(actionId1).toBeDefined();
      expect(actionId2).toBeDefined();
    });

    it('should handle queue storage errors gracefully', async () => {
      const action = {
        type: 'CREATE' as const,
        entity: 'job',
        data: {},
      };

      LocalDatabase.queueOfflineAction.mockRejectedValue(new Error('Storage full'));

      // Should throw since storage failed
      await expect(OfflineManager.queueAction(action)).rejects.toThrow('Storage full');
    });
  });

  describe('getQueue', () => {
    it('should return empty array when no queue exists', async () => {
      LocalDatabase.getOfflineActions.mockResolvedValue([]);

      const queue = await OfflineManager.getQueue();

      expect(queue).toEqual([]);
      expect(LocalDatabase.init).toHaveBeenCalled();
      expect(LocalDatabase.getOfflineActions).toHaveBeenCalled();
    });

    it('should return parsed queue when it exists', async () => {
      const mockDbActions = [
        {
          id: 'action-1',
          type: 'CREATE',
          entity: 'job',
          data: '{"title":"Test job"}',
          created_at: 1234567890,
          retry_count: 0,
          max_retries: 3,
          query_key: null,
        },
      ];

      LocalDatabase.getOfflineActions.mockResolvedValue(mockDbActions);

      const queue = await OfflineManager.getQueue();

      expect(queue).toEqual([
        {
          id: 'action-1',
          type: 'CREATE',
          entity: 'job',
          data: { title: 'Test job' },
          timestamp: 1234567890,
          retryCount: 0,
          maxRetries: 3,
          queryKey: undefined,
        },
      ]);
    });

    it('should handle database errors gracefully', async () => {
      LocalDatabase.getOfflineActions.mockRejectedValue(new Error('Database error'));

      const queue = await OfflineManager.getQueue();

      expect(queue).toEqual([]);
    });
  });

  describe('syncQueue', () => {
    it('should sync pending actions when online', async () => {
      const mockDbActions = [
        {
          id: 'action-1',
          type: 'CREATE',
          entity: 'job',
          data: '{"title":"Test job","homeownerId":"user-1"}',
          created_at: 1234567890,
          retry_count: 0,
          max_retries: 3,
          query_key: null,
        },
      ];

      // First call returns the actions, second call returns empty after processing
      LocalDatabase.getOfflineActions
        .mockResolvedValueOnce(mockDbActions)  // For getQueue() call
        .mockResolvedValueOnce(mockDbActions); // For syncQueue() call

      mockNetInfo.fetch.mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
      } as any);

      JobService.createJob.mockResolvedValue({ id: 'job-1', title: 'Test job' });

      await OfflineManager.syncQueue();

      expect(JobService.createJob).toHaveBeenCalledWith({
        title: 'Test job',
        homeownerId: 'user-1',
      });
      expect(LocalDatabase.removeOfflineAction).toHaveBeenCalledWith('action-1');
    });

    it('should not sync when offline', async () => {
      mockNetInfo.fetch.mockResolvedValue({
        isConnected: false,
        isInternetReachable: false,
      } as any);

      await OfflineManager.syncQueue();

      expect(LocalDatabase.getOfflineActions).not.toHaveBeenCalled();
    });

    it('should handle sync errors and retry', async () => {
      const mockDbActions = [
        {
          id: 'action-1',
          type: 'CREATE',
          entity: 'job',
          data: '{"title":"Test job"}',
          created_at: 1234567890,
          retry_count: 0,
          max_retries: 3,
          query_key: null,
        },
      ];

      LocalDatabase.getOfflineActions.mockResolvedValue(mockDbActions);
      mockNetInfo.fetch.mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
      } as any);

      JobService.createJob.mockRejectedValue(new Error('Network error'));

      await OfflineManager.syncQueue();

      // Action should not be removed since it failed
      expect(LocalDatabase.removeOfflineAction).not.toHaveBeenCalled();
    });
  });

  describe('getPendingActionsCount', () => {
    it('should return count of pending actions', async () => {
      const mockActions = [
        { id: 'action-1' },
        { id: 'action-2' },
      ];
      LocalDatabase.getOfflineActions.mockResolvedValue(mockActions);

      const count = await OfflineManager.getPendingActionsCount();

      expect(count).toBe(2);
      expect(LocalDatabase.init).toHaveBeenCalled();
      expect(LocalDatabase.getOfflineActions).toHaveBeenCalled();
    });

    it('should return 0 on error', async () => {
      LocalDatabase.getOfflineActions.mockRejectedValue(new Error('Database error'));

      const count = await OfflineManager.getPendingActionsCount();

      expect(count).toBe(0);
    });
  });

  describe('clearQueue', () => {
    it('should clear the queue', async () => {
      const mockActions = [{ id: 'action-1' }, { id: 'action-2' }];
      LocalDatabase.getOfflineActions.mockResolvedValue(mockActions);

      await OfflineManager.clearQueue();

      expect(LocalDatabase.init).toHaveBeenCalled();
      expect(LocalDatabase.getOfflineActions).toHaveBeenCalled();
      expect(LocalDatabase.removeOfflineAction).toHaveBeenCalledWith('action-1');
      expect(LocalDatabase.removeOfflineAction).toHaveBeenCalledWith('action-2');
    });

    it('should handle clear errors gracefully', async () => {
      LocalDatabase.getOfflineActions.mockRejectedValue(new Error('Clear failed'));

      // Should not throw
      await expect(OfflineManager.clearQueue()).resolves.not.toThrow();
    });
  });

  describe('hasPendingActions', () => {
    it('should return true when there are pending actions', async () => {
      const mockActions = [{ id: 'action-1' }];
      LocalDatabase.getOfflineActions.mockResolvedValue(mockActions);

      const hasPending = await OfflineManager.hasPendingActions();

      expect(hasPending).toBe(true);
    });

    it('should return false when there are no pending actions', async () => {
      LocalDatabase.getOfflineActions.mockResolvedValue([]);

      const hasPending = await OfflineManager.hasPendingActions();

      expect(hasPending).toBe(false);
    });

    it('should return false on error', async () => {
      LocalDatabase.getOfflineActions.mockRejectedValue(new Error('Database error'));

      const hasPending = await OfflineManager.hasPendingActions();

      expect(hasPending).toBe(false);
    });
  });
});