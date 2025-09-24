/**
 * Rate Limiting System
 * Implements various rate limiting strategies for API protection
 */

import { logger } from './logger';

export interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyGenerator?: (identifier: string) => string; // Custom key generation
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  skipFailedRequests?: boolean; // Don't count failed requests
  onLimitReached?: (key: string, info: RateLimitInfo) => void; // Callback when limit reached
}

export interface RateLimitInfo {
  totalRequests: number;
  remainingRequests: number;
  resetTime: number;
  isLimited: boolean;
}

export interface RateLimitEntry {
  count: number;
  resetTime: number;
  firstRequest: number;
}

export class RateLimiter {
  private store = new Map<string, RateLimitEntry>();
  private cleanupInterval: NodeJS.Timeout;
  private options: Required<RateLimitOptions>;

  constructor(options: RateLimitOptions) {
    this.options = {
      keyGenerator: (id: string) => id,
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      onLimitReached: () => {},
      ...options,
    };

    // Cleanup expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  /**
   * Check if request is allowed and update counters
   */
  async checkLimit(identifier: string): Promise<RateLimitInfo> {
    const key = this.options.keyGenerator(identifier);
    const now = Date.now();

    let entry = this.store.get(key);

    // Create new entry if doesn't exist or window expired
    if (!entry || now >= entry.resetTime) {
      entry = {
        count: 0,
        resetTime: now + this.options.windowMs,
        firstRequest: now,
      };
      this.store.set(key, entry);
    }

    // Calculate remaining requests
    const remainingRequests = Math.max(0, this.options.maxRequests - entry.count);
    const isLimited = entry.count >= this.options.maxRequests;

    const info: RateLimitInfo = {
      totalRequests: entry.count,
      remainingRequests,
      resetTime: entry.resetTime,
      isLimited,
    };

    // Trigger callback if limit reached
    if (isLimited && this.options.onLimitReached) {
      this.options.onLimitReached(key, info);
    }

    return info;
  }

  /**
   * Record a request (increment counter)
   */
  async recordRequest(identifier: string, wasSuccessful?: boolean): Promise<void> {
    // Skip counting based on options
    if (wasSuccessful && this.options.skipSuccessfulRequests) {
      return;
    }
    if (wasSuccessful === false && this.options.skipFailedRequests) {
      return;
    }

    const key = this.options.keyGenerator(identifier);
    const entry = this.store.get(key);

    if (entry) {
      entry.count++;
      this.store.set(key, entry);
    }
  }

  /**
   * Get current rate limit status
   */
  async getStatus(identifier: string): Promise<RateLimitInfo> {
    const key = this.options.keyGenerator(identifier);
    const entry = this.store.get(key);
    const now = Date.now();

    if (!entry || now >= entry.resetTime) {
      return {
        totalRequests: 0,
        remainingRequests: this.options.maxRequests,
        resetTime: now + this.options.windowMs,
        isLimited: false,
      };
    }

    return {
      totalRequests: entry.count,
      remainingRequests: Math.max(0, this.options.maxRequests - entry.count),
      resetTime: entry.resetTime,
      isLimited: entry.count >= this.options.maxRequests,
    };
  }

  /**
   * Reset rate limit for specific identifier
   */
  async reset(identifier: string): Promise<void> {
    const key = this.options.keyGenerator(identifier);
    this.store.delete(key);
    logger.info('RateLimiter', 'Rate limit reset for key', { key });
  }

  /**
   * Get time until reset in milliseconds
   */
  getTimeUntilReset(identifier: string): number {
    const key = this.options.keyGenerator(identifier);
    const entry = this.store.get(key);

    if (!entry) return 0;

    return Math.max(0, entry.resetTime - Date.now());
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, entry] of this.store.entries()) {
      if (now >= entry.resetTime) {
        this.store.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.debug('RateLimiter', 'Cleaned up expired entries', { cleanedCount });
    }
  }

  /**
   * Get statistics about the rate limiter
   */
  getStats(): {
    totalKeys: number;
    totalRequests: number;
    limitedKeys: number;
    memoryUsage: number;
  } {
    let totalRequests = 0;
    let limitedKeys = 0;

    for (const entry of this.store.values()) {
      totalRequests += entry.count;
      if (entry.count >= this.options.maxRequests) {
        limitedKeys++;
      }
    }

    return {
      totalKeys: this.store.size,
      totalRequests,
      limitedKeys,
      memoryUsage: process.memoryUsage?.().heapUsed || 0,
    };
  }

  /**
   * Dispose of the rate limiter
   */
  dispose(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.store.clear();
  }
}

/**
 * Sliding Window Rate Limiter
 * More accurate but uses more memory
 */
export class SlidingWindowRateLimiter {
  private requests = new Map<string, number[]>();
  private options: RateLimitOptions;

