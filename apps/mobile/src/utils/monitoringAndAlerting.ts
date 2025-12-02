/**
 * Advanced Monitoring and Alerting System
 * Comprehensive health monitoring, real-time alerts, and performance tracking
 */

import { Platform } from 'react-native';
import { logger } from './logger';
import { performanceMonitor, PerformanceMetrics } from './performanceMonitor';

export interface HealthCheck {
  name: string;
  check: () => Promise<HealthStatus>;
  interval: number; // in milliseconds
  timeout: number; // in milliseconds
  critical: boolean;
}

export interface HealthStatus {
  healthy: boolean;
  message?: string;
  details?: Record<string, any>;
  responseTime?: number;
  timestamp: number;
}

export interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'critical';
  services: Map<string, HealthStatus>;
  lastUpdated: number;
  status?: 'healthy' | 'degraded' | 'critical';
  uptime?: number;
  timestamp?: number;
}

export interface AlertRule {
  id: string;
  name: string;
  condition: (metrics: PerformanceMetrics, health: SystemHealth) => boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  cooldown: number; // milliseconds before same alert can fire again
  channels: AlertChannel[];
}

export type AlertChannel = 'console' | 'sentry' | 'webhook' | 'email' | 'push';

export interface Alert {
  id: string;
  ruleId: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;
  acknowledged: boolean;
  resolved: boolean;
  details?: Record<string, any>;
}

export interface MetricThreshold {
  metric: keyof PerformanceMetrics;
  warning: number;
  critical: number;
  comparison: 'greater' | 'less' | 'equal';
}

/**
 * Advanced Monitoring and Alerting Manager
 */
export class MonitoringAndAlerting {
  private static instance: MonitoringAndAlerting;
  private healthChecks = new Map<string, HealthCheck>();
  private healthIntervals = new Map<string, NodeJS.Timeout>();
  private currentHealth: SystemHealth = {
    overall: 'healthy',
    services: new Map(),
    lastUpdated: Date.now()
  };

  private alertRules = new Map<string, AlertRule>();
  private activeAlerts = new Map<string, Alert>();
  private alertCooldowns = new Map<string, number>();
  private webhookEndpoints: string[] = [];

  private monitoringInterval?: NodeJS.Timeout;
  private isInitialized = false;
  private alertListeners: Array<(alert: Alert) => void> = [];

  static getInstance(): MonitoringAndAlerting {
    if (!this.instance) {
      this.instance = new MonitoringAndAlerting();
    }
    return this.instance;
  }

  /**
   * Initialize monitoring and alerting system
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      logger.info('MonitoringAndAlerting', 'Initializing monitoring and alerting system');

      // Setup default health checks
      this.setupDefaultHealthChecks();

      // Setup default alert rules
      this.setupDefaultAlertRules();

      // Start monitoring loop
      this.startMonitoring();

      // Start health checks
      this.startHealthChecks();

      this.isInitialized = true;
      logger.info('MonitoringAndAlerting', 'Monitoring and alerting system initialized successfully');
    } catch (error) {
      logger.error('MonitoringAndAlerting', 'Failed to initialize monitoring system', error as Error);
      throw error;
    }
  }

  /**
   * Setup default health checks for core services
   */
  private setupDefaultHealthChecks(): void {
    // Memory health check
    this.addHealthCheck({
      name: 'memory',
      check: async () => {
        const metrics = performanceMonitor.getMetrics();
        const memoryUsage = metrics.memoryUsage || 0;
        const maxMemory = 300 * 1024 * 1024; // 300MB

        return {
          healthy: memoryUsage < maxMemory,
          message: memoryUsage > maxMemory ? 'High memory usage detected' : 'Memory usage normal',
          details: {
            current: Math.round(memoryUsage / 1024 / 1024),
            max: Math.round(maxMemory / 1024 / 1024),
            unit: 'MB'
          },
          timestamp: Date.now()
        };
      },
      interval: 30000, // 30 seconds
      timeout: 5000,
      critical: true
    });

    // Application responsiveness check
    this.addHealthCheck({
      name: 'app_responsiveness',
      check: async () => {
        const start = Date.now();
        await new Promise(resolve => setTimeout(resolve, 0)); // Yield to event loop
        const responseTime = Date.now() - start;

        return {
          healthy: responseTime < 50,
          message: responseTime > 50 ? 'App responsiveness degraded' : 'App responsive',
          details: { responseTime, threshold: 50 },
          responseTime,
          timestamp: Date.now()
        };
      },
      interval: 15000, // 15 seconds
      timeout: 1000,
      critical: true
    });

    // Network connectivity check (web only)
    if (Platform.OS === 'web') {
      this.addHealthCheck({
        name: 'network_connectivity',
        check: async () => {
          try {
            const online = navigator.onLine;
            return {
              healthy: online,
              message: online ? 'Network connected' : 'Network disconnected',
              details: { online },
              timestamp: Date.now()
            };
          } catch (error) {
            return {
              healthy: false,
              message: 'Network check failed',
              details: { error: (error as Error).message },
              timestamp: Date.now()
            };
          }
        },
        interval: 60000, // 1 minute
        timeout: 5000,
        critical: false
      });
    }

    // Error rate monitoring
    this.addHealthCheck({
      name: 'error_rate',
      check: async () => {
        // This would integrate with actual error tracking
        const errorRate = 0; // Placeholder - would be calculated from actual errors
        const threshold = 5; // 5% error rate threshold

        return {
          healthy: errorRate < threshold,
          message: errorRate > threshold ? `High error rate: ${errorRate}%` : 'Error rate normal',
          details: { errorRate, threshold },
          timestamp: Date.now()
        };
      },
      interval: 60000, // 1 minute
      timeout: 5000,
      critical: true
    });

    logger.debug('MonitoringAndAlerting', 'Default health checks configured');
  }

