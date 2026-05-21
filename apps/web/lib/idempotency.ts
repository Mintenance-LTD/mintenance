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
  // Pass the TTL to the RPC so expired-completed rows are swept atomically
  // inside the same transaction as the claim attempt. Avoids the previous
  // recursion path (release_idempotency_claim only deleted status='pending'
  // rows so an expired-completed row would loop forever).
  const { data, error } = await serverSupabase.rpc(
    'try_claim_idempotency_key',
    {
      p_idempotency_key: idempotencyKey,
      p_operation: operation,
      p_stale_after_seconds: STALE_CLAIM_SECONDS,
      p_ttl_seconds: IDEMPOTENCY_TTL_HOURS * 3600,
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
    // Completed previously and still within the 24h TTL. The RPC sweeps
    // expired-completed rows before returning, so we never see is_duplicate
    // for a row that's past the TTL — it would have been deleted and
    // either re-claimed (row.claimed=true above) or pending.
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
 * Retries up to 5x with exponential backoff (250 / 500 / 1000 / 2000 ms
 * = ~3.75s spent between attempts before the final one). The protected
 * operation has already completed by the time this is called, so failing
 * here leaves the claim 'pending' and the next retry-after-stale-takeover
 * may re-execute the work. For Stripe-bound routes that risk is mitigated
 * by upstream Stripe `idempotencyKey` headers (Stripe dedupes server-side);
 * for notification/DB-only side-effects the duplication risk remains and
 * needs deterministic per-call dedup keys at the caller layer.
 *
 * After retry exhaustion, the claim is RELEASED (DELETE) so the next
 * request can retry immediately instead of waiting STALE_CLAIM_SECONDS
 * for stale-takeover. Tighter blast radius than the previous "leave
 * pending and wait" behaviour, same upstream dedup guarantees.
 *
 * We deliberately don't throw on persistent failure: throwing here would
 * cause the API to return 500 even though the protected work succeeded,
 * triggering client retries that loop through the same 503 (claim pending)
 * → 60s-stale-takeover → re-execute path.
 */
export async function storeIdempotencyResult<T>(
  idempotencyKey: string,
  operation: string,
  result: T,
  userId?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const MAX_ATTEMPTS = 5;
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
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

    if (!error) {
      if (data === false) {
        logger.warn('Idempotency completion updated zero rows', {
          service: 'idempotency',
          idempotencyKey,
          operation,
        });
      }
      return;
    }

    lastError = error;
    if (attempt < MAX_ATTEMPTS) {
      // Exponential backoff capped at 4s per step: 250, 500, 1000, 2000.
      // Most failures are transient (network blip / pgbouncer reconnect).
      await new Promise((r) =>
        setTimeout(r, Math.min(250 * 2 ** (attempt - 1), 4000))
      );
    }
  }

  // Release the pending claim so retries don't wait STALE_CLAIM_SECONDS.
  // Release failures are intentionally swallowed — the stale-takeover
  // backstop still kicks in.
  try {
    await serverSupabase.rpc('release_idempotency_claim', {
      p_idempotency_key: idempotencyKey,
      p_operation: operation,
    });
  } catch {
    /* intentional */
  }

  // Log at ERROR with severity='critical' so alerting can fire on a
  // persistent stream — the idempotency cache is broken and downstream
  // side-effect duplication becomes possible.
  logger.error(
    'Idempotency completion RPC failed after retries — claim released for retry',
    lastError,
    {
      service: 'idempotency',
      idempotencyKey,
      operation,
      attempts: MAX_ATTEMPTS,
      severity: 'critical',
    }
  );
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
