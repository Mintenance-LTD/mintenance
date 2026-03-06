import { NextRequest } from 'next/server';
import { serverSupabase } from './api/supabaseServer';
import { logger } from './logger';

export interface SecurityEvent {
  id?: string;
  event_type: 'auth_failure' | 'rate_limit' | 'xss_attempt' | 'injection_attempt' | 'suspicious_activity' | 'webhook_failure' | 'gdpr_access' | 'admin_action';
  severity: 'low' | 'medium' | 'high' | 'critical';
  user_id?: string;
  ip_address: string;
  user_agent: string;
  endpoint: string;
  method: string;
  payload?: Record<string, unknown>;
  details: string;
  timestamp: Date;
  resolved: boolean;
  metadata?: Record<string, unknown>;
}

// Thresholds for automated IP blocking
const BLOCK_THRESHOLDS = {
  // Number of high/critical events within the window to trigger a block
  HIGH_SEVERITY_COUNT: 5,
  // Time window in ms (15 minutes)
  WINDOW_MS: 15 * 60 * 1000,
  // Block duration in ms (1 hour)
  BLOCK_DURATION_MS: 60 * 60 * 1000,
  // Max blocked IPs to prevent memory leak
  MAX_BLOCKED_IPS: 1000,
};

interface IPRecord {
  count: number;
  firstSeen: number;
}

export class SecurityMonitor {
  private static instance: SecurityMonitor;
  private eventQueue: SecurityEvent[] = [];
  private readonly BATCH_SIZE = 10;
  private readonly FLUSH_INTERVAL = 30000; // 30 seconds

  // Per-instance IP tracking for automated blocking
  private ipEventCounts: Map<string, IPRecord> = new Map();
  private blockedIPs: Map<string, number> = new Map(); // IP -> unblock timestamp

  private constructor() {
    // Start periodic flush
    setInterval(() => this.flushEvents(), this.FLUSH_INTERVAL);
    // Periodically clean up expired blocks and stale tracking data
    setInterval(() => this.cleanupExpiredEntries(), 60_000);
  }

  static getInstance(): SecurityMonitor {
    if (!SecurityMonitor.instance) {
      SecurityMonitor.instance = new SecurityMonitor();
    }
    return SecurityMonitor.instance;
  }

  /**
   * Check if an IP is currently blocked
   */
  isIPBlocked(ip: string): boolean {
    const unblockTime = this.blockedIPs.get(ip);
    if (!unblockTime) return false;
    if (Date.now() >= unblockTime) {
      this.blockedIPs.delete(ip);
      return false;
    }
    return true;
  }

  /**
   * Track high-severity events per IP and auto-block if threshold exceeded
   */
  private trackAndBlock(ip: string, severity: SecurityEvent['severity']): void {
    if (ip === 'unknown' || severity === 'low') return;

    const now = Date.now();
    const existing = this.ipEventCounts.get(ip);

    if (existing && (now - existing.firstSeen) < BLOCK_THRESHOLDS.WINDOW_MS) {
      existing.count++;
    } else {
      this.ipEventCounts.set(ip, { count: 1, firstSeen: now });
      return;
    }

    // Check if threshold exceeded for high/critical events
    if (
      (severity === 'high' || severity === 'critical') &&
      existing.count >= BLOCK_THRESHOLDS.HIGH_SEVERITY_COUNT
    ) {
      // Enforce max blocked IPs to prevent memory leak
      if (this.blockedIPs.size >= BLOCK_THRESHOLDS.MAX_BLOCKED_IPS) {
        // Evict the earliest expiring block
        let earliestIP: string | null = null;
        let earliestTime = Infinity;
        for (const [blockedIP, unblockTime] of this.blockedIPs) {
          if (unblockTime < earliestTime) {
            earliestTime = unblockTime;
            earliestIP = blockedIP;
          }
        }
        if (earliestIP) this.blockedIPs.delete(earliestIP);
      }

      this.blockedIPs.set(ip, now + BLOCK_THRESHOLDS.BLOCK_DURATION_MS);
      this.ipEventCounts.delete(ip);

      logger.error(`[security-monitor] IP auto-blocked due to ${existing.count} high-severity events`, {
        service: 'security_monitor',
        ip,
        eventCount: existing.count,
        blockDurationMinutes: BLOCK_THRESHOLDS.BLOCK_DURATION_MS / 60_000,
      });
    }
  }

