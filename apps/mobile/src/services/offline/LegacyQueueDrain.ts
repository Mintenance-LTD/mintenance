import { logger } from '../../utils/logger';
import type { DatabaseOfflineActionRow } from '../sync/types';

/**
 * Legacy SQLite offline-queue drain shim (offline-consolidation Phase 1,
 * 2026-07-27).
 *
 * The platform has two offline write systems; OfflineManager (AsyncStorage
 * action queue) is canonical. The SQLite side (offline_actions table +
 * dirty-record flags consumed by SyncManager) has NO production writers
 * today, but the retirement plan requires PROOF that no install in the wild
 * still carries residue from a historical build before the tables and the
 * SyncManager upload path are deleted.
 *
 * This shim runs once per launch, after a session exists:
 *   1. MEASURES both legacy stores and emits telemetry — this is the
 *      Phase-0 signal that retirement watches (expected: all zeros).
 *   2. DRAINS any residue into OfflineManager.queueAction so a user who
 *      upgraded with pending writes in the legacy queue does not lose them.
 *      Rows are deleted from SQLite only AFTER the corresponding
 *      queueAction resolves (insert-then-delete; a crash in the window can
 *      duplicate a MESSAGE — accepted for a queue that has provably never
 *      been written; job/profile replays are server-idempotent enough).
 *
 * Ownership guard: SQLite rows carry no user id, so anything whose owner
 * IS locally verifiable (message senderId, profile row id) is dropped when
 * it belongs to a different account. Job rows cannot be verified locally —
 * they are drained and the server's ownership checks are the backstop (a
 * foreign-account job write 403s and dead-letters in OfflineManager).
 */

const VALID_ACTION_TYPES = ['CREATE', 'UPDATE', 'DELETE'] as const;
type ValidActionType = (typeof VALID_ACTION_TYPES)[number];

export interface LegacyDrainResult {
  /** Whether the drain actually executed (false: already ran / no user). */
  ran: boolean;
  measured: {
    legacyActions: number;
    dirtyUsers: number;
    dirtyMessages: number;
  };
  drained: number;
  /** Rows discarded (corrupt, foreign-account, unknown entity/type). */
  dropped: number;
  /** Rows left in place for a retry on the next launch. */
  failed: number;
}

let hasRunThisLaunch = false;

/** Test hook — reset the once-per-launch guard. */
export function __resetLegacyDrainForTests(): void {
  hasRunThisLaunch = false;
}

function breadcrumb(message: string): void {
  try {
    // Same best-effort pattern as OfflineManager: telemetry must never
    // block or break the drain.
    const sentry = require('../../config/sentry');
    sentry.addBreadcrumb?.(message, 'offline');
  } catch {
    /* best-effort */
  }
}

