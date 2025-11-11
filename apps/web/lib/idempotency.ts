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
 * Check if an idempotency key has been used before
 * Returns cached result if found, otherwise null
 */
export async function checkIdempotency<T>(
  idempotencyKey: string,
  operation: string
): Promise<IdempotencyResult<T> | null> {
  try {
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
  } catch (error) {
    logger.error('Exception checking idempotency', error, {
      service: 'idempotency',
      idempotencyKey,
      operation,
    });
    return null;
  }
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

