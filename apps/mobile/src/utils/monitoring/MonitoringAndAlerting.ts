import { logger } from '../logger';
import { performanceMonitor } from '../performanceMonitor';
import { HealthCheckManager } from './HealthCheckManager';
import { AlertRuleManager } from './AlertRuleManager';
import type { HealthCheck, Alert, AlertRule, SystemHealth } from './types';

const MONITORING_GLOBAL_INSTANCE_KEY = '__mintenanceMonitoringInstance';

export class MonitoringAndAlerting {
  private static instance: MonitoringAndAlerting;
  private currentHealth: SystemHealth = {
    overall: 'healthy',
    services: new Map(),
    lastUpdated: Date.now(),
  };

  private healthManager: HealthCheckManager;
  private alertManager: AlertRuleManager;
  private monitoringInterval?: NodeJS.Timeout;
  private isInitialized = false;

  constructor() {
    this.healthManager = new HealthCheckManager(this.currentHealth);
    this.alertManager = new AlertRuleManager();
  }

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
      this.alertManager.setupDefaultAlertRules(() => this.healthManager.getHealthChecks());
      this.startMonitoring();
      this.healthManager.startAllHealthChecks();
      this.isInitialized = true;
      logger.info('MonitoringAndAlerting', 'Monitoring and alerting system initialized successfully');
    } catch (error) {
      logger.error('MonitoringAndAlerting', 'Failed to initialize monitoring system', error as unknown as Record<string, unknown>);
      throw error;
    }
  }

  setupDefaultHealthChecks(): void {
    this.healthManager.setupDefaultHealthChecks();
  }

  private startMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      this.alertManager.checkAlertRules(this.currentHealth);
      this.updateOverallHealth();
    }, 10000);
    logger.debug('MonitoringAndAlerting', 'Monitoring loop started');
  }

  private updateOverallHealth(): void {
    const services = Array.from(this.currentHealth.services.values());
    const criticalServices = Array.from(this.healthManager.getHealthChecks().values())
      .filter((hc) => hc.critical)
      .map((hc) => this.currentHealth.services.get(hc.name))
      .filter(Boolean);

    let overall: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (criticalServices.some((service) => !service!.healthy)) overall = 'critical';
    else if (services.some((service) => !service.healthy)) overall = 'degraded';

    this.currentHealth.overall = overall;
    this.currentHealth.lastUpdated = Date.now();
  }

  addHealthCheck(healthCheck: HealthCheck): void {
    this.healthManager.addHealthCheck(healthCheck, this.isInitialized);
  }

  addAlertRule(rule: AlertRule): void {
    this.alertManager.addAlertRule(rule);
  }

  addWebhookEndpoint(url: string): void {
    this.alertManager.addWebhookEndpoint(url);
  }

  getSystemHealth(): SystemHealth {
    return { ...this.currentHealth, services: new Map(this.currentHealth.services) };
  }

  async checkSystemHealth(): Promise<SystemHealth> {
    return { ...this.currentHealth, services: this.currentHealth.services };
  }

  getActiveAlerts(): Alert[] {
    return this.alertManager.getActiveAlerts();
  }

  acknowledgeAlert(alertId: string): boolean {
    return this.alertManager.acknowledgeAlert(alertId);
  }

  resolveAlert(alertId: string): boolean {
    return this.alertManager.resolveAlert(alertId);
  }

  addAlertListener(listener: (alert: Alert) => void): void {
    this.alertManager.addAlertListener(listener);
  }

  removeAlertListener(listener: (alert: Alert) => void): void {
    this.alertManager.removeAlertListener(listener);
  }

  getAlertStatistics(): unknown {
    return this.alertManager.getAlertStatistics();
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
        report += `   - ID: ${alert.id}\n   - Time: ${new Date(alert.timestamp).toLocaleString()}\n   - Acknowledged: ${alert.acknowledged ? 'Yes' : 'No'}\n\n`;
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

  dispose(): void {
    if (this.monitoringInterval) clearInterval(this.monitoringInterval);
    this.healthManager.dispose();
    this.alertManager.dispose();
    // Reset in-place so HealthCheckManager's reference stays valid
    this.currentHealth.overall = 'healthy';
    this.currentHealth.services.clear();
    this.currentHealth.lastUpdated = Date.now();
    this.isInitialized = false;
    logger.info('MonitoringAndAlerting', 'Monitoring system disposed');
  }
}
