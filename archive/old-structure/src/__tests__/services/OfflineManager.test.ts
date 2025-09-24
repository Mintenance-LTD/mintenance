import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { OfflineManager, OfflineAction } from '../../services/OfflineManager';
import { queryClient } from '../../lib/queryClient';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('@react-native-community/netinfo');
jest.mock('../../lib/queryClient');
jest.mock('../../services/JobService');
jest.mock('../../services/MessagingService');
jest.mock('../../services/UserService');
jest.mock('../../utils/logger');

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockNetInfo = NetInfo as jest.Mocked<typeof NetInfo>;
const mockQueryClient = queryClient as jest.Mocked<typeof queryClient>;

describe('OfflineManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue();
    mockAsyncStorage.removeItem.mockResolvedValue();
    mockNetInfo.fetch.mockResolvedValue({
      isConnected: true,
      isInternetReachable: true,
    } as any);
  });

  describe('queueAction', () => {
    it('queues an action successfully', async () => {
      const action = {
        type: 'CREATE' as const,
        entity: 'job',
        data: { title: 'Test Job' },
        maxRetries: 3,
      };

      const actionId = await OfflineManager.queueAction(action);

      expect(actionId).toBeDefined();
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'OFFLINE_QUEUE',
        expect.stringContaining('"type":"CREATE"')
      );
    });

    it('attempts immediate sync when online', async () => {
      mockNetInfo.fetch.mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
      } as any);

      const action = {
        type: 'CREATE' as const,
        entity: 'job',
        data: { title: 'Test Job' },
      };

      await OfflineManager.queueAction(action);

      expect(mockNetInfo.fetch).toHaveBeenCalled();
    });

    it('handles queue storage errors gracefully', async () => {
      mockAsyncStorage.setItem.mockRejectedValue(new Error('Storage error'));

      const action = {
        type: 'CREATE' as const,
        entity: 'job',
        data: { title: 'Test Job' },
      };

      await expect(OfflineManager.queueAction(action)).rejects.toThrow(
        'Storage error'
      );
    });
  });

  describe('getQueue', () => {
    it('returns empty array when no queue exists', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);

      const queue = await OfflineManager.getQueue();

      expect(queue).toEqual([]);
    });

    it('returns parsed queue when it exists', async () => {
      const mockQueue: OfflineAction[] = [
        {
          id: '1',
          type: 'CREATE',
          entity: 'job',
          data: { title: 'Test' },
          timestamp: Date.now(),
          retryCount: 0,
          maxRetries: 3,
        },
      ];

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockQueue));

      const queue = await OfflineManager.getQueue();

      expect(queue).toEqual(mockQueue);
    });

    it('handles JSON parse errors gracefully', async () => {
      mockAsyncStorage.getItem.mockResolvedValue('invalid json');

      const queue = await OfflineManager.getQueue();

      expect(queue).toEqual([]);
    });
  });

  describe('syncQueue', () => {
    it('skips sync when already in progress', async () => {
      // Start a sync operation
      const syncPromise1 = OfflineManager.syncQueue();
      const syncPromise2 = OfflineManager.syncQueue();

      await Promise.all([syncPromise1, syncPromise2]);

      // Second call should have been skipped
      expect(mockNetInfo.fetch).toHaveBeenCalledTimes(2); // Once per call
    });

    it('skips sync when offline', async () => {
      mockNetInfo.fetch.mockResolvedValue({
        isConnected: false,
        isInternetReachable: false,
      } as any);

      await OfflineManager.syncQueue();

      expect(mockAsyncStorage.getItem).not.toHaveBeenCalledWith(
        'OFFLINE_QUEUE'
      );
    });

    it('syncs empty queue successfully', async () => {
      mockAsyncStorage.getItem.mockResolvedValue('[]');

      await OfflineManager.syncQueue();

      expect(mockAsyncStorage.getItem).toHaveBeenCalledWith('OFFLINE_QUEUE');
    });

    it('processes actions in queue', async () => {
      const mockQueue: OfflineAction[] = [
        {
          id: '1',
          type: 'CREATE',
          entity: 'job',
          data: { title: 'Test Job' },
          timestamp: Date.now(),
          retryCount: 0,
          maxRetries: 3,
          queryKey: ['jobs', 'list'],
        },
      ];

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockQueue));

      // Mock successful job service
      const { JobService } = require('../../services/JobService');
      JobService.createJob = jest.fn().mockResolvedValue({ id: 'new-job' });

      await OfflineManager.syncQueue();

      expect(JobService.createJob).toHaveBeenCalledWith({ title: 'Test Job' });
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['jobs', 'list'],
      });
    });

    it('retries failed actions up to max retries', async () => {
      const mockQueue: OfflineAction[] = [
        {
          id: '1',
          type: 'CREATE',
          entity: 'job',
          data: { title: 'Test Job' },
          timestamp: Date.now(),
          retryCount: 0,
          maxRetries: 2,
        },
      ];

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockQueue));

      // Mock failing job service
      const { JobService } = require('../../services/JobService');
      JobService.createJob = jest
        .fn()
        .mockRejectedValue(new Error('Network error'));

      await OfflineManager.syncQueue();

      // Should update queue with increased retry count
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'OFFLINE_QUEUE',
        expect.stringContaining('"retryCount":1')
      );
    });

    it('removes actions that exceed max retries', async () => {
      const mockQueue: OfflineAction[] = [
        {
          id: '1',
          type: 'CREATE',
          entity: 'job',
          data: { title: 'Test Job' },
          timestamp: Date.now(),
          retryCount: 3,
          maxRetries: 3,
        },
      ];

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockQueue));

      // Mock failing job service
      const { JobService } = require('../../services/JobService');
      JobService.createJob = jest
        .fn()
        .mockRejectedValue(new Error('Permanent error'));

      await OfflineManager.syncQueue();

      // Should remove failed action from queue
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'OFFLINE_QUEUE',
        '[]'
      );
    });
  });

  describe('clearQueue', () => {
    it('clears the offline queue', async () => {
      await OfflineManager.clearQueue();

      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('OFFLINE_QUEUE');
    });
  });

  describe('sync status listeners', () => {
    it('notifies listeners of sync status changes', async () => {
      const mockListener = jest.fn();
      const unsubscribe = OfflineManager.onSyncStatusChange(mockListener);

      // Clear queue to trigger sync status change
      await OfflineManager.clearQueue();

      expect(mockListener).toHaveBeenCalledWith('synced', 0);

      unsubscribe();
    });

    it('handles listener errors gracefully', async () => {
      const mockListener = jest.fn().mockImplementation(() => {
        throw new Error('Listener error');
      });

      OfflineManager.onSyncStatusChange(mockListener);

      // This should not throw
      await OfflineManager.clearQueue();

      expect(mockListener).toHaveBeenCalled();
    });
  });

  describe('utility methods', () => {
    it('gets pending actions count', async () => {
      const mockQueue: OfflineAction[] = [
        {
          id: '1',
          type: 'CREATE',
          entity: 'job',
          data: {},
          timestamp: Date.now(),
          retryCount: 0,
          maxRetries: 3,
        },
        {
          id: '2',
          type: 'UPDATE',
          entity: 'job',
          data: {},
          timestamp: Date.now(),
          retryCount: 0,
          maxRetries: 3,
        },
      ];

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockQueue));

      const count = await OfflineManager.getPendingActionsCount();
      expect(count).toBe(2);
    });

    it('checks if has pending actions', async () => {
      const mockQueue: OfflineAction[] = [
        {
          id: '1',
          type: 'CREATE',
          entity: 'job',
          data: {},
          timestamp: Date.now(),
          retryCount: 0,
          maxRetries: 3,
        },
      ];

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockQueue));

      const hasPending = await OfflineManager.hasPendingActions();
      expect(hasPending).toBe(true);
    });
  });
});
