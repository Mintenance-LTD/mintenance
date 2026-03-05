import { Platform } from 'react-native';
import { logger } from '../logger';
import { performanceMonitor } from '../performanceMonitor';
import { dispatchAlert } from './alertDispatchers';
import type { HealthCheck, HealthStatus, SystemHealth, AlertRule, AlertChannel, Alert } from './types';

const MONITORING_GLOBAL_INSTANCE_KEY = '__mintenanceMonitoringInstance';

export class MonitoringAndAlerting {
  private static instance: MonitoringAndAlerting;
  private healthChecks = new Map<string, HealthCheck>();
  private healthIntervals = new Map<string, NodeJS.Timeout>();
  private currentHealth: SystemHealth = {
    overall: 'healthy',
    services: new Map(),
    lastUpdated: Date.now(),
  };

  private alertRules = new Map<string, AlertRule>();
  private activeAlerts = new Map<string, Alert>();
  private alertCooldowns = new Map<string, number>();
  private alertCooldownChecks = new Map<string, number>();
  private webhookEndpoints: string[] = [];

  private monitoringInterval?: NodeJS.Timeout;
  private isInitialized = false;
  private alertListeners: ((alert: Alert) => void)[] = [];

  static getInstance(): MonitoringAndAlerting {
    if (!this.instance) {
      const globalInstance = (globalThis as Record<string, unknown>)[MONITORING_GLOBAL_INSTANCE_KEY] as MonitoringAndAlerting | undefined;
      this.instance = globalInstance || new MonitoringAndAlerting();
      (globalThis as Record<string, unknown>)[MONITORING_GLOBAL_INSTANCE_KEY] = this.instance;
    }
    return this.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    try {
      logger.info('MonitoringAndAlerting', 'Initializing monitoring and alerting system');
      this.setupDefaultHealthChecks();
      this.setupDefaultAlertRules();
      this.startMonitoring();
      this.startHealthChecks();
      this.isInitialized = true;
      logger.info('MonitoringAndAlerting', 'Monitoring and alerting system initialized successfully');
    } catch (error) {
      logger.error('MonitoringAndAlerting', 'Failed to initialize monitoring system', error as unknown as Record<string, unknown>);
      throw error;
    }
  }

  private setupDefaultHealthChecks(): void {
    this.addHealthCheck({
      name: 'memory',
      check: async () => {
        const metrics = performanceMonitor.getMetrics();
        const memoryUsage = metrics.memoryUsage || 0;
        const maxMemory = 300 * 1024 * 1024;
        return {
          healthy: memoryUsage < maxMemory,
          message: memoryUsage > maxMemory ? 'High memory usage detected' : 'Memory usage normal',
          details: { current: Math.round(memoryUsage / 1024 / 1024), max: Math.round(maxMemory / 1024 / 1024), unit: 'MB' },
          timestamp: Date.now(),
        };
      },
      interval: 30000,
      timeout: 5000,
      critical: true,
    });

    this.addHealthCheck({
      name: 'app_responsiveness',
      check: async () => {
        const start = Date.now();
        await Promise.resolve();
        const responseTime = Date.now() - start;
        return {
          healthy: responseTime < 50,
          message: responseTime > 50 ? 'App responsiveness degraded' : 'App responsive',
          details: { responseTime, threshold: 50 },
          responseTime,
          timestamp: Date.now(),
        };
      },
      interval: 15000,
      timeout: 1000,
      critical: true,
    });

    if (Platform.OS === 'web') {
      this.addHealthCheck({
        name: 'network_connectivity',
        check: async () => {
          try {
            const online = navigator.onLine;
            return { healthy: online, message: online ? 'Network connected' : 'Network disconnected', details: { online }, timestamp: Date.now() };
          } catch (error) {
            return { healthy: false, message: 'Network check failed', details: { error: (error as Error).message }, timestamp: Date.now() };
          }
        },
        interval: 60000,
        timeout: 5000,
        critical: false,
      });
    }

    this.addHealthCheck({
      name: 'error_rate',
      check: async () => {
        const errorRate = 0;
        const threshold = 5;
        return {
          healthy: errorRate < threshold,
          message: errorRate > threshold ? `High error rate: ${errorRate}%` : 'Error rate normal',
          details: { errorRate, threshold },
          timestamp: Date.now(),
        };
      },
      interval: 60000,
      timeout: 5000,
      critical: true,
    });

    logger.debug('MonitoringAndAlerting', 'Default health checks configured');
  }

