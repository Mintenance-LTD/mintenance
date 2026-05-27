import { AppState, AppStateStatus } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { LocalDatabase } from './LocalDatabase';
import { queryClient } from '../lib/queryClient';
import { logger } from '../utils/logger';

import {
  SYNC_DEFAULTS,
  type AppStateSubscription,
  type NetworkUnsubscribe,
  type SyncError,
  type SyncOptions,
  type SyncStatus,
} from './sync/types';
import { downloadJobs, downloadMessages, downloadUsers } from './sync/download';
import { uploadDirtyRecords } from './sync/upload';
import { processOfflineActions } from './sync/offline-actions';

/**
 * SyncManager — coordinates bidirectional sync between SQLite cache
 * and the live API. Refactored 2026-05-09: download / upload /
 * offline-action processing extracted to `sync/*`. This file owns
 * the singleton state (timers, subscriptions, listeners) and the
 * `init / syncAll / cleanup` lifecycle.
 */

// Re-export types so existing imports `from '@/services/SyncManager'`
// continue to work without a sweep through every consumer.
export type {
  SyncDirection,
  SyncError,
  SyncOptions,
  SyncStatus,
  SyncStrategy,
} from './sync/types';

class SyncManagerService {
  private isInitialized = false;
  // 2026-05-27 whole-app review Critical #6: was `syncInProgress: boolean`
  // — check-then-set is not atomic in JS event-loop semantics. Two
  // concurrent triggers (e.g. AppState 'active' + 60s background
  // timer firing within the same tick) could both observe `false`
  // and both proceed, racing on the offline-action queue and producing
  // duplicate writes. Promise-based mutex pattern: a single in-flight
  // promise is shared across concurrent callers so the second caller
  // awaits the first instead of starting a parallel sync.
  private syncPromise: Promise<SyncStatus> | null = null;
  // 2026-05-27 whole-app review Critical #7: was hardcoded to zero in
  // getSyncStatus. Cache the real values here, refreshed inside
  // syncAll. UI subscribers (NotificationScreen, settings) now see
  // actual pending-action counts and accumulated errors.
  private lastSyncTime: Date | null = null;
  private lastErrors: SyncError[] = [];
  private lastPendingUploads = 0;
  private backgroundTimer: NodeJS.Timeout | null = null;
  private appStateSubscription: AppStateSubscription | null = null;
  private networkSubscription: NetworkUnsubscribe | null = null;
  private syncListeners: ((status: SyncStatus) => void)[] = [];

