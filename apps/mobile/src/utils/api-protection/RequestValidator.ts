/** API Protection - Request Validator */

import { SecurityConfig } from './types';

/**
 * AUDIT_PUNCH_LIST P1 #26 (B6-P1-2) — `generateSecurityHeaders()` was
 * removed 2026-05-09. It produced response-side headers (CSP /
 * X-Frame-Options / HSTS / X-Content-Type-Options / X-XSS-Protection
 * / Referrer-Policy) and attached them to OUTGOING mobile requests,
 * which is meaningless: those headers are interpreted by the
 * BROWSER on a server response, not by the server on a client
 * request. Real defense lives in middleware on the web tier.
 */
export class RequestValidator {
  constructor(private config: SecurityConfig) {}

  isBlockedUserAgent(userAgent?: string): boolean {
    if (!userAgent) return false;
    const lowerUA = userAgent.toLowerCase();
    return this.config.blockedUserAgents.some((blocked) =>
      lowerUA.includes(blocked.toLowerCase())
    );
  }
}
