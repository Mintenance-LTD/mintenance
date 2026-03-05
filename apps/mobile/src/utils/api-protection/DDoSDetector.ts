/** API Protection - DDoS Detector */

import { logger } from "../logger";
import { ApiRequest, SecurityViolation } from "./types";

export class DDoSDetector {
  constructor(
    private getRecentRequests: (identifier: string, windowMs: number) => ApiRequest[],
    private blockedIPs: Set<string>,
    private onViolation: (violation: SecurityViolation) => void
  ) {}

  async check(request: ApiRequest): Promise<{ allowed: boolean; reason?: string }> {
    if (!request.ipAddress) return { allowed: true };

    const recentRequests = this.getRecentRequests(request.ipAddress, 60 * 1000);
    const requestsPerSecond = recentRequests.length / 60;
    const uniqueEndpoints = new Set(recentRequests.map(r => r.endpoint)).size;
    const uniqueUserAgents = new Set(recentRequests.map(r => r.userAgent)).size;

    if (requestsPerSecond > 10) {
      this.onViolation({
        type: "ddos", severity: "critical", request,
        details: "High request rate: " + requestsPerSecond.toFixed(2) + " req/sec",
        timestamp: Date.now(),
      });
      this.blockedIPs.add(request.ipAddress);
      setTimeout(() => { this.blockedIPs.delete(request.ipAddress!); }, 15 * 60 * 1000);
      return { allowed: false, reason: "DDoS protection triggered" };
    }

    if (recentRequests.length > 50 && uniqueEndpoints > 10 && uniqueUserAgents < 3) {
      this.onViolation({
        type: "ddos", severity: "high", request,
        details: "Potential distributed attack pattern",
        timestamp: Date.now(),
      });
      return { allowed: false, reason: "Suspicious request pattern" };
    }

    return { allowed: true };
  }
}
