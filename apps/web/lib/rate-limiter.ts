import { NextRequest } from 'next/server';

interface RateLimitEntry {
  count: number;
  resetTime: number;
  blocked?: boolean;
  blockUntil?: number;
}

interface RateLimitConfig {
  windowMs: number;    // Time window in milliseconds
  maxRequests: number; // Max requests per window
  blockDurationMs?: number; // How long to block after limit exceeded
  skipSuccessfulRequests?: boolean; // Don't count successful requests
}

class InMemoryRateLimiter {
  private store = new Map<string, RateLimitEntry>();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = {
      blockDurationMs: 15 * 60 * 1000, // 15 minutes default
      skipSuccessfulRequests: false,
      ...config
    };

    // Cleanup expired entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Check if request is allowed and update counters
   */
  checkLimit(identifier: string): { allowed: boolean; limit: number; remaining: number; resetTime: number; retryAfter?: number } {
    const now = Date.now();
    const entry = this.store.get(identifier);

    // If entry doesn't exist or is expired, create/reset it
    if (!entry || now > entry.resetTime) {
      const newEntry: RateLimitEntry = {
        count: 1,
        resetTime: now + this.config.windowMs
      };
      this.store.set(identifier, newEntry);

      return {
        allowed: true,
        limit: this.config.maxRequests,
        remaining: this.config.maxRequests - 1,
        resetTime: newEntry.resetTime
      };
    }

    // Check if currently blocked
    if (entry.blocked && entry.blockUntil && now < entry.blockUntil) {
      return {
        allowed: false,
        limit: this.config.maxRequests,
        remaining: 0,
        resetTime: entry.resetTime,
        retryAfter: Math.ceil((entry.blockUntil - now) / 1000)
      };
    }

    // If block period has expired, unblock
    if (entry.blocked && entry.blockUntil && now >= entry.blockUntil) {
      entry.blocked = false;
      entry.blockUntil = undefined;
      entry.count = 1; // Reset count
      entry.resetTime = now + this.config.windowMs; // Reset window
      this.store.set(identifier, entry);

      return {
        allowed: true,
        limit: this.config.maxRequests,
        remaining: this.config.maxRequests - 1,
        resetTime: entry.resetTime
      };
    }

    // Increment counter
    entry.count += 1;

    // Check if limit exceeded
    if (entry.count > this.config.maxRequests) {
      // Block if configured
      if (this.config.blockDurationMs) {
        entry.blocked = true;
        entry.blockUntil = now + this.config.blockDurationMs;
      }

      this.store.set(identifier, entry);

      return {
        allowed: false,
        limit: this.config.maxRequests,
        remaining: 0,
        resetTime: entry.resetTime,
        retryAfter: this.config.blockDurationMs ? Math.ceil(this.config.blockDurationMs / 1000) : Math.ceil((entry.resetTime - now) / 1000)
      };
    }

    this.store.set(identifier, entry);

    return {
      allowed: true,
      limit: this.config.maxRequests,
      remaining: this.config.maxRequests - entry.count,
      resetTime: entry.resetTime
    };
  }

  /**
   * Mark a successful request (if configured to skip successful requests)
   */
  recordSuccess(identifier: string): void {
    if (!this.config.skipSuccessfulRequests) return;

    const entry = this.store.get(identifier);
    if (entry && entry.count > 0) {
      entry.count -= 1;
      this.store.set(identifier, entry);
    }
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      // Remove if window expired and not blocked
      if (now > entry.resetTime && (!entry.blocked || (entry.blockUntil && now > entry.blockUntil))) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Get current stats for identifier
   */
  getStats(identifier: string): { count: number; remaining: number; resetTime: number; blocked: boolean } | null {
    const entry = this.store.get(identifier);
    if (!entry) return null;

    return {
      count: entry.count,
      remaining: Math.max(0, this.config.maxRequests - entry.count),
      resetTime: entry.resetTime,
      blocked: !!entry.blocked
    };
  }

  /**
   * Reset limits for identifier
   */
  reset(identifier: string): void {
    this.store.delete(identifier);
  }
}

// Rate limiter configurations
const loginLimiter = new InMemoryRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 attempts per 15 minutes
  blockDurationMs: 30 * 60 * 1000, // Block for 30 minutes after limit exceeded
  skipSuccessfulRequests: true // Don't count successful logins
});

const generalApiLimiter = new InMemoryRateLimiter({
  windowMs: 1 * 60 * 1000, // 1 minute
  maxRequests: 100, // 100 requests per minute
  blockDurationMs: 5 * 60 * 1000 // Block for 5 minutes
});

/**
 * Get client identifier for rate limiting
 * Uses combination of IP and User-Agent for better tracking
 */
export function getClientIdentifier(request: NextRequest): string {
  const ip = getClientIP(request);
  const userAgent = request.headers.get('user-agent') || 'unknown';

  // Create a simple hash of user agent to avoid storing full string
  const uaHash = Buffer.from(userAgent).toString('base64').slice(0, 10);

  return `${ip}:${uaHash}`;
}

/**
 * Get client IP address with support for proxies
 */
export function getClientIP(request: NextRequest): string {
  // Check various headers for real IP (in order of preference)
  const headers = [
    'x-forwarded-for',
    'x-real-ip',
    'x-client-ip',
    'cf-connecting-ip', // Cloudflare
    'x-forwarded',
    'forwarded-for',
    'forwarded'
  ];

  for (const header of headers) {
    const value = request.headers.get(header);
    if (value) {
      // x-forwarded-for can contain multiple IPs, take the first one
      const ip = value.split(',')[0].trim();
      if (ip && ip !== 'unknown') {
        return ip;
      }
    }
  }

  // Fallback to request IP (Next 15 may not expose request.ip)
  // Try connection info via headers or default to localhost
  const fallbackIp = (request as any)?.ip as string | undefined;
  return fallbackIp || '127.0.0.1';
}

/**
 * Rate limit middleware for login endpoints
 */
export async function checkLoginRateLimit(request: NextRequest) {
  const identifier = getClientIdentifier(request);
  return loginLimiter.checkLimit(identifier);
}

/**
 * Record successful login (removes one count if configured)
 */
export function recordSuccessfulLogin(request: NextRequest) {
  const identifier = getClientIdentifier(request);
  loginLimiter.recordSuccess(identifier);
}

/**
 * Rate limit middleware for general API endpoints
 */
export async function checkApiRateLimit(request: NextRequest) {
  const identifier = getClientIdentifier(request);
  return generalApiLimiter.checkLimit(identifier);
}

/**
 * Create rate limit response headers
 */
export function createRateLimitHeaders(result: { limit: number; remaining: number; resetTime: number; retryAfter?: number }): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString(),
  };

  if (result.retryAfter) {
    headers['Retry-After'] = result.retryAfter.toString();
  }

  return headers;
}

export { loginLimiter, generalApiLimiter };