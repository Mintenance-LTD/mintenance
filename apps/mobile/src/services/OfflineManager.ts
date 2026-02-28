import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../utils/logger';
import { queryClient } from '../lib/queryClient';
import NetInfo from '@react-native-community/netinfo';
import { EntityVersionTracker } from './offline/EntityVersionTracker';
import { DataMerger } from './offline/DataMerger';
import { ActionExecutor } from './offline/ActionExecutor';
import { ConflictManager } from './offline/ConflictManager';
import type {
  OfflineAction,
  OfflineActionWithRetry,
  SyncStatus,
  DataConflict,
} from './offline/types';

// Re-export public types so existing imports from this module continue to work
export type { ConflictResolutionStrategy, DataConflict, OfflineAction, SyncStatus } from './offline/types';

class OfflineManagerClass {
  private readonly OFFLINE_QUEUE_KEY = 'OFFLINE_QUEUE';
  private readonly MAX_RETRIES = 3;
  private readonly CHUNK_SIZE = 50;
  private syncInProgress = false;
  private retryTimer: NodeJS.Timeout | null = null;
  // CRITICAL FIX: Memory leak prevention - use unsubscribe from onSyncStatusChange()
  private syncListeners: ((status: SyncStatus, pendingCount: number) => void)[] = [];

  private readonly versionTracker = new EntityVersionTracker();
  private readonly dataMerger = new DataMerger();
  private readonly actionExecutor = new ActionExecutor();
  private readonly conflictManager: ConflictManager;

  // OFFLINE QUEUE CONSOLIDATION FIX: Always use AsyncStorage for consistency
  private get shouldUseAsyncStorage(): boolean {
    return true;
  }

  constructor() {
    this.conflictManager = new ConflictManager(
      this.versionTracker,
      this.dataMerger,
      (action) => this.queueAction(action)
    );
  }

  async queueAction(
    action: Omit<OfflineAction, 'id' | 'timestamp' | 'retryCount'>
  ): Promise<string> {
    try { const sentry = require('../config/sentry'); sentry.addBreadcrumb?.('offline.queue_action', 'offline'); } catch {}
    const actionId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    try {
      const existing = (await AsyncStorage.getItem(this.OFFLINE_QUEUE_KEY)) || '[]';
      let queue: OfflineAction[];
      try { queue = JSON.parse(existing); } catch { queue = []; }

      const baseVersion = action.entityId
        ? await this.versionTracker.getEntityVersion(action.entity, action.entityId)
        : undefined;
      const strategy =
        action.strategy ||
        this.conflictManager.getDefaultStrategy(action.entity, action.type);

      const queued: OfflineAction = {
        id: actionId,
        type: action.type,
        entity: action.entity,
        data: action.data,
        timestamp: Date.now(),
        retryCount: 0,
        maxRetries: action.maxRetries || this.MAX_RETRIES,
        queryKey: action.queryKey,
        version: action.version,
        entityId: action.entityId,
        baseVersion,
        strategy,
      };
      queue.push(queued);
      await AsyncStorage.setItem(this.OFFLINE_QUEUE_KEY, JSON.stringify(queue));
      logger.info('Action queued for offline sync', {
        actionId, type: action.type, entity: action.entity,
        version: action.version, baseVersion, strategy,
      });

      const networkState = await NetInfo.fetch();
      if (networkState.isConnected && networkState.isInternetReachable) {
        this.syncQueue();
      }

      const pendingCount = await this.getPendingActionsCount();
      this.notifySyncListeners('pending', pendingCount);
      return actionId;
    } catch (error) {
      logger.error('Failed to queue offline action:', error, { action });
      throw error;
    }
  }

  async getQueue(): Promise<OfflineAction[]> {
    try {
      const existing = await AsyncStorage.getItem(this.OFFLINE_QUEUE_KEY);
      if (!existing) return [];
      try { return JSON.parse(existing); } catch { return []; }
    } catch (error) {
      logger.error('Failed to get offline queue:', error);
      return [];
    }
  }

