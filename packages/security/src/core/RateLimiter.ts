import { logger } from '@mintenance/shared';

/**
 * Rate limiter for sanitization and security operations
 * Prevents brute-force attacks and abuse
 */
export interface RateLimitOptions {
  maxAttempts: number;
  windowMs: number;
  keyPrefix?: string;
}
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  totalAttempts: number;
}
export class SanitizationRateLimiter {
  private attempts: Map<string, { count: number; resetTime: number }> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private readonly maxAttempts: number;
  private readonly windowMs: number;
  private readonly keyPrefix: string;
  constructor(options: RateLimitOptions = {
    maxAttempts: 50,
    windowMs: 60000, // 1 minute
    keyPrefix: 'sanitization'
  }) {
    this.maxAttempts = options.maxAttempts;
    this.windowMs = options.windowMs;
    this.keyPrefix = options.keyPrefix || 'sanitization';
    // Start cleanup interval
    this.startCleanupInterval();
  }
  /**
   * Check if a request is allowed based on rate limits
   */
  isAllowed(key: string): RateLimitResult {
    const fullKey = `${this.keyPrefix}:${key}`;
    const now = Date.now();
    const attempt = this.attempts.get(fullKey);
    // If no previous attempts or window expired
    if (!attempt || now > attempt.resetTime) {
      this.attempts.set(fullKey, {
        count: 1,
        resetTime: now + this.windowMs,
      });
      return {
        allowed: true,
        remaining: this.maxAttempts - 1,
        resetTime: now + this.windowMs,
        totalAttempts: 1,
      };
    }
    // Increment attempt count
    attempt.count++;
    // Check if limit exceeded
    const allowed = attempt.count <= this.maxAttempts;
    const remaining = Math.max(0, this.maxAttempts - attempt.count);
    return {
      allowed,
      remaining,
      resetTime: attempt.resetTime,
      totalAttempts: attempt.count,
    };
  }
  /**
   * Track an attempt and check if it's allowed
   */
  trackAttempt(key: string): boolean {
    return this.isAllowed(key).allowed;
  }
  /**
   * Reset rate limit for a specific key
   */
  reset(key: string): void {
    const fullKey = `${this.keyPrefix}:${key}`;
    this.attempts.delete(fullKey);
  }
  /**
   * Reset all rate limits
   */
  resetAll(): void {
    this.attempts.clear();
  }
  /**
   * Get current status for a key
   */
  getStatus(key: string): RateLimitResult | null {
    const fullKey = `${this.keyPrefix}:${key}`;
    const now = Date.now();
    const attempt = this.attempts.get(fullKey);
    if (!attempt) {
      return {
        allowed: true,
        remaining: this.maxAttempts,
        resetTime: now + this.windowMs,
        totalAttempts: 0,
      };
    }
    if (now > attempt.resetTime) {
      // Window expired
      return {
        allowed: true,
        remaining: this.maxAttempts,
        resetTime: now + this.windowMs,
        totalAttempts: 0,
      };
    }
    return {
      allowed: attempt.count < this.maxAttempts,
      remaining: Math.max(0, this.maxAttempts - attempt.count),
      resetTime: attempt.resetTime,
      totalAttempts: attempt.count,
    };
  }
  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    this.attempts.forEach((attempt, key) => {
      if (now > attempt.resetTime) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => this.attempts.delete(key));
  }
  /**
   * Start automatic cleanup interval
   */
  private startCleanupInterval(): void {
    // Clean up expired entries every 5 minutes
    if (typeof setInterval !== 'undefined') {
      this.cleanupInterval = setInterval(() => {
        this.cleanup();
      }, 5 * 60 * 1000);
      // Allow Node.js to exit even if interval is active
      if (this.cleanupInterval && typeof this.cleanupInterval.unref === 'function') {
        this.cleanupInterval.unref();
      }
    }
  }
  /**
   * Stop the cleanup interval
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.attempts.clear();
  }
  /**
   * Get statistics about rate limiting
   */
  getStats(): {
    totalKeys: number;
    totalAttempts: number;
    blockedKeys: number;
  } {
    const now = Date.now();
    let totalAttempts = 0;
    let blockedKeys = 0;
    this.attempts.forEach((attempt) => {
      if (now <= attempt.resetTime) {
        totalAttempts += attempt.count;
        if (attempt.count > this.maxAttempts) {
          blockedKeys++;
        }
      }
    });
    return {
      totalKeys: this.attempts.size,
      totalAttempts,
      blockedKeys,
    };
  }
}
/**
 * SQL-specific rate limiter with stricter limits
 */
export class SqlQueryRateLimiter extends SanitizationRateLimiter {
  constructor() {
    super({
      maxAttempts: 30, // Stricter limit for SQL queries
      windowMs: 60000,
      keyPrefix: 'sql',
    });
  }
  /**
   * Track a potentially dangerous SQL query attempt
   */
  trackDangerousQuery(key: string, query: string): boolean {
    // Log the dangerous query attempt
    if (process.env.NODE_ENV === 'development') {
      logger.warn(`[SqlQueryRateLimiter] Dangerous query attempt from ${key}: ${query.substring(0, 100)}`);
    }
    // Use stricter rate limiting for dangerous queries
    const dangerousKey = `dangerous:${key}`;
    const result = this.isAllowed(dangerousKey);
    // If this is a repeated dangerous query, apply even stricter limits
    if (result.totalAttempts > 5) {
      return false; // Block after 5 dangerous attempts
    }
    return result.allowed;
  }
}
/**
 * Authentication-specific rate limiter
 */
export class AuthRateLimiter extends SanitizationRateLimiter {
  constructor() {
    super({
      maxAttempts: 5, // Very strict for auth attempts
      windowMs: 15 * 60 * 1000, // 15 minutes
      keyPrefix: 'auth',
    });
  }
  /**
   * Track a failed login attempt
   */
  trackFailedLogin(identifier: string): RateLimitResult {
    const result = this.isAllowed(identifier);
    // Log if user is getting close to limit
    if (result.remaining <= 2 && result.remaining > 0) {
      logger.warn(`[AuthRateLimiter] User ${identifier} has ${result.remaining} login attempts remaining`);
    }
    // Log if user is blocked
    if (!result.allowed) {
      logger.error(`[AuthRateLimiter] User ${identifier} is blocked due to too many failed attempts`);
    }
    return result;
  }
  /**
   * Reset on successful login
   */
  onSuccessfulLogin(identifier: string): void {
    this.reset(identifier);
  }
}
/**
 * Factory for creating rate limiters
 */
export class RateLimiterFactory {
  private static limiters: Map<string, SanitizationRateLimiter> = new Map();
  /**
   * Get or create a rate limiter
   */
  static getInstance(
    type: 'sanitization' | 'sql' | 'auth' | 'custom',
    options?: RateLimitOptions
  ): SanitizationRateLimiter {
    const key = options ? `${type}:${JSON.stringify(options)}` : type;
    if (!this.limiters.has(key)) {
      let limiter: SanitizationRateLimiter;
      switch (type) {
        case 'sql':
          limiter = new SqlQueryRateLimiter();
          break;
        case 'auth':
          limiter = new AuthRateLimiter();
          break;
        case 'custom':
          limiter = new SanitizationRateLimiter(options);
          break;
        default:
          limiter = new SanitizationRateLimiter();
      }
      this.limiters.set(key, limiter);
    }
    return this.limiters.get(key)!;
  }
  /**
   * Destroy all rate limiters
   */
  static destroyAll(): void {
    this.limiters.forEach(limiter => limiter.destroy());
    this.limiters.clear();
  }
}