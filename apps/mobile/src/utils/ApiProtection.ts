/**
 * API Protection Service
 * Comprehensive API security and protection system
 */

import {
  RateLimiter,
  MultiTierRateLimiter,
  rateLimitConfigs,
  userTierLimits,
  RateLimitInfo,
} from './RateLimiter';
import { logger } from './logger';

export interface ApiRequest {
  endpoint: string;
  method: string;
  userId?: string;
  userTier?: string;
  clientId?: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: number;
}

export interface ApiResponse {
  statusCode: number;
  success: boolean;
  data?: any;
  error?: string;
  timestamp: number;
}

export interface SecurityConfig {
  enableRateLimiting: boolean;
  enableDDoSProtection: boolean;
  enableAbuseDetection: boolean;
  enableRequestValidation: boolean;
  enableResponseSanitization: boolean;
  maxRequestSize: number; // bytes
  allowedOrigins: string[];
  blockedUserAgents: string[];
  sensitiveEndpoints: string[];
}

export interface AbusePattern {
  name: string;
  description: string;
  threshold: number;
  windowMs: number;
  actions: ('log' | 'block' | 'alert')[];
}

export interface SecurityViolation {
  type: 'rate_limit' | 'ddos' | 'abuse' | 'validation' | 'blocked_agent';
  severity: 'low' | 'medium' | 'high' | 'critical';
  request: ApiRequest;
  details: string;
  timestamp: number;
}

export class ApiProtectionService {
  private rateLimiters = new Map<string, RateLimiter>();
  private userTierLimiter: MultiTierRateLimiter;
  private requestHistory = new Map<string, ApiRequest[]>();
  private blockedIPs = new Set<string>();
  private blockedUsers = new Set<string>();
  private securityViolations: SecurityViolation[] = [];
  private config: SecurityConfig;

  // Abuse detection patterns
  private abusePatterns: AbusePattern[] = [
    {
      name: 'rapid_fire_requests',
      description: 'Too many requests in short time',
      threshold: 50,
      windowMs: 60 * 1000, // 1 minute
      actions: ['log', 'block'],
    },
    {
      name: 'failed_auth_attempts',
      description: 'Multiple failed authentication attempts',
      threshold: 10,
      windowMs: 15 * 60 * 1000, // 15 minutes
      actions: ['log', 'block', 'alert'],
    },
    {
      name: 'suspicious_endpoints',
      description: 'Accessing sensitive endpoints rapidly',
      threshold: 5,
      windowMs: 5 * 60 * 1000, // 5 minutes
      actions: ['log', 'alert'],
    },
    {
      name: 'data_scraping',
      description: 'Systematic data access patterns',
      threshold: 100,
      windowMs: 60 * 60 * 1000, // 1 hour
      actions: ['log', 'block'],
    },
  ];

  constructor(config: Partial<SecurityConfig> = {}) {
    this.config = {
      enableRateLimiting: true,
      enableDDoSProtection: true,
      enableAbuseDetection: true,
      enableRequestValidation: true,
      enableResponseSanitization: true,
      maxRequestSize: 10 * 1024 * 1024, // 10MB
      allowedOrigins: ['*'],
      blockedUserAgents: ['bot', 'crawler', 'spider', 'scraper'],
      sensitiveEndpoints: ['/api/auth', '/api/payment', '/api/admin'],
      ...config,
    };

    this.initializeRateLimiters();
    this.initializeUserTierLimiter();
    this.startCleanupTasks();
  }

  /**
   * Initialize rate limiters for different endpoint types
   */
  private initializeRateLimiters(): void {
    // Create rate limiters for different endpoint categories
    Object.entries(rateLimitConfigs).forEach(([name, config]) => {
      this.rateLimiters.set(name, new RateLimiter({
        ...config,
        onLimitReached: (key, info) => {
          this.handleRateLimitViolation(name, key, info);
        },
      }));
    });

    logger.info('ApiProtectionService', 'Rate limiters initialized', {
      count: this.rateLimiters.size,
    });
  }

  /**
   * Initialize user tier-based rate limiter
   */
  private initializeUserTierLimiter(): void {
    this.userTierLimiter = new MultiTierRateLimiter(userTierLimits);
    logger.info('ApiProtectionService', 'User tier limiter initialized');
  }

  /**
   * Start cleanup tasks
   */
  private startCleanupTasks(): void {
    // Clean up old request history every 5 minutes
    setInterval(() => {
      this.cleanupRequestHistory();
    }, 5 * 60 * 1000);

    // Clean up old security violations every hour
    setInterval(() => {
      this.cleanupSecurityViolations();
    }, 60 * 60 * 1000);
  }

