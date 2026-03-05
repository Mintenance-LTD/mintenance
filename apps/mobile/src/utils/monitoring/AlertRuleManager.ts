import { logger } from '../logger';
import { performanceMonitor } from '../performanceMonitor';
import { dispatchAlert } from './alertDispatchers';
import type { AlertRule, Alert, AlertChannel, SystemHealth } from './types';
import type { HealthCheck } from './types';

export class AlertRuleManager {
  private alertRules = new Map<string, AlertRule>();
  private activeAlerts = new Map<string, Alert>();
  private alertCooldowns = new Map<string, number>();
  private alertCooldownChecks = new Map<string, number>();
  private alertListeners: ((alert: Alert) => void)[] = [];
  private webhookEndpoints: string[] = [];

  addAlertRule(rule: AlertRule): void {
    this.alertRules.set(rule.id, rule);
    logger.debug('MonitoringAndAlerting', 'Alert rule added', { id: rule.id, name: rule.name });
  }

  addWebhookEndpoint(url: string): void {
    this.webhookEndpoints.push(url);
    logger.debug('MonitoringAndAlerting', 'Webhook endpoint added', { url });
  }

  setupDefaultAlertRules(getHealthChecks: () => Map<string, HealthCheck>): void {
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
        const healthChecks = getHealthChecks();
        for (const [name, status] of health.services) {
          const healthCheck = healthChecks.get(name);
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

  checkAlertRules(currentHealth: SystemHealth): void {
    const metrics = performanceMonitor.getMetrics();
    const currentTime = Date.now();

    for (const rule of this.alertRules.values()) {
      const lastAlertTime = this.alertCooldowns.get(rule.id);
      if (lastAlertTime !== undefined && currentTime - lastAlertTime < rule.cooldown) {
        const cooldownCheckedFor = this.alertCooldownChecks.get(rule.id);
        if (cooldownCheckedFor === lastAlertTime) continue;
        if (rule.condition(metrics, currentHealth)) {
          this.alertCooldownChecks.set(rule.id, lastAlertTime);
        }
        continue;
      }
      if (!rule.condition(metrics, currentHealth)) continue;
      this.triggerAlert(rule, metrics, currentHealth);
      this.alertCooldowns.set(rule.id, currentTime);
      this.alertCooldownChecks.delete(rule.id);
    }
  }

  private triggerAlert(rule: AlertRule, metrics: import('../performanceMonitor').PerformanceMetrics, currentHealth: SystemHealth): void {
    const healthSummary: Record<string, unknown> = { overall: currentHealth.overall, lastUpdated: currentHealth.lastUpdated, services: {} };
    for (const [name, status] of currentHealth.services) {
      (healthSummary.services as Record<string, unknown>)[name] = { healthy: status.healthy, message: status.message, responseTime: status.responseTime };
    }

    const alert: Alert = {
      id: `${rule.id}_${Date.now()}`,
      ruleId: rule.id,
      message: `Alert: ${rule.name}`,
      severity: rule.severity,
      timestamp: Date.now(),
      acknowledged: false,
      resolved: false,
      details: { metrics, health: healthSummary },
    };

    this.activeAlerts.set(alert.id, alert);
    dispatchAlert(alert, rule.channels as AlertChannel[], this.webhookEndpoints, currentHealth);

    this.alertListeners.forEach((listener) => {
      try {
        listener(alert);
      } catch (error) {
        logger.error('MonitoringAndAlerting', 'Alert listener error', error as unknown as Record<string, unknown>);
      }
    });

    logger.warn('MonitoringAndAlerting', 'Alert triggered', { id: alert.id, rule: rule.name, severity: rule.severity });
  }

  getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values()).filter((a) => !a.resolved);
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

  getAlertStatistics(): unknown {
    return {
      totalAlerts: this.activeAlerts.size,
      criticalAlerts: Array.from(this.activeAlerts.values()).filter((a) => a.severity === 'critical').length,
      warningAlerts: Array.from(this.activeAlerts.values()).filter((a) => a.severity === 'medium').length,
      infoAlerts: Array.from(this.activeAlerts.values()).filter((a) => a.severity === 'low').length,
    };
  }

  dispose(): void {
    this.alertRules.clear();
    this.activeAlerts.clear();
    this.alertCooldowns.clear();
    this.alertCooldownChecks.clear();
    this.alertListeners = [];
    this.webhookEndpoints = [];
  }
}