  /**
   * Setup default alert rules
   */
  private setupDefaultAlertRules(): void {
    // High memory usage alert
    this.addAlertRule({
      id: 'high_memory_usage',
      name: 'High Memory Usage',
      condition: (metrics) => (metrics.memoryUsage || 0) > 250 * 1024 * 1024, // 250MB
      severity: 'high',
      cooldown: 300000, // 5 minutes
      channels: ['console', 'sentry']
    });

    // Slow startup alert
    this.addAlertRule({
      id: 'slow_startup',
      name: 'Slow App Startup',
      condition: (metrics) => (metrics.startupTime || 0) > 5000, // 5 seconds
      severity: 'medium',
      cooldown: 600000, // 10 minutes
      channels: ['console', 'sentry']
    });

    // API response time alert
    this.addAlertRule({
      id: 'slow_api_response',
      name: 'Slow API Response',
      condition: (metrics) => (metrics.apiResponseTime || 0) > 5000, // 5 seconds
      severity: 'medium',
      cooldown: 180000, // 3 minutes
      channels: ['console', 'sentry']
    });

    // Low FPS alert
    this.addAlertRule({
      id: 'low_fps',
      name: 'Low FPS Performance',
      condition: (metrics) => (metrics.fps || 60) < 30, // Below 30 FPS
      severity: 'medium',
      cooldown: 300000, // 5 minutes
      channels: ['console']
    });

    // Critical service down alert
    this.addAlertRule({
      id: 'critical_service_down',
      name: 'Critical Service Unavailable',
      condition: (_, health) => {
        for (const [name, status] of health.services) {
          const healthCheck = this.healthChecks.get(name);
          if (healthCheck?.critical && !status.healthy) {
            return true;
          }
        }
        return false;
      },
      severity: 'critical',
      cooldown: 60000, // 1 minute
      channels: ['console', 'sentry', 'webhook']
    });

    logger.debug('MonitoringAndAlerting', 'Default alert rules configured');
  }

  /**
   * Add a health check
   */
  addHealthCheck(healthCheck: HealthCheck): void {
    this.healthChecks.set(healthCheck.name, healthCheck);

    if (this.isInitialized) {
      this.startHealthCheck(healthCheck);
    }

    logger.debug('MonitoringAndAlerting', 'Health check added', { name: healthCheck.name });
  }

  /**
   * Add an alert rule
   */
  addAlertRule(rule: AlertRule): void {
    this.alertRules.set(rule.id, rule);
    logger.debug('MonitoringAndAlerting', 'Alert rule added', { id: rule.id, name: rule.name });
  }

  /**
   * Add webhook endpoint for alerts
   */
  addWebhookEndpoint(url: string): void {
    this.webhookEndpoints.push(url);
    logger.debug('MonitoringAndAlerting', 'Webhook endpoint added', { url });
  }

