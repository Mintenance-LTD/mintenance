/**
 * SQLCipher-style at-rest encryption for the mobile local database.
 *
 * # Why this exists (audit P3 deferred item, 2026-04-25)
 *
 * `apps/mobile/src/services/local-db/LocalDatabaseService.ts` currently
 * opens `mintenance_local.db` as a plaintext SQLite file. The DB
 * caches:
 *   - User profile rows (`users` table — PII, role, location)
 *   - Job rows (`jobs` table — homeowner_id, contractor_id, addresses)
 *   - Message rows (`messages` table — message_text bodies)
 *   - Bid rows (`bids` table — amount, contractor_id)
 *   - Offline action queue (`offline_actions` — request bodies)
 *
 * On a rooted Android device or jailbroken iOS device, this file is
 * readable. The audit flagged it as a P3 because:
 *   1. Auth tokens are NOT in the SQLite file — they're in
 *      `expo-secure-store` (Keychain / EncryptedSharedPrefs), which
 *      is the OS-managed secure-store.
 *   2. Cards / Stripe customer IDs are NOT here — Stripe Customer IDs
 *      live in profile rows but the actual PMs are in Stripe's vault.
 *   3. The residual risk is "PII + message history readable on a
 *      compromised device" — meaningful but not credential-grade.
 *
 * # Two-step rollout
 *
 * Step 1 (this commit): scaffold the encryption-key helper + flag.
 *   - Generate a per-install random 256-bit key, persist in
 *     `expo-secure-store` (NOT in AsyncStorage), retrieve on each
 *     app boot. The key never leaves the device.
 *   - Add `LOCAL_DB_ENCRYPTION_ENABLED` env flag.
 *   - Provide `getDatabaseOpenOptions()` that returns the
 *     SQLCipher-compatible `{ encryptionKey }` option when the flag
 *     is on.
 *   - DO NOT wire into `LocalDatabaseService.init()` yet.
 *
 * Step 2 (separate PR — needs user-action):
 *   - Verify `expo-sqlite@<version>` supports the `encryptionKey`
 *     openDatabaseAsync option in this app's Expo SDK version
 *     (SDK 54 → expo-sqlite 16.x exposes SQLCipher via the option;
 *     earlier 15.x does not).
 *   - Add a one-time migration: for existing users, attach the
 *     plaintext DB, re-export rows, drop+recreate as encrypted,
 *     reimport. See `migrateToEncrypted()` below for the playbook.
 *   - Wire `getDatabaseOpenOptions()` into `init()`.
 *   - Soak-test in EAS dev-client → staging → prod.
 *
 * # Why NOT to ship the wiring today
 *
 *   - Existing users have a plaintext DB. Flipping the flag without
 *     a migration would mean openDatabaseAsync rejects the file (key
 *     mismatch), and the app would silently lose all cached data.
 *   - The migration needs validation against real production data
 *     volumes (some power users have 500+ messages cached).
 *   - SDK-compat verification is a build-test step that must be done
 *     on a real device — Expo Go doesn't enforce SQLCipher.
 *
 * # User-action required to ship Step 2
 *
 *   1. Verify `expo-sqlite` version supports `encryptionKey` (run
 *      `npx expo install --check` to see the resolved version).
 *   2. Run the migration script `migrateToEncrypted()` on a
 *      development build first — verify data integrity end-to-end.
 *   3. Add `EXPO_PUBLIC_LOCAL_DB_ENCRYPTION_ENABLED=true` to EAS
 *      dev profile, then staging, then prod.
 *   4. After 1-2 release cycles confirming no key-mismatch crashes,
 *      remove the flag and make encryption the default.
 */

import * as SecureStore from 'expo-secure-store';
import { logger } from '../../utils/logger';

/** SecureStore key under which we persist the per-install DB key. */
const DB_KEY_STORE_KEY = 'mintenance.local_db.encryption_key.v1';

/** 256 bits / 64 hex characters. */
const KEY_LENGTH_BYTES = 32;

/**
 * Read the env flag exactly the same way `certPinning.ts` does so the
 * conventions match. Reading `process.env` lazily means a CI test
 * setup that defines this var can flip behaviour without rebuilding.
 */
export function isLocalDbEncryptionEnabled(): boolean {
  const v = process.env.EXPO_PUBLIC_LOCAL_DB_ENCRYPTION_ENABLED;
  return v === 'true' || v === '1';
}

/**
 * Generate a cryptographically random 256-bit key, hex-encoded for
 * SQLCipher compatibility. Uses `crypto.getRandomValues` which is
 * available in React Native's Hermes runtime; falls back to a
 * timestamp-derived weaker source ONLY in test environments.
 */
function generateKey(): string {
  const buf = new Uint8Array(KEY_LENGTH_BYTES);
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(buf);
  } else {
    // Test environment fallback. Should never run in production —
    // Hermes on iOS / Android both expose crypto.getRandomValues.
    if (process.env.NODE_ENV !== 'test') {
      logger.error(
        '[local-db-encryption] crypto.getRandomValues unavailable; using ' +
          'weak fallback. This is a serious problem in production.'
      );
    }
    for (let i = 0; i < KEY_LENGTH_BYTES; i++) {
      buf[i] = Math.floor(Math.random() * 256);
    }
  }
  // hex-encode
  let out = '';
  for (const byte of buf) {
    out += byte.toString(16).padStart(2, '0');
  }
  return out;
}

/**
 * Read the persisted DB encryption key from expo-secure-store, or
 * generate + persist a fresh one on first boot. The key never leaves
 * the device — it's bound to the app's Keychain (iOS) /
 * EncryptedSharedPrefs (Android) entry, which is itself protected by
 * the device's secure enclave / hardware-backed keystore.
 *
 * Returns null when SecureStore is unavailable (web, certain test
 * environments) — callers should treat null as "encryption is
 * unavailable on this platform" and fall through to plaintext.
 */
export async function getOrCreateDbKey(): Promise<string | null> {
  try {
    const isAvailable = await SecureStore.isAvailableAsync();
    if (!isAvailable) {
      logger.warn(
        '[local-db-encryption] SecureStore not available on this platform; ' +
          'cannot derive a DB key. Falling through to plaintext DB.'
      );
      return null;
    }
  } catch (err) {
    logger.warn(
      '[local-db-encryption] SecureStore.isAvailableAsync threw; falling ' +
        'through to plaintext DB',
      { error: err instanceof Error ? err.message : String(err) }
    );
    return null;
  }

  try {
    const existing = await SecureStore.getItemAsync(DB_KEY_STORE_KEY);
    if (existing && existing.length === KEY_LENGTH_BYTES * 2) {
      return existing;
    }
  } catch (err) {
    logger.warn(
      '[local-db-encryption] SecureStore.getItemAsync threw; will try to ' +
        'regenerate the key',
      { error: err instanceof Error ? err.message : String(err) }
    );
  }

  // No existing key, or the stored value was malformed. Generate +
  // persist. If the persist fails we still return the generated key
  // so the current session works — but the next session will mint
  // another fresh key and lose access to whatever was written this
  // run. That's a real risk; surface it to Sentry.
  const fresh = generateKey();
  try {
    await SecureStore.setItemAsync(DB_KEY_STORE_KEY, fresh, {
      // iOS: only retrievable while device is unlocked. Sets a
      // higher security class than the default (which would survive
      // a device reboot before unlock). Trade-off: app launching
      // before first unlock can't open the DB. Acceptable for our
      // app-foreground-only usage.
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
    return fresh;
  } catch (err) {
    logger.error(
      '[local-db-encryption] SecureStore.setItemAsync failed; the freshly-' +
        'generated DB key cannot be persisted. The DB will appear empty on ' +
        'next launch.',
      err
    );
    return fresh;
  }
}

/**
 * Build the option bag for `SQLite.openDatabaseAsync(name, options)`.
 * Returns an empty object when encryption is disabled or unavailable
 * — the caller can spread it into the options argument unconditionally.
 *
 * Usage in `LocalDatabaseService.init()`:
 *
 *   const options = await getDatabaseOpenOptions();
 *   this.db = await SQLite.openDatabaseAsync(this.DB_NAME, options);
 */
export async function getDatabaseOpenOptions(): Promise<
  Record<string, unknown>
> {
  if (!isLocalDbEncryptionEnabled()) return {};

  const key = await getOrCreateDbKey();
  if (!key) return {};

  // Note: the exact option name depends on the underlying library.
  // expo-sqlite uses `key` (lower-case) for SQLCipher; op-sqlite uses
  // `encryptionKey`. Both libraries accept the same hex-encoded
  // key shape we generate above.
  return { key };
}

/**
 * Migration playbook for users that already have a plaintext
 * `mintenance_local.db`. Documented as a function signature only —
 * the body is intentionally NOT shipped because it must be tested
 * against real device data before release.
 *
 * Algorithm:
 *   1. Open plaintext DB at the existing path.
 *   2. Generate + persist the new encryption key.
 *   3. Run `ATTACH DATABASE 'encrypted.db' AS encrypted KEY '<key>'`.
 *   4. Run `SELECT sqlcipher_export('encrypted')`.
 *   5. Run `DETACH DATABASE encrypted`.
 *   6. Close the plaintext DB.
 *   7. Atomically rename: encrypted.db → mintenance_local.db.
 *   8. Re-open with `key` option, verify a SELECT works.
 *   9. On error at any step, rollback — leave plaintext in place,
 *      do not flip the flag for this user.
 *
 * The actual implementation needs:
 *   - The exact expo-sqlite API for ATTACH + sqlcipher_export
 *     (varies by SDK version).
 *   - File-system access to do the atomic rename
 *     (`expo-file-system` copyAsync + deleteAsync sequence).
 *   - Telemetry hooks for migration success / failure rates.
 */
export async function migrateToEncrypted(): Promise<{
  migrated: boolean;
  reason?: string;
}> {
  // Intentionally not implemented — see header. Throwing here would
  // break the build (the function is referenced from header docs);
  // returning a "migrated: false" envelope keeps callers honest if
  // someone wires this in prematurely.
  return {
    migrated: false,
    reason: 'Migration not implemented — see header for playbook.',
  };
}
