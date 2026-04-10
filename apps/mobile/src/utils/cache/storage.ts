import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../logger';
import type { CacheEntry } from './types';

// ============================================================================
// DISK STORAGE LAYER (AsyncStorage wrapper)
// ============================================================================

export async function getDiskEntry<T>(
  key: string
): Promise<CacheEntry<T> | null> {
  try {
    const stored = await AsyncStorage.getItem(`cache_${key}`);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export async function setDiskEntry(entry: CacheEntry): Promise<boolean> {
  try {
    await AsyncStorage.setItem(`cache_${entry.key}`, JSON.stringify(entry));
    return true;
  } catch (error) {
    logger.warn('Disk cache set error', { data: { key: entry.key, error } });
    return false;
  }
}

export async function deleteDiskEntry(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(`cache_${key}`);
  } catch (error) {
    logger.warn('Disk cache delete error', { data: { key, error } });
  }
}

export async function clearDiskCache(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter((key) => key.startsWith('cache_'));
    await AsyncStorage.multiRemove(cacheKeys);
  } catch (error) {
    logger.warn('Disk cache clear error', { data: error });
  }
}

export async function cleanupDiskCache(
  isValid: (entry: CacheEntry) => boolean
): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter((key) => key.startsWith('cache_'));

    for (const key of cacheKeys) {
      const entry = await getDiskEntry(key.replace('cache_', ''));
      if (entry && !isValid(entry)) {
        await AsyncStorage.removeItem(key);
      }
    }
  } catch (error) {
    logger.warn('Disk cache cleanup error', { data: error });
  }
}
