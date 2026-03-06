/**
 * API Protection - Full Service Implementation
 */
 
import { RateLimitInfo } from "../RateLimiter";
import { logger } from "../logger";
import { ApiRequest, SecurityConfig, SecurityViolation, AbusePattern, DEFAULT_SECURITY_CONFIG } from "./types";
import { RateLimitGuard } from "./RateLimitGuard";
import { DDoSDetector } from "./DDoSDetector";
import { AbuseDetector } from "./AbuseDetector";
import { RequestValidator } from "./RequestValidator";

export class ApiProtectionService {
  private requestHistory: Map<string, ApiRequest[]>;
  private blockedIPs: Set<string>;
  private blockedUsers: Set<string>;
  private securityViolations: SecurityViolation[];
  private config: SecurityConfig;
  private rateLimitGuard: RateLimitGuard;
  private ddosDetector: DDoSDetector;
  private abuseDetector: AbuseDetector;
  private requestValidator: RequestValidator;

  constructor(config: Partial<SecurityConfig> = {}) {
    this.config = { ...DEFAULT_SECURITY_CONFIG, ...config };
    this.requestHistory = new Map();
    this.blockedIPs = new Set();
    this.blockedUsers = new Set();
    this.securityViolations = [];
    this.rateLimitGuard = new RateLimitGuard(v => this.recordSecurityViolation(v));
    this.ddosDetector = new DDoSDetector(
      (id, ms) => this.getRecentRequests(id, ms),
      this.blockedIPs,
      v => this.recordSecurityViolation(v)
    );
    this.abuseDetector = new AbuseDetector(
      (id, ms) => this.getRecentRequests(id, ms),
      this.blockedIPs, this.blockedUsers, this.config,
      v => this.recordSecurityViolation(v),
      (p, r) => this.sendSecurityAlert(p, r)
    );
    this.requestValidator = new RequestValidator(this.config);
    this.startCleanupTasks();
  }

  private startCleanupTasks(): void {
    setInterval(() => { this.cleanupRequestHistory(); }, 300000);
    setInterval(() => { this.cleanupSecurityViolations(); }, 3600000);
  }

  async checkRequest(request: ApiRequest): Promise<{
    allowed: boolean; reason?: string; rateLimitInfo?: RateLimitInfo; securityHeaders?: Record<string, string>;
  }> {
    try {
      if (request.ipAddress && this.blockedIPs.has(request.ipAddress)) {
        this.recordSecurityViolation({ type: "blocked_agent", severity: "high", request, details: "IP blocked", timestamp: Date.now() });
        return { allowed: false, reason: "IP blocked" };
      }
      if (request.userId && this.blockedUsers.has(request.userId)) {
        this.recordSecurityViolation({ type: "blocked_agent", severity: "high", request, details: "User blocked", timestamp: Date.now() });
        return { allowed: false, reason: "User blocked" };
      }
      if (this.config.enableRequestValidation && this.requestValidator.isBlockedUserAgent(request.userAgent)) {
        this.recordSecurityViolation({ type: "blocked_agent", severity: "medium", request, details: "Blocked UA", timestamp: Date.now() });
        return { allowed: false, reason: "Blocked user agent" };
      }
      if (this.config.enableRateLimiting) {
        const rl = await this.rateLimitGuard.checkLimits(request, this.getRequestIdentifier(request));
        if (!rl.allowed) return rl;
      }
      if (this.config.enableDDoSProtection) {
        const dd = await this.ddosDetector.check(request);
        if (!dd.allowed) return dd;
      }
      if (this.config.enableAbuseDetection) {
        const ab = await this.abuseDetector.check(request, this.getRequestIdentifier(request));
        if (!ab.allowed) return ab;
      }
      this.recordRequest(request);
      return { allowed: true, securityHeaders: this.requestValidator.generateSecurityHeaders() };
    } catch (error) {
      logger.error("ApiProtectionService", "Error in request check", { error } as Record<string, unknown>);
      return { allowed: true };
    }
  }

  private recordSecurityViolation(violation: SecurityViolation): void {
    this.securityViolations.push(violation);
    logger.warn("ApiProtectionService", "Security violation", { type: violation.type, severity: violation.severity });
    if (violation.severity === "critical") { logger.error("ApiProtectionService", "CRITICAL VIOLATION", violation as unknown as Record<string, unknown>); }
  }

  private sendSecurityAlert(pattern: AbusePattern, request: ApiRequest): void {
    logger.error("ApiProtectionService", "Security alert", { pattern: pattern.name, endpoint: request.endpoint });
  }

  private recordRequest(request: ApiRequest): void {
    const id = this.getRequestIdentifier(request);
    if (!this.requestHistory.has(id)) { this.requestHistory.set(id, []); }
    const history = this.requestHistory.get(id)!;
    history.push(request);
    if (history.length > 1000) { history.shift(); }
  }

  private getRecentRequests(identifier: string, windowMs: number): ApiRequest[] {
    const history = this.requestHistory.get(identifier) || [];
    return history.filter(r => r.timestamp > Date.now() - windowMs);
  }

  private getRequestIdentifier(request: ApiRequest): string {
    return request.userId || request.clientId || request.ipAddress || "anonymous";
  }

  private cleanupRequestHistory(): void {
    const cutoff = Date.now() - 86400000;
    for (const [id, history] of this.requestHistory.entries()) {
      const filtered = history.filter(r => r.timestamp > cutoff);
      if (filtered.length === 0) { this.requestHistory.delete(id); }
      else if (filtered.length !== history.length) { this.requestHistory.set(id, filtered); }
    }
  }

  private cleanupSecurityViolations(): void {
    const cutoff = Date.now() - 604800000;
    this.securityViolations = this.securityViolations.filter(v => v.timestamp > cutoff);
  }

  getSecurityStats(): {
    activeConnections: number; blockedIPs: number; blockedUsers: number;
    recentViolations: number; rateLimiterStats: Record<string, unknown>;
  } {
    const recentViolations = this.securityViolations.filter(v => v.timestamp > Date.now() - 86400000).length;
    return {
      activeConnections: this.requestHistory.size, blockedIPs: this.blockedIPs.size,
      blockedUsers: this.blockedUsers.size, recentViolations, rateLimiterStats: this.rateLimitGuard.getStats(),
    };
  }

  blockIdentifier(type: "ip" | "user", identifier: string, duration?: number): void {
    if (type === "ip") { this.blockedIPs.add(identifier); } else { this.blockedUsers.add(identifier); }
    if (duration) {
      setTimeout(() => {
        if (type === "ip") { this.blockedIPs.delete(identifier); } else { this.blockedUsers.delete(identifier); }
      }, duration);
    }
    logger.info("ApiProtectionService", "Blocked "+type, { identifier });
  }

  unblockIdentifier(type: "ip" | "user", identifier: string): void {
    if (type === "ip") { this.blockedIPs.delete(identifier); } else { this.blockedUsers.delete(identifier); }
    logger.info("ApiProtectionService", "Unblocked "+type, { identifier });
  }

  dispose(): void {
    this.rateLimitGuard.dispose();
    this.requestHistory.clear();
    this.blockedIPs.clear();
    this.blockedUsers.clear();
    this.securityViolations.length = 0;
  }
}

export const apiProtectionService = new ApiProtectionService();
export default apiProtectionService;
