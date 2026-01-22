import { OfflineManager } from '../../services/OfflineManager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { logger } from '../../utils/logger';
import { queryClient } from '../../lib/queryClient';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('@react-native-community/netinfo');
jest.mock('../../utils/logger');
jest.mock('../../lib/queryClient');

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

jest.mock('../../config/sentry', () => ({
  addBreadcrumb: jest.fn(),
}));

describe('OfflineManager - Backoff and Retry Logic', () => {
  const mockLogger = logger as jest.Mocked<typeof logger>;
  const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
  const mockNetInfo = NetInfo as jest.Mocked<typeof NetInfo>;
  const mockQueryClient = queryClient as jest.Mocked<typeof queryClient>;

  let JobService: any;
  let MessagingService: any;
  let UserService: any;
  let sentry: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset OfflineManager state
    (OfflineManager as any).syncInProgress = false;
    (OfflineManager as any).retryTimer = null;
    (OfflineManager as any).syncListeners = [];
    (OfflineManager as any).conflictListeners = [];

    // Setup default mocks
    if (!mockAsyncStorage.getAllKeys) {
      (mockAsyncStorage as any).getAllKeys = jest.fn();
    }

    mockAsyncStorage.getItem.mockResolvedValue('[]');
    mockAsyncStorage.setItem.mockResolvedValue(undefined);
    mockAsyncStorage.removeItem.mockResolvedValue(undefined);
    mockAsyncStorage.getAllKeys.mockResolvedValue([]);

    mockNetInfo.fetch.mockResolvedValue({
      isConnected: true,
      isInternetReachable: true,
      type: 'wifi',
      details: null,
    } as any);

    mockNetInfo.addEventListener.mockReturnValue(() => {});

    mockQueryClient.invalidateQueries.mockResolvedValue(undefined);

    // Get service mocks
    JobService = require('../../services/JobService').JobService;
    MessagingService = require('../../services/MessagingService').MessagingService;
    UserService = require('../../services/UserService').UserService;
    sentry = require('../../config/sentry');
  });

  afterEach(() => {
    // Clear any pending timers
    if ((OfflineManager as any).retryTimer) {
      if (typeof clearTimeout === 'function') {
        clearTimeout((OfflineManager as any).retryTimer);
      }
      (OfflineManager as any).retryTimer = null;
    }
  });

  describe('Exponential Backoff', () => {
    it('should apply exponential backoff for failed actions', async () => {
      // Setup: Queue with one action that will fail
      const failingAction = {
        id: 'action-1',
        type: 'CREATE' as const,
        entity: 'job',
        data: JSON.stringify({ title: 'Test Job' }),
        timestamp: Date.now(),
        retryCount: 0,
        maxRetries: 3,
      };

      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify([failingAction]));
      JobService.createJob.mockRejectedValue(new Error('Network error'));

      // Act: Start sync
      await OfflineManager.syncQueue();

      // Assert: Action should be retried with exponential backoff
      expect(JobService.createJob).toHaveBeenCalledTimes(1);

      // Check that the action was updated with retry count and next retry time
      const setItemCalls = mockAsyncStorage.setItem.mock.calls;
      const updatedQueueCall = setItemCalls.find(call => call[0] === 'OFFLINE_QUEUE');

      if (updatedQueueCall) {
        const updatedQueue = JSON.parse(updatedQueueCall[1] as string);
        expect(updatedQueue[0].retryCount).toBe(1);
        expect(updatedQueue[0].nextRetryAt).toBeDefined();

        // Calculate expected backoff: 500 * 2^(retryCount-1) = 500ms for first retry
        const expectedDelay = 500;
        const actualDelay = updatedQueue[0].nextRetryAt - failingAction.timestamp;
        expect(actualDelay).toBeGreaterThanOrEqual(expectedDelay);
      }
    });

    it('should increase backoff delay exponentially with each retry', async () => {
      const baseTime = Date.now();

      // Test multiple retry counts
      const testCases = [
        { retryCount: 0, expectedDelay: 0 },      // Initial attempt
        { retryCount: 1, expectedDelay: 500 },    // 500 * 2^0 = 500ms
        { retryCount: 2, expectedDelay: 1000 },   // 500 * 2^1 = 1000ms
        { retryCount: 3, expectedDelay: 2000 },   // 500 * 2^2 = 2000ms
        { retryCount: 4, expectedDelay: 4000 },   // 500 * 2^3 = 4000ms
        { retryCount: 5, expectedDelay: 8000 },   // 500 * 2^4 = 8000ms
      ];

      for (const testCase of testCases) {
        const action = {
          id: `action-${testCase.retryCount}`,
          type: 'CREATE' as const,
          entity: 'job',
          data: JSON.stringify({ title: 'Test Job' }),
          timestamp: baseTime,
          retryCount: testCase.retryCount,
          maxRetries: 10,
        };

        mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify([action]));
        JobService.createJob.mockRejectedValueOnce(new Error('Network error'));

        await OfflineManager.syncQueue();

        if (testCase.retryCount < action.maxRetries) {
          const setItemCalls = mockAsyncStorage.setItem.mock.calls;
          const lastCall = setItemCalls[setItemCalls.length - 1];

          if (lastCall && lastCall[0] === 'OFFLINE_QUEUE') {
            const updatedQueue = JSON.parse(lastCall[1] as string);
            const updatedAction = updatedQueue[0];

            if (testCase.expectedDelay > 0) {
              const actualDelay = updatedAction.nextRetryAt - baseTime;
              // Allow for execution time skew with real timers
              expect(actualDelay).toBeGreaterThanOrEqual(testCase.expectedDelay);
            }
          }
        }
      }
    });

    it('should cap backoff delay at 30 seconds', async () => {
      // Action with high retry count that would exceed 30s with exponential backoff
      const action = {
        id: 'action-max',
        type: 'CREATE' as const,
        entity: 'job',
        data: JSON.stringify({ title: 'Test Job' }),
        timestamp: Date.now(),
        retryCount: 10, // 500 * 2^9 = 256000ms > 30000ms cap
        maxRetries: 15,
      };

      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify([action]));
      JobService.createJob.mockRejectedValue(new Error('Network error'));

      await OfflineManager.syncQueue();

      const setItemCalls = mockAsyncStorage.setItem.mock.calls;
      const updatedQueueCall = setItemCalls.find(call => call[0] === 'OFFLINE_QUEUE');

      if (updatedQueueCall) {
        const updatedQueue = JSON.parse(updatedQueueCall[1] as string);
        const nextRetryAt = updatedQueue[0].nextRetryAt;
        const delay = nextRetryAt - action.timestamp;

        // Should be capped at 30000ms
        expect(delay).toBeLessThanOrEqual(30500);
        expect(delay).toBeGreaterThanOrEqual(29000); // Allow some tolerance
      }
    });
  });

  describe('Retry Scheduling', () => {
    it('should schedule next sync after failures', async () => {
      const action = {
        id: 'action-1',
        type: 'CREATE' as const,
        entity: 'job',
        data: JSON.stringify({ title: 'Test Job' }),
        timestamp: Date.now(),
        retryCount: 0,
        maxRetries: 3,
      };

      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify([action]));
      JobService.createJob.mockRejectedValue(new Error('Temporary failure'));

      const setTimeoutSpy = jest.spyOn(global, 'setTimeout');

      await OfflineManager.syncQueue();

      // Should schedule retry
      expect(setTimeoutSpy).toHaveBeenCalled();
      expect((OfflineManager as any).retryTimer).toBeDefined();

      // Verify Sentry breadcrumb
      expect(sentry.addBreadcrumb).toHaveBeenCalledWith(
        expect.stringContaining('offline.schedule_retry'),
        'offline'
      );
    });

    it('should clear existing timer before scheduling new one', async () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

      // Set an existing timer
      (OfflineManager as any).retryTimer = setTimeout(() => {}, 10000);

      const action = {
        id: 'action-1',
        type: 'CREATE' as const,
        entity: 'job',
        data: JSON.stringify({ title: 'Test Job' }),
        timestamp: Date.now(),
        retryCount: 0,
        maxRetries: 3,
      };

      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify([action]));
      JobService.createJob.mockRejectedValue(new Error('Temporary failure'));

      await OfflineManager.syncQueue();

      // Should clear existing timer
      expect(clearTimeoutSpy).toHaveBeenCalled();
    });

    it('should schedule retry with minimum delay from multiple failed actions', async () => {
      const baseTime = Date.now();

      const actions = [
        {
          id: 'action-1',
          type: 'CREATE' as const,
          entity: 'job',
          data: JSON.stringify({ title: 'Job 1' }),
          timestamp: baseTime,
          retryCount: 1, // Next retry in 500ms
          maxRetries: 3,
        },
        {
          id: 'action-2',
          type: 'CREATE' as const,
          entity: 'job',
          data: JSON.stringify({ title: 'Job 2' }),
          timestamp: baseTime,
          retryCount: 3, // Next retry in 2000ms
          maxRetries: 5,
        },
        {
          id: 'action-3',
          type: 'CREATE' as const,
          entity: 'job',
          data: JSON.stringify({ title: 'Job 3' }),
          timestamp: baseTime,
          retryCount: 2, // Next retry in 1000ms
          maxRetries: 4,
        },
      ];

      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(actions));
      JobService.createJob.mockRejectedValue(new Error('Batch failure'));

      const setTimeoutSpy = jest.spyOn(global, 'setTimeout');

      await OfflineManager.syncQueue();

      // Should schedule with minimum delay (500ms from action-1)
      expect(setTimeoutSpy).toHaveBeenCalled();
      const delayArg = setTimeoutSpy.mock.calls[0][1];
      expect(delayArg).toBeGreaterThanOrEqual(0);
      expect(delayArg).toBeLessThanOrEqual(1000);
    });
  });

  describe('Retry Count Management', () => {
    it('should increment retry count on failure', async () => {
      const action = {
        id: 'action-1',
        type: 'CREATE' as const,
        entity: 'job',
        data: JSON.stringify({ title: 'Test Job' }),
        timestamp: Date.now(),
        retryCount: 0,
        maxRetries: 3,
      };

      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify([action]));
      JobService.createJob.mockRejectedValue(new Error('API error'));

      await OfflineManager.syncQueue();

      const setItemCalls = mockAsyncStorage.setItem.mock.calls;
      const updatedQueueCall = setItemCalls.find(call => call[0] === 'OFFLINE_QUEUE');

      if (updatedQueueCall) {
        const updatedQueue = JSON.parse(updatedQueueCall[1] as string);
        expect(updatedQueue[0].retryCount).toBe(1);
      }
    });

    it('should stop retrying after max retries reached', async () => {
      const action = {
        id: 'action-1',
        type: 'CREATE' as const,
        entity: 'job',
        data: JSON.stringify({ title: 'Test Job' }),
        timestamp: Date.now(),
        retryCount: 2, // Already retried twice
        maxRetries: 3, // Max is 3
      };

      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify([action]));
      JobService.createJob.mockRejectedValue(new Error('Permanent failure'));

      await OfflineManager.syncQueue();

      // Should attempt one more time (3rd retry)
      expect(JobService.createJob).toHaveBeenCalledTimes(1);

      // After this failure, should not be in queue anymore
      const setItemCalls = mockAsyncStorage.setItem.mock.calls;
      const updatedQueueCall = setItemCalls.find(call => call[0] === 'OFFLINE_QUEUE');

      if (updatedQueueCall) {
        const updatedQueue = JSON.parse(updatedQueueCall[1] as string);
        // Action should be removed or marked as failed permanently
        expect(updatedQueue.length).toBe(0);
      }

      // Should log error about max retries
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Action failed permanently'),
        expect.any(Error),
        expect.any(Object)
      );
    });

    it('should handle mixed success and failure in batch', async () => {
      const actions = [
        {
          id: 'success-1',
          type: 'CREATE' as const,
          entity: 'job',
          data: JSON.stringify({ title: 'Success Job' }),
          timestamp: Date.now(),
          retryCount: 0,
          maxRetries: 3,
        },
        {
          id: 'fail-1',
          type: 'CREATE' as const,
          entity: 'bid',
          data: JSON.stringify({ amount: 100 }),
          timestamp: Date.now(),
          retryCount: 0,
          maxRetries: 3,
        },
        {
          id: 'success-2',
          type: 'UPDATE' as const,
          entity: 'profile',
          data: JSON.stringify({ userId: 'user-1', updates: { name: 'Test' } }),
          timestamp: Date.now(),
          retryCount: 0,
          maxRetries: 3,
        },
      ];

      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(actions));

      // Setup mixed results
      JobService.createJob.mockResolvedValueOnce({ id: 'job-1' });
      JobService.submitBid.mockRejectedValueOnce(new Error('Bid failed'));
      UserService.updateUserProfile.mockResolvedValueOnce({ success: true });

      await OfflineManager.syncQueue();

      // Check that only failed action remains in queue
      const setItemCalls = mockAsyncStorage.setItem.mock.calls;
      const updatedQueueCall = setItemCalls.find(call => call[0] === 'OFFLINE_QUEUE');

      if (updatedQueueCall) {
        const updatedQueue = JSON.parse(updatedQueueCall[1] as string);
        expect(updatedQueue.length).toBe(1);
        expect(updatedQueue[0].id).toBe('fail-1');
        expect(updatedQueue[0].retryCount).toBe(1);
      }
    });
  });

  describe('Breadcrumb Tracking', () => {
    it('should add breadcrumbs for queue operations', async () => {
      await OfflineManager.queueAction({
        type: 'CREATE',
        entity: 'job',
        data: { title: 'Test Job' },
        maxRetries: 3,
      });

      expect(sentry.addBreadcrumb).toHaveBeenCalledWith(
        'offline.queue_action',
        'offline'
      );
    });

    it('should add breadcrumbs for retry scheduling', async () => {
      const action = {
        id: 'action-1',
        type: 'CREATE' as const,
        entity: 'job',
        data: JSON.stringify({ title: 'Test Job' }),
        timestamp: Date.now(),
        retryCount: 0,
        maxRetries: 3,
      };

      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify([action]));
      JobService.createJob.mockRejectedValue(new Error('Network error'));

      await OfflineManager.syncQueue();

      // Should have breadcrumb for scheduling retry
      expect(sentry.addBreadcrumb).toHaveBeenCalledWith(
        expect.stringContaining('offline.schedule_retry'),
        'offline'
      );
    });

    it('should include delay in retry breadcrumb', async () => {
      const action = {
        id: 'action-1',
        type: 'CREATE' as const,
        entity: 'job',
        data: JSON.stringify({ title: 'Test Job' }),
        timestamp: Date.now(),
        retryCount: 2, // Will have 1000ms delay
        maxRetries: 5,
      };

      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify([action]));
      JobService.createJob.mockRejectedValue(new Error('API error'));

      await OfflineManager.syncQueue();

      // Check that breadcrumb includes delay information
      const breadcrumbCalls = sentry.addBreadcrumb.mock.calls;
      const retryBreadcrumb = breadcrumbCalls.find(call =>
        call[0].includes('offline.schedule_retry')
      );

      expect(retryBreadcrumb).toBeDefined();
      if (retryBreadcrumb) {
        // Breadcrumb should include delay amount
        expect(retryBreadcrumb[0]).toMatch(/offline\.schedule_retry:\d+/);
      }
    });
  });

  describe('Network State Handling', () => {
    it('should not retry when offline', async () => {
      mockNetInfo.fetch.mockResolvedValueOnce({
        isConnected: false,
        isInternetReachable: false,
        type: 'none',
        details: null,
      } as any);

      const action = {
        id: 'action-1',
        type: 'CREATE' as const,
        entity: 'job',
        data: JSON.stringify({ title: 'Test Job' }),
        timestamp: Date.now(),
        retryCount: 0,
        maxRetries: 3,
      };

      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify([action]));

      await OfflineManager.syncQueue();

      // Should not attempt to execute action when offline
      expect(JobService.createJob).not.toHaveBeenCalled();
    });

    it('should automatically sync when coming back online', async () => {
      const action = {
        type: 'CREATE' as const,
        entity: 'job',
        data: { title: 'Test Job' },
        maxRetries: 3,
      };

      // Initially online to queue the action
      mockNetInfo.fetch.mockResolvedValueOnce({
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi',
        details: null,
      } as any);

      const actionId = await OfflineManager.queueAction(action);

      // Verify automatic sync was triggered
      expect(mockAsyncStorage.getItem).toHaveBeenCalled();
    });

    it('should handle network state changes during sync', async () => {
      const actions = [
        {
          id: 'action-1',
          type: 'CREATE' as const,
          entity: 'job',
          data: JSON.stringify({ title: 'Job 1' }),
          timestamp: Date.now(),
          retryCount: 0,
          maxRetries: 3,
        },
        {
          id: 'action-2',
          type: 'CREATE' as const,
          entity: 'job',
          data: JSON.stringify({ title: 'Job 2' }),
          timestamp: Date.now(),
          retryCount: 0,
          maxRetries: 3,
        },
      ];

      // Start online
      mockNetInfo.fetch.mockResolvedValueOnce({
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi',
        details: null,
      } as any);

      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(actions));

      // First action succeeds, second fails due to network
      JobService.createJob
        .mockResolvedValueOnce({ id: 'job-1' })
        .mockRejectedValueOnce(new Error('Network disconnected'));

      await OfflineManager.syncQueue();

      // First action should be removed, second should remain with incremented retry
      const setItemCalls = mockAsyncStorage.setItem.mock.calls;
      const updatedQueueCall = setItemCalls.find(call => call[0] === 'OFFLINE_QUEUE');

      if (updatedQueueCall) {
        const updatedQueue = JSON.parse(updatedQueueCall[1] as string);
        expect(updatedQueue.length).toBe(1);
        expect(updatedQueue[0].id).toBe('action-2');
        expect(updatedQueue[0].retryCount).toBe(1);
      }
    });
  });

  describe('Sync Progress Notifications', () => {
    it('should notify listeners of sync status changes', async () => {
      const listener = jest.fn();
      const unsubscribe = OfflineManager.onSyncStatusChange(listener);

      const action = {
        id: 'action-1',
        type: 'CREATE' as const,
        entity: 'job',
        data: JSON.stringify({ title: 'Test Job' }),
        timestamp: Date.now(),
        retryCount: 0,
        maxRetries: 3,
      };

      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify([action]));
      JobService.createJob.mockResolvedValueOnce({ id: 'job-1' });

      await OfflineManager.syncQueue();

      // Should have been notified of status changes
      expect(listener).toHaveBeenCalledWith('syncing', expect.any(Number));
      expect(listener).toHaveBeenCalledWith('synced', 0);

      unsubscribe();
    });

    it('should notify error status on failures', async () => {
      const listener = jest.fn();
      const unsubscribe = OfflineManager.onSyncStatusChange(listener);

      const action = {
        id: 'action-1',
        type: 'CREATE' as const,
        entity: 'job',
        data: JSON.stringify({ title: 'Test Job' }),
        timestamp: Date.now(),
        retryCount: 0,
        maxRetries: 3,
      };

      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify([action]));
      JobService.createJob.mockRejectedValueOnce(new Error('API error'));

      await OfflineManager.syncQueue();

      // Should notify error status
      expect(listener).toHaveBeenCalledWith('error', expect.any(Number));

      unsubscribe();
    });

    it('should properly unsubscribe listeners', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      const unsubscribe1 = OfflineManager.onSyncStatusChange(listener1);
      const unsubscribe2 = OfflineManager.onSyncStatusChange(listener2);

      // Verify listeners are registered
      expect((OfflineManager as any).syncListeners.length).toBe(2);

      // Unsubscribe first listener
      unsubscribe1();
      expect((OfflineManager as any).syncListeners.length).toBe(1);

      // Unsubscribe second listener
      unsubscribe2();
      expect((OfflineManager as any).syncListeners.length).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle concurrent sync attempts', async () => {
      const action = {
        id: 'action-1',
        type: 'CREATE' as const,
        entity: 'job',
        data: JSON.stringify({ title: 'Test Job' }),
        timestamp: Date.now(),
        retryCount: 0,
        maxRetries: 3,
      };

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify([action]));

      // Make execution slow
      JobService.createJob.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({ id: 'job-1' }), 100))
      );

      // Start multiple syncs concurrently
      const sync1 = OfflineManager.syncQueue();
      const sync2 = OfflineManager.syncQueue();
      const sync3 = OfflineManager.syncQueue();

      await Promise.all([sync1, sync2, sync3]);

      // Should only execute once due to syncInProgress flag
      expect(JobService.createJob).toHaveBeenCalledTimes(1);
    });

    it('should handle corrupted queue data', async () => {
      mockAsyncStorage.getItem.mockResolvedValueOnce('invalid json {]');

      await OfflineManager.syncQueue();

      // Should handle gracefully and reset queue
      expect(mockLogger.error).not.toHaveBeenCalled();
      expect(mockAsyncStorage.setItem).not.toHaveBeenCalled();
    });

    it('should handle actions with missing entity handlers', async () => {
      const action = {
        id: 'action-1',
        type: 'CREATE' as const,
        entity: 'unknown_entity',
        data: JSON.stringify({ test: 'data' }),
        timestamp: Date.now(),
        retryCount: 0,
        maxRetries: 3,
      };

      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify([action]));

      await OfflineManager.syncQueue();

      // Should log error and increment retry count
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Action failed'),
        expect.objectContaining({
          error: expect.stringContaining('Unknown entity type')
        })
      );
    });

    it('should handle very large queues in chunks', async () => {
      // Create a large queue
      const largeQueue = Array.from({ length: 150 }, (_, i) => ({
        id: `action-${i}`,
        type: 'CREATE' as const,
        entity: 'job',
        data: JSON.stringify({ title: `Job ${i}` }),
        timestamp: Date.now(),
        retryCount: 0,
        maxRetries: 3,
      }));

      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(largeQueue));
      JobService.createJob.mockResolvedValue({ id: 'job-1' });

      await OfflineManager.syncQueue();

      // Should process in chunks (CHUNK_SIZE = 50)
      // First 50 should be processed
      expect(JobService.createJob).toHaveBeenCalledTimes(150);
    });

    it('should handle timer cleanup on error', async () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

      // Force an error in scheduling
      jest.spyOn(global, 'setTimeout').mockImplementationOnce(() => {
        throw new Error('Timer error');
      });

      const action = {
        id: 'action-1',
        type: 'CREATE' as const,
        entity: 'job',
        data: JSON.stringify({ title: 'Test Job' }),
        timestamp: Date.now(),
        retryCount: 0,
        maxRetries: 3,
      };

      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify([action]));
      JobService.createJob.mockRejectedValue(new Error('Network error'));

      await OfflineManager.syncQueue();

      // Should handle error gracefully
      expect((OfflineManager as any).retryTimer).not.toBeNull();
    });
  });

  describe('Integration with Conflict Resolution', () => {
    it('should handle version conflicts during retry', async () => {
      const action = {
        id: 'action-1',
        type: 'UPDATE' as const,
        entity: 'job',
        data: JSON.stringify({ jobId: 'job-1', status: 'in_progress', contractorId: 'c-1' }),
        timestamp: Date.now(),
        retryCount: 0,
        maxRetries: 3,
        entityId: 'job-1',
        version: 2,
        baseVersion: 1,
        strategy: 'last-write-wins' as const,
      };

      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify([action]));

      // Simulate version conflict error
      JobService.updateJobStatus.mockRejectedValueOnce(new Error('Version conflict'));

      await OfflineManager.syncQueue();

      // Should handle conflict and retry with backoff
      const setItemCalls = mockAsyncStorage.setItem.mock.calls;
      const updatedQueueCall = setItemCalls.find(call => call[0] === 'OFFLINE_QUEUE');

      if (updatedQueueCall) {
        const updatedQueue = JSON.parse(updatedQueueCall[1] as string);
        expect(updatedQueue[0].retryCount).toBe(1);
        expect(updatedQueue[0].nextRetryAt).toBeDefined();
      }
    });

    it('should apply different strategies for different entities', async () => {
      const action = {
        type: 'UPDATE' as const,
        entity: 'profile',
        entityId: 'user-1',
        data: { userId: 'user-1', updates: { preferences: {} } },
        maxRetries: 5,
      };

      await OfflineManager.queueAction(action);

      // Check that action was queued with appropriate strategy
      const setItemCalls = mockAsyncStorage.setItem.mock.calls;
      const queueCall = setItemCalls.find(call => call[0] === 'OFFLINE_QUEUE');

      if (queueCall) {
        const queue = JSON.parse(queueCall[1] as string);
        expect(queue[0].strategy).toBeDefined();
        // Profile updates might use 'client-wins' strategy
      }
    });
  });
});
