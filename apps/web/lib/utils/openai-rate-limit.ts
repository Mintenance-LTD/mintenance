/**
 * OpenAI API Rate Limit Handling Utility
 * 
 * Provides retry logic with exponential backoff and rate limit header parsing
 * for OpenAI API requests.
 */

import { logger } from '@mintenance/shared';

export interface OpenAIRateLimitInfo {
  limitRequests: number | null;
  remainingRequests: number | null;
  limitTokens: number | null;
  remainingTokens: number | null;
  resetRequests: number | null; // Unix timestamp
  resetTokens: number | null; // Unix timestamp
  retryAfter: number | null; // Seconds to wait
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 5,
  baseDelayMs: 2000, // Start with 2 seconds
  maxDelayMs: 60000, // Max 60 seconds
  backoffMultiplier: 2,
};

/**
 * Parse OpenAI rate limit headers from response
 */
export function parseRateLimitHeaders(headers: Headers): OpenAIRateLimitInfo {
  const info: OpenAIRateLimitInfo = {
    limitRequests: null,
    remainingRequests: null,
    limitTokens: null,
    remainingTokens: null,
    resetRequests: null,
    resetTokens: null,
    retryAfter: null,
  };

  // Parse rate limit headers
  const limitRequests = headers.get('x-ratelimit-limit-requests');
  const remainingRequests = headers.get('x-ratelimit-remaining-requests');
  const limitTokens = headers.get('x-ratelimit-limit-tokens');
  const remainingTokens = headers.get('x-ratelimit-remaining-tokens');
  const resetRequests = headers.get('x-ratelimit-reset-requests');
  const resetTokens = headers.get('x-ratelimit-reset-tokens');
  const retryAfter = headers.get('retry-after');

  if (limitRequests) info.limitRequests = parseInt(limitRequests, 10);
  if (remainingRequests) info.remainingRequests = parseInt(remainingRequests, 10);
  if (limitTokens) info.limitTokens = parseInt(limitTokens, 10);
  if (remainingTokens) info.remainingTokens = parseInt(remainingTokens, 10);
  if (resetRequests) info.resetRequests = parseInt(resetRequests, 10);
  if (resetTokens) info.resetTokens = parseInt(resetTokens, 10);
  if (retryAfter) info.retryAfter = parseInt(retryAfter, 10);

  return info;
}

/**
 * Check if error is a rate limit error (429)
 */
export function isRateLimitError(error: unknown): boolean {
  if (error instanceof Error) {
    return (
      error.message.includes('429') ||
      error.message.includes('rate limit') ||
      error.message.includes('too many requests')
    );
  }
  return false;
}

/**
 * Calculate delay based on retry attempt and rate limit info
 */
export function calculateDelay(
  attempt: number,
  config: RetryConfig,
  rateLimitInfo?: OpenAIRateLimitInfo
): number {
  // If we have a retry-after header, use it (but cap at maxDelayMs)
  if (rateLimitInfo?.retryAfter) {
    const retryAfterMs = rateLimitInfo.retryAfter * 1000;
    return Math.min(retryAfterMs, config.maxDelayMs);
  }

  // Otherwise, use exponential backoff
  const exponentialDelay = config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt);
  return Math.min(exponentialDelay, config.maxDelayMs);
}

/**
 * Execute a function with retry logic for OpenAI API rate limits
 */
export async function withOpenAIRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: Error | null = null;
  let lastRateLimitInfo: OpenAIRateLimitInfo | undefined;

  for (let attempt = 0; attempt <= finalConfig.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if it's a rate limit error
      const isRateLimit = isRateLimitError(lastError);

      // If it's not a rate limit error or we're out of retries, throw
      if (!isRateLimit || attempt >= finalConfig.maxAttempts) {
        logger.error('OpenAI API request failed', {
          attempt: attempt + 1,
          maxAttempts: finalConfig.maxAttempts + 1,
          error: lastError.message,
          isRateLimit,
        });
        throw lastError;
      }

      // Calculate delay based on rate limit info or exponential backoff
      const delayMs = calculateDelay(attempt, finalConfig, lastRateLimitInfo);

      logger.warn('OpenAI rate limit hit, retrying with backoff', {
        attempt: attempt + 1,
        maxAttempts: finalConfig.maxAttempts + 1,
        delayMs,
        rateLimitInfo: lastRateLimitInfo,
        error: lastError.message,
      });

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  throw lastError || new Error('Retry failed with unknown error');
}

/**
 * Execute an OpenAI fetch request with rate limit handling
 */
export async function fetchWithOpenAIRetry(
  url: string,
  options: RequestInit,
  config: Partial<RetryConfig> = {}
): Promise<Response> {
  return withOpenAIRetry(async () => {
    const response = await fetch(url, options);

    // If it's a 429, parse rate limit headers for better retry timing
    if (response.status === 429) {
      const rateLimitInfo = parseRateLimitHeaders(response.headers);
      const errorText = await response.text();
      const error = new Error(`AI assessment failed: ${response.status}`);
      
      // Attach rate limit info to error for better retry handling
      (error as any).rateLimitInfo = rateLimitInfo;
      
      throw error;
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI assessment failed: ${response.status}: ${errorText}`);
    }

    return response;
  }, config);
}

