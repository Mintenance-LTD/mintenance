import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../../utils/logger';
import type {
  OfflineAction,
  DataConflict,
  ConflictResolutionStrategy,
  ServerEntityData,
} from './types';
import type { EntityVersionTracker } from './EntityVersionTracker';
import type { DataMerger } from './DataMerger';

type QueueActionFn = (
  action: Omit<OfflineAction, 'id' | 'timestamp' | 'retryCount'>
) => Promise<string>;

/**
 * Manages conflict detection and resolution for offline actions.
 * Detects when a queued action conflicts with server state (version mismatch),
 * resolves conflicts using pluggable strategies, and queues unresolvable
 * conflicts for manual user review.
 */
export class ConflictManager {
  private readonly CONFLICT_QUEUE_KEY = 'CONFLICT_QUEUE';
  private readonly MAX_RETRIES = 3;
  private conflictListeners: ((conflicts: DataConflict[]) => void)[] = [];

  constructor(
    private readonly versionTracker: EntityVersionTracker,
    private readonly dataMerger: DataMerger,
    private readonly queueAction: QueueActionFn
  ) {}

  /** Get default conflict resolution strategy for entity/operation type */
  getDefaultStrategy(entity: string, type: OfflineAction['type']): ConflictResolutionStrategy {
    if (entity === 'payment' || entity === 'escrow') return 'server-wins';
    if (entity === 'profile' && type === 'UPDATE') return 'client-wins';
    if (entity === 'message') return 'last-write-wins';
    if (entity === 'job' || entity === 'bid') return 'merge';
    return 'last-write-wins';
  }

