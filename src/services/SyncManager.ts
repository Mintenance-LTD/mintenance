import { AppState, AppStateStatus } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { LocalDatabase } from './LocalDatabase';
import { AuthService } from './AuthService';
import { JobService } from './JobService';
import { MessagingService } from './MessagingService';
import { queryClient } from '../lib/queryClient';
import { logger } from '../utils/logger';
import { User, Job } from '../types';

export type SyncStrategy = 'immediate' | 'background' | 'manual';
export type SyncDirection = 'upload' | 'download' | 'bidirectional';

export interface SyncOptions {
  strategy: SyncStrategy;
  direction: SyncDirection;
  batchSize?: number;
  timeout?: number;
}

export interface SyncStatus {
  isActive: boolean;
  lastSyncTime: Date | null;
  pendingUploads: number;
  pendingDownloads: number;
  errors: SyncError[];
}

export interface SyncError {
  id: string;
  entity: string;
  operation: string;
  error: string;
  timestamp: Date;
  retryCount: number;
}

class SyncManagerService {
  private isInitialized = false;
  private syncInProgress = false;
  private backgroundTimer: NodeJS.Timeout | null = null;
  private appStateSubscription: any = null;
  private networkSubscription: any = null;
  private syncListeners: ((status: SyncStatus) => void)[] = [];
  
  private readonly DEFAULT_BATCH_SIZE = 50;
  private readonly DEFAULT_TIMEOUT = 30000; // 30 seconds
  private readonly BACKGROUND_SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes

