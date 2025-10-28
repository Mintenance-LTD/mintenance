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

export class SecurityMonitor {
  private static instance: SecurityMonitor;
  private eventQueue: SecurityEvent[] = [];
  private readonly BATCH_SIZE = 10;
  private readonly FLUSH_INTERVAL = 30000; // 30 seconds

  private constructor() {
    // Start periodic flush
    setInterval(() => this.flushEvents(), this.FLUSH_INTERVAL);
  }

  static getInstance(): SecurityMonitor {
    if (!SecurityMonitor.instance) {
      SecurityMonitor.instance = new SecurityMonitor();
    }
    return SecurityMonitor.instance;
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
    metadata?: Record<string, any>
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
      payload: JSON.stringify(payload).substring(0, 1000), // Truncate for storage
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
      payload: JSON.stringify(payload).substring(0, 1000),
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
    metadata?: Record<string, any>
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
    metadata?: Record<string, any>
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
  async getSecurityMetrics(timeframe: '1h' | '24h' | '7d' | '30d' = '24h'): Promise<any> {
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
    return data.reduce((acc, item) => {
      acc[item[key]] = (acc[item[key]] || 0) + 1;
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
