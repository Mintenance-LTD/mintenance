import * as SecureStore from 'expo-secure-store';
import { logger } from '../utils/logger';

/**
 * SecureStore-backed storage adapter for `@supabase/supabase-js`.
 *
 * WHY:
 *   Without an explicit `storage` option, supabase-js on React Native
 *   persists the whole session (access_token + refresh_token) into
 *   AsyncStorage in cleartext. With Android's default `allowBackup=true`
 *   and ADB access to an unlocked phone, an attacker can pull
 *   /data/data/com.mintenance.app/files/RKStorage/ and read the JWT,
 *   granting full account takeover.
 *
 *   This adapter stores values inside expo-secure-store, which writes to
 *   the Android Keystore and iOS Keychain. The 2026-04-21 security audit
 *   flagged the AsyncStorage persistence as P0.
 *
 * 2048-BYTE LIMIT / CHUNKING:
 *   expo-secure-store rejects values > 2048 bytes with an opaque error.
 *   Supabase sessions can exceed this once refresh tokens are added.
 *   We chunk the serialized value and write `<key>__<i>` entries plus a
 *   `<key>__count` sentinel. Reads reassemble in order.
 *
 * CROSS-CUTTING:
 *   - The pre-existing auth-session-manager (src/contexts/auth-session-manager.ts)
 *     continues to write an essential-fields copy under its own
 *     `mintenance_session` key. That path is untouched.
 *   - On first launch after upgrade, the supabase-js storage key will
 *     be absent and the user will be asked to re-login. A separate
 *     one-shot migration from AsyncStorage can be added later if the
 *     UX cost is too high.
 */

const CHUNK_SIZE = 1800;

async function clearChunkedKey(baseKey: string): Promise<void> {
  const countStr = await SecureStore.getItemAsync(`${baseKey}__count`);
  if (!countStr) return;
  const count = Number(countStr);
  if (!Number.isFinite(count) || count <= 0) return;
  await Promise.all(
    Array.from({ length: count }, (_, i) =>
      SecureStore.deleteItemAsync(`${baseKey}__${i}`)
    )
  );
  await SecureStore.deleteItemAsync(`${baseKey}__count`);
}

export const ExpoSecureStoreAdapter = {
  async getItem(key: string): Promise<string | null> {
    try {
      const countStr = await SecureStore.getItemAsync(`${key}__count`);
      if (!countStr) {
        return SecureStore.getItemAsync(key);
      }

      const count = Number(countStr);
      if (!Number.isFinite(count) || count <= 0) return null;

      const parts = await Promise.all(
        Array.from({ length: count }, (_, i) =>
          SecureStore.getItemAsync(`${key}__${i}`)
        )
      );

      if (parts.some((p) => p === null)) {
        // Partial write: clear and treat as no session.
        logger.warn('[supabase-storage] Partial chunked value; clearing', {
          key,
        });
        await clearChunkedKey(key);
        return null;
      }

      return parts.join('');
    } catch (error) {
      logger.error('[supabase-storage] getItem failed', error);
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      if (value.length <= CHUNK_SIZE) {
        await clearChunkedKey(key);
        await SecureStore.setItemAsync(key, value);
        return;
      }

      const chunks = Math.ceil(value.length / CHUNK_SIZE);

      // Delete any pre-existing single-value entry, then clear older
      // chunk state so we don't leave dangling indices on shrink.
      await SecureStore.deleteItemAsync(key);
      await clearChunkedKey(key);

      for (let i = 0; i < chunks; i++) {
        await SecureStore.setItemAsync(
          `${key}__${i}`,
          value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE)
        );
      }
      await SecureStore.setItemAsync(`${key}__count`, String(chunks));
    } catch (error) {
      logger.error('[supabase-storage] setItem failed', error);
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      await clearChunkedKey(key);
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      logger.error('[supabase-storage] removeItem failed', error);
    }
  },
};
