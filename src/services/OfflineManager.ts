import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../utils/logger';
import { queryClient } from '../lib/queryClient';
import NetInfo from '@react-native-community/netinfo';

export type OfflineAction = {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  entity: string;
  data: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  queryKey?: string[];
};

export type SyncStatus = 'syncing' | 'synced' | 'error' | 'pending';

class OfflineManagerClass {
  private readonly OFFLINE_QUEUE_KEY = 'OFFLINE_QUEUE';
  private readonly MAX_RETRIES = 3;
  private syncInProgress = false;
  private syncListeners: ((status: SyncStatus, pendingCount: number) => void)[] = [];

  async queueAction(action: Omit<OfflineAction, 'id' | 'timestamp' | 'retryCount'>): Promise<string> {
    const actionId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const queuedAction: OfflineAction = {
      ...action,
      id: actionId,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: action.maxRetries || this.MAX_RETRIES,
    };

    try {
      const queue = await this.getQueue();
      queue.push(queuedAction);
      await AsyncStorage.setItem(this.OFFLINE_QUEUE_KEY, JSON.stringify(queue));
      
      logger.info('Action queued for offline sync', {
        actionId,
        type: action.type,
        entity: action.entity,
      });

      // Try to sync immediately if online
      const networkState = await NetInfo.fetch();
      if (networkState.isConnected && networkState.isInternetReachable) {
        this.syncQueue();
      }

      this.notifySyncListeners('pending', queue.length);
      return actionId;
    } catch (error) {
      logger.error('Failed to queue offline action:', error, { action });
      throw error;
    }
  }

  async getQueue(): Promise<OfflineAction[]> {
    try {
      const queueData = await AsyncStorage.getItem(this.OFFLINE_QUEUE_KEY);
      return queueData ? JSON.parse(queueData) : [];
    } catch (error) {
      logger.error('Failed to get offline queue:', error);
      return [];
    }
  }

  async clearQueue(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.OFFLINE_QUEUE_KEY);
      this.notifySyncListeners('synced', 0);
    } catch (error) {
      logger.error('Failed to clear offline queue:', error);
    }
  }

  async syncQueue(): Promise<void> {
    if (this.syncInProgress) {
      logger.debug('Sync already in progress, skipping');
      return;
    }

    const networkState = await NetInfo.fetch();
    if (!networkState.isConnected || !networkState.isInternetReachable) {
      logger.debug('Device is offline, skipping sync');
      return;
    }

    this.syncInProgress = true;
    this.notifySyncListeners('syncing', 0);

    try {
      const queue = await this.getQueue();
      if (queue.length === 0) {
        this.notifySyncListeners('synced', 0);
        return;
      }

      logger.info('Starting offline queue sync', { queueLength: queue.length });

      const failedActions: OfflineAction[] = [];
      let syncedCount = 0;

      for (const action of queue) {
        try {
          await this.executeAction(action);
          syncedCount++;
          
          // Invalidate related queries
          if (action.queryKey) {
            await queryClient.invalidateQueries({ queryKey: action.queryKey });
          }

          logger.debug('Action synced successfully', {
            actionId: action.id,
            type: action.type,
            entity: action.entity,
          });
        } catch (error) {
          action.retryCount++;
          
          if (action.retryCount < action.maxRetries) {
            failedActions.push(action);
            logger.warn('Action failed, will retry', {
              actionId: action.id,
              retryCount: action.retryCount,
              maxRetries: action.maxRetries,
              error: (error as Error).message,
            });
          } else {
            logger.error('Action failed permanently, removing from queue', error, {
              actionId: action.id,
              type: action.type,
              entity: action.entity,
            });
          }
        }
      }

      // Update queue with failed actions that still have retries
      await AsyncStorage.setItem(this.OFFLINE_QUEUE_KEY, JSON.stringify(failedActions));

      const status: SyncStatus = failedActions.length > 0 ? 'error' : 'synced';
      this.notifySyncListeners(status, failedActions.length);

      logger.info('Offline queue sync completed', {
        totalActions: queue.length,
        syncedActions: syncedCount,
        failedActions: failedActions.length,
      });
    } catch (error) {
      logger.error('Failed to sync offline queue:', error);
      this.notifySyncListeners('error', 0);
    } finally {
      this.syncInProgress = false;
    }
  }

  private async executeAction(action: OfflineAction): Promise<void> {
    // This would be implemented based on your specific API endpoints
    // For now, we'll simulate the action execution
    const { type, entity, data } = action;
    
    logger.debug('Executing offline action', {
      type,
      entity,
      actionId: action.id,
    });

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // Here you would implement actual API calls based on the action type and entity
    switch (entity) {
      case 'job':
        await this.executeJobAction(type, data);
        break;
      case 'bid':
        await this.executeBidAction(type, data);
        break;
      case 'message':
        await this.executeMessageAction(type, data);
        break;
      case 'profile':
        await this.executeProfileAction(type, data);
        break;
      default:
        throw new Error(`Unknown entity type: ${entity}`);
    }
  }

  private async executeJobAction(type: OfflineAction['type'], data: any): Promise<void> {
    const { JobService } = await import('./JobService');
    
    switch (type) {
      case 'CREATE':
        await JobService.createJob(data);
        break;
      case 'UPDATE':
        await JobService.updateJobStatus(data.jobId, data.status, data.contractorId);
        break;
      default:
        throw new Error(`Unsupported job action: ${type}`);
    }
  }

  private async executeBidAction(type: OfflineAction['type'], data: any): Promise<void> {
    const { JobService } = await import('./JobService');
    
    switch (type) {
      case 'CREATE':
        await JobService.submitBid(data);
        break;
      case 'UPDATE':
        if (data.status === 'accepted') {
          await JobService.acceptBid(data.bidId);
        }
        break;
      default:
        throw new Error(`Unsupported bid action: ${type}`);
    }
  }

  private async executeMessageAction(type: OfflineAction['type'], data: any): Promise<void> {
    const { MessagingService } = await import('./MessagingService');
    
    switch (type) {
      case 'CREATE':
        await MessagingService.sendMessage(data.jobId, data.senderId, data.message);
        break;
      default:
        throw new Error(`Unsupported message action: ${type}`);
    }
  }

  private async executeProfileAction(type: OfflineAction['type'], data: any): Promise<void> {
    const { UserService } = await import('./UserService');
    
    switch (type) {
      case 'UPDATE':
        await UserService.updateProfile(data.userId, data.updates);
        break;
      default:
        throw new Error(`Unsupported profile action: ${type}`);
    }
  }

  onSyncStatusChange(callback: (status: SyncStatus, pendingCount: number) => void): () => void {
    this.syncListeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.syncListeners.indexOf(callback);
      if (index > -1) {
        this.syncListeners.splice(index, 1);
      }
    };
  }

  private notifySyncListeners(status: SyncStatus, pendingCount: number): void {
    this.syncListeners.forEach(callback => {
      try {
        callback(status, pendingCount);
      } catch (error) {
        logger.error('Error in sync status callback:', error);
      }
    });
  }

  async getPendingActionsCount(): Promise<number> {
    const queue = await this.getQueue();
    return queue.length;
  }

  async hasPendingActions(): Promise<boolean> {
    const count = await this.getPendingActionsCount();
    return count > 0;
  }
}

export const OfflineManager = new OfflineManagerClass();