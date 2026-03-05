/** API Protection - Rate Limit Guard */

import { RateLimiter, MultiTierRateLimiter, rateLimitConfigs, userTierLimits, RateLimitInfo } from "../RateLimiter";
import { logger } from "../logger";
import { ApiRequest, SecurityViolation } from "./types";

export class RateLimitGuard {
  private rateLimiters: Map<string, RateLimiter>;
  private userTierLimiter: MultiTierRateLimiter;

  constructor(private readonly onViolation: (v: SecurityViolation) => void) {
    this.rateLimiters = new Map();
    this.initializeRateLimiters();
    this.userTierLimiter = new MultiTierRateLimiter(userTierLimits);
    logger.info("RateLimitGuard", "Initialized");
  }

  private initializeRateLimiters(): void {
    Object.entries(rateLimitConfigs).forEach(([name, config]: [string, { maxRequests: number; windowMs: number }]) => {
      this.rateLimiters.set(name, new RateLimiter({
        maxRequests: config.maxRequests,
        windowMs: config.windowMs,
        onLimitReached: (key: string, info: RateLimitInfo) => { this.handleViolation(name, key, info); },
      }));
    });
    logger.info("RateLimitGuard", "Rate limiters initialized", { count: this.rateLimiters.size });
  }

  private handleViolation(limiterName: string, key: string, info: RateLimitInfo): void {
    logger.warn("RateLimitGuard", "Rate limit exceeded", {
      limiter: limiterName, key, requests: info.totalRequests,
      resetTime: new Date(info.resetTime).toISOString(),
    });
  }

  categorizeEndpoint(endpoint: string): string {
    if (endpoint.includes("/auth") || endpoint.includes("/login")) return "auth";
    if (endpoint.includes("/payment")) return "payment";
    if (endpoint.includes("/upload")) return "upload";
    if (endpoint.includes("/search")) return "search";
    if (endpoint.includes("/password")) return "passwordReset";
    return "api";
  }

  async checkLimits(request: ApiRequest, identifier: string): Promise<{
    allowed: boolean; reason?: string; rateLimitInfo?: RateLimitInfo;
  }> {
    const cat = this.categorizeEndpoint(request.endpoint);
    const limiter = this.rateLimiters.get(cat);
    if (limiter) {
      const info = await limiter.checkLimit(identifier);
      if (info.isLimited) {
        await limiter.recordRequest(identifier);
        return { allowed: false, reason: "Rate limit exceeded for " + cat, rateLimitInfo: info };
      }
      await limiter.recordRequest(identifier);
    }
    if (request.userId && request.userTier) {
      const tierInfo = await this.userTierLimiter.checkLimit(request.userTier, request.userId);
      if (tierInfo.isLimited) {
        await this.userTierLimiter.recordRequest(request.userTier, request.userId);
        return { allowed: false, reason: "Rate limit exceeded: user tier", rateLimitInfo: tierInfo };
      }
      await this.userTierLimiter.recordRequest(request.userTier, request.userId);
    }
    return { allowed: true };
  }

  getStats(): Record<string, unknown> {
    const stats: Record<string, unknown> = {};
    for (const [n, l] of this.rateLimiters.entries()) { stats[n] = l.getStats(); }
    return stats;
  }

  dispose(): void {
    for (const l of this.rateLimiters.values()) { l.dispose(); }
    this.userTierLimiter.dispose();
  }
}