  /** Detect if there's a conflict between an offline action and server state */
  async detectConflict(action: OfflineAction): Promise<DataConflict | null> {
    if (action.type !== 'UPDATE' || !action.entityId) return null;
    try {
      const serverData = await this.fetchServerData(action.entity, action.entityId);
      if (!serverData) return null;
      const serverEntity = serverData as ServerEntityData;
      const currentVersion = await this.versionTracker.getEntityVersion(
        action.entity,
        action.entityId
      );
      const baseVersion = action.baseVersion || 0;
      if (!serverEntity.version || serverEntity.version <= baseVersion) return null;

      const conflict: DataConflict = {
        id: `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        actionId: action.id,
        entity: action.entity,
        entityId: action.entityId,
        clientVersion: action.version || currentVersion,
        serverVersion: serverEntity.version,
        clientData: action.data,
        serverData,
        clientTimestamp: action.timestamp,
        serverTimestamp: new Date(
          serverEntity.updatedAt || serverEntity.updated_at || Date.now()
        ).getTime(),
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
    } catch (error) {
      logger.error('Failed to detect conflict:', error);
      return null;
    }
  }

  /** Fetch current server data for an entity (used by detectConflict) */
  private async fetchServerData(entity: string, entityId: string): Promise<unknown> {
    try {
      switch (entity) {
        case 'job': {
          const { JobService } = require('../JobService');
          return await JobService.getJobById(entityId);
        }
        case 'bid': {
          const { JobService } = require('../JobService');
          const bids = await JobService.getBidsByJob(entityId);
          return (bids as ServerEntityData[]).find((b) => b.id === entityId);
        }
        case 'profile': {
          const { UserService } = require('../UserService');
          return await UserService.getUserProfile(entityId);
        }
        case 'message':
          return null;
        default:
          logger.warn('Unknown entity type for conflict detection:', entity);
          return null;
      }
    } catch (error) {
      logger.error('Failed to fetch server data:', error);
      return null;
    }
  }

  /** Resolve conflict based on strategy. Returns true if resolved, false if manual needed. */
  async resolveConflict(conflict: DataConflict): Promise<boolean> {
    switch (conflict.strategy) {
      case 'last-write-wins':
        return this.resolveLastWriteWins(conflict);
      case 'server-wins':
        conflict.resolved = true;
        conflict.resolution = 'server';
        logger.info('Conflict resolved: server-wins strategy', { entity: conflict.entity });
        return true;
      case 'client-wins':
        conflict.resolved = true;
        conflict.resolution = 'client';
        logger.info('Conflict resolved: client-wins strategy', { entity: conflict.entity });
        return true;
      case 'merge':
        return this.resolveMerge(conflict);
      case 'manual':
        return false;
      default:
        return this.resolveLastWriteWins(conflict);
    }
  }

  private async resolveLastWriteWins(conflict: DataConflict): Promise<boolean> {
    conflict.resolved = true;
    if (conflict.clientTimestamp > conflict.serverTimestamp) {
      conflict.resolution = 'client';
      logger.info('Conflict resolved: client write is newer', { entity: conflict.entity });
    } else {
      conflict.resolution = 'server';
      logger.info('Conflict resolved: server write is newer', { entity: conflict.entity });
    }
    return true;
  }

  private async resolveMerge(conflict: DataConflict): Promise<boolean> {
    try {
      let mergedData: unknown;
      switch (conflict.entity) {
        case 'job':
          mergedData = this.dataMerger.mergeJobData(conflict.clientData, conflict.serverData);
          break;
        case 'bid':
          mergedData = this.dataMerger.mergeBidData(conflict.clientData, conflict.serverData);
          break;
        case 'profile':
          mergedData = this.dataMerger.mergeProfileData(conflict.clientData, conflict.serverData);
          break;
        default:
          return this.resolveLastWriteWins(conflict);
      }
      conflict.resolved = true;
      conflict.resolution = 'merged';
      conflict.mergedData = mergedData;
      logger.info('Conflict resolved: data merged', { entity: conflict.entity });
      return true;
    } catch (error) {
      logger.error('Failed to merge data:', error);
      return false;
    }
  }

  /** Add conflict to queue for manual resolution */
  async addToConflictQueue(conflict: DataConflict): Promise<void> {
    try {
      const existing = (await AsyncStorage.getItem(this.CONFLICT_QUEUE_KEY)) || '[]';
      const queue: DataConflict[] = JSON.parse(existing);
      queue.push(conflict);
      await AsyncStorage.setItem(this.CONFLICT_QUEUE_KEY, JSON.stringify(queue));
      this.notifyConflictListeners(queue);
      logger.info('Conflict added to queue for manual resolution', { conflictId: conflict.id });
    } catch (error) {
      logger.error('Failed to add conflict to queue:', error);
    }
  }

  /** Get all pending conflicts */
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

  /** Manually resolve a conflict and optionally re-queue the winning data */
  async resolveConflictManually(
    conflictId: string,
    resolution: 'client' | 'server' | 'merged',
    mergedData?: unknown
  ): Promise<void> {
    const conflicts = await this.getConflicts();
    const conflict = conflicts.find((c) => c.id === conflictId);
    if (!conflict) throw new Error('Conflict not found');

    conflict.resolved = true;
    conflict.resolution = resolution;
    if (mergedData) conflict.mergedData = mergedData;

    const remaining = conflicts.filter((c) => c.id !== conflictId);
    await AsyncStorage.setItem(this.CONFLICT_QUEUE_KEY, JSON.stringify(remaining));

    if (resolution === 'client' || resolution === 'merged') {
      const dataToSync = resolution === 'merged' ? mergedData : conflict.clientData;
      await this.queueAction({
        type: 'UPDATE',
        entity: conflict.entity,
        entityId: conflict.entityId,
        data: dataToSync,
        baseVersion: conflict.serverVersion,
        maxRetries: this.MAX_RETRIES,
        strategy: 'client-wins',
      });
    }

    this.notifyConflictListeners(remaining);
    logger.info('Conflict resolved manually', { conflictId, resolution, entity: conflict.entity });
  }

  /** Clear all resolved conflicts from the queue */
  async clearResolvedConflicts(): Promise<void> {
    try {
      const conflicts = await this.getConflicts();
      const unresolved = conflicts.filter((c) => !c.resolved);
      await AsyncStorage.setItem(this.CONFLICT_QUEUE_KEY, JSON.stringify(unresolved));
      this.notifyConflictListeners(unresolved);
    } catch (error) {
      logger.error('Failed to clear resolved conflicts:', error);
    }
  }

  /** Subscribe to conflict updates. Returns unsubscribe function. */
  onConflictDetected(callback: (conflicts: DataConflict[]) => void): () => void {
    this.conflictListeners.push(callback);
    return () => {
      const index = this.conflictListeners.indexOf(callback);
      if (index > -1) this.conflictListeners.splice(index, 1);
    };
  }

  notifyConflictListeners(conflicts: DataConflict[]): void {
    this.conflictListeners.forEach((callback) => {
      try {
        callback(conflicts);
      } catch (error) {
        logger.error('Error in conflict callback:', error);
      }
    });
  }
}
