/**
 * Timeout utilities for preventing function timeouts
 */

import { logger } from '@mintenance/shared';

export interface TimeoutOptions {
  timeoutMs?: number;
  fallbackValue?: any;
  errorMessage?: string;
}

/**
 * Wrap an async operation with timeout protection
 */
export async function withTimeout<T>(
  operation: () => Promise<T>,
  options: TimeoutOptions = {}
): Promise<T> {
  const {
    timeoutMs = 25000, // 25 seconds default (leave 5s buffer for Vercel's 30s limit)
    fallbackValue = null,
    errorMessage = 'Operation timed out'
  } = options;

  return Promise.race([
    operation(),
    new Promise<T>((_, reject) => {
      setTimeout(() => {
        reject(new Error(errorMessage));
      }, timeoutMs);
    })
  ]).catch(error => {
    if (error.message === errorMessage) {
      logger.warn('Operation timed out, returning fallback', {
        service: 'timeout-utils',
        timeoutMs,
      });
      return fallbackValue;
    }
    throw error;
  });
}

/**
 * Batch operations to prevent timeouts
 */
export async function batchOperations<T, R>(
  items: T[],
  processor: (batch: T[]) => Promise<R[]>,
  batchSize: number = 10,
  delayMs: number = 100
): Promise<R[]> {
  const results: R[] = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await processor(batch);
    results.push(...batchResults);
    
    // Add delay between batches to prevent overwhelming the system
    if (i + batchSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  return results;
}

/**
 * Create a timeout-aware database query wrapper
 */
export function createTimeoutQuery<T>(
  queryFn: () => Promise<T>,
  timeoutMs: number = 20000
): Promise<T> {
  return withTimeout(queryFn, {
    timeoutMs,
    fallbackValue: null,
    errorMessage: `Database query timed out after ${timeoutMs}ms`
  });
}