  async clearQueue(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.OFFLINE_QUEUE_KEY);
      this.notifySyncListeners('synced', 0);
      logger.info('Offline queue cleared');
    } catch (error) {
      logger.error('Failed to clear offline queue:', error);
    }
  }

  async syncQueue(): Promise<void> {
    try { const sentry = require('../config/sentry'); sentry.addBreadcrumb?.('offline.sync_start', 'offline'); } catch {}
    const networkState = await NetInfo.fetch();
    if (this.syncInProgress) { logger.debug('Sync already in progress, skipping'); return; }
    if (!networkState.isConnected || !networkState.isInternetReachable) {
      logger.debug('Device is offline, skipping sync');
      return;
    }

    this.syncInProgress = true;
    this.notifySyncListeners('syncing', 0);

    try {
      const queue = await this.getQueue();
      if (queue.length === 0) { this.notifySyncListeners('synced', 0); return; }
      logger.info('Starting offline queue sync', { queueLength: queue.length });

      const failedActions: OfflineAction[] = [];
      let syncedCount = 0;

      for (let start = 0; start < queue.length; start += this.CHUNK_SIZE) {
        const batch = queue.slice(start, start + this.CHUNK_SIZE);
        for (const action of batch) {
          try {
            const conflict = await this.conflictManager.detectConflict(action);
            if (conflict) {
              const resolved = await this.conflictManager.resolveConflict(conflict);
              if (!resolved) {
                await this.conflictManager.addToConflictQueue(conflict);
                this.notifySyncListeners('conflict', failedActions.length);
                logger.warn('Conflict requires manual resolution', { actionId: action.id });
                continue;
              }
              if (conflict.resolution === 'merged' && conflict.mergedData) {
                action.data = conflict.mergedData;
              } else if (conflict.resolution === 'server') {
                logger.info('Conflict resolved: server version kept', { actionId: action.id });
                continue;
              }
            }

            await this.actionExecutor.executeAction(action);
            syncedCount++;

            if (action.entityId) {
              await this.versionTracker.updateEntityVersion(action.entity, action.entityId);
            }
            if (action.queryKey) {
              await queryClient.invalidateQueries({ queryKey: action.queryKey });
            }
            logger.debug('Action synced successfully', { actionId: action.id, type: action.type });
          } catch (error) {
            action.retryCount++;
            if (action.retryCount < action.maxRetries) {
              const actionWithRetry = action as OfflineActionWithRetry;
              actionWithRetry.nextRetryAt =
                Date.now() + Math.min(30000, 500 * Math.pow(2, action.retryCount - 1));
              failedActions.push(action);
              logger.warn('Action failed, will retry', {
                actionId: action.id,
                retryCount: action.retryCount,
                error: (error as Error).message,
              });
            } else {
              logger.error('Action failed permanently, removed from queue', error, {
                actionId: action.id, type: action.type, entity: action.entity,
              });
            }
          }
        }
      }

      if (this.shouldUseAsyncStorage) {
        await AsyncStorage.setItem(
          this.OFFLINE_QUEUE_KEY,
          JSON.stringify(failedActions.map((a) => ({ ...a })))
        );
      }

      const status: SyncStatus = failedActions.length > 0 ? 'error' : 'synced';
      this.notifySyncListeners(status, failedActions.length);
      logger.info('Offline queue sync completed', {
        totalActions: queue.length, syncedActions: syncedCount, failedActions: failedActions.length,
      });

      if (failedActions.length > 0) {
        const now = Date.now();
        const minDelay = Math.max(
          250,
          Math.min(
            30000,
            Math.min(
              ...failedActions.map((a) => {
                const ar = a as OfflineActionWithRetry;
                return Math.max(0, (ar.nextRetryAt || now + 500) - now);
              })
            )
          )
        );
        this.scheduleNextSync(minDelay);
      }
    } catch (error) {
      logger.error('Failed to sync offline queue:', error);
      this.notifySyncListeners('error', 0);
    } finally {
      this.syncInProgress = false;
    }
  }

  private scheduleNextSync(delayMs: number): void {
    try {
      if (this.retryTimer) { clearTimeout(this.retryTimer); this.retryTimer = null; }
      try { const sentry = require('../config/sentry'); sentry.addBreadcrumb?.(`offline.schedule_retry:${delayMs}`, 'offline'); } catch {}
      this.retryTimer = setTimeout(() => { this.retryTimer = null; this.syncQueue(); }, Math.max(0, delayMs | 0));
      if (this.retryTimer && typeof (this.retryTimer as NodeJS.Timeout).unref === 'function') {
        (this.retryTimer as NodeJS.Timeout).unref();
      }
    } catch {}
  }

  /**
   * Subscribe to sync status changes.
   * CRITICAL FIX: Returns unsubscribe function to prevent memory leaks.
   * Always call the returned function on component unmount.
   */
  onSyncStatusChange(
    callback: (status: SyncStatus, pendingCount: number) => void
  ): () => void {
    this.syncListeners.push(callback);
    return () => {
      const index = this.syncListeners.indexOf(callback);
      if (index > -1) this.syncListeners.splice(index, 1);
    };
  }

  private notifySyncListeners(status: SyncStatus, pendingCount: number): void {
    this.syncListeners.forEach((callback) => {
      try { callback(status, pendingCount); } catch (error) {
        logger.error('Error in sync status callback:', error);
      }
    });
  }

  async getPendingActionsCount(): Promise<number> {
    try {
      const existing = await AsyncStorage.getItem(this.OFFLINE_QUEUE_KEY);
      if (!existing) return 0;
      try { const queue = JSON.parse(existing); return Array.isArray(queue) ? queue.length : 0; } catch { return 0; }
    } catch (error) {
      logger.error('Failed to get pending actions count:', error);
      return 0;
    }
  }

  async hasPendingActions(): Promise<boolean> {
    return (await this.getPendingActionsCount()) > 0;
  }

  // ---- Conflict management delegation ----

  async getConflicts(): Promise<DataConflict[]> {
    return this.conflictManager.getConflicts();
  }

  async resolveConflictManually(
    conflictId: string,
    resolution: 'client' | 'server' | 'merged',
    mergedData?: unknown
  ): Promise<void> {
    return this.conflictManager.resolveConflictManually(conflictId, resolution, mergedData);
  }

  async clearResolvedConflicts(): Promise<void> {
    return this.conflictManager.clearResolvedConflicts();
  }

  onConflictDetected(callback: (conflicts: DataConflict[]) => void): () => void {
    return this.conflictManager.onConflictDetected(callback);
  }
}

export const OfflineManager = new OfflineManagerClass();