  /**
   * Clean up expired blocks and stale tracking entries
   */
  private cleanupExpiredEntries(): void {
    const now = Date.now();

    for (const [ip, unblockTime] of this.blockedIPs) {
      if (now >= unblockTime) this.blockedIPs.delete(ip);
    }

    for (const [ip, record] of this.ipEventCounts) {
      if (now - record.firstSeen > BLOCK_THRESHOLDS.WINDOW_MS) {
        this.ipEventCounts.delete(ip);
      }
    }
  }

  /**
   * Log a security event
   */
  async logEvent(event: Omit<SecurityEvent, 'id' | 'timestamp' | 'resolved'>): Promise<void> {
    const securityEvent: SecurityEvent = {
      ...event,
      timestamp: new Date(),
      resolved: false,
    };

    // Add to queue
    this.eventQueue.push(securityEvent);

    // Flush if batch size reached
    if (this.eventQueue.length >= this.BATCH_SIZE) {
      await this.flushEvents();
    }

    // Track IP for automated blocking (high/critical events)
    this.trackAndBlock(event.ip_address, event.severity);

    // Log critical events immediately
    if (event.severity === 'critical') {
      logger.error(`🚨 CRITICAL SECURITY EVENT: ${event.event_type}`, {
        severity: event.severity,
        endpoint: event.endpoint,
        ip: event.ip_address,
        details: event.details,
        timestamp: securityEvent.timestamp,
      });
    }
  }

  /**
   * Log authentication failure
   */
  async logAuthFailure(
    request: NextRequest,
    reason: string,
    userId?: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.logEvent({
      event_type: 'auth_failure',
      severity: 'medium',
      user_id: userId,
      ip_address: this.getClientIP(request),
      user_agent: request.headers.get('user-agent') || 'unknown',
      endpoint: request.nextUrl.pathname,
      method: request.method,
      details: `Authentication failed: ${reason}`,
      metadata,
    });
  }

  /**
   * Log rate limit violation
   */
  async logRateLimit(
    request: NextRequest,
    limitType: string,
    userId?: string
  ): Promise<void> {
    await this.logEvent({
      event_type: 'rate_limit',
      severity: 'medium',
      user_id: userId,
      ip_address: this.getClientIP(request),
      user_agent: request.headers.get('user-agent') || 'unknown',
      endpoint: request.nextUrl.pathname,
      method: request.method,
      details: `Rate limit exceeded for ${limitType}`,
    });
  }

  /**
   * Log XSS attempt
   */
  async logXSSAttempt(
    request: NextRequest,
    payload: Record<string, unknown>,
    userId?: string
  ): Promise<void> {
    await this.logEvent({
      event_type: 'xss_attempt',
      severity: 'high',
      user_id: userId,
      ip_address: this.getClientIP(request),
      user_agent: request.headers.get('user-agent') || 'unknown',
      endpoint: request.nextUrl.pathname,
      method: request.method,
      payload: { raw: JSON.stringify(payload).substring(0, 1000) }, // Truncate for storage
      details: 'Potential XSS attack detected in input',
    });
  }

  /**
   * Log injection attempt
   */
  async logInjectionAttempt(
    request: NextRequest,
    payload: Record<string, unknown>,
    injectionType: string,
    userId?: string
  ): Promise<void> {
    await this.logEvent({
      event_type: 'injection_attempt',
      severity: 'high',
      user_id: userId,
      ip_address: this.getClientIP(request),
      user_agent: request.headers.get('user-agent') || 'unknown',
      endpoint: request.nextUrl.pathname,
      method: request.method,
      payload: { raw: JSON.stringify(payload).substring(0, 1000) },
      details: `Potential ${injectionType} injection detected`,
    });
  }

  /**
   * Log suspicious activity
   */
  async logSuspiciousActivity(
    request: NextRequest,
    reason: string,
    userId?: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.logEvent({
      event_type: 'suspicious_activity',
      severity: 'medium',
      user_id: userId,
      ip_address: this.getClientIP(request),
      user_agent: request.headers.get('user-agent') || 'unknown',
      endpoint: request.nextUrl.pathname,
      method: request.method,
      details: reason,
      metadata,
    });
  }

