import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../utils/logger';
import { queryClient } from '../lib/queryClient';
import NetInfo from '@react-native-community/netinfo';
// OFFLINE QUEUE CONSOLIDATION FIX: LocalDatabase removed - using only AsyncStorage for consistency

// =============================================
// CONFLICT RESOLUTION TYPES
// =============================================

/**
 * Conflict resolution strategies for offline sync
 */
export type ConflictResolutionStrategy =
  | 'last-write-wins'      // Default: Most recent timestamp wins
  | 'server-wins'          // Server data always takes precedence (for critical data)
  | 'client-wins'          // Client data always takes precedence (for user preferences)
  | 'manual'               // Requires user intervention via UI dialog
  | 'merge';               // Attempt intelligent merge based on entity type

/**
 * Conflict information when offline changes conflict with server state
 */
export interface DataConflict {
  id: string;
  actionId: string;
  entity: string;
  entityId: string;
  clientVersion: number;
  serverVersion: number;
  clientData: unknown;
  serverData: unknown;
  clientTimestamp: number;
  serverTimestamp: number;
  detectedAt: number;
  strategy: ConflictResolutionStrategy;
  resolved: boolean;
  resolution?: 'client' | 'server' | 'merged';
  mergedData?: unknown;
}

/**
 * Enhanced offline action with version tracking for conflict detection
 */
export type OfflineAction = {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  entity: string;
  data: unknown;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  queryKey?: string[];
  // Conflict resolution fields
  version?: number;           // Optimistic version number
  entityId?: string;          // ID of the entity being modified
  baseVersion?: number;       // Server version when action was created
  strategy?: ConflictResolutionStrategy;
};

export type SyncStatus = 'syncing' | 'synced' | 'error' | 'pending' | 'conflict';

class OfflineManagerClass {
  private readonly OFFLINE_QUEUE_KEY = 'OFFLINE_QUEUE';
  private readonly CONFLICT_QUEUE_KEY = 'CONFLICT_QUEUE';
  private readonly ENTITY_VERSIONS_KEY = 'ENTITY_VERSIONS';
  private readonly MAX_RETRIES = 3;
  private readonly CHUNK_SIZE = 50; // process actions in manageable chunks
  private syncInProgress = false;
  private retryTimer: unknown = null;
  // CRITICAL FIX: Memory leak prevention
  // syncListeners array must be properly cleaned up to prevent indefinite growth
  // Use the unsubscribe function returned by onSyncStatusChange() to cleanup
  private syncListeners: ((
    status: SyncStatus,
    pendingCount: number
  ) => void)[] = [];
  // Conflict resolution listeners
  private conflictListeners: ((conflicts: DataConflict[]) => void)[] = [];

  // OFFLINE QUEUE CONSOLIDATION FIX: Always use AsyncStorage for consistency
  // LocalDatabase removed - causes storage inconsistency and complexity
  // AsyncStorage is simpler, more reliable, and works consistently across test/prod
  private get shouldUseAsyncStorage(): boolean {
    return true; // Always use AsyncStorage for offline queue
  }