  async init(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize local database
      await LocalDatabase.init();

      // Setup app state listener for background sync
      this.appStateSubscription = AppState.addEventListener(
        'change',
        this.handleAppStateChange.bind(this)
      );

      // Setup network listener for automatic sync on reconnection
      this.networkSubscription = NetInfo.addEventListener((state) => {
        if (state.isConnected && state.isInternetReachable) {
          logger.info('Network reconnected, triggering sync');
          this.syncAll({ strategy: 'immediate', direction: 'bidirectional' });
        }
      });

      // Start background sync timer
      this.startBackgroundSync();

      this.isInitialized = true;
      logger.info('SyncManager initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize SyncManager:', error);
      throw error;
    }
  }

  /**
   * Sync all entities with configurable options
   */
  async syncAll(options: Partial<SyncOptions> = {}): Promise<SyncStatus> {
    const config: SyncOptions = {
      strategy: 'immediate',
      direction: 'bidirectional',
      batchSize: this.DEFAULT_BATCH_SIZE,
      timeout: this.DEFAULT_TIMEOUT,
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
      // Check network connectivity
      const networkState = await NetInfo.fetch();
      if (!networkState.isConnected || !networkState.isInternetReachable) {
        throw new Error('No internet connection available');
      }

      // Sync in order of dependency (users first, then jobs, then messages)
      if (config.direction === 'download' || config.direction === 'bidirectional') {
        // Download remote changes first
        await this.downloadUsers(config).catch(error => {
          errors.push(this.createSyncError('user', 'download', error));
        });

        await this.downloadJobs(config).catch(error => {
          errors.push(this.createSyncError('job', 'download', error));
        });

        await this.downloadMessages(config).catch(error => {
          errors.push(this.createSyncError('message', 'download', error));
        });
      }

      if (config.direction === 'upload' || config.direction === 'bidirectional') {
        // Upload local changes
        await this.uploadDirtyRecords('users', config).catch(error => {
          errors.push(this.createSyncError('user', 'upload', error));
        });

        await this.uploadDirtyRecords('jobs', config).catch(error => {
          errors.push(this.createSyncError('job', 'upload', error));
        });

        await this.uploadDirtyRecords('messages', config).catch(error => {
          errors.push(this.createSyncError('message', 'upload', error));
        });

        // Process offline action queue
        await this.processOfflineActions().catch(error => {
          errors.push(this.createSyncError('action_queue', 'process', error));
        });
      }

      // Update sync metadata
      await this.updateSyncMetadata();

      // Invalidate React Query cache to trigger UI refresh
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

  /**
   * Download users from remote server
   */
  private async downloadUsers(config: SyncOptions): Promise<void> {
    const currentUser = await AuthService.getCurrentUser();
    if (!currentUser) return;

    logger.debug('Downloading users');
    
    // For contractors, we might want to download other users for discovery
    if (currentUser.role === 'contractor') {
      // Implementation would depend on your API design
      // For now, just ensure current user is up to date
      await LocalDatabase.saveUser(currentUser, false);
    }
  }

  /**
   * Download jobs from remote server
   */
  private async downloadJobs(config: SyncOptions): Promise<void> {
    const currentUser = await AuthService.getCurrentUser();
    if (!currentUser) return;

    logger.debug('Downloading jobs');

    try {
      // Get available jobs for contractors, own jobs for homeowners
      let remoteJobs: Job[] = [];
      
      if (currentUser.role === 'contractor') {
        remoteJobs = await JobService.getAvailableJobs();
      } else {
        remoteJobs = await JobService.getJobsByHomeowner(currentUser.id);
      }

      // Save to local database
      for (const job of remoteJobs) {
        await LocalDatabase.saveJob(job, false);
      }

      logger.debug('Downloaded jobs', { count: remoteJobs.length });
    } catch (error) {
      logger.error('Failed to download jobs:', error);
      throw error;
    }
  }

  /**
   * Download messages from remote server
   */
  private async downloadMessages(config: SyncOptions): Promise<void> {
    const currentUser = await AuthService.getCurrentUser();
    if (!currentUser) return;

    logger.debug('Downloading messages');

    try {
      // Get user's job conversations
      const jobs = await LocalDatabase.getJobsByStatus('assigned', currentUser.id);
      
      for (const job of jobs) {
        try {
          const messages = await MessagingService.getJobMessages(job.id, config.batchSize);
          
          for (const message of messages) {
            // Remove computed fields before saving
            const { senderName, senderRole, ...messageData } = message;
            await LocalDatabase.saveMessage(messageData, false);
          }
        } catch (error) {
          logger.warn('Failed to download messages for job', { jobId: job.id, error });
        }
      }

      logger.debug('Downloaded messages for jobs', { jobCount: jobs.length });
    } catch (error) {
      logger.error('Failed to download messages:', error);
      throw error;
    }
  }

  /**
   * Upload dirty records to remote server
   */
  private async uploadDirtyRecords(table: string, config: SyncOptions): Promise<void> {
    const dirtyRecords = await LocalDatabase.getDirtyRecords(table);
    if (dirtyRecords.length === 0) return;

    logger.debug(`Uploading dirty ${table}`, { count: dirtyRecords.length });

    for (const record of dirtyRecords.slice(0, config.batchSize || this.DEFAULT_BATCH_SIZE)) {
      try {
        await this.uploadRecord(table, record);
        await LocalDatabase.markRecordSynced(table, record.id);
      } catch (error) {
        logger.error(`Failed to upload ${table} record`, error as unknown, { id: record.id });
        // Don't mark as synced, will retry next time
      }
    }
  }

  /**
   * Upload individual record based on table type
   */
  private async uploadRecord(table: string, record: any): Promise<void> {
    switch (table) {
      case 'users':
        await AuthService.updateUserProfile(record.id, record);
        break;
      case 'jobs':
        // Would need to implement job update API
        logger.warn('Job updates not implemented yet');
        break;
      case 'messages':
        await MessagingService.sendMessage(
          record.job_id,
          record.receiver_id,
          record.message_text,
          record.sender_id,
          record.message_type,
          record.attachment_url
        );
        break;
      default:
        throw new Error(`Unknown table: ${table}`);
    }
  }

  /**
   * Process queued offline actions
   */
  private async processOfflineActions(): Promise<void> {
    const actions = await LocalDatabase.getOfflineActions();
    if (actions.length === 0) return;

    logger.debug('Processing offline actions', { count: actions.length });

    for (const action of actions) {
      try {
        const data = JSON.parse(action.data);
        
        switch (action.entity) {
          case 'job':
            await this.processJobAction(action.type, data);
            break;
          case 'message':
            await this.processMessageAction(action.type, data);
            break;
          default:
            logger.warn('Unknown action entity:', action.entity);
        }

        await LocalDatabase.removeOfflineAction(action.id);
        logger.debug('Processed offline action:', action.id);
      } catch (error) {
        logger.error('Failed to process offline action', error as unknown, { id: action.id });
        // Keep action in queue for retry
      }
    }
  }

  private async processJobAction(type: string, data: any): Promise<void> {
    switch (type) {
      case 'CREATE':
        await JobService.createJob(data);
        break;
      case 'UPDATE':
        await JobService.updateJobStatus(data.jobId, data.status, data.contractorId);
        break;
      default:
        throw new Error(`Unknown job action: ${type}`);
    }
  }

  private async processMessageAction(type: string, data: any): Promise<void> {
    switch (type) {
      case 'CREATE':
        await MessagingService.sendMessage(
          data.jobId,
          data.receiverId,
          data.messageText,
          data.senderId,
          data.messageType,
          data.attachmentUrl
        );
        break;
      default:
        throw new Error(`Unknown message action: ${type}`);
    }
  }

  /**
   * Update sync metadata for all tables
   */
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

  /**
   * Get current sync status
   */
  getSyncStatus(): SyncStatus {
    return {
      isActive: this.syncInProgress,
      lastSyncTime: new Date(), // Would be stored in metadata
      pendingUploads: 0, // Would be calculated from dirty records
      pendingDownloads: 0, // Would be calculated from sync metadata
      errors: [], // Would be stored in local database
    };
  }

  /**
   * Handle app state changes for background sync
   */
  private handleAppStateChange(nextAppState: AppStateStatus): void {
    if (nextAppState === 'active') {
      // App became active, trigger sync
      logger.info('App became active, triggering sync');
      this.syncAll({ strategy: 'background', direction: 'bidirectional' });
    }
  }

  /**
   * Start background sync timer
   */
  private startBackgroundSync(): void {
    this.backgroundTimer = setInterval(() => {
      this.syncAll({ strategy: 'background', direction: 'upload' });
    }, this.BACKGROUND_SYNC_INTERVAL);
  }

  /**
   * Stop background sync timer
   */
  private stopBackgroundSync(): void {
    if (this.backgroundTimer) {
      clearInterval(this.backgroundTimer);
      this.backgroundTimer = null;
    }
  }

  /**
   * Create sync error object
   */
  private createSyncError(entity: string, operation: string, error: any): SyncError {
    return {
      id: `${entity}_${operation}_${Date.now()}`,
      entity,
      operation,
      error: error.message || 'Unknown error',
      timestamp: new Date(),
      retryCount: 0,
    };
  }

  /**
   * Add sync status listener
   */
  onSyncStatusChange(callback: (status: SyncStatus) => void): () => void {
    this.syncListeners.push(callback);
    
    return () => {
      const index = this.syncListeners.indexOf(callback);
      if (index > -1) {
        this.syncListeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify all sync listeners
   */
  private notifySyncListeners(status: SyncStatus): void {
    this.syncListeners.forEach(callback => {
      try {
        callback(status);
      } catch (error) {
        logger.error('Error in sync status callback:', error);
      }
    });
  }

  /**
   * Manual sync trigger
   */
  async forcSync(): Promise<SyncStatus> {
    return this.syncAll({ strategy: 'manual', direction: 'bidirectional' });
  }

  /**
   * Clear all local data and resync
   */
  async resetAndResync(): Promise<SyncStatus> {
    await LocalDatabase.clearAllData();
    return this.syncAll({ strategy: 'manual', direction: 'download' });
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.stopBackgroundSync();
    
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
    }
    
    if (this.networkSubscription) {
      this.networkSubscription();
    }
    
    await LocalDatabase.close();
    this.isInitialized = false;
    
    logger.info('SyncManager cleanup completed');
  }
}

export const SyncManager = new SyncManagerService();
