/**
 * API Timeout Utilities
 *
 * Provides timeout wrappers for external API calls to prevent hanging requests
 * Supports fetch, Stripe, and other async operations
 */

import { logger } from '@mintenance/shared';

/**
 * Timeout configuration
 */
export interface TimeoutConfig {
  timeoutMs: number;          // Timeout in milliseconds
  operation: string;          // Operation name for logging
  retries?: number;           // Number of retries (default: 0)
  retryDelayMs?: number;      // Delay between retries (default: 1000ms)
}

/**
 * Timeout error class
 */
export class TimeoutError extends Error {
  constructor(
    public operation: string,
    public timeoutMs: number
  ) {
    super(`Operation '${operation}' timed out after ${timeoutMs}ms`);
    this.name = 'TimeoutError';
  }
}

/**
 * Execute an async operation with timeout
 *
 * @param operation - The async operation to execute
 * @param config - Timeout configuration
 * @returns Promise that resolves with operation result or rejects on timeout
 *
 * @example
 * const result = await withTimeout(
 *   () => fetch('https://api.example.com/data'),
 *   { timeoutMs: 5000, operation: 'fetch-external-data' }
 * );
 */
export async function withTimeout<T>(
  operation: () => Promise<T>,
  config: TimeoutConfig
): Promise<T> {
  const { timeoutMs, operation: opName, retries = 0, retryDelayMs = 1000 } = config;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        // Execute operation with timeout
        const result = await Promise.race([
          operation(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new TimeoutError(opName, timeoutMs)), timeoutMs)
          ),
        ]);

        clearTimeout(timeoutId);
        return result;
      } catch (error) {
        clearTimeout(timeoutId);

        // If it's a timeout error and we have retries left, retry
        if (error instanceof TimeoutError && attempt < retries) {
          lastError = error;
          logger.warn(`Timeout on attempt ${attempt + 1}/${retries + 1}, retrying...`, {
            operation: opName,
            timeoutMs,
            attempt: attempt + 1,
          });

          // Wait before retry
          await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
          continue;
        }

        throw error;
      }
    } catch (error) {
      // If this is the last attempt, throw the error
      if (attempt === retries) {
        logger.error('Operation failed after all retries', {
          operation: opName,
          attempts: attempt + 1,
          error,
        });
        throw error;
      }

      lastError = error as Error;
    }
  }

  // Should never reach here, but TypeScript doesn't know that
  throw lastError || new Error('Unknown error');
}

/**
 * Fetch with timeout
 *
 * @param url - URL to fetch
 * @param options - Fetch options
 * @param timeoutMs - Timeout in milliseconds (default: 10000)
 * @returns Response
 *
 * @example
 * const response = await fetchWithTimeout(
 *   'https://maps.googleapis.com/maps/api/geocode/json?address=London',
 *   { method: 'GET' },
 *   5000
 * );
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 10000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      throw new TimeoutError(`fetch: ${url}`, timeoutMs);
    }

    throw error;
  }
}

/**
 * Geocoding with timeout (Google Maps API)
 *
 * @param address - Address to geocode
 * @param apiKey - Google Maps API key
 * @param timeoutMs - Timeout in milliseconds (default: 5000)
 * @returns Geocoding result
 */
export async function geocodeWithTimeout(
  address: string,
  apiKey: string,
  timeoutMs: number = 5000
): Promise<{
  latitude: number;
  longitude: number;
  formattedAddress: string;
}> {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
    address
  )}&key=${apiKey}`;

  const response = await fetchWithTimeout(url, { method: 'GET' }, timeoutMs);

  if (!response.ok) {
    throw new Error(`Geocoding failed: ${response.statusText}`);
  }

  const data = await response.json();

  if (data.status !== 'OK' || !data.results?.[0]) {
    throw new Error(`Geocoding failed: ${data.status}`);
  }

  const result = data.results[0];
  const location = result.geometry.location;

  return {
    latitude: location.lat,
    longitude: location.lng,
    formattedAddress: result.formatted_address,
  };
}

/**
 * Stripe API call with timeout
 *
 * @param operation - Stripe operation to execute
 * @param operationName - Name of the operation for logging
 * @param timeoutMs - Timeout in milliseconds (default: 10000)
 * @returns Result from Stripe operation
 *
 * @example
 * const paymentIntent = await stripeWithTimeout(
 *   () => stripe.paymentIntents.create({ amount: 1000, currency: 'gbp' }),
 *   'create-payment-intent',
 *   10000
 * );
 */
export async function stripeWithTimeout<T>(
  operation: () => Promise<T>,
  operationName: string,
  timeoutMs: number = 10000
): Promise<T> {
  return withTimeout(operation, {
    timeoutMs,
    operation: `stripe:${operationName}`,
    retries: 2, // Stripe operations are idempotent, can retry
    retryDelayMs: 1000,
  });
}

/**
 * AI/ML model inference with timeout
 *
 * @param operation - ML operation to execute
 * @param modelName - Name of the model for logging
 * @param timeoutMs - Timeout in milliseconds (default: 30000)
 * @returns Model prediction result
 *
 * @example
 * const prediction = await mlWithTimeout(
 *   () => YOLOModel.predict(imageUri),
 *   'yolo-damage-detection',
 *   30000
 * );
 */
export async function mlWithTimeout<T>(
  operation: () => Promise<T>,
  modelName: string,
  timeoutMs: number = 30000
): Promise<T> {
  return withTimeout(operation, {
    timeoutMs,
    operation: `ml:${modelName}`,
    retries: 1, // ML operations can be retried once
    retryDelayMs: 2000,
  });
}

/**
 * Database query with timeout
 *
 * @param operation - Database operation to execute
 * @param queryName - Name of the query for logging
 * @param timeoutMs - Timeout in milliseconds (default: 15000)
 * @returns Query result
 */
export async function dbWithTimeout<T>(
  operation: () => Promise<T>,
  queryName: string,
  timeoutMs: number = 15000
): Promise<T> {
  return withTimeout(operation, {
    timeoutMs,
    operation: `db:${queryName}`,
    retries: 0, // Don't retry DB operations by default (they may not be idempotent)
  });
}
