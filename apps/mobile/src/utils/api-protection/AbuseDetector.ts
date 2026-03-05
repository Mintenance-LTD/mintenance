/** API Protection - Abuse Detector */

import { logger } from "../logger";
import { ApiRequest, AbusePattern, SecurityConfig, SecurityViolation, DEFAULT_ABUSE_PATTERNS } from "./types";

export class AbuseDetector {
  private readonly patterns: AbusePattern[];

  constructor(
    private getRecentRequests: (identifier: string, windowMs: number) => ApiRequest[],
    private blockedIPs: Set<string>,
    private blockedUsers: Set<string>,
    private config: SecurityConfig,
    private onViolation: (violation: SecurityViolation) => void,
    private onAlert: (pattern: AbusePattern, request: ApiRequest) => void
  ) {
    this.patterns = DEFAULT_ABUSE_PATTERNS;
  }

  async check(request: ApiRequest, identifier: string): Promise<{ allowed: boolean; reason?: string }> {
    for (const pattern of this.patterns) {
      const isViolation = await this.checkPattern(request, pattern, identifier);
      if (isViolation) {
        this.onViolation({
          type: "abuse", severity: "medium", request,
          details: "Abuse pattern detected: " + pattern.name,
          timestamp: Date.now(),
        });
        if (pattern.actions.includes("block")) {
          if (request.ipAddress) this.blockedIPs.add(request.ipAddress);
          if (request.userId) this.blockedUsers.add(request.userId);
          return { allowed: false, reason: "Abuse detected: " + pattern.description };
        }
        if (pattern.actions.includes("alert")) { this.onAlert(pattern, request); }
      }
    }
    return { allowed: true };
  }

  private async checkPattern(request: ApiRequest, pattern: AbusePattern, identifier: string): Promise<boolean> {
    const recentRequests = this.getRecentRequests(identifier, pattern.windowMs);
    switch (pattern.name) {
      case "rapid_fire_requests": return recentRequests.length >= pattern.threshold;
      case "failed_auth_attempts": {
        const authReqs = recentRequests.filter(r => r.endpoint.includes("/auth") || r.endpoint.includes("/login"));
        return authReqs.length >= pattern.threshold;
      }
      case "suspicious_endpoints": {
        const sensitiveReqs = recentRequests.filter(r =>
          this.config.sensitiveEndpoints.some(ep => r.endpoint.includes(ep)));
        return sensitiveReqs.length >= pattern.threshold;
      }
      case "data_scraping": {
        const uniqueEps = new Set(recentRequests.map(r => r.endpoint)).size;
        return recentRequests.length >= pattern.threshold && uniqueEps > 20;
      }
      default: return false;
    }
  }
}