  /**
   * Start monitoring loop
   */
  private startMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      this.checkAlertRules();
      this.updateOverallHealth();
    }, 10000); // Check every 10 seconds

    logger.debug('MonitoringAndAlerting', 'Monitoring loop started');
  }

  /**
   * Start all health checks
   */
  private startHealthChecks(): void {
    for (const healthCheck of this.healthChecks.values()) {
      this.startHealthCheck(healthCheck);
    }
  }

  /**
   * Start individual health check
   */
  private startHealthCheck(healthCheck: HealthCheck): void {
    // Run initial check
    this.runHealthCheck(healthCheck);

    // Schedule recurring checks
    const interval = setInterval(() => {
      this.runHealthCheck(healthCheck);
    }, healthCheck.interval);

    this.healthIntervals.set(healthCheck.name, interval);
    logger.debug('MonitoringAndAlerting', 'Health check started', { name: healthCheck.name });
  }

  /**
   * Run a single health check with timeout
   */
  private async runHealthCheck(healthCheck: HealthCheck): Promise<void> {
    try {
      const timeoutPromise = new Promise<HealthStatus>((_, reject) =>
        setTimeout(() => reject(new Error('Health check timeout')), healthCheck.timeout)
      );

      const healthStatus = await Promise.race([
        healthCheck.check(),
        timeoutPromise
      ]);

      this.currentHealth.services.set(healthCheck.name, healthStatus);

      if (!healthStatus.healthy && healthCheck.critical) {
        logger.warn('MonitoringAndAlerting', `Critical health check failed: ${healthCheck.name}`, {
          message: healthStatus.message,
          details: healthStatus.details
        });
      }
    } catch (error) {
      const failedStatus: HealthStatus = {
        healthy: false,
        message: `Health check failed: ${(error as Error).message}`,
        timestamp: Date.now()
      };

      this.currentHealth.services.set(healthCheck.name, failedStatus);

      if (healthCheck.critical) {
        logger.error('MonitoringAndAlerting', `Critical health check error: ${healthCheck.name}`, error as Error);
      }
    }
  }

  /**
   * Check alert rules and trigger alerts
   */
  private checkAlertRules(): void {
    const metrics = performanceMonitor.getMetrics();
    const currentTime = Date.now();

    for (const rule of this.alertRules.values()) {
      // Check cooldown
      const lastAlertTime = this.alertCooldowns.get(rule.id) || 0;
      if (currentTime - lastAlertTime < rule.cooldown) {
        continue;
      }

      // Check condition
      if (rule.condition(metrics, this.currentHealth)) {
        this.triggerAlert(rule, metrics);
        this.alertCooldowns.set(rule.id, currentTime);
      }
    }
  }

  /**
   * Trigger an alert
   */
  private triggerAlert(rule: AlertRule, metrics: PerformanceMetrics): void {
    const alert: Alert = {
      id: `${rule.id}_${Date.now()}`,
      ruleId: rule.id,
      message: `Alert: ${rule.name}`,
      severity: rule.severity,
      timestamp: Date.now(),
      acknowledged: false,
      resolved: false,
      details: {
        metrics,
        health: this.getHealthSummary()
      }
    };

    this.activeAlerts.set(alert.id, alert);

    // Send alert through configured channels
    this.sendAlert(alert, rule.channels);

    // Notify listeners
    this.alertListeners.forEach(listener => {
      try {
        listener(alert);
      } catch (error) {
        logger.error('MonitoringAndAlerting', 'Alert listener error', error as Error);
      }
    });

    logger.warn('MonitoringAndAlerting', 'Alert triggered', {
      id: alert.id,
      rule: rule.name,
      severity: rule.severity
    });
  }

  /**
   * Send alert through specified channels
   */
  private async sendAlert(alert: Alert, channels: AlertChannel[]): Promise<void> {
    for (const channel of channels) {
      try {
        switch (channel) {
          case 'console':
            this.sendConsoleAlert(alert);
            break;
          case 'sentry':
            this.sendSentryAlert(alert);
            break;
          case 'webhook':
            await this.sendWebhookAlert(alert);
            break;
          case 'email':
            await this.sendEmailAlert(alert);
            break;
          case 'push':
            await this.sendPushAlert(alert);
            break;
        }
      } catch (error) {
        logger.error('MonitoringAndAlerting', `Failed to send alert via ${channel}`, error as Error);
      }
    }
  }

  /**
   * Send console alert
   */
  private sendConsoleAlert(alert: Alert): void {
    const emoji = {
      low: '🟡',
      medium: '🟠',
      high: '🔴',
      critical: '🚨'
    }[alert.severity];

    logger.warn(`${emoji} ALERT [${alert.severity.toUpperCase()}]: ${alert.message}`);
  }

  /**
   * Send Sentry alert
   */
  private sendSentryAlert(alert: Alert): void {
    const level = {
      low: 'info',
      medium: 'warning',
      high: 'error',
      critical: 'fatal'
    }[alert.severity] as 'info' | 'warning' | 'error' | 'fatal';

    logger.error(`ALERT: ${alert.message}`, undefined, {
      alertId: alert.id,
      severity: alert.severity,
      details: alert.details
    });
  }

  /**
   * Send webhook alert
   */
  private async sendWebhookAlert(alert: Alert): Promise<void> {
    const payload = {
      type: 'alert',
      alert: {
        id: alert.id,
        message: alert.message,
        severity: alert.severity,
        timestamp: alert.timestamp,
        details: alert.details
      },
      system: {
        platform: Platform.OS,
        health: this.getHealthSummary()
      }
    };

    const promises = this.webhookEndpoints.map(async (url) => {
      try {
        if (Platform.OS === 'web') {
          await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
          });
        }
        logger.debug('MonitoringAndAlerting', 'Webhook alert sent', { url });
      } catch (error) {
        logger.error('MonitoringAndAlerting', 'Webhook alert failed', error as Error);
      }
    });

    await Promise.allSettled(promises);
  }

  /**
   * Send email alert (placeholder)
   */
  private async sendEmailAlert(alert: Alert): Promise<void> {
    // This would integrate with an email service
    logger.debug('MonitoringAndAlerting', 'Email alert (placeholder)', { alert: alert.id });
  }

  /**
   * Send push notification alert (placeholder)
   */
  private async sendPushAlert(alert: Alert): Promise<void> {
    // This would integrate with push notification service
    logger.debug('MonitoringAndAlerting', 'Push alert (placeholder)', { alert: alert.id });
  }

  /**
   * Update overall system health status
   */
  private updateOverallHealth(): void {
    const services = Array.from(this.currentHealth.services.values());
    const criticalServices = Array.from(this.healthChecks.values())
      .filter(hc => hc.critical)
      .map(hc => this.currentHealth.services.get(hc.name))
      .filter(Boolean);

    let overall: 'healthy' | 'degraded' | 'critical' = 'healthy';

    // Check if any critical service is down
    if (criticalServices.some(service => !service!.healthy)) {
      overall = 'critical';
    }
    // Check if any service is unhealthy
    else if (services.some(service => !service.healthy)) {
      overall = 'degraded';
    }

    this.currentHealth.overall = overall;
    this.currentHealth.lastUpdated = Date.now();
  }

  /**
   * Get current system health
   */
  getSystemHealth(): SystemHealth {
    return {
      ...this.currentHealth,
      services: new Map(this.currentHealth.services)
    };
  }

  /**
   * Get health summary for logging
   */
  private getHealthSummary(): Record<string, any> {
    const summary: Record<string, any> = {
      overall: this.currentHealth.overall,
      lastUpdated: this.currentHealth.lastUpdated,
      services: {}
    };

    for (const [name, status] of this.currentHealth.services) {
      summary.services[name] = {
        healthy: status.healthy,
        message: status.message,
        responseTime: status.responseTime
      };
    }

    return summary;
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values()).filter(alert => !alert.resolved);
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      alert.acknowledged = true;
      logger.info('MonitoringAndAlerting', 'Alert acknowledged', { alertId });
      return true;
    }
    return false;
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      alert.resolved = true;
      logger.info('MonitoringAndAlerting', 'Alert resolved', { alertId });
      return true;
    }
    return false;
  }

  /**
   * Add alert listener
   */
  addAlertListener(listener: (alert: Alert) => void): void {
    this.alertListeners.push(listener);
  }

  /**
   * Remove alert listener
   */
  removeAlertListener(listener: (alert: Alert) => void): void {
    const index = this.alertListeners.indexOf(listener);
    if (index > -1) {
      this.alertListeners.splice(index, 1);
    }
  }

  /**
   * Generate monitoring report
   */
  generateReport(): string {
    const health = this.getSystemHealth();
    const activeAlerts = this.getActiveAlerts();
    const metrics = performanceMonitor.getMetrics();

    let report = `# 📊 System Monitoring Report\n\n`;
    report += `**Generated:** ${new Date().toLocaleString()}\n`;
    report += `**Overall Health:** ${health.overall.toUpperCase()} ${health.overall === 'healthy' ? '✅' : health.overall === 'degraded' ? '⚠️' : '🚨'}\n\n`;

    // Active Alerts
    if (activeAlerts.length > 0) {
      report += `## 🚨 Active Alerts (${activeAlerts.length})\n\n`;
      activeAlerts.forEach(alert => {
        const emoji = { low: '🟡', medium: '🟠', high: '🔴', critical: '🚨' }[alert.severity];
        report += `${emoji} **${alert.message}** (${alert.severity})\n`;
        report += `   - ID: ${alert.id}\n`;
        report += `   - Time: ${new Date(alert.timestamp).toLocaleString()}\n`;
        report += `   - Acknowledged: ${alert.acknowledged ? 'Yes' : 'No'}\n\n`;
      });
    } else {
      report += `## ✅ No Active Alerts\n\n`;
    }

    // Service Health
    report += `## 🏥 Service Health\n\n`;
    for (const [name, status] of health.services) {
      const emoji = status.healthy ? '✅' : '❌';
      report += `${emoji} **${name}**: ${status.message || (status.healthy ? 'Healthy' : 'Unhealthy')}\n`;
      if (status.responseTime) {
        report += `   - Response Time: ${status.responseTime}ms\n`;
      }
      if (status.details) {
        report += `   - Details: ${JSON.stringify(status.details)}\n`;
      }
      report += `   - Last Check: ${new Date(status.timestamp).toLocaleString()}\n\n`;
    }

    // Performance Metrics
    report += `## 📈 Performance Metrics\n\n`;
    if (metrics.startupTime) report += `- **Startup Time**: ${metrics.startupTime}ms\n`;
    if (metrics.memoryUsage) report += `- **Memory Usage**: ${Math.round(metrics.memoryUsage / 1024 / 1024)}MB\n`;
    if (metrics.navigationTime) report += `- **Navigation Time**: ${metrics.navigationTime}ms\n`;
    if (metrics.apiResponseTime) report += `- **API Response Time**: ${metrics.apiResponseTime}ms\n`;
    if (metrics.fps) report += `- **FPS**: ${metrics.fps}\n`;

    report += `\n---\n*Report generated by Mintenance Monitoring System*\n`;

    return report;
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    // Clear monitoring interval
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    // Clear health check intervals
    for (const interval of this.healthIntervals.values()) {
      clearInterval(interval);
    }

    // Clear data
    this.healthChecks.clear();
    this.healthIntervals.clear();
    this.alertRules.clear();
    this.activeAlerts.clear();
    this.alertCooldowns.clear();
    this.alertListeners = [];

    this.isInitialized = false;
    logger.info('MonitoringAndAlerting', 'Monitoring system disposed');
  }

  /**
   * Check system health (alias for getSystemHealth)
   */
  async checkSystemHealth(): Promise<SystemHealth> {
    return this.getSystemHealth();
  }

  /**
   * Get alert statistics (stub for compatibility)
   */
  getAlertStatistics(): any {
    return {
      totalAlerts: this.activeAlerts.size,
      criticalAlerts: Array.from(this.activeAlerts.values()).filter(alert => alert.severity === 'critical').length,
      warningAlerts: Array.from(this.activeAlerts.values()).filter(alert => alert.severity === 'warning').length,
      infoAlerts: Array.from(this.activeAlerts.values()).filter(alert => alert.severity === 'info').length,
    };
  }
}

// Export singleton instance
export const monitoringAndAlerting = MonitoringAndAlerting.getInstance();

// Enhanced performance monitor with alerting integration
export const recordMetric = (name: string, value: number): void => {
  performanceMonitor.recordMetric?.(name, value);
};

// Convenience functions for common monitoring tasks
export const checkSystemHealth = (): SystemHealth => {
  return monitoringAndAlerting.getSystemHealth();
};

export const getActiveAlerts = (): Alert[] => {
  return monitoringAndAlerting.getActiveAlerts();
};

export const generateHealthReport = (): string => {
  return monitoringAndAlerting.generateReport();
};

// Auto-initialize in production
if (!__DEV__) {
  monitoringAndAlerting.initialize().catch(error => {
    logger.error('MonitoringAndAlerting', 'Failed to auto-initialize monitoring', error);
  });
}