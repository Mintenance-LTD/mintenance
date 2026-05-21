/**
 * Idempotency Utility
 *
 * Claim-then-complete pattern (2026-05-21 redesign).
 *
 * Previous design called pg_try_advisory_lock and pg_advisory_unlock as two
 * separate PostgREST requests; in Supabase's transaction-pool mode the unlock
 * can hit a different backend than the lock, so locks leaked. The window
 * between checkIdempotency and storeIdempotencyResult was effectively
 * unprotected — two concurrent requests with the same key could both pass
 * the cache check and both execute the protected operation.
 *
 * New design uses three SQL RPCs:
 *   try_claim_idempotency_key  — atomic INSERT … ON CONFLICT DO NOTHING.
 *                                Caller owns the operation iff it inserted.
 *   complete_idempotency_claim — UPDATE the row to status='completed' with
 *                                the result.
 *   release_idempotency_claim  — DELETE a pending claim (use on failure so
 *                                future retries can succeed).
 *
 * The public surface of this module (checkIdempotency / storeIdempotencyResult)
 * is preserved; callers do not need to change.
 */

import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { ServiceUnavailableError } from '@/lib/errors/api-error';

interface IdempotencyResult<T> {
  isDuplicate: boolean;
  cachedResult?: T;
  idempotencyKey: string;
}

/**
 * Thrown when the idempotency store itself is unavailable (RPC failure,
 * pending-claim conflict, etc.). Extends ServiceUnavailableError so the
 * existing handleAPIError pipeline returns the right 503.
 *
 * The fail-CLOSED guarantee: a caller that hits a store error or pending-claim
 * conflict sees a 503 instead of falling through and double-processing.
 */
export class IdempotencyStoreUnavailableError extends ServiceUnavailableError {
  constructor(
    message: string,
    public readonly idempotencyKey: string,
    public readonly operation: string,
    public readonly cause?: unknown
  ) {
    super('Idempotency store');
    this.name = 'IdempotencyStoreUnavailableError';
    this.userMessage = message;
  }
}

interface ClaimRow {
  claimed: boolean;
  is_duplicate: boolean;
  is_pending: boolean;
  cached_result: unknown;
  cached_created_at: string | null;
}

const IDEMPOTENCY_TTL_HOURS = 24;
const STALE_CLAIM_SECONDS = 60;

/**
 * Check if an idempotency key has been used before.
 *
 * Returns:
 *   - { isDuplicate: true, cachedResult } when the key has already been
 *     processed (completed). Caller should return this result directly
 *     instead of executing the operation again.
 *   - null when the key has NOT been seen (caller now owns the claim and
 *     should proceed with the operation, then call storeIdempotencyResult).
 *
 * Throws `IdempotencyStoreUnavailableError` when:
 *   - the RPC errored,
 *   - another request is currently processing this key (pending claim
 *     within the stale-claim TTL).
 *
 * The boolean useLocking parameter is retained for backwards compatibility
 * with existing callers but no longer needed — atomicity is enforced by
 * INSERT … ON CONFLICT DO NOTHING inside the RPC, so locking happens
 * transparently. Passing false disables nothing; the parameter is ignored.
 */
export async function checkIdempotency<T>(
  idempotencyKey: string,
  operation: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _useLocking: boolean = true
): Promise<IdempotencyResult<T> | null> {
  const { data, error } = await serverSupabase.rpc(
    'try_claim_idempotency_key',
    {
      p_idempotency_key: idempotencyKey,
      p_operation: operation,
      p_stale_after_seconds: STALE_CLAIM_SECONDS,
    }
  );

  if (error) {
    logger.error('Idempotency claim RPC failed — failing closed', error, {
      service: 'idempotency',
      idempotencyKey,
      operation,
    });
    throw new IdempotencyStoreUnavailableError(
      'Idempotency store is unavailable',
      idempotencyKey,
      operation,
      error
    );
  }

  const row = (Array.isArray(data) ? data[0] : data) as ClaimRow | undefined;
  if (!row) {
    logger.error(
      'Idempotency claim RPC returned no row — failing closed',
      null,
      {
        service: 'idempotency',
        idempotencyKey,
        operation,
      }
    );
    throw new IdempotencyStoreUnavailableError(
      'Idempotency store returned no row',
      idempotencyKey,
      operation
    );
  }

  if (row.claimed) {
    // We own the operation. Caller proceeds.
    return null;
  }

  if (row.is_duplicate) {
    // Completed previously. Honour 24h TTL: expired entries are treated as
    // a new request (caller proceeds, but we have NOT re-claimed). To keep
    // this safe, return null only if a fresh claim can be made.
    if (row.cached_created_at) {
      const ageMinutes =
        (Date.now() - new Date(row.cached_created_at).getTime()) / 60000;
      if (ageMinutes > IDEMPOTENCY_TTL_HOURS * 60) {
        logger.warn('Idempotency key expired — treating as new request', {
          service: 'idempotency',
          idempotencyKey,
          operation,
          ageMinutes,
        });
        // Drop the stale row so the next claim can succeed atomically.
        await serverSupabase.rpc('release_idempotency_claim', {
          p_idempotency_key: idempotencyKey,
          p_operation: operation,
        });
        return checkIdempotency<T>(idempotencyKey, operation);
      }
    }
    return {
      isDuplicate: true,
      cachedResult: row.cached_result as T,
      idempotencyKey,
    };
  }

  if (row.is_pending) {
    // Another request is in flight (within stale-claim TTL).
    logger.warn('Idempotency key is held by an in-flight request', {
      service: 'idempotency',
      idempotencyKey,
      operation,
    });
    throw new IdempotencyStoreUnavailableError(
      'Another request is currently processing this idempotency key',
      idempotencyKey,
      operation
    );
  }

  // Defensive: unreachable.
  throw new IdempotencyStoreUnavailableError(
    'Idempotency store returned an unexpected state',
    idempotencyKey,
    operation
  );
}

