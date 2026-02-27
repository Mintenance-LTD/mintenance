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
      const versions = JSON.parse(versionsJson);
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
      const versions = versionsJson ? JSON.parse(versionsJson) : {};
      const key = `${entity}:${entityId}`;
      versions[key] = (versions[key] || 0) + 1;
      await AsyncStorage.setItem(this.ENTITY_VERSIONS_KEY, JSON.stringify(versions));
    } catch (error) {
      logger.error('Failed to update entity version:', error);
    }
  }
}