  /**
   * Main security check for incoming requests
   */
  async checkRequest(request: ApiRequest): Promise<{
    allowed: boolean;
    reason?: string;
    rateLimitInfo?: RateLimitInfo;
    securityHeaders?: Record<string, string>;
  }> {
    try {
      // 1. Check if IP is blocked
      if (request.ipAddress && this.blockedIPs.has(request.ipAddress)) {
        this.recordSecurityViolation({
          type: 'blocked_agent',
          severity: 'high',
          request,
          details: 'IP address is blocked',
          timestamp: Date.now(),
        });
        return { allowed: false, reason: 'IP blocked' };
      }

      // 2. Check if user is blocked
      if (request.userId && this.blockedUsers.has(request.userId)) {
        this.recordSecurityViolation({
          type: 'blocked_agent',
          severity: 'high',
          request,
          details: 'User is blocked',
          timestamp: Date.now(),
        });
        return { allowed: false, reason: 'User blocked' };
      }

      // 3. Check user agent
      if (this.config.enableRequestValidation && this.isBlockedUserAgent(request.userAgent)) {
        this.recordSecurityViolation({
          type: 'blocked_agent',
          severity: 'medium',
          request,
          details: 'Blocked user agent',
          timestamp: Date.now(),
        });
        return { allowed: false, reason: 'Blocked user agent' };
      }

      // 4. Rate limiting checks
      if (this.config.enableRateLimiting) {
        const rateLimitResult = await this.checkRateLimits(request);
        if (!rateLimitResult.allowed) {
          return rateLimitResult;
        }
      }

      // 5. DDoS protection
      if (this.config.enableDDoSProtection) {
        const ddosCheck = await this.checkDDoSPatterns(request);
        if (!ddosCheck.allowed) {
          return ddosCheck;
        }
      }

      // 6. Abuse detection
      if (this.config.enableAbuseDetection) {
        const abuseCheck = await this.checkAbusePatterns(request);
        if (!abuseCheck.allowed) {
          return abuseCheck;
        }
      }

      // Record request for analysis
      this.recordRequest(request);

      return {
        allowed: true,
        securityHeaders: this.generateSecurityHeaders(),
      };
    } catch (error) {
      logger.error('ApiProtectionService', 'Error in request check', error);
      return { allowed: true }; // Fail open for availability
    }
  }

  /**
   * Check various rate limits
   */
  private async checkRateLimits(request: ApiRequest): Promise<{
    allowed: boolean;
    reason?: string;
    rateLimitInfo?: RateLimitInfo;
  }> {
    const identifier = this.getRequestIdentifier(request);

    // Check endpoint-specific rate limits
    const endpointCategory = this.categorizeEndpoint(request.endpoint);
    const endpointLimiter = this.rateLimiters.get(endpointCategory);

    if (endpointLimiter) {
      const info = await endpointLimiter.checkLimit(identifier);
      if (info.isLimited) {
        await endpointLimiter.recordRequest(identifier);
        return {
          allowed: false,
          reason: `Rate limit exceeded for ${endpointCategory}`,
          rateLimitInfo: info,
        };
      }
      await endpointLimiter.recordRequest(identifier);
    }

    // Check user tier limits
    if (request.userId && request.userTier) {
      const tierInfo = await this.userTierLimiter.checkLimit(request.userTier, request.userId);
      if (tierInfo.isLimited) {
        await this.userTierLimiter.recordRequest(request.userTier, request.userId);
        return {
          allowed: false,
          reason: `User tier rate limit exceeded`,
          rateLimitInfo: tierInfo,
        };
      }
      await this.userTierLimiter.recordRequest(request.userTier, request.userId);
    }

    return { allowed: true };
  }

  /**
   * Check for DDoS attack patterns
   */
  private async checkDDoSPatterns(request: ApiRequest): Promise<{
    allowed: boolean;
    reason?: string;
  }> {
    if (!request.ipAddress) return { allowed: true };

    // Get recent requests from this IP
    const recentRequests = this.getRecentRequests(request.ipAddress, 60 * 1000); // Last minute

    // Check for DDoS indicators
    const requestsPerSecond = recentRequests.length / 60;
    const uniqueEndpoints = new Set(recentRequests.map(r => r.endpoint)).size;
    const uniqueUserAgents = new Set(recentRequests.map(r => r.userAgent)).size;

    // DDoS detection thresholds
    if (requestsPerSecond > 10) {
      this.recordSecurityViolation({
        type: 'ddos',
        severity: 'critical',
        request,
        details: `High request rate: ${requestsPerSecond.toFixed(2)} req/sec`,
        timestamp: Date.now(),
      });

      // Temporarily block IP
      this.blockedIPs.add(request.ipAddress);
      setTimeout(() => {
        this.blockedIPs.delete(request.ipAddress!);
      }, 15 * 60 * 1000); // 15 minutes

      return { allowed: false, reason: 'DDoS protection triggered' };
    }

    // Check for distributed attack (many endpoints, few user agents)
    if (recentRequests.length > 50 && uniqueEndpoints > 10 && uniqueUserAgents < 3) {
      this.recordSecurityViolation({
        type: 'ddos',
        severity: 'high',
        request,
        details: 'Potential distributed attack pattern',
        timestamp: Date.now(),
      });

      return { allowed: false, reason: 'Suspicious request pattern' };
    }

    return { allowed: true };
  }