  private setupDefaultAlertRules(): void {
    this.addAlertRule({
      id: 'high_memory_usage',
      name: 'High Memory Usage',
      condition: (metrics) => (metrics.memoryUsage || 0) > 250 * 1024 * 1024,
      severity: 'high',
      cooldown: 300000,
      channels: ['console', 'sentry'],
    });

    this.addAlertRule({
      id: 'slow_startup',
      name: 'Slow App Startup',
      condition: (metrics) => (metrics.startupTime || 0) > 5000,
      severity: 'medium',
      cooldown: 600000,
      channels: ['console', 'sentry'],
    });

    this.addAlertRule({
      id: 'slow_api_response',
      name: 'Slow API Response',
      condition: (metrics) => (metrics.apiResponseTime || 0) > 5000,
      severity: 'medium',
      cooldown: 180000,
      channels: ['console', 'sentry'],
    });

    this.addAlertRule({
      id: 'low_fps',
      name: 'Low FPS Performance',
      condition: (metrics) => (metrics.fps || 60) < 30,
      severity: 'medium',
      cooldown: 300000,
      channels: ['console'],
    });

    this.addAlertRule({
      id: 'critical_service_down',
      name: 'Critical Service Unavailable',
      condition: (_, health) => {
        for (const [name, status] of health.services) {
          const healthCheck = this.healthChecks.get(name);
          if (healthCheck?.critical && !status.healthy) return true;
        }
        return false;
      },
      severity: 'critical',
      cooldown: 60000,
      channels: ['console', 'sentry', 'webhook'],
    });

    logger.debug('MonitoringAndAlerting', 'Default alert rules configured');
  }

  addHealthCheck(healthCheck: HealthCheck): void {
    this.healthChecks.set(healthCheck.name, healthCheck);
    if (!this.currentHealth.services.has(healthCheck.name)) {
      this.currentHealth.services.set(healthCheck.name, { healthy: true, message: 'Health check scheduled', timestamp: Date.now() });
    }
    if (this.isInitialized) this.startHealthCheck(healthCheck);
    logger.debug('MonitoringAndAlerting', 'Health check added', { name: healthCheck.name });
  }

  addAlertRule(rule: AlertRule): void {
    this.alertRules.set(rule.id, rule);
    logger.debug('MonitoringAndAlerting', 'Alert rule added', { id: rule.id, name: rule.name });
  }

  addWebhookEndpoint(url: string): void {
    this.webhookEndpoints.push(url);
    logger.debug('MonitoringAndAlerting', 'Webhook endpoint added', { url });
  }

