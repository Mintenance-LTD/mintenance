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
  private syncInProgress = false;
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
    const config: SyncOptions = {
      strategy: 'immediate',
      direction: 'bidirectional',
      batchSize: SYNC_DEFAULTS.BATCH_SIZE,
      timeout: SYNC_DEFAULTS.TIMEOUT_MS,
      ...options,
    };

    if (this.syncInProgress) {
      logger.warn('Sync already in progress, skipping');
      return this.getSyncStatus();
    }

    this.syncInProgress = true;
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

      const status = this.getSyncStatus();
      this.notifySyncListeners(status);

      logger.info('Full sync completed', {
        errors: errors.length,
        duration: Date.now(),
      });
      return status;
    } catch (error) {
      logger.error('Full sync failed:', error);
      errors.push(this.createSyncError('sync_manager', 'full_sync', error));
      const status = { ...this.getSyncStatus(), errors };
      this.notifySyncListeners(status);
      return status;
    } finally {
      this.syncInProgress = false;
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
    return {
      isActive: this.syncInProgress,
      lastSyncTime: new Date(),
      pendingUploads: 0,
      pendingDownloads: 0,
      errors: [],
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