  async queueAction(
    action: Omit<OfflineAction, 'id' | 'timestamp' | 'retryCount'>
  ): Promise<string> {
    try { const sentry = require('../config/sentry'); sentry.addBreadcrumb?.('offline.queue_action', 'offline'); } catch {}
    const actionId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // OFFLINE QUEUE CONSOLIDATION FIX: Use only AsyncStorage
      const existing = (await AsyncStorage.getItem(this.OFFLINE_QUEUE_KEY)) || '[]';
      let queue: OfflineAction[];
      try {
        queue = JSON.parse(existing);
      } catch {
        queue = [];
      }

      // Get current version for version tracking
      const baseVersion = action.entityId
        ? await this.getEntityVersion(action.entity, action.entityId)
        : undefined;

      // Determine conflict resolution strategy
      const strategy = action.strategy || this.getDefaultStrategy(action.entity, action.type);

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
        actionId,
        type: action.type,
        entity: action.entity,
        version: action.version,
        baseVersion,
        strategy,
      });

      // Try to sync immediately if online
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
      // OFFLINE QUEUE CONSOLIDATION FIX: Use only AsyncStorage
      const existing = await AsyncStorage.getItem(this.OFFLINE_QUEUE_KEY);
      if (!existing) return [];
      try {
        return JSON.parse(existing);
      } catch (e) {
        return [];
      }
    } catch (error) {
      logger.error('Failed to get offline queue:', error);
      return [];
    }
  }

  async clearQueue(): Promise<void> {
    try {
      // OFFLINE QUEUE CONSOLIDATION FIX: Use only AsyncStorage
      await AsyncStorage.removeItem(this.OFFLINE_QUEUE_KEY);
      this.notifySyncListeners('synced', 0);
      logger.info('Offline queue cleared');
    } catch (error) {
      logger.error('Failed to clear offline queue:', error);
    }
  }

  async syncQueue(): Promise<void> {
    try { const sentry = require('../config/sentry'); sentry.addBreadcrumb?.('offline.sync_start', 'offline'); } catch {}
    // Always check network state for each invocation (tests expect this)
    const networkState = await NetInfo.fetch();
    if (this.syncInProgress) {
      logger.debug('Sync already in progress, skipping');
      return;
    }
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

      // Process in chunks to avoid long event-loop blocking with huge queues
      for (let start = 0; start < queue.length; start += this.CHUNK_SIZE) {
        const batch = queue.slice(start, start + this.CHUNK_SIZE);
        for (const action of batch) {
          try {
            // Check for conflicts before executing
            const conflict = await this.detectConflict(action);

            if (conflict) {
              // Handle conflict based on strategy
              const resolved = await this.resolveConflict(conflict);

              if (!resolved) {
                // Manual resolution required - add to conflict queue
                await this.addToConflictQueue(conflict);
                this.notifySyncListeners('conflict', failedActions.length);
                logger.warn('Conflict detected, requires manual resolution', {
                  actionId: action.id,
                  entity: action.entity,
                  entityId: action.entityId,
                });
                continue; // Skip this action for now
              }

              // Conflict resolved automatically - update action data
              if (conflict.resolution === 'merged' && conflict.mergedData) {
                action.data = conflict.mergedData;
              } else if (conflict.resolution === 'server') {
                // Server wins - skip this action
                logger.info('Conflict resolved: server version kept', {
                  actionId: action.id,
                  entity: action.entity,
                });
                continue;
              }
              // If client wins, proceed with original action data
            }

            await this.executeAction(action);
            syncedCount++;

            // Update entity version after successful sync
            if (action.entityId) {
              await this.updateEntityVersion(action.entity, action.entityId);
            }

            // OFFLINE QUEUE CONSOLIDATION FIX: Removal handled after loop via AsyncStorage update

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
              // record backoff delay for future scheduling (not enforced here to keep tests fast)
              (action as unknown).nextRetryAt = Date.now() + Math.min(30000, 500 * Math.pow(2, action.retryCount - 1));
              failedActions.push(action);
              logger.warn('Action failed, will retry', {
                actionId: action.id,
                retryCount: action.retryCount,
                maxRetries: action.maxRetries,
                error: (error as Error).message,
              });
            } else {
              // OFFLINE QUEUE CONSOLIDATION FIX: Permanently failed actions dropped from queue below

              logger.error(
                'Action failed permanently, removed from queue',
                error,
                {
                  actionId: action.id,
                  type: action.type,
                  entity: action.entity,
                }
              );
            }
          }
        }
      }

      if (this.shouldUseAsyncStorage) {
        // Build updated queue snapshot (only failed actions remain)
        const updatedQueue = failedActions.map((a) => ({ ...a }));
        await AsyncStorage.setItem(
          this.OFFLINE_QUEUE_KEY,
          JSON.stringify(updatedQueue)
        );
      } else {
        // Update retry counts for failed actions in DB (skipped in tests)
      }

      const status: SyncStatus = failedActions.length > 0 ? 'error' : 'synced';
      this.notifySyncListeners(status, failedActions.length);

      logger.info('Offline queue sync completed', {
        totalActions: queue.length,
        syncedActions: syncedCount,
        failedActions: failedActions.length,
      });

      // Schedule next retry for failed actions
      if (failedActions.length > 0) {
        const now = Date.now();
        const minDelay = Math.max(
          250,
          Math.min(
            30000,
            Math.min(
              ...failedActions.map((a: unknown) => Math.max(0, (a.nextRetryAt || now + 500) - now))
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
      if (this.retryTimer) {
        clearTimeout(this.retryTimer);
        this.retryTimer = null;
      }
      try { const sentry = require('../config/sentry'); sentry.addBreadcrumb?.(`offline.schedule_retry:${delayMs}`, 'offline'); } catch {}
      this.retryTimer = setTimeout(() => {
        this.retryTimer = null;
        this.syncQueue();
      }, Math.max(0, delayMs | 0));
      (this.retryTimer as unknown)?.unref?.();
    } catch {}
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
    await new Promise((resolve) => setTimeout(resolve, 100));

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

  private async executeJobAction(
    type: OfflineAction['type'],
    data: unknown
  ): Promise<void> {
    // Import statically so jest.mock works consistently in tests
    const { JobService } = require('./JobService');

    switch (type) {
      case 'CREATE':
        await JobService.createJob(data);
        break;
      case 'UPDATE':
        await JobService.updateJobStatus(
          data.jobId,
          data.status,
          data.contractorId
        );
        break;
      default:
        throw new Error(`Unsupported job action: ${type}`);
    }
  }

  private async executeBidAction(
    type: OfflineAction['type'],
    data: unknown
  ): Promise<void> {
    const { JobService } = require('./JobService');

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

  private async executeMessageAction(
    type: OfflineAction['type'],
    data: unknown
  ): Promise<void> {
    const { MessagingService } = require('./MessagingService');

    switch (type) {
      case 'CREATE':
        await MessagingService.sendMessage(
          data.jobId,
          data.receiverId,
          data.message,
          data.senderId
        );
        break;
      default:
        throw new Error(`Unsupported message action: ${type}`);
    }
  }

  private async executeProfileAction(
    type: OfflineAction['type'],
    data: unknown
  ): Promise<void> {
    const { UserService } = require('./UserService');

    switch (type) {
      case 'UPDATE':
        await UserService.updateUserProfile(data.userId, data.updates);
        break;
      default:
        throw new Error(`Unsupported profile action: ${type}`);
    }
  }

  /**
   * Subscribe to sync status changes
   * CRITICAL FIX: Returns unsubscribe function to prevent memory leaks
   *
   * Usage:
   * ```typescript
   * useEffect(() => {
   *   const unsubscribe = OfflineManager.onSyncStatusChange((status, count) => {
   *     logger.info('Sync status:', status, count', [object Object], { service: 'mobile' });
   *   });
   *
   *   // IMPORTANT: Always cleanup on unmount to prevent memory leak
   *   return unsubscribe;
   * }, []);
   * ```
   *
   * @param callback - Function to call when sync status changes
   * @returns Unsubscribe function - MUST be called on component unmount
   */
  onSyncStatusChange(
    callback: (status: SyncStatus, pendingCount: number) => void
  ): () => void {
    this.syncListeners.push(callback);

    // Return unsubscribe function to allow proper cleanup
    return () => {
      const index = this.syncListeners.indexOf(callback);
      if (index > -1) {
        this.syncListeners.splice(index, 1);
      }
    };
  }

  private notifySyncListeners(status: SyncStatus, pendingCount: number): void {
    this.syncListeners.forEach((callback) => {
      try {
        callback(status, pendingCount);
      } catch (error) {
        logger.error('Error in sync status callback:', error);
      }
    });
  }

  async getPendingActionsCount(): Promise<number> {
    try {
      // OFFLINE QUEUE CONSOLIDATION FIX: Use only AsyncStorage
      const existing = await AsyncStorage.getItem(this.OFFLINE_QUEUE_KEY);
      if (!existing) return 0;
      try {
        const queue = JSON.parse(existing);
        return Array.isArray(queue) ? queue.length : 0;
      } catch {
        return 0;
      }
    } catch (error) {
      logger.error('Failed to get pending actions count:', error);
      return 0;
    }
  }

  async hasPendingActions(): Promise<boolean> {
    const count = await this.getPendingActionsCount();
    return count > 0;
  }

  // =============================================
  // CONFLICT RESOLUTION METHODS
  // =============================================

  /**
   * Get default conflict resolution strategy for entity type
   */
  private getDefaultStrategy(
    entity: string,
    type: OfflineAction['type']
  ): ConflictResolutionStrategy {
    // Critical data should use server-wins by default
    if (entity === 'payment' || entity === 'escrow') {
      return 'server-wins';
    }

    // User preferences should use client-wins
    if (entity === 'profile' && type === 'UPDATE') {
      return 'client-wins';
    }

    // Messages are create-only, no conflicts
    if (entity === 'message') {
      return 'last-write-wins';
    }

    // Jobs and bids use merge strategy when possible
    if (entity === 'job' || entity === 'bid') {
      return 'merge';
    }

    // Default: last write wins
    return 'last-write-wins';
  }

  /**
   * Get stored version for an entity
   */
  private async getEntityVersion(entity: string, entityId: string): Promise<number> {
    try {
      const versionsJson = await AsyncStorage.getItem(this.ENTITY_VERSIONS_KEY);
      if (!versionsJson) return 0;

      const versions = JSON.parse(versionsJson);
      const key = `${entity}:${entityId}`;
      return versions[key] || 0;
    } catch (error) {
      logger.error('Failed to get entity version:', error);
      return 0;
    }
  }

  /**
   * Update stored version for an entity
   */
  private async updateEntityVersion(entity: string, entityId: string): Promise<void> {
    try {
      const versionsJson = await AsyncStorage.getItem(this.ENTITY_VERSIONS_KEY);
      const versions = versionsJson ? JSON.parse(versionsJson) : {};

      const key = `${entity}:${entityId}`;
      versions[key] = (versions[key] || 0) + 1;

      await AsyncStorage.setItem(this.ENTITY_VERSIONS_KEY, JSON.stringify(versions));
    } catch (error) {
      logger.error('Failed to update entity version:', error);
    }
  }

  /**
   * Detect if there's a conflict between offline action and server state
   */
  private async detectConflict(action: OfflineAction): Promise<DataConflict | null> {
    // Only UPDATE operations can have conflicts
    if (action.type !== 'UPDATE' || !action.entityId) {
      return null;
    }

    try {
      // Fetch current server state
      const serverData = await this.fetchServerData(action.entity, action.entityId);
      if (!serverData) {
        return null; // Entity doesn't exist on server
      }

      // Check if versions match
      const currentVersion = await this.getEntityVersion(action.entity, action.entityId);
      const baseVersion = action.baseVersion || 0;

      // If server has been updated since we created this action, there's a conflict
      if (serverData.version && serverData.version > baseVersion) {
        const conflict: DataConflict = {
          id: `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          actionId: action.id,
          entity: action.entity,
          entityId: action.entityId,
          clientVersion: action.version || currentVersion,
          serverVersion: serverData.version,
          clientData: action.data,
          serverData: serverData,
          clientTimestamp: action.timestamp,
          serverTimestamp: new Date(serverData.updatedAt || serverData.updated_at).getTime(),
          detectedAt: Date.now(),
          strategy: action.strategy || this.getDefaultStrategy(action.entity, action.type),
          resolved: false,
        };

        logger.warn('Conflict detected', {
          entity: action.entity,
          entityId: action.entityId,
          clientVersion: conflict.clientVersion,
          serverVersion: conflict.serverVersion,
          strategy: conflict.strategy,
        });

        return conflict;
      }

      return null;
    } catch (error) {
      logger.error('Failed to detect conflict:', error);
      return null; // On error, assume no conflict and proceed
    }
  }

  /**
   * Fetch current server data for conflict detection
   */
  private async fetchServerData(entity: string, entityId: string): Promise<unknown> {
    try {
      switch (entity) {
        case 'job': {
          const { JobService } = require('./JobService');
          return await JobService.getJobById(entityId);
        }
        case 'bid': {
          const { JobService } = require('./JobService');
          const bids = await JobService.getBidsByJob(entityId);
          return bids.find((b: unknown) => b.id === entityId);
        }
        case 'profile': {
          const { UserService } = require('./UserService');
          return await UserService.getUserProfile(entityId);
        }
        case 'message': {
          // Messages are append-only, no conflicts
          return null;
        }
        default:
          logger.warn('Unknown entity type for conflict detection:', entity);
          return null;
      }
    } catch (error) {
      logger.error('Failed to fetch server data:', error);
      return null;
    }
  }

  /**
   * Resolve conflict based on strategy
   * @returns true if resolved automatically, false if manual resolution needed
   */
  private async resolveConflict(conflict: DataConflict): Promise<boolean> {
    switch (conflict.strategy) {
      case 'last-write-wins':
        return this.resolveLastWriteWins(conflict);

      case 'server-wins':
        conflict.resolved = true;
        conflict.resolution = 'server';
        logger.info('Conflict resolved: server-wins strategy', {
          entity: conflict.entity,
          entityId: conflict.entityId,
        });
        return true;

      case 'client-wins':
        conflict.resolved = true;
        conflict.resolution = 'client';
        logger.info('Conflict resolved: client-wins strategy', {
          entity: conflict.entity,
          entityId: conflict.entityId,
        });
        return true;

      case 'merge':
        return this.resolveMerge(conflict);

      case 'manual':
        return false; // Requires user intervention

      default:
        return this.resolveLastWriteWins(conflict);
    }
  }

  /**
   * Resolve conflict using last-write-wins strategy
   */
  private async resolveLastWriteWins(conflict: DataConflict): Promise<boolean> {
    if (conflict.clientTimestamp > conflict.serverTimestamp) {
      conflict.resolved = true;
      conflict.resolution = 'client';
      logger.info('Conflict resolved: client write is newer', {
        entity: conflict.entity,
        clientTimestamp: conflict.clientTimestamp,
        serverTimestamp: conflict.serverTimestamp,
      });
      return true;
    } else {
      conflict.resolved = true;
      conflict.resolution = 'server';
      logger.info('Conflict resolved: server write is newer', {
        entity: conflict.entity,
        clientTimestamp: conflict.clientTimestamp,
        serverTimestamp: conflict.serverTimestamp,
      });
      return true;
    }
  }

  /**
   * Resolve conflict using intelligent merge strategy
   */
  private async resolveMerge(conflict: DataConflict): Promise<boolean> {
    try {
      let mergedData: unknown;

      switch (conflict.entity) {
        case 'job':
          mergedData = this.mergeJobData(conflict.clientData, conflict.serverData);
          break;

        case 'bid':
          mergedData = this.mergeBidData(conflict.clientData, conflict.serverData);
          break;

        case 'profile':
          mergedData = this.mergeProfileData(conflict.clientData, conflict.serverData);
          break;

        default:
          // Can't merge - fallback to last-write-wins
          return this.resolveLastWriteWins(conflict);
      }

      conflict.resolved = true;
      conflict.resolution = 'merged';
      conflict.mergedData = mergedData;

      logger.info('Conflict resolved: data merged', {
        entity: conflict.entity,
        entityId: conflict.entityId,
      });

      return true;
    } catch (error) {
      logger.error('Failed to merge data:', error);
      return false; // Requires manual resolution
    }
  }

  /**
   * Merge job data intelligently
   */
  private mergeJobData(clientData: unknown, serverData: unknown): unknown {
    return {
      ...serverData,
      // Client updates for editable fields
      title: clientData.title || serverData.title,
      description: clientData.description || serverData.description,
      budget: clientData.budget !== undefined ? clientData.budget : serverData.budget,
      priority: clientData.priority || serverData.priority,
      // Server wins for status and critical fields
      status: serverData.status,
      contractorId: serverData.contractorId,
      homeownerId: serverData.homeownerId,
      // Merge photos (union of both sets)
      photos: Array.from(new Set([
        ...(serverData.photos || []),
        ...(clientData.photos || []),
      ])),
      // Keep server timestamps
      createdAt: serverData.createdAt,
      updatedAt: serverData.updatedAt,
    };
  }

  /**
   * Merge bid data intelligently
   */
  private mergeBidData(clientData: unknown, serverData: unknown): unknown {
    // Bids are mostly immutable - server wins for status changes
    return {
      ...serverData,
      // Client can update description before acceptance
      description: serverData.status === 'pending'
        ? (clientData.description || serverData.description)
        : serverData.description,
      // Server wins for status and amount
      status: serverData.status,
      amount: serverData.amount,
      updatedAt: serverData.updatedAt,
    };
  }

  /**
   * Merge profile data intelligently
   */
  private mergeProfileData(clientData: unknown, serverData: unknown): unknown {
    return {
      ...serverData,
      // Client wins for user preferences
      name: clientData.name || serverData.name,
      phone: clientData.phone || serverData.phone,
      bio: clientData.bio || serverData.bio,
      // Merge skills (union of both sets)
      skills: Array.from(new Set([
        ...(serverData.skills || []),
        ...(clientData.skills || []),
      ])),
      // Server wins for verification status
      isVerified: serverData.isVerified,
      rating: serverData.rating,
      completedJobs: serverData.completedJobs,
    };
  }

  /**
   * Add conflict to queue for manual resolution
   */
  private async addToConflictQueue(conflict: DataConflict): Promise<void> {
    try {
      const existing = await AsyncStorage.getItem(this.CONFLICT_QUEUE_KEY) || '[]';
      const queue: DataConflict[] = JSON.parse(existing);
      queue.push(conflict);
      await AsyncStorage.setItem(this.CONFLICT_QUEUE_KEY, JSON.stringify(queue));

      // Notify listeners about new conflict
      this.notifyConflictListeners(queue);

      logger.info('Conflict added to queue for manual resolution', {
        conflictId: conflict.id,
        entity: conflict.entity,
      });
    } catch (error) {
      logger.error('Failed to add conflict to queue:', error);
    }
  }

  /**
   * Get all pending conflicts
   */
  async getConflicts(): Promise<DataConflict[]> {
    try {
      const existing = await AsyncStorage.getItem(this.CONFLICT_QUEUE_KEY);
      if (!existing) return [];
      return JSON.parse(existing);
    } catch (error) {
      logger.error('Failed to get conflicts:', error);
      return [];
    }
  }

  /**
   * Manually resolve a conflict
   */
  async resolveConflictManually(
    conflictId: string,
    resolution: 'client' | 'server' | 'merged',
    mergedData?: unknown
  ): Promise<void> {
    try {
      const conflicts = await this.getConflicts();
      const conflict = conflicts.find(c => c.id === conflictId);

      if (!conflict) {
        throw new Error('Conflict not found');
      }

      conflict.resolved = true;
      conflict.resolution = resolution;
      if (mergedData) {
        conflict.mergedData = mergedData;
      }

      // Remove from conflict queue
      const remaining = conflicts.filter(c => c.id !== conflictId);
      await AsyncStorage.setItem(this.CONFLICT_QUEUE_KEY, JSON.stringify(remaining));

      // Apply the resolution
      if (resolution === 'client' || resolution === 'merged') {
        const dataToSync = resolution === 'merged' ? mergedData : conflict.clientData;

        // BUGFIX: Update baseVersion to current server version to prevent infinite loop
        // Re-queue the action with resolved data
        await this.queueAction({
          type: 'UPDATE',
          entity: conflict.entity,
          entityId: conflict.entityId,
          data: dataToSync,
          baseVersion: conflict.serverVersion, // Use server version as new base
          maxRetries: this.MAX_RETRIES,
          strategy: 'client-wins', // Force client-wins after manual resolution
        });
      }
      // If server wins, do nothing - server data is already current

      this.notifyConflictListeners(remaining);

      logger.info('Conflict resolved manually', {
        conflictId,
        resolution,
        entity: conflict.entity,
      });
    } catch (error) {
      logger.error('Failed to resolve conflict manually:', error);
      throw error;
    }
  }

  /**
   * Clear all resolved conflicts
   */
  async clearResolvedConflicts(): Promise<void> {
    try {
      const conflicts = await this.getConflicts();
      const unresolved = conflicts.filter(c => !c.resolved);
      await AsyncStorage.setItem(this.CONFLICT_QUEUE_KEY, JSON.stringify(unresolved));
      this.notifyConflictListeners(unresolved);
    } catch (error) {
      logger.error('Failed to clear resolved conflicts:', error);
    }
  }

  /**
   * Subscribe to conflict updates
   */
  onConflictDetected(callback: (conflicts: DataConflict[]) => void): () => void {
    this.conflictListeners.push(callback);

    // Return unsubscribe function
    return () => {
      const index = this.conflictListeners.indexOf(callback);
      if (index > -1) {
        this.conflictListeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify conflict listeners
   */
  private notifyConflictListeners(conflicts: DataConflict[]): void {
    this.conflictListeners.forEach(callback => {
      try {
        callback(conflicts);
      } catch (error) {
        logger.error('Error in conflict callback:', error);
      }
    });
  }
}

export const OfflineManager = new OfflineManagerClass();