  private startMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      this.checkAlertRules();
      this.updateOverallHealth();
    }, 10000);
    logger.debug('MonitoringAndAlerting', 'Monitoring loop started');
  }

  private startHealthChecks(): void {
    for (const healthCheck of this.healthChecks.values()) {
      this.startHealthCheck(healthCheck);
    }
  }

  private startHealthCheck(healthCheck: HealthCheck): void {
    this.runHealthCheck(healthCheck);
    const interval = setInterval(() => this.runHealthCheck(healthCheck), healthCheck.interval);
    this.healthIntervals.set(healthCheck.name, interval);
    logger.debug('MonitoringAndAlerting', 'Health check started', { name: healthCheck.name });
  }

  private async runHealthCheck(healthCheck: HealthCheck): Promise<void> {
    try {
      const timeoutPromise = new Promise<HealthStatus>((_, reject) =>
        setTimeout(() => reject(new Error('Health check timeout')), healthCheck.timeout)
      );
      const healthStatus = await Promise.race([healthCheck.check(), timeoutPromise]);
      this.currentHealth.services.set(healthCheck.name, healthStatus);
      if (!healthStatus.healthy && healthCheck.critical) {
        logger.warn('MonitoringAndAlerting', `Critical health check failed: ${healthCheck.name}`, {
          message: healthStatus.message,
          details: healthStatus.details,
        });
      }
    } catch (error) {
      const failedStatus: HealthStatus = {
        healthy: false,
        message: `Health check failed: ${(error as Error).message}`,
        timestamp: Date.now(),
      };
      this.currentHealth.services.set(healthCheck.name, failedStatus);
      if (healthCheck.critical) {
        logger.error('MonitoringAndAlerting', `Critical health check error: ${healthCheck.name}`, error as unknown as Record<string, unknown>);
      }
    }
  }

  private checkAlertRules(): void {
    const metrics = performanceMonitor.getMetrics();
    const currentTime = Date.now();

    for (const rule of this.alertRules.values()) {
      const lastAlertTime = this.alertCooldowns.get(rule.id);
      if (lastAlertTime !== undefined && currentTime - lastAlertTime < rule.cooldown) {
        const cooldownCheckedFor = this.alertCooldownChecks.get(rule.id);
        if (cooldownCheckedFor === lastAlertTime) continue;
        if (rule.condition(metrics, this.currentHealth)) {
          this.alertCooldownChecks.set(rule.id, lastAlertTime);
        }
        continue;
      }
      if (!rule.condition(metrics, this.currentHealth)) continue;
      this.triggerAlert(rule, metrics);
      this.alertCooldowns.set(rule.id, currentTime);
      this.alertCooldownChecks.delete(rule.id);
    }
  }

  private triggerAlert(rule: AlertRule, metrics: import('../performanceMonitor').PerformanceMetrics): void {
    const alert: Alert = {
      id: `${rule.id}_${Date.now()}`,
      ruleId: rule.id,
      message: `Alert: ${rule.name}`,
      severity: rule.severity,
      timestamp: Date.now(),
      acknowledged: false,
      resolved: false,
      details: { metrics, health: this.getHealthSummary() },
    };

    this.activeAlerts.set(alert.id, alert);
    dispatchAlert(alert, rule.channels as AlertChannel[], this.webhookEndpoints, this.currentHealth);

    this.alertListeners.forEach((listener) => {
      try {
        listener(alert);
      } catch (error) {
        logger.error('MonitoringAndAlerting', 'Alert listener error', error as unknown as Record<string, unknown>);
      }
    });

    logger.warn('MonitoringAndAlerting', 'Alert triggered', { id: alert.id, rule: rule.name, severity: rule.severity });
  }

  private updateOverallHealth(): void {
    const services = Array.from(this.currentHealth.services.values());
    const criticalServices = Array.from(this.healthChecks.values())
      .filter((hc) => hc.critical)
      .map((hc) => this.currentHealth.services.get(hc.name))
      .filter(Boolean);

    let overall: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (criticalServices.some((service) => !service!.healthy)) overall = 'critical';
    else if (services.some((service) => !service.healthy)) overall = 'degraded';

    this.currentHealth.overall = overall;
    this.currentHealth.lastUpdated = Date.now();
  }

  getSystemHealth(): SystemHealth {
    return { ...this.currentHealth, services: new Map(this.currentHealth.services) };
  }

  private getHealthSummary(): Record<string, unknown> {
    const summary: Record<string, unknown> = { overall: this.currentHealth.overall, lastUpdated: this.currentHealth.lastUpdated, services: {} };
    for (const [name, status] of this.currentHealth.services) {
      (summary.services as Record<string, unknown>)[name] = { healthy: status.healthy, message: status.message, responseTime: status.responseTime };
    }
    return summary;
  }

  getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values()).filter((alert) => !alert.resolved);
  }

  acknowledgeAlert(alertId: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (alert) { alert.acknowledged = true; logger.info('MonitoringAndAlerting', 'Alert acknowledged', { alertId }); return true; }
    return false;
  }

  resolveAlert(alertId: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (alert) { alert.resolved = true; logger.info('MonitoringAndAlerting', 'Alert resolved', { alertId }); return true; }
    return false;
  }

  addAlertListener(listener: (alert: Alert) => void): void {
    this.alertListeners.push(listener);
  }

  removeAlertListener(listener: (alert: Alert) => void): void {
    const index = this.alertListeners.indexOf(listener);
    if (index > -1) this.alertListeners.splice(index, 1);
  }

  generateReport(): string {
    const health = this.getSystemHealth();
    const activeAlerts = this.getActiveAlerts();
    const metrics = performanceMonitor.getMetrics();

    let report = `# 📊 System Monitoring Report\n\n`;
    report += `**Generated:** ${new Date().toLocaleString()}\n`;
    report += `**Overall Health:** ${health.overall.toUpperCase()} ${health.overall === 'healthy' ? '✅' : health.overall === 'degraded' ? '⚠️' : '🚨'}\n\n`;

    if (activeAlerts.length > 0) {
      report += `## 🚨 Active Alerts (${activeAlerts.length})\n\n`;
      activeAlerts.forEach((alert) => {
        const emoji = { low: '🟡', medium: '🟠', high: '🔴', critical: '🚨' }[alert.severity];
        report += `${emoji} **${alert.message}** (${alert.severity})\n`;
        report += `   - ID: ${alert.id}\n`;
        report += `   - Time: ${new Date(alert.timestamp).toLocaleString()}\n`;
        report += `   - Acknowledged: ${alert.acknowledged ? 'Yes' : 'No'}\n\n`;
      });
    } else {
      report += `## ✅ No Active Alerts\n\n`;
    }

    report += `## 🏥 Service Health\n\n`;
    for (const [name, status] of health.services) {
      const emoji = status.healthy ? '✅' : '❌';
      report += `${emoji} **${name}**: ${status.message || (status.healthy ? 'Healthy' : 'Unhealthy')}\n`;
      if (status.responseTime) report += `   - Response Time: ${status.responseTime}ms\n`;
      if (status.details) report += `   - Details: ${JSON.stringify(status.details)}\n`;
      report += `   - Last Check: ${new Date(status.timestamp).toLocaleString()}\n\n`;
    }

    report += `## 📈 Performance Metrics\n\n`;
    if (metrics.startupTime) report += `- **Startup Time**: ${metrics.startupTime}ms\n`;
    if (metrics.memoryUsage) report += `- **Memory Usage**: ${Math.round(metrics.memoryUsage / 1024 / 1024)}MB\n`;
    if (metrics.navigationTime) report += `- **Navigation Time**: ${metrics.navigationTime}ms\n`;
    if (metrics.apiResponseTime) report += `- **API Response Time**: ${metrics.apiResponseTime}ms\n`;
    if (metrics.fps) report += `- **FPS**: ${metrics.fps}\n`;
    report += `\n---\n*Report generated by Mintenance Monitoring System*\n`;

    return report;
  }

  async checkSystemHealth(): Promise<SystemHealth> {
    return { ...this.currentHealth, services: this.currentHealth.services };
  }

  getAlertStatistics(): unknown {
    return {
      totalAlerts: this.activeAlerts.size,
      criticalAlerts: Array.from(this.activeAlerts.values()).filter((a) => a.severity === 'critical').length,
      warningAlerts: Array.from(this.activeAlerts.values()).filter((a) => a.severity === 'medium').length,
      infoAlerts: Array.from(this.activeAlerts.values()).filter((a) => a.severity === 'low').length,
    };
  }

  dispose(): void {
    if (this.monitoringInterval) clearInterval(this.monitoringInterval);
    for (const interval of this.healthIntervals.values()) clearInterval(interval);
    this.healthChecks.clear();
    this.healthIntervals.clear();
    this.alertRules.clear();
    this.activeAlerts.clear();
    this.alertCooldowns.clear();
    this.alertCooldownChecks.clear();
    this.alertListeners = [];
    this.webhookEndpoints = [];
    this.currentHealth = { overall: 'healthy', services: new Map(), lastUpdated: Date.now() };
    this.isInitialized = false;
    logger.info('MonitoringAndAlerting', 'Monitoring system disposed');
  }
}
