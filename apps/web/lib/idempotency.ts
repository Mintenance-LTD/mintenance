/**
 * Idempotency Utility
 * 
 * Provides idempotency key management for critical operations to prevent
 * duplicate processing of requests (e.g., payments, escrow releases, bid submissions).
 */

import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';

export interface IdempotencyResult<T> {
  isDuplicate: boolean;
  cachedResult?: T;
  idempotencyKey: string;
}

/**
 * Distributed lock result
 */
interface LockResult {
  acquired: boolean;
  lockId?: string;
}

/**
 * Lock timeout in milliseconds (default: 30 seconds)
 */
const LOCK_TIMEOUT_MS = 30000;

/**
 * Acquire a distributed lock using PostgreSQL advisory locks
 * Uses pg_try_advisory_lock for non-blocking lock acquisition
 *
 * @param key - Unique key to lock (will be hashed to integer)
 * @param ttl - Time to live in milliseconds (default: 30 seconds)
 * @returns Lock result with acquisition status and lock ID
 */
export async function acquireDistributedLock(
  key: string,
  ttl: number = LOCK_TIMEOUT_MS
): Promise<LockResult> {
  try {
    // Hash the key to a 32-bit integer for PostgreSQL advisory lock
    // Using simple hash function for demonstration
    const lockId = hashStringToInt32(key);

    // Try to acquire the lock (non-blocking)
    const { data, error } = await serverSupabase.rpc('pg_try_advisory_lock', {
      lock_key: lockId,
    });

    if (error) {
      logger.error('Error acquiring distributed lock', error, {
        service: 'idempotency',
        key,
        lockId,
      });
      return { acquired: false };
    }

    // data will be true if lock was acquired, false otherwise
    if (data) {
      // Set a timeout to auto-release the lock
      setTimeout(() => {
        releaseDistributedLock(key, lockId).catch((err) => {
          logger.error('Error auto-releasing lock after timeout', err, {
            service: 'idempotency',
            key,
            lockId,
          });
        });
      }, ttl);

      logger.info('Distributed lock acquired', {
        service: 'idempotency',
        key,
        lockId,
        ttl,
      });

      return { acquired: true, lockId: lockId.toString() };
    }

    logger.warn('Failed to acquire distributed lock - already held', {
      service: 'idempotency',
      key,
      lockId,
    });

    return { acquired: false };
  } catch (error) {
    logger.error('Exception acquiring distributed lock', error, {
      service: 'idempotency',
      key,
    });
    return { acquired: false };
  }
}

/**
 * Release a distributed lock
 *
 * @param key - The key that was locked
 * @param lockId - Optional lock ID (will be computed from key if not provided)
 */
export async function releaseDistributedLock(
  key: string,
  lockId?: number
): Promise<void> {
  try {
    const computedLockId = lockId ?? hashStringToInt32(key);

    const { error } = await serverSupabase.rpc('pg_advisory_unlock', {
      lock_key: computedLockId,
    });

    if (error) {
      logger.error('Error releasing distributed lock', error, {
        service: 'idempotency',
        key,
        lockId: computedLockId,
      });
      return;
    }

    logger.info('Distributed lock released', {
      service: 'idempotency',
      key,
      lockId: computedLockId,
    });
  } catch (error) {
    logger.error('Exception releasing distributed lock', error, {
      service: 'idempotency',
      key,
    });
  }
}

/**
 * Hash a string to a 32-bit integer for PostgreSQL advisory locks
 * Uses a simple hash function (djb2 variant)
 */
function hashStringToInt32(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  // Ensure positive 32-bit integer
  return Math.abs(hash | 0);
}

/**
 * Check if an idempotency key has been used before
 * Returns cached result if found, otherwise null
 * Uses distributed locking to prevent race conditions
 */
