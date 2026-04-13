import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../../utils/logger';

/**
 * Tracks entity versions in AsyncStorage for optimistic concurrency control.
 * Used by ConflictManager to detect when server data has changed since the
 * client last synced.
 */
export class EntityVersionTracker {
  private readonly ENTITY_VERSIONS_KEY = 'ENTITY_VERSIONS';

  /** Get stored version for an entity */
  async getEntityVersion(entity: string, entityId: string): Promise<number> {
    try {
      const versionsJson = await AsyncStorage.getItem(this.ENTITY_VERSIONS_KEY);
      if (!versionsJson) return 0;
      let versions: Record<string, number>;
      try {
        versions = JSON.parse(versionsJson);
      } catch (parseError) {
        // MSV-P1-4: version tracker store is corrupt. Reset so the client
        // can continue syncing but log loudly — silently returning 0 could
        // mask conflict detection bugs.
        logger.error(
          'Entity version store JSON corrupt in getEntityVersion; resetting',
          { parseError, entity, entityId }
        );
        await AsyncStorage.removeItem(this.ENTITY_VERSIONS_KEY);
        return 0;
      }
      return versions[`${entity}:${entityId}`] || 0;
    } catch (error) {
      logger.error('Failed to get entity version:', error);
      return 0;
    }
  }

  /** Increment stored version for an entity after successful sync */
  async updateEntityVersion(entity: string, entityId: string): Promise<void> {
    try {
      const versionsJson = await AsyncStorage.getItem(this.ENTITY_VERSIONS_KEY);
      let versions: Record<string, number>;
      if (versionsJson) {
        try {
          versions = JSON.parse(versionsJson);
        } catch (parseError) {
          logger.error(
            'Entity version store JSON corrupt in updateEntityVersion; resetting',
            { parseError, entity, entityId }
          );
          versions = {};
        }
      } else {
        versions = {};
      }
      const key = `${entity}:${entityId}`;
      versions[key] = (versions[key] || 0) + 1;
      await AsyncStorage.setItem(
        this.ENTITY_VERSIONS_KEY,
        JSON.stringify(versions)
      );
    } catch (error) {
      logger.error('Failed to update entity version:', error);
    }
  }
}
