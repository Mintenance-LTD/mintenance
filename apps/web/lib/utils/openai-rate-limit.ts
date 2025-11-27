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

export interface RetryMetrics {
  totalRequests: number;
  totalRetries: number;
  requestsWithRetries: number; // Number of requests that required at least one retry
  rateLimitErrors: number;
  successfulAfterRetry: number;
  failedAfterRetry: number;
  averageRetriesPerRequest: number;
  retryRate: number; // Percentage of requests that required retries
  averageRetryDelayMs: number;
  totalDelayTimeMs: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 5,
  baseDelayMs: 2000, // Start with 2 seconds
  maxDelayMs: 60000, // Max 60 seconds
  backoffMultiplier: 2,
};

export const BATCH_PROCESSING_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 10, // More retries for batch jobs
  baseDelayMs: 20000, // 20 seconds - longer for batch
  maxDelayMs: 300000, // 5 minutes - longer for batch
  backoffMultiplier: 2,
};

// Global metrics tracker
let retryMetrics: RetryMetrics = {
  totalRequests: 0,
  totalRetries: 0,
  requestsWithRetries: 0,
  rateLimitErrors: 0,
  successfulAfterRetry: 0,
  failedAfterRetry: 0,
  averageRetriesPerRequest: 0,
  retryRate: 0,
  averageRetryDelayMs: 0,
  totalDelayTimeMs: 0,
};

/**
 * Get current retry metrics
 */
export function getRetryMetrics(): RetryMetrics {
  return { ...retryMetrics };
}

/**
 * Reset retry metrics (useful for testing or batch processing)
 */
export function resetRetryMetrics(): void {
  retryMetrics = {
    totalRequests: 0,
    totalRetries: 0,
    requestsWithRetries: 0,
    rateLimitErrors: 0,
    successfulAfterRetry: 0,
    failedAfterRetry: 0,
    averageRetriesPerRequest: 0,
    retryRate: 0,
    averageRetryDelayMs: 0,
    totalDelayTimeMs: 0,
  };
}

/**
 * Check if base delay should be increased based on retry metrics
 */