export async function drainLegacySqliteQueue(
  currentUserId: string
): Promise<LegacyDrainResult> {
  const result: LegacyDrainResult = {
    ran: false,
    measured: { legacyActions: 0, dirtyUsers: 0, dirtyMessages: 0 },
    drained: 0,
    dropped: 0,
    failed: 0,
  };

  if (hasRunThisLaunch || !currentUserId) {
    return result;
  }
  hasRunThisLaunch = true;
  result.ran = true;

  try {
    // Lazy imports: keep app-start cost near zero and avoid module cycles
    // (OfflineManager -> queryClient -> providers).
    const { LocalDatabase } = await import('../LocalDatabase');
    const { OfflineManager } = await import('../OfflineManager');

    await LocalDatabase.init();

    const [actions, dirtyUsers, dirtyMessages] = await Promise.all([
      LocalDatabase.getOfflineActions(),
      LocalDatabase.getDirtyRecords('users'),
      LocalDatabase.getDirtyRecords('messages'),
    ]);

    result.measured = {
      legacyActions: actions.length,
      dirtyUsers: dirtyUsers.length,
      dirtyMessages: dirtyMessages.length,
    };

    // Phase-0 telemetry: ALWAYS emitted, including the all-zero case —
    // retirement of the legacy system is gated on this staying zero in
    // the wild across release cycles.
    logger.info('[LegacyQueueDrain] legacy store measurement', {
      ...result.measured,
    });
    breadcrumb(
      `offline.legacy_measure:a${result.measured.legacyActions}` +
        `:u${result.measured.dirtyUsers}:m${result.measured.dirtyMessages}`
    );

    const nothingToDrain =
      actions.length === 0 &&
      dirtyUsers.length === 0 &&
      dirtyMessages.length === 0;
    if (nothingToDrain) {
      return result;
    }

    logger.warn(
      '[LegacyQueueDrain] residue found in legacy SQLite queue — draining',
      { ...result.measured }
    );

    // ---- 1. offline_actions rows, oldest first --------------------------
    const ordered = [...(actions as DatabaseOfflineActionRow[])].sort(
      (a, b) => a.created_at - b.created_at
    );

    for (const row of ordered) {
      let data: Record<string, unknown>;
      try {
        data = JSON.parse(row.data) as Record<string, unknown>;
      } catch (parseError) {
        logger.error(
          '[LegacyQueueDrain] corrupt legacy action JSON — dead-lettering',
          parseError,
          { id: row.id, entity: row.entity, type: row.type }
        );
        await LocalDatabase.removeOfflineAction(row.id);
        result.dropped++;
        continue;
      }

      if (!VALID_ACTION_TYPES.includes(row.type as ValidActionType)) {
        logger.warn(
          '[LegacyQueueDrain] unknown legacy action type — dropping',
          {
            id: row.id,
            type: row.type,
          }
        );
        await LocalDatabase.removeOfflineAction(row.id);
        result.dropped++;
        continue;
      }
      const actionType = row.type as ValidActionType;

      try {
        if (row.entity === 'message') {
          // Ownership is locally verifiable for messages.
          if (data.senderId !== currentUserId) {
            logger.warn(
              '[LegacyQueueDrain] legacy message from another account — dropping',
              { id: row.id }
            );
            await LocalDatabase.removeOfflineAction(row.id);
            result.dropped++;
            continue;
          }
          await OfflineManager.queueAction({
            type: actionType,
            entity: 'message',
            data: {
              jobId: data.jobId,
              receiverId: data.receiverId,
              // Legacy SyncManager rows use `messageText`; the canonical
              // ActionExecutor expects `message`.
              message: data.messageText ?? data.message,
              senderId: data.senderId,
            },
            maxRetries: row.max_retries,
          });
        } else if (row.entity === 'job') {
          // No local owner field; the server's ownership checks are the
          // backstop for foreign-account rows.
          await OfflineManager.queueAction({
            type: actionType,
            entity: 'job',
            data,
            maxRetries: row.max_retries,
          });
        } else {
          logger.warn('[LegacyQueueDrain] unknown legacy entity — dropping', {
            id: row.id,
            entity: row.entity,
          });
          await LocalDatabase.removeOfflineAction(row.id);
          result.dropped++;
          continue;
        }

        // Delete ONLY after the canonical queue accepted the action.
        await LocalDatabase.removeOfflineAction(row.id);
        result.drained++;
      } catch (queueError) {
        // Leave the row in place — next launch retries the drain.
        logger.error(
          '[LegacyQueueDrain] failed to re-queue legacy action — will retry next launch',
          queueError,
          { id: row.id, entity: row.entity }
        );
        result.failed++;
      }
    }

    // ---- 2. dirty user rows (profile edits) -----------------------------
    for (const raw of dirtyUsers) {
      const row = raw as { id: string };
      try {
        if (row.id === currentUserId) {
          await OfflineManager.queueAction({
            type: 'UPDATE',
            entity: 'profile',
            data: { userId: row.id, updates: raw },
            maxRetries: 3,
          });
          result.drained++;
        } else {
          logger.warn(
            '[LegacyQueueDrain] dirty profile row for another account — abandoning',
            { rowId: row.id }
          );
          result.dropped++;
        }
        // Both branches clear the dirty flag: drained rows are now owned by
        // the canonical queue; foreign rows must stop re-surfacing forever.
        await LocalDatabase.markRecordSynced('users', row.id);
      } catch (err) {
        logger.error(
          '[LegacyQueueDrain] failed to drain dirty user row — will retry next launch',
          err,
          { rowId: row.id }
        );
        result.failed++;
      }
    }

    // ---- 3. dirty message rows ------------------------------------------
    for (const raw of dirtyMessages) {
      const row = raw as {
        id: string;
        job_id: string;
        sender_id: string;
        receiver_id: string;
        message_text: string;
      };
      try {
        if (row.sender_id === currentUserId) {
          await OfflineManager.queueAction({
            type: 'CREATE',
            entity: 'message',
            data: {
              jobId: row.job_id,
              receiverId: row.receiver_id,
              message: row.message_text,
              senderId: row.sender_id,
            },
            maxRetries: 3,
          });
          result.drained++;
        } else {
          logger.warn(
            '[LegacyQueueDrain] dirty message from another account — abandoning',
            { rowId: row.id }
          );
          result.dropped++;
        }
        await LocalDatabase.markRecordSynced('messages', row.id);
      } catch (err) {
        logger.error(
          '[LegacyQueueDrain] failed to drain dirty message row — will retry next launch',
          err,
          { rowId: row.id }
        );
        result.failed++;
      }
    }

    logger.info('[LegacyQueueDrain] drain complete', {
      drained: result.drained,
      dropped: result.dropped,
      failed: result.failed,
    });
    breadcrumb(
      `offline.legacy_drain:d${result.drained}:x${result.dropped}:f${result.failed}`
    );
    return result;
  } catch (error) {
    // The drain must never break app start.
    logger.error(
      '[LegacyQueueDrain] drain crashed — will retry next launch',
      error
    );
    return result;
  }
}