  async init(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await LocalDatabase.init();

      this.appStateSubscription = AppState.addEventListener(
        'change',
        this.handleAppStateChange.bind(this)
      );

      this.networkSubscription = NetInfo.addEventListener((state) => {
        if (state.isConnected && state.isInternetReachable) {
          logger.info('Network reconnected, triggering sync');
          this.syncAll({ strategy: 'immediate', direction: 'bidirectional' });
        }
      });

      this.startBackgroundSync();
      this.isInitialized = true;
      logger.info('SyncManager initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize SyncManager:', error);
      throw error;
    }
  }

  /**
   * Sync all entities with configurable options. Sequencing matters:
   * users → jobs → messages on download, then dirty records → offline
   * actions on upload. Each phase wraps in `.catch` so a single
   * failure doesn't abort the whole sync.
   */
  async syncAll(options: Partial<SyncOptions> = {}): Promise<SyncStatus> {
    // 2026-05-27 whole-app review Critical #6: share the in-flight
    // promise across concurrent callers. The first caller's syncAll
    // runs; subsequent callers (until that promise settles) await it
    // instead of starting their own race.
    if (this.syncPromise) {
      logger.warn('Sync already in progress, awaiting in-flight result');
      return this.syncPromise;
    }
    this.syncPromise = this._doSync(options);
    try {
      return await this.syncPromise;
    } finally {
      this.syncPromise = null;
    }
  }

  private async _doSync(
    options: Partial<SyncOptions> = {}
  ): Promise<SyncStatus> {
    const config: SyncOptions = {
      strategy: 'immediate',
      direction: 'bidirectional',
      batchSize: SYNC_DEFAULTS.BATCH_SIZE,
      timeout: SYNC_DEFAULTS.TIMEOUT_MS,
      ...options,
    };

    logger.info('Starting full sync', config);

    const errors: SyncError[] = [];

    try {
      const networkState = await NetInfo.fetch();
      if (!networkState.isConnected || !networkState.isInternetReachable) {
        throw new Error('No internet connection available');
      }

      if (
        config.direction === 'download' ||
        config.direction === 'bidirectional'
      ) {
        await downloadUsers(config).catch((error) => {
          errors.push(this.createSyncError('user', 'download', error));
        });
        await downloadJobs(config).catch((error) => {
          errors.push(this.createSyncError('job', 'download', error));
        });
        await downloadMessages(config).catch((error) => {
          errors.push(this.createSyncError('message', 'download', error));
        });
      }

      if (
        config.direction === 'upload' ||
        config.direction === 'bidirectional'
      ) {
        await uploadDirtyRecords('users', config).catch((error) => {
          errors.push(this.createSyncError('user', 'upload', error));
        });
        await uploadDirtyRecords('jobs', config).catch((error) => {
          errors.push(this.createSyncError('job', 'upload', error));
        });
        await uploadDirtyRecords('messages', config).catch((error) => {
          errors.push(this.createSyncError('message', 'upload', error));
        });
        await processOfflineActions().catch((error) => {
          errors.push(this.createSyncError('action_queue', 'process', error));
        });
      }

      await this.updateSyncMetadata();
      await queryClient.invalidateQueries();

      // 2026-05-27 audit fix #7: refresh the cached pendingUploads
      // count from LocalDatabase so getSyncStatus reports the real
      // number instead of hardcoded zero.
      await this.refreshPendingUploads();
      this.lastErrors = errors;
      this.lastSyncTime = new Date();

      const status = this.getSyncStatus();
      this.notifySyncListeners(status);

      logger.info('Full sync completed', {
        errors: errors.length,
        pendingUploads: this.lastPendingUploads,
      });
      return status;
    } catch (error) {
      logger.error('Full sync failed:', error);
      errors.push(this.createSyncError('sync_manager', 'full_sync', error));
      this.lastErrors = errors;
      this.lastSyncTime = new Date();
      const status = this.getSyncStatus();
      this.notifySyncListeners(status);
      return status;
    }
  }

  /**
   * 2026-05-27 audit fix #7: pull live pendingActions from
   * LocalDatabase. Updates cached field so getSyncStatus stays sync
   * without forcing every caller to await.
   */
  private async refreshPendingUploads(): Promise<void> {
    try {
      const storageInfo = await LocalDatabase.getStorageInfo();
      this.lastPendingUploads =
        (storageInfo.pendingActions ?? 0) + (storageInfo.dirtyRecords ?? 0);
    } catch (err) {
      logger.warn('Failed to refresh pendingUploads cache', { err });
    }
  }

  // -----------------------------------------------------------------
  // Metadata + status
  // -----------------------------------------------------------------

  private async updateSyncMetadata(): Promise<void> {
    const timestamp = Date.now();
    const tables = ['users', 'jobs', 'messages', 'bids'];

    for (const table of tables) {
      const storageInfo = await LocalDatabase.getStorageInfo();
      await LocalDatabase.updateSyncMetadata({
        table,
        lastSyncTimestamp: timestamp,
        recordCount: storageInfo.totalRecords,
        isDirty: storageInfo.dirtyRecords > 0,
      });
    }
  }

  getSyncStatus(): SyncStatus {
    // 2026-05-27 whole-app review Critical #7: previously hardcoded
    // every field. Now returns the cached values populated by syncAll
    // so subscribers see real pendingUploads + errors. lastSyncTime
    // falls back to now() only if no sync has run yet (initial state).
    return {
      isActive: this.syncPromise !== null,
      lastSyncTime: this.lastSyncTime ?? new Date(),
      pendingUploads: this.lastPendingUploads,
      pendingDownloads: 0,
      errors: this.lastErrors,
    };
  }

  // -----------------------------------------------------------------
  // Lifecycle / background sync
  // -----------------------------------------------------------------

  private handleAppStateChange(nextAppState: AppStateStatus): void {
    if (nextAppState === 'active') {
      logger.info('App became active, triggering sync');
      this.syncAll({ strategy: 'background', direction: 'bidirectional' });
    }
  }

  private startBackgroundSync(): void {
    this.backgroundTimer = setInterval(() => {
      this.syncAll({ strategy: 'background', direction: 'upload' });
    }, SYNC_DEFAULTS.BACKGROUND_INTERVAL_MS);
  }

  private stopBackgroundSync(): void {
    if (this.backgroundTimer) {
      clearInterval(this.backgroundTimer);
      this.backgroundTimer = null;
    }
  }

  private createSyncError(
    entity: string,
    operation: string,
    error: Error | unknown
  ): SyncError {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    return {
      id: `${entity}_${operation}_${Date.now()}`,
      entity,
      operation,
      error: errorMessage,
      timestamp: new Date(),
      retryCount: 0,
    };
  }

  // -----------------------------------------------------------------
  // Listeners
  // -----------------------------------------------------------------

  onSyncStatusChange(callback: (status: SyncStatus) => void): () => void {
    this.syncListeners.push(callback);
    return () => {
      const index = this.syncListeners.indexOf(callback);
      if (index > -1) {
        this.syncListeners.splice(index, 1);
      }
    };
  }

  private notifySyncListeners(status: SyncStatus): void {
    this.syncListeners.forEach((callback) => {
      try {
        callback(status);
      } catch (error) {
        logger.error('Error in sync status callback:', error);
      }
    });
  }

  // -----------------------------------------------------------------
  // Public utilities
  // -----------------------------------------------------------------

  async forcSync(): Promise<SyncStatus> {
    return this.syncAll({ strategy: 'manual', direction: 'bidirectional' });
  }

  async resetAndResync(): Promise<SyncStatus> {
    await LocalDatabase.clearAllData();
    return this.syncAll({ strategy: 'manual', direction: 'download' });
  }

  async cleanup(): Promise<void> {
    this.stopBackgroundSync();

    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }

    if (this.networkSubscription) {
      this.networkSubscription();
      this.networkSubscription = null;
    }

    await LocalDatabase.close();
    this.isInitialized = false;

    logger.info('SyncManager cleanup completed');
  }
}

export const SyncManager = new SyncManagerService();