export function shouldIncreaseBaseDelay(metrics: RetryMetrics): boolean {
  return metrics.retryRate > 50;
}

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

  // Parse and validate values
  if (limitRequests) {
    const parsed = parseInt(limitRequests, 10);
    if (!isNaN(parsed) && parsed > 0) {
      info.limitRequests = parsed;
    }
  }
  if (remainingRequests) {
    const parsed = parseInt(remainingRequests, 10);
    if (!isNaN(parsed) && parsed >= 0) {
      info.remainingRequests = parsed;
    }
  }
  if (limitTokens) {
    const parsed = parseInt(limitTokens, 10);
    if (!isNaN(parsed) && parsed > 0) {
      info.limitTokens = parsed;
    }
  }
  if (remainingTokens) {
    const parsed = parseInt(remainingTokens, 10);
    if (!isNaN(parsed) && parsed >= 0) {
      info.remainingTokens = parsed;
    }
  }
  if (resetRequests) {
    const parsed = parseInt(resetRequests, 10);
    if (!isNaN(parsed) && parsed > 0) {
      // Validate timestamp (should be reasonable Unix timestamp)
      const now = Math.floor(Date.now() / 1000);
      if (parsed > now - 86400 && parsed < now + 3600) {
        info.resetRequests = parsed;
      }
    }
  }
  if (resetTokens) {
    const parsed = parseInt(resetTokens, 10);
    if (!isNaN(parsed) && parsed > 0) {
      const now = Math.floor(Date.now() / 1000);
      if (parsed > now - 86400 && parsed < now + 3600) {
        info.resetTokens = parsed;
      }
    }
  }
  if (retryAfter) {
    const parsed = parseInt(retryAfter, 10);
    if (!isNaN(parsed) && parsed > 0 && parsed < 3600) {
      info.retryAfter = parsed;
    }
  }

  // Log parsed headers at debug level
  logger.debug('Parsed OpenAI rate limit headers', {
    limitRequests: info.limitRequests,
    remainingRequests: info.remainingRequests,
    limitTokens: info.limitTokens,
    remainingTokens: info.remainingTokens,
    resetRequests: info.resetRequests,
    resetTokens: info.resetTokens,
    retryAfter: info.retryAfter,
  });

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
  let delayMs: number;

  // If we have a retry-after header, prefer it (but cap at maxDelayMs)
  if (rateLimitInfo?.retryAfter) {
    delayMs = rateLimitInfo.retryAfter * 1000;
    delayMs = Math.min(delayMs, config.maxDelayMs);
    logger.debug('Using retry-after header for delay', {
      retryAfter: rateLimitInfo.retryAfter,
      delayMs,
    });
  } else {
    // Otherwise, use exponential backoff
    delayMs = config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt);
    delayMs = Math.min(delayMs, config.maxDelayMs);
    logger.debug('Using exponential backoff for delay', {
      attempt,
      baseDelayMs: config.baseDelayMs,
      delayMs,
    });
  }

  // Ensure minimum delay of 1 second
  return Math.max(delayMs, 1000);
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
  let retryCount = 0;
  let totalDelayMs = 0;

  // Track this request
  retryMetrics.totalRequests++;

  for (let attempt = 0; attempt <= finalConfig.maxAttempts; attempt++) {
    try {
      const result = await fn();
      
      // If we had retries, track successful retry
      if (retryCount > 0) {
        retryMetrics.successfulAfterRetry++;
        retryMetrics.requestsWithRetries++;
      }
      
      // Update metrics
      retryMetrics.totalRetries += retryCount;
      if (retryCount > 0) {
        retryMetrics.totalDelayTimeMs += totalDelayMs;
        if (retryMetrics.totalRetries > 0) {
          retryMetrics.averageRetryDelayMs = retryMetrics.totalDelayTimeMs / retryMetrics.totalRetries;
        }
      }
      if (retryMetrics.totalRequests > 0) {
        retryMetrics.averageRetriesPerRequest = retryMetrics.totalRetries / retryMetrics.totalRequests;
        retryMetrics.retryRate = (retryMetrics.requestsWithRetries / retryMetrics.totalRequests) * 100;
      }
      
      return result;
    } catch (error) {
      // Preserve the original error object to maintain rateLimitInfo
      if (error instanceof Error) {
        lastError = error;
        // Preserve rate limit info if it exists
        if ((error as any)?.rateLimitInfo) {
          lastRateLimitInfo = (error as any).rateLimitInfo;
        }
      } else {
        lastError = new Error(String(error));
      }

      // Check if it's a rate limit error
      const isRateLimit = isRateLimitError(lastError);

      // Track rate limit errors
      if (isRateLimit) {
        retryMetrics.rateLimitErrors++;
      }

      // If it's not a rate limit error or we're out of retries, throw
      if (!isRateLimit || attempt >= finalConfig.maxAttempts) {
        // Track failed retry if we had retries
        if (retryCount > 0) {
          retryMetrics.failedAfterRetry++;
          retryMetrics.requestsWithRetries++;
        }
        
        // Update metrics
        retryMetrics.totalRetries += retryCount;
        if (retryCount > 0) {
          retryMetrics.totalDelayTimeMs += totalDelayMs;
          if (retryMetrics.totalRetries > 0) {
            retryMetrics.averageRetryDelayMs = retryMetrics.totalDelayTimeMs / retryMetrics.totalRetries;
          }
        }
        if (retryMetrics.totalRequests > 0) {
          retryMetrics.averageRetriesPerRequest = retryMetrics.totalRetries / retryMetrics.totalRequests;
          retryMetrics.retryRate = (retryMetrics.requestsWithRetries / retryMetrics.totalRequests) * 100;
        }
        
        logger.error('OpenAI API request failed', {
          attempt: attempt + 1,
          maxAttempts: finalConfig.maxAttempts + 1,
          error: lastError.message,
          isRateLimit,
          rateLimitInfo: lastRateLimitInfo,
        });
        // Preserve rateLimitInfo in the thrown error
        if (lastRateLimitInfo) {
          (lastError as any).rateLimitInfo = lastRateLimitInfo;
        }
        throw lastError;
      }

      // Increment retry count
      retryCount++;

      // Calculate delay based on rate limit info or exponential backoff
      const delayMs = calculateDelay(attempt, finalConfig, lastRateLimitInfo);
      totalDelayMs += delayMs;

      logger.warn('OpenAI rate limit hit, retrying with backoff', {
        attempt: attempt + 1,
        maxAttempts: finalConfig.maxAttempts + 1,
        delayMs,
        rateLimitInfo: lastRateLimitInfo,
        error: lastError.message,
        usingHeaderDelay: !!lastRateLimitInfo?.retryAfter,
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