/**
 * Mark a claim 'completed' and persist the result. Safe to call multiple
 * times — only the first call (against a 'pending' row) updates.
 *
 * If the underlying row doesn't exist (e.g., expired and cleaned up between
 * claim and store), the missing-row case is treated as success since the
 * intent — make this operation result visible to retries — cannot be met
 * without the row anyway. Caller has already done the work; logging only.
 */
export async function storeIdempotencyResult<T>(
  idempotencyKey: string,
  operation: string,
  result: T,
  userId?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const { data, error } = await serverSupabase.rpc(
    'complete_idempotency_claim',
    {
      p_idempotency_key: idempotencyKey,
      p_operation: operation,
      p_result: result as unknown,
      p_user_id: userId ?? null,
      p_metadata: metadata ?? null,
    }
  );

  if (error) {
    logger.error('Idempotency completion RPC failed', error, {
      service: 'idempotency',
      idempotencyKey,
      operation,
    });
    return;
  }

  if (data === false) {
    logger.warn('Idempotency completion updated zero rows', {
      service: 'idempotency',
      idempotencyKey,
      operation,
    });
  }
}

/**
 * Drop a pending claim so future retries can succeed. Call this when the
 * protected operation FAILED and you want the next request with the same
 * key to be allowed to retry from scratch instead of inheriting a stale
 * 'pending' row.
 *
 * Note: callers that don't call this on failure are still protected — the
 * row will be auto-recovered after STALE_CLAIM_SECONDS by the next claim.
 */
export async function releaseIdempotencyClaim(
  idempotencyKey: string,
  operation: string
): Promise<void> {
  const { error } = await serverSupabase.rpc('release_idempotency_claim', {
    p_idempotency_key: idempotencyKey,
    p_operation: operation,
  });
  if (error) {
    logger.error('Idempotency release RPC failed', error, {
      service: 'idempotency',
      idempotencyKey,
      operation,
    });
  }
}

/**
 * Wrap the post-claim block of a route so the idempotency claim is
 * released when the operation throws. Lets the user retry immediately
 * instead of waiting for the 60s stale-takeover window.
 *
 * Usage:
 *   const idempotencyCheck = await checkIdempotency(key, 'op');
 *   if (idempotencyCheck?.isDuplicate) return cached;
 *   return await releaseOnError(key, 'op', async () => {
 *     // ... do the protected work ...
 *     await storeIdempotencyResult(key, 'op', result);
 *     return NextResponse.json(result);
 *   });
 *
 * The release failure is swallowed so it can't mask the original error.
 * Re-throws the original error so the route's existing error handling
 * (withApiHandler / handleAPIError) still runs.
 */
export async function releaseOnError<T>(
  idempotencyKey: string,
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    try {
      await releaseIdempotencyClaim(idempotencyKey, operation);
    } catch {
      // intentional: don't let release failure mask the original error
    }
    throw err;
  }
}

function generateIdempotencyKey(
  operation: string,
  userId: string,
  resourceId?: string
): string {
  const timestamp = Date.now();
  const random = crypto.randomUUID();
  const parts = [
    operation,
    userId,
    resourceId || '',
    timestamp.toString(),
    random,
  ]
    .filter(Boolean)
    .join('_');

  return `${parts}`.substring(0, 255);
}

/**
 * Extract idempotency key from request headers or generate new one.
 */
export function getIdempotencyKeyFromRequest(
  request: Request,
  operation: string,
  userId: string,
  resourceId?: string
): string {
  const headerKey = request.headers.get('idempotency-key');
  if (headerKey && headerKey.length > 0 && headerKey.length <= 255) {
    return headerKey;
  }
  return generateIdempotencyKey(operation, userId, resourceId);
}
