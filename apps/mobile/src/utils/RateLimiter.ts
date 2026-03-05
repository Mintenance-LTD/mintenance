/**
 * RateLimiter.ts
 * In-memory rate limiting utilities for API protection.
 */

export interface RateLimitInfo {
  isLimited: boolean;
  totalRequests: number;
  resetTime: number;
  remaining: number;
}

interface RateLimiterConfig {
  maxRequests: number;
  windowMs: number;
  onLimitReached?: (key: string, info: RateLimitInfo) => void;
}

interface RequestRecord {
  count: number;
  windowStart: number;
}

export class RateLimiter {
  private records = new Map<string, RequestRecord>();
  private cleanupTimer: NodeJS.Timeout;

  constructor(private readonly config: RateLimiterConfig) {
    this.cleanupTimer = setInterval(() => this.cleanup(), config.windowMs);
  }

  async checkLimit(key: string): Promise<RateLimitInfo> {
    const now = Date.now();
    const record = this.records.get(key);
    if (!record || now - record.windowStart >= this.config.windowMs) {
      return { isLimited: false, totalRequests: 0, resetTime: now + this.config.windowMs, remaining: this.config.maxRequests };
    }
    const isLimited = record.count >= this.config.maxRequests;
    const info: RateLimitInfo = {
      isLimited,
      totalRequests: record.count,
      resetTime: record.windowStart + this.config.windowMs,
      remaining: Math.max(0, this.config.maxRequests - record.count),
    };
    if (isLimited && this.config.onLimitReached) {
      this.config.onLimitReached(key, info);
    }
    return info;
  }

  async recordRequest(key: string): Promise<void> {
    const now = Date.now();
    const record = this.records.get(key);
    if (!record || now - record.windowStart >= this.config.windowMs) {
      this.records.set(key, { count: 1, windowStart: now });
    } else {
      record.count += 1;
    }
  }

  getStats(): Record<string, unknown> {
    return { activeKeys: this.records.size, maxRequests: this.config.maxRequests, windowMs: this.config.windowMs };
  }

  dispose(): void {
    clearInterval(this.cleanupTimer);
    this.records.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.records.entries()) {
      if (now - record.windowStart >= this.config.windowMs) {
        this.records.delete(key);
      }
    }
  }
}

export class MultiTierRateLimiter {
  private limiters = new Map<string, RateLimiter>();

  constructor(private readonly tierLimits: Record<string, RateLimiterConfig>) {
    for (const [tier, config] of Object.entries(tierLimits)) {
      this.limiters.set(tier, new RateLimiter(config));
    }
  }

  async checkLimit(tier: string, key: string): Promise<RateLimitInfo> {
    const limiter = this.limiters.get(tier) ?? this.limiters.get('default');
    if (!limiter) {
      return { isLimited: false, totalRequests: 0, resetTime: Date.now() + 60000, remaining: 100 };
    }
    return limiter.checkLimit(key);
  }

  async recordRequest(tier: string, key: string): Promise<void> {
    const limiter = this.limiters.get(tier) ?? this.limiters.get('default');
    if (limiter) await limiter.recordRequest(key);
  }

  dispose(): void {
    for (const limiter of this.limiters.values()) limiter.dispose();
  }
}

export const rateLimitConfigs: Record<string, RateLimiterConfig> = {
  auth: { maxRequests: 10, windowMs: 15 * 60 * 1000 },          // 10/15min
  payment: { maxRequests: 5, windowMs: 60 * 1000 },              // 5/min (strict, fires before abuse)
  upload: { maxRequests: 30, windowMs: 60 * 1000 },              // 30/min
  search: { maxRequests: 100, windowMs: 60 * 1000 },             // 100/min
  passwordReset: { maxRequests: 5, windowMs: 60 * 60 * 1000 },   // 5/hour
  api: { maxRequests: 200, windowMs: 60 * 1000 },                // 200/min
};

export const userTierLimits: Record<string, RateLimiterConfig> = {
  free: { maxRequests: 50, windowMs: 60 * 1000 },                // fires before rapid_fire abuse threshold (50)
  basic: { maxRequests: 500, windowMs: 60 * 1000 },
  premium: { maxRequests: 2000, windowMs: 60 * 1000 },
  default: { maxRequests: 200, windowMs: 60 * 1000 },
};