export async function checkIdempotency<T>(
  idempotencyKey: string,
  operation: string,
  useLocking: boolean = true
): Promise<IdempotencyResult<T> | null> {
  let lockId: number | undefined;

  try {
    // Acquire distributed lock to prevent concurrent processing
    if (useLocking) {
      const lockResult = await acquireDistributedLock(
        `idempotency:${operation}:${idempotencyKey}`,
        LOCK_TIMEOUT_MS
      );

      if (!lockResult.acquired) {
        // Lock not acquired - another request is processing this key
        // Wait a bit and try to get the cached result
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Try to get the cached result (might be available now)
        const cachedCheck = await getCachedIdempotencyResult<T>(
          idempotencyKey,
          operation
        );
        if (cachedCheck) {
          return cachedCheck;
        }

        // Still not available - return null to indicate lock contention
        logger.warn('Lock contention - request will be retried', {
          service: 'idempotency',
          idempotencyKey,
          operation,
        });
        return null;
      }

      lockId = lockResult.lockId ? parseInt(lockResult.lockId) : undefined;
    }

    // Check for existing result
    const cachedResult = await getCachedIdempotencyResult<T>(
      idempotencyKey,
      operation
    );

    return cachedResult;
  } catch (error) {
    logger.error('Exception checking idempotency', error, {
      service: 'idempotency',
      idempotencyKey,
      operation,
    });
    return null;
  } finally {
    // Always release lock if acquired
    if (useLocking && lockId !== undefined) {
      await releaseDistributedLock(
        `idempotency:${operation}:${idempotencyKey}`,
        lockId
      );
    }
  }
}

/**
 * Internal function to get cached idempotency result
 */
async function getCachedIdempotencyResult<T>(
  idempotencyKey: string,
  operation: string
): Promise<IdempotencyResult<T> | null> {
  const { data, error } = await serverSupabase
    .from('idempotency_keys')
    .select('result, created_at')
    .eq('idempotency_key', idempotencyKey)
    .eq('operation', operation)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Key doesn't exist - this is a new request
      return null;
    }
    logger.error('Error checking idempotency', error, {
      service: 'idempotency',
      idempotencyKey,
      operation,
    });
    return null;
  }

  if (data) {
    // Key exists - this is a duplicate request
    const cachedResult = data.result as T;
    const createdAt = new Date(data.created_at);
    const ageMinutes = (Date.now() - createdAt.getTime()) / (1000 * 60);

    // Idempotency keys expire after 24 hours
    if (ageMinutes > 24 * 60) {
      logger.warn('Idempotency key expired, treating as new request', {
        service: 'idempotency',
        idempotencyKey,
        operation,
        ageMinutes,
      });
      return null;
    }

    return {
      isDuplicate: true,
      cachedResult,
      idempotencyKey,
    };
  }

  return null;
}

/**
 * Store idempotency key with result
 */
export async function storeIdempotencyResult<T>(
  idempotencyKey: string,
  operation: string,
  result: T,
  userId?: string,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    const { error } = await serverSupabase
      .from('idempotency_keys')
      .insert({
        idempotency_key: idempotencyKey,
        operation,
        result,
        user_id: userId || null,
        metadata: metadata || null,
        created_at: new Date().toISOString(),
      });

    if (error) {
      // If it's a unique constraint violation, that's okay - means another request already stored it
      if (error.code === '23505') {
        logger.warn('Idempotency key already exists (race condition)', {
          service: 'idempotency',
          idempotencyKey,
          operation,
        });
        return;
      }

      logger.error('Error storing idempotency result', error, {
        service: 'idempotency',
        idempotencyKey,
        operation,
      });
    }
  } catch (error) {
    logger.error('Exception storing idempotency result', error, {
      service: 'idempotency',
      idempotencyKey,
      operation,
    });
  }
}

/**
 * Generate an idempotency key for an operation
 */
export function generateIdempotencyKey(
  operation: string,
  userId: string,
  resourceId?: string
): string {
  const timestamp = Date.now();
  const random = crypto.randomUUID();
  const parts = [operation, userId, resourceId || '', timestamp.toString(), random]
    .filter(Boolean)
    .join('_');
  
  return `${parts}`.substring(0, 255); // Ensure it fits in database
}

/**
 * Extract idempotency key from request headers or generate new one
 */
export function getIdempotencyKeyFromRequest(
  request: Request,
  operation: string,
  userId: string,
  resourceId?: string
): string {
  // Check for idempotency key in header (client can provide one)
  const headerKey = request.headers.get('idempotency-key');
  if (headerKey && headerKey.length > 0 && headerKey.length <= 255) {
    return headerKey;
  }

  // Generate one based on request content
  return generateIdempotencyKey(operation, userId, resourceId);
}