  /**
   * Check for abuse patterns
   */
  private async checkAbusePatterns(request: ApiRequest): Promise<{
    allowed: boolean;
    reason?: string;
  }> {
    const identifier = this.getRequestIdentifier(request);

    for (const pattern of this.abusePatterns) {
      const isViolation = await this.checkAbusePattern(request, pattern, identifier);

      if (isViolation) {
        this.recordSecurityViolation({
          type: 'abuse',
          severity: 'medium',
          request,
          details: `Abuse pattern detected: ${pattern.name}`,
          timestamp: Date.now(),
        });

        // Execute pattern actions
        if (pattern.actions.includes('block')) {
          if (request.ipAddress) {
            this.blockedIPs.add(request.ipAddress);
          }
          if (request.userId) {
            this.blockedUsers.add(request.userId);
          }
          return { allowed: false, reason: `Abuse detected: ${pattern.description}` };
        }

        if (pattern.actions.includes('alert')) {
          this.sendSecurityAlert(pattern, request);
        }
      }
    }

    return { allowed: true };
  }

  /**
   * Check specific abuse pattern
   */
  private async checkAbusePattern(
    request: ApiRequest,
    pattern: AbusePattern,
    identifier: string
  ): Promise<boolean> {
    const recentRequests = this.getRecentRequests(identifier, pattern.windowMs);

    switch (pattern.name) {
      case 'rapid_fire_requests':
        return recentRequests.length >= pattern.threshold;

      case 'failed_auth_attempts':
        const authRequests = recentRequests.filter(r =>
          r.endpoint.includes('/auth') || r.endpoint.includes('/login')
        );
        return authRequests.length >= pattern.threshold;

      case 'suspicious_endpoints':
        const sensitiveRequests = recentRequests.filter(r =>
          this.config.sensitiveEndpoints.some(endpoint => r.endpoint.includes(endpoint))
        );
        return sensitiveRequests.length >= pattern.threshold;

      case 'data_scraping':
        const uniqueEndpoints = new Set(recentRequests.map(r => r.endpoint)).size;
        return recentRequests.length >= pattern.threshold && uniqueEndpoints > 20;

      default:
        return false;
    }
  }

  /**
   * Record security violation
   */
  private recordSecurityViolation(violation: SecurityViolation): void {
    this.securityViolations.push(violation);

    logger.warn('ApiProtectionService', 'Security violation detected', {
      type: violation.type,
      severity: violation.severity,
      endpoint: violation.request.endpoint,
      userId: violation.request.userId,
      ipAddress: violation.request.ipAddress,
      details: violation.details,
    });

    // Alert on critical violations
    if (violation.severity === 'critical') {
      this.sendCriticalAlert(violation);
    }
  }

  /**
   * Handle rate limit violations
   */
  private handleRateLimitViolation(
    limiterName: string,
    key: string,
    info: RateLimitInfo
  ): void {
    logger.warn('ApiProtectionService', 'Rate limit exceeded', {
      limiter: limiterName,
      key,
      requests: info.totalRequests,
      resetTime: new Date(info.resetTime).toISOString(),
    });
  }

  /**
   * Send security alert
   */
  private sendSecurityAlert(pattern: AbusePattern, request: ApiRequest): void {
    // In production, this would integrate with alerting systems
    logger.error('ApiProtectionService', 'Security alert triggered', {
      pattern: pattern.name,
      description: pattern.description,
      userId: request.userId,
      endpoint: request.endpoint,
      ipAddress: request.ipAddress,
    });
  }

  /**
   * Send critical security alert
   */
  private sendCriticalAlert(violation: SecurityViolation): void {
    // In production, this would trigger immediate notifications
    logger.error('ApiProtectionService', 'CRITICAL SECURITY VIOLATION', {
      type: violation.type,
      details: violation.details,
      request: violation.request,
    });
  }

  /**
   * Record request for analysis
   */
  private recordRequest(request: ApiRequest): void {
    const identifier = this.getRequestIdentifier(request);

    if (!this.requestHistory.has(identifier)) {
      this.requestHistory.set(identifier, []);
    }

    const history = this.requestHistory.get(identifier)!;
    history.push(request);

    // Keep only last 1000 requests per identifier
    if (history.length > 1000) {
      history.shift();
    }
  }

