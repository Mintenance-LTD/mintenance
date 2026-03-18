// @ts-expect-error -- expo-task-manager types don't resolve in monorepo tsc; works at runtime via Metro
import * as TaskManager from 'expo-task-manager';
// @ts-expect-error -- expo-background-fetch types don't resolve in monorepo tsc; works at runtime via Metro
import * as BackgroundFetch from 'expo-background-fetch';
import NetInfo from '@react-native-community/netinfo';
import { logger } from '../utils/logger';
import { OfflineManager } from './OfflineManager';

const BACKGROUND_SYNC_TASK = 'MINTENANCE_BACKGROUND_SYNC';

/**
 * Background sync service using expo-task-manager + expo-background-fetch.
 * Syncs the offline queue when the app is in the background.
 *
 * Registration must happen at module level (outside of components)
 * per Expo's requirements.
 */

// Define the background task at module level (Expo requirement)
TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
  try {
    const networkState = await NetInfo.fetch();
    if (!networkState.isConnected || !networkState.isInternetReachable) {
      logger.debug('[BackgroundSync] No network, skipping');
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    const hasPending = await OfflineManager.hasPendingActions();
    if (!hasPending) {
      logger.debug('[BackgroundSync] No pending actions');
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    logger.info('[BackgroundSync] Syncing offline queue in background');
    await OfflineManager.syncQueue();

    const stillPending = await OfflineManager.hasPendingActions();
    return stillPending
      ? BackgroundFetch.BackgroundFetchResult.Failed
      : BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    logger.error('[BackgroundSync] Background sync failed:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export class BackgroundSyncService {
  private static registered = false;

  /**
   * Register the background sync task. Call once during app initialization.
   * Safe to call multiple times -- subsequent calls are no-ops.
   */
  static async register(): Promise<void> {
    if (this.registered) return;

    try {
      const status = await BackgroundFetch.getStatusAsync();

      if (status === BackgroundFetch.BackgroundFetchStatus.Denied) {
        logger.warn('[BackgroundSync] Background fetch denied by OS');
        return;
      }

      if (status === BackgroundFetch.BackgroundFetchStatus.Restricted) {
        logger.warn('[BackgroundSync] Background fetch restricted by OS');
        return;
      }

      await BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK, {
        minimumInterval: 15 * 60, // 15 minutes (minimum on iOS)
        stopOnTerminate: false,   // Android: continue after app killed
        startOnBoot: true,        // Android: start on device boot
      });

      this.registered = true;
      logger.info('[BackgroundSync] Background sync registered');
    } catch (error) {
      logger.error('[BackgroundSync] Failed to register:', error);
    }
  }

  /**
   * Unregister the background sync task.
   */
  static async unregister(): Promise<void> {
    try {
      const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
      if (isRegistered) {
        await BackgroundFetch.unregisterTaskAsync(BACKGROUND_SYNC_TASK);
        this.registered = false;
        logger.info('[BackgroundSync] Background sync unregistered');
      }
    } catch (error) {
      logger.error('[BackgroundSync] Failed to unregister:', error);
    }
  }

  /**
   * Check if background sync is currently registered and available.
   */
  static async isAvailable(): Promise<boolean> {
    try {
      const status = await BackgroundFetch.getStatusAsync();
      return status === BackgroundFetch.BackgroundFetchStatus.Available;
    } catch {
      return false;
    }
  }
}