  /**
   * Log webhook failure
   */
  async logWebhookFailure(
    request: NextRequest,
    error: string,
    webhookType: string
  ): Promise<void> {
    await this.logEvent({
      event_type: 'webhook_failure',
      severity: 'high',
      ip_address: this.getClientIP(request),
      user_agent: request.headers.get('user-agent') || 'unknown',
      endpoint: request.nextUrl.pathname,
      method: request.method,
      details: `Webhook failure for ${webhookType}: ${error}`,
    });
  }

  /**
   * Log GDPR access
   */
  async logGDPRAccess(
    request: NextRequest,
    action: string,
    userId: string
  ): Promise<void> {
    await this.logEvent({
      event_type: 'gdpr_access',
      severity: 'low',
      user_id: userId,
      ip_address: this.getClientIP(request),
      user_agent: request.headers.get('user-agent') || 'unknown',
      endpoint: request.nextUrl.pathname,
      method: request.method,
      details: `GDPR ${action} request`,
    });
  }

  /**
   * Log admin action
   */
  async logAdminAction(
    request: NextRequest,
    action: string,
    adminUserId: string,
    targetUserId?: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.logEvent({
      event_type: 'admin_action',
      severity: 'medium',
      user_id: adminUserId,
      ip_address: this.getClientIP(request),
      user_agent: request.headers.get('user-agent') || 'unknown',
      endpoint: request.nextUrl.pathname,
      method: request.method,
      details: `Admin action: ${action}`,
      metadata: {
        ...metadata,
        target_user_id: targetUserId,
      },
    });
  }

  /**
   * Flush events to database
   */
  private async flushEvents(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    const eventsToFlush = this.eventQueue.splice(0, this.BATCH_SIZE);

    try {
      const { error } = await serverSupabase
        .from('security_events')
        .insert(eventsToFlush.map(event => ({
          event_type: event.event_type,
          severity: event.severity,
          user_id: event.user_id,
          ip_address: event.ip_address,
          user_agent: event.user_agent,
          endpoint: event.endpoint,
          method: event.method,
          payload: event.payload,
          details: event.details,
          metadata: event.metadata,
          resolved: event.resolved,
        })));

      if (error) {
        logger.error('Failed to log security events', error);
        // Re-queue events for retry
        this.eventQueue.unshift(...eventsToFlush);
      }
    } catch (error) {
      logger.error('Error flushing security events', error);
      // Re-queue events for retry
      this.eventQueue.unshift(...eventsToFlush);
    }
  }

  /**
   * Get client IP address
   */
  private getClientIP(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');

    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }

    if (realIP) {
      return realIP;
    }

    // Return unknown if no IP headers available (avoid unsafe type assertion)
    return 'unknown';
  }

  /**
   * Get security metrics
   */
  async getSecurityMetrics(timeframe: '1h' | '24h' | '7d' | '30d' = '24h'): Promise<unknown> {
    const timeframes = {
      '1h': '1 hour',
      '24h': '24 hours',
      '7d': '7 days',
      '30d': '30 days',
    };

    const { data, error } = await serverSupabase
      .from('security_events')
      .select('*')
      .gte('created_at', new Date(Date.now() - this.getTimeframeMs(timeframe)).toISOString());

    if (error) {
      logger.error('Failed to fetch security metrics', error);
      return null;
    }

    return {
      total_events: data.length,
      by_severity: this.groupBy(data, 'severity'),
      by_type: this.groupBy(data, 'event_type'),
      top_ips: this.getTopIPs(data),
      recent_events: data.slice(0, 10),
    };
  }

  private groupBy(data: Record<string, unknown>[], key: string): Record<string, number> {
    return data.reduce<Record<string, number>>((acc, item) => {
      const keyVal = String(item[key]);
      const currentCount = acc[keyVal] as number | undefined;
      acc[keyVal] = (currentCount || 0) + 1;
      return acc;
    }, {});
  }

  private getTopIPs(data: Record<string, unknown>[]): Array<{ ip: string; count: number }> {
    const ipCounts = this.groupBy(data, 'ip_address');
    return Object.entries(ipCounts)
      .map(([ip, count]) => ({ ip, count: count as number }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  private getTimeframeMs(timeframe: string): number {
    const multipliers = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
    };
    return multipliers[timeframe as keyof typeof multipliers] || multipliers['24h'];
  }
}

// Export singleton instance
export const securityMonitor = SecurityMonitor.getInstance();