  /**
   * Get recent requests for analysis
   */
  private getRecentRequests(identifier: string, windowMs: number): ApiRequest[] {
    const history = this.requestHistory.get(identifier) || [];
    const cutoff = Date.now() - windowMs;

    return history.filter(request => request.timestamp > cutoff);
  }

  /**
   * Generate request identifier for tracking
   */
  private getRequestIdentifier(request: ApiRequest): string {
    // Prioritize user ID, then client ID, then IP address
    return request.userId || request.clientId || request.ipAddress || 'anonymous';
  }

  /**
   * Categorize endpoint for rate limiting
   */
  private categorizeEndpoint(endpoint: string): string {
    if (endpoint.includes('/auth') || endpoint.includes('/login')) return 'auth';
    if (endpoint.includes('/payment')) return 'payment';
    if (endpoint.includes('/upload')) return 'upload';
    if (endpoint.includes('/search')) return 'search';
    if (endpoint.includes('/password')) return 'passwordReset';
    return 'api';
  }

  /**
   * Check if user agent is blocked
   */
  private isBlockedUserAgent(userAgent?: string): boolean {
    if (!userAgent) return false;

    const lowerUA = userAgent.toLowerCase();
    return this.config.blockedUserAgents.some(blocked =>
      lowerUA.includes(blocked.toLowerCase())
    );
  }

  /**
   * Generate security headers
   */
  private generateSecurityHeaders(): Record<string, string> {
    return {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Content-Security-Policy': "default-src 'self'",
    };
  }

  /**
   * Clean up old request history
   */
  private cleanupRequestHistory(): void {
    const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
    let cleanedCount = 0;

    for (const [identifier, history] of this.requestHistory.entries()) {
      const filteredHistory = history.filter(request => request.timestamp > cutoff);

      if (filteredHistory.length === 0) {
        this.requestHistory.delete(identifier);
        cleanedCount++;
      } else if (filteredHistory.length !== history.length) {
        this.requestHistory.set(identifier, filteredHistory);
      }
    }

    if (cleanedCount > 0) {
      logger.debug('ApiProtectionService', 'Cleaned up request history', { cleanedCount });
    }
  }

  /**
   * Clean up old security violations
   */
  private cleanupSecurityViolations(): void {
    const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days
    const beforeCount = this.securityViolations.length;

    this.securityViolations = this.securityViolations.filter(
      violation => violation.timestamp > cutoff
    );

    const cleanedCount = beforeCount - this.securityViolations.length;
    if (cleanedCount > 0) {
      logger.debug('ApiProtectionService', 'Cleaned up security violations', { cleanedCount });
    }
  }

  /**
   * Get security statistics
   */
  getSecurityStats(): {
    activeConnections: number;
    blockedIPs: number;
    blockedUsers: number;
    recentViolations: number;
    rateLimiterStats: Record<string, any>;
  } {
    const recentViolations = this.securityViolations.filter(
      v => v.timestamp > Date.now() - (24 * 60 * 60 * 1000)
    ).length;

    const rateLimiterStats: Record<string, any> = {};
    for (const [name, limiter] of this.rateLimiters.entries()) {
      rateLimiterStats[name] = limiter.getStats();
    }

    return {
      activeConnections: this.requestHistory.size,
      blockedIPs: this.blockedIPs.size,
      blockedUsers: this.blockedUsers.size,
      recentViolations,
      rateLimiterStats,
    };
  }

  /**
   * Manually block IP or user
   */
  blockIdentifier(type: 'ip' | 'user', identifier: string, duration?: number): void {
    if (type === 'ip') {
      this.blockedIPs.add(identifier);
    } else {
      this.blockedUsers.add(identifier);
    }

    if (duration) {
      setTimeout(() => {
        if (type === 'ip') {
          this.blockedIPs.delete(identifier);
        } else {
          this.blockedUsers.delete(identifier);
        }
      }, duration);
    }

    logger.info('ApiProtectionService', `Blocked ${type}`, {
      identifier,
      duration: duration ? `${duration}ms` : 'permanent',
    });
  }

  /**
   * Unblock IP or user
   */
  unblockIdentifier(type: 'ip' | 'user', identifier: string): void {
    if (type === 'ip') {
      this.blockedIPs.delete(identifier);
    } else {
      this.blockedUsers.delete(identifier);
    }

    logger.info('ApiProtectionService', `Unblocked ${type}`, { identifier });
  }

  /**
   * Dispose of the service
   */
  dispose(): void {
    for (const limiter of this.rateLimiters.values()) {
      limiter.dispose();
    }
    this.userTierLimiter.dispose();
    this.requestHistory.clear();
    this.blockedIPs.clear();
    this.blockedUsers.clear();
    this.securityViolations.length = 0;
  }
}

// Export singleton instance
export const apiProtectionService = new ApiProtectionService();

export default apiProtectionService;