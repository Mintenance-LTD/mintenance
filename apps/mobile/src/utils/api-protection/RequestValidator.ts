/** API Protection - Request Validator */

import { SecurityConfig } from "./types";

export class RequestValidator {
  constructor(private config: SecurityConfig) {}

  isBlockedUserAgent(userAgent?: string): boolean {
    if (!userAgent) return false;
    const lowerUA = userAgent.toLowerCase();
    return this.config.blockedUserAgents.some(blocked => lowerUA.includes(blocked.toLowerCase()));
  }

  generateSecurityHeaders(): Record<string, string> {
    return {
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "X-XSS-Protection": "1; mode=block",
      "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Content-Security-Policy": "default-src 'self'",
    };
  }
}
