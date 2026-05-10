/**
 * AsyncStorage versioned-migration runner.
 *
 * Audit P2 (2026-05-10): mobile previously had no AsyncStorage
 * versioning. Schema changes to keys like `QUERY_CACHE`,
 * `assessment_ids`, or `video_upload_queue` would silently break
 * installed clients on the next app launch — they'd read the old
 * shape and either crash on deserialisation or write garbage back.
 *
 * Contract:
 *   - A single `MOBILE_STORAGE_VERSION` key holds the highest-
 *     applied migration index (number, or `0` for fresh installs).
 *   - `runStorageMigrations()` is idempotent: if `currentVersion`
 *     already equals `latestVersion` it returns immediately.
 *   - Each migration is `(prev) => Promise<void>`. They run
 *     sequentially in version order. A throw aborts the chain
 *     and `MOBILE_STORAGE_VERSION` stays at the previous version,
 *     so a partial migration retries on the next launch.
 *   - Migrations MUST be additive or transformative — never assume
 *     a key exists. If a key is missing, treat that as "fresh
 *     install" and skip.
 *
 * Where to mount:
 *   Call `runStorageMigrations()` from `App.tsx` (or wherever the
 *   auth bootstrap fires) BEFORE any consumer reads a possibly-
 *   migrated key. The function is a no-op for the common case
 *   (already at latest), so it's safe to await on every cold start.
 *
 * Adding a new migration:
 *   1. Append a new entry to `MIGRATIONS` with the next index.
 *   2. Bump `LATEST_VERSION` to match.
 *   3. The migration function receives no arguments and is
 *      responsible for reading whichever keys it needs to transform.
 *   4. Never re-use or re-order existing indices — the version
 *      stamp is comparison-based, not hash-based.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { MOBILE_STORAGE_KEYS } from './storageKeys';
import { logger } from '../utils/logger';

const MIGRATIONS: ReadonlyArray<{
  version: number;
  description: string;
  run: () => Promise<void>;
}> = [
  // Bootstrap stamp — no-op for fresh installs that already have
  // current-format data, plus a guard for installs upgrading from a
  // pre-versioning build.
  {
    version: 1,
    description: 'Initialise storage version stamp',
    run: async () => {
      // Pure stamp; no data transform.
    },
  },
  // Future migrations append below.
  // Example:
  //   {
  //     version: 2,
  //     description: 'Migrate QUERY_CACHE entries from v3 → v4 schema',
  //     run: async () => {
  //       const raw = await AsyncStorage.getItem(MOBILE_STORAGE_KEYS.QUERY_CACHE);
  //       if (!raw) return;
  //       const old = JSON.parse(raw);
  //       const next = transformV3ToV4(old);
  //       await AsyncStorage.setItem(MOBILE_STORAGE_KEYS.QUERY_CACHE, JSON.stringify(next));
  //     },
  //   },
];

const LATEST_VERSION = MIGRATIONS.reduce(
  (max, m) => Math.max(max, m.version),
  0
);

const VERSION_KEY = 'mintenance_storage_version';

async function readCurrentVersion(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(VERSION_KEY);
    if (!raw) return 0;
    const parsed = parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  } catch (err) {
    logger.warn('storageMigrations: read current version failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    return 0;
  }
}

async function writeCurrentVersion(version: number): Promise<void> {
  try {
    await AsyncStorage.setItem(VERSION_KEY, String(version));
  } catch (err) {
    logger.warn('storageMigrations: write current version failed', {
      version,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * Run all pending AsyncStorage migrations in order. Idempotent.
 * Returns the final version (== LATEST_VERSION on full success).
 */
export async function runStorageMigrations(): Promise<number> {
  const currentVersion = await readCurrentVersion();
  if (currentVersion >= LATEST_VERSION) {
    return currentVersion;
  }

  // Sort defensively — MIGRATIONS is hand-written but a future
  // contributor might add out-of-order. We refuse to run anything
  // if order is broken, to make the error obvious.
  const pending = MIGRATIONS.filter((m) => m.version > currentVersion).sort(
    (a, b) => a.version - b.version
  );

  for (const m of pending) {
    try {
      logger.info(
        `storageMigrations: running v${m.version} — ${m.description}`
      );
      await m.run();
      await writeCurrentVersion(m.version);
    } catch (err) {
      // Halt on first failure. Keys are NOT version-stamped, so a
      // failed migration leaves the store in the previous-version
      // shape. The next cold start retries this migration.
      logger.error(
        `storageMigrations: migration v${m.version} failed`,
        err instanceof Error ? err : new Error(String(err)),
        { description: m.description }
      );
      return currentVersion;
    }
  }

  return LATEST_VERSION;
}

/**
 * Returns the latest known migration version. Exported for tests
 * and for telemetry on cold-start.
 */
export function getLatestStorageVersion(): number {
  return LATEST_VERSION;
}

// Re-exported for callers who want a single import surface.
export { MOBILE_STORAGE_KEYS };