  constructor(options: RateLimitOptions) {
    this.options = options;
  }

  async checkLimit(identifier: string): Promise<RateLimitInfo> {
    const key = this.options.keyGenerator?.(identifier) || identifier;
    const now = Date.now();
    const windowStart = now - this.options.windowMs;

    // Get existing requests for this key
    let requests = this.requests.get(key) || [];

    // Remove requests outside the window
    requests = requests.filter(timestamp => timestamp > windowStart);

    // Update the store
    this.requests.set(key, requests);

    const remainingRequests = Math.max(0, this.options.maxRequests - requests.length);
    const isLimited = requests.length >= this.options.maxRequests;

    return {
      totalRequests: requests.length,
      remainingRequests,
      resetTime: requests.length > 0 ? requests[0] + this.options.windowMs : now + this.options.windowMs,
      isLimited,
    };
  }

  async recordRequest(identifier: string): Promise<void> {
    const key = this.options.keyGenerator?.(identifier) || identifier;
    const now = Date.now();

    let requests = this.requests.get(key) || [];
    requests.push(now);

    // Keep only requests within the window
    const windowStart = now - this.options.windowMs;
    requests = requests.filter(timestamp => timestamp > windowStart);

    this.requests.set(key, requests);
  }
}

/**
 * Token Bucket Rate Limiter
 * Allows bursts but maintains average rate
 */
export class TokenBucketRateLimiter {
  private buckets = new Map<string, { tokens: number; lastRefill: number }>();
  private options: RateLimitOptions & { refillRate: number };

  constructor(options: RateLimitOptions & { refillRate: number }) {
    this.options = options;
  }

  async checkLimit(identifier: string): Promise<RateLimitInfo> {
    const key = this.options.keyGenerator?.(identifier) || identifier;
    const now = Date.now();

    let bucket = this.buckets.get(key);

    if (!bucket) {
      bucket = {
        tokens: this.options.maxRequests,
        lastRefill: now,
      };
      this.buckets.set(key, bucket);
    }

    // Refill tokens based on time passed
    const timePassed = now - bucket.lastRefill;
    const tokensToAdd = Math.floor((timePassed / 1000) * this.options.refillRate);

    if (tokensToAdd > 0) {
      bucket.tokens = Math.min(this.options.maxRequests, bucket.tokens + tokensToAdd);
      bucket.lastRefill = now;
    }

    const isLimited = bucket.tokens <= 0;
    const remainingRequests = Math.max(0, bucket.tokens);

    return {
      totalRequests: this.options.maxRequests - bucket.tokens,
      remainingRequests,
      resetTime: now + ((this.options.maxRequests - bucket.tokens) / this.options.refillRate) * 1000,
      isLimited,
    };
  }

  async recordRequest(identifier: string): Promise<boolean> {
    const info = await this.checkLimit(identifier);

    if (info.isLimited) {
      return false;
    }

    const key = this.options.keyGenerator?.(identifier) || identifier;
    const bucket = this.buckets.get(key)!;
    bucket.tokens--;

    return true;
  }
}

/**
 * Multi-tier Rate Limiter
 * Different limits for different tiers
 */
export interface TierLimits {
  [tier: string]: RateLimitOptions;
}

export class MultiTierRateLimiter {
  private limiters = new Map<string, RateLimiter>();

  constructor(private tierLimits: TierLimits) {
    for (const [tier, options] of Object.entries(tierLimits)) {
      this.limiters.set(tier, new RateLimiter(options));
    }
  }

  async checkLimit(tier: string, identifier: string): Promise<RateLimitInfo> {
    const limiter = this.limiters.get(tier);
    if (!limiter) {
      throw new Error(`Unknown tier: ${tier}`);
    }

    return limiter.checkLimit(identifier);
  }

  async recordRequest(tier: string, identifier: string, wasSuccessful?: boolean): Promise<void> {
    const limiter = this.limiters.get(tier);
    if (!limiter) {
      throw new Error(`Unknown tier: ${tier}`);
    }

    return limiter.recordRequest(identifier, wasSuccessful);
  }

  getTiers(): string[] {
    return Array.from(this.limiters.keys());
  }

  dispose(): void {
    for (const limiter of this.limiters.values()) {
      limiter.dispose();
    }
    this.limiters.clear();
  }
}

// Export pre-configured rate limiters for common use cases
export const rateLimitConfigs = {
  // API endpoints
  api: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
  },

  // Authentication attempts
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
    skipSuccessfulRequests: true,
  },

  // Payment processing
  payment: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10,
  },

  // File uploads
  upload: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 5,
  },

  // Search queries
  search: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30,
  },

  // Password reset
  passwordReset: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3,
  },
};

// User tier configurations
export const userTierLimits: TierLimits = {
  free: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 50,
  },
  premium: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 200,
  },
  contractor: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 500,
  },
  admin: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 1000,
  },
};