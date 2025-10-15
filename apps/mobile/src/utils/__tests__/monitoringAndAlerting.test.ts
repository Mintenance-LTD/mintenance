/**
 * Tests for Advanced Monitoring and Alerting System
 */

import { Platform } from 'react-native';
import {
  MonitoringAndAlerting,
  monitoringAndAlerting,
  checkSystemHealth,
  getActiveAlerts,
  generateHealthReport,
  HealthCheck,
  AlertRule,
  Alert,
  HealthStatus,
  SystemHealth,
} from '../monitoringAndAlerting';

// Mock dependencies
jest.mock('../logger');
jest.mock('../performanceMonitor', () => ({
  performanceMonitor: {
    getMetrics: jest.fn(() => ({
      startupTime: 1500,
      memoryUsage: 100 * 1024 * 1024, // 100MB
      navigationTime: 200,
      apiResponseTime: 300,
      fps: 60,
    })),
    recordMetric: jest.fn(),
  },
}));

describe('MonitoringAndAlerting', () => {
  let instance: MonitoringAndAlerting;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    // Create fresh instance for each test
    instance = MonitoringAndAlerting.getInstance();
  });

  afterEach(() => {
    instance.dispose();
    jest.useRealTimers();
  });

  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = MonitoringAndAlerting.getInstance();
      const instance2 = MonitoringAndAlerting.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('initialize', () => {
    it('should initialize monitoring system successfully', async () => {
      await instance.initialize();
      const health = instance.getSystemHealth();
      expect(health).toBeDefined();
      expect(health.overall).toBe('healthy');
    });

    it('should not re-initialize if already initialized', async () => {
      await instance.initialize();
      await instance.initialize(); // Second call should be no-op
      expect(instance.getSystemHealth()).toBeDefined();
    });

    it('should setup default health checks', async () => {
      await instance.initialize();
      const health = instance.getSystemHealth();
      expect(health.services.size).toBeGreaterThan(0);
    });
  });

  describe('Health Checks', () => {
    it('should add custom health check', async () => {
      const customCheck: HealthCheck = {
        name: 'custom_check',
        check: async () => ({
          healthy: true,
          message: 'Custom check passed',
          timestamp: Date.now(),
        }),
        interval: 10000,
        timeout: 5000,
        critical: false,
      };

      instance.addHealthCheck(customCheck);
      await instance.initialize();

      // Run timers to execute health check
      jest.advanceTimersByTime(100);
      await Promise.resolve();

      const health = instance.getSystemHealth();
      expect(health.services.has('custom_check')).toBe(true);
    });

    it('should handle health check timeout', async () => {
      const slowCheck: HealthCheck = {
        name: 'slow_check',
        check: async () => {
          await new Promise(resolve => setTimeout(resolve, 10000));
          return {
            healthy: true,
            message: 'Should timeout',
            timestamp: Date.now(),
          };
        },
        interval: 30000,
        timeout: 1000, // 1 second timeout
        critical: true,
      };

      instance.addHealthCheck(slowCheck);
      await instance.initialize();

      // Advance timers and flush promises to allow health check to run and timeout
      jest.advanceTimersByTime(2000);
      await Promise.resolve();
      await Promise.resolve(); // Extra flush for async resolution

      const health = instance.getSystemHealth();
      const status = health.services.get('slow_check');
      // Health check should exist and be marked as failed due to timeout
      expect(status).toBeDefined();
      if (status) {
        expect(status.healthy).toBe(false);
      }
    });

    it('should mark critical health check failures', async () => {
      const criticalCheck: HealthCheck = {
        name: 'critical_check',
        check: async () => ({
          healthy: false,
          message: 'Critical failure',
          timestamp: Date.now(),
        }),
        interval: 10000,
        timeout: 5000,
        critical: true,
      };

      instance.addHealthCheck(criticalCheck);
      await instance.initialize();

      jest.advanceTimersByTime(100);
      await Promise.resolve();

      const health = instance.getSystemHealth();
      expect(health.services.get('critical_check')?.healthy).toBe(false);
    });
  });

  describe('Alert Rules', () => {
    it('should add alert rule', () => {
      const rule: AlertRule = {
        id: 'test_rule',
        name: 'Test Rule',
        condition: () => false,
        severity: 'low',
        cooldown: 60000,
        channels: ['console'],
      };

      instance.addAlertRule(rule);
      // Alert rule should be added (no public getter, but won't throw)
      expect(() => instance.addAlertRule(rule)).not.toThrow();
    });

    it('should trigger alert when condition is met', async () => {
      const mockListener = jest.fn();

      const rule: AlertRule = {
        id: 'high_memory',
        name: 'High Memory Alert',
        condition: (metrics) => (metrics.memoryUsage || 0) > 50 * 1024 * 1024,
        severity: 'high',
        cooldown: 60000,
        channels: ['console'],
      };

      instance.addAlertRule(rule);
      instance.addAlertListener(mockListener);
      await instance.initialize();

      // Advance timers to trigger monitoring loop
      jest.advanceTimersByTime(10000);
      await Promise.resolve();

      expect(mockListener).toHaveBeenCalled();
    });

    it('should respect alert cooldown period', async () => {
      const mockListener = jest.fn();

      const rule: AlertRule = {
        id: 'cooldown_test',
        name: 'Cooldown Test',
        condition: () => true, // Always true
        severity: 'low',
        cooldown: 60000, // 1 minute cooldown
        channels: ['console'],
      };

      instance.addAlertRule(rule);
      instance.addAlertListener(mockListener);
      await instance.initialize();

      // Clear any alerts from initialization
      mockListener.mockClear();

      // First trigger - advance monitoring loop interval (10s)
      jest.advanceTimersByTime(10000);
      await Promise.resolve();
      const firstCallCount = mockListener.mock.calls.length;
      expect(firstCallCount).toBeGreaterThanOrEqual(1);

      // Second trigger within cooldown (should not fire again)
      jest.advanceTimersByTime(10000);
      await Promise.resolve();
      expect(mockListener.mock.calls.length).toBe(firstCallCount);

      // Third trigger after cooldown (should fire)
      jest.advanceTimersByTime(50000);
      await Promise.resolve();
      expect(mockListener.mock.calls.length).toBeGreaterThan(firstCallCount);
    });
  });

  describe('Alert Management', () => {
    it('should get active alerts', async () => {
      const rule: AlertRule = {
        id: 'test_alert',
        name: 'Test Alert',
        condition: () => true,
        severity: 'medium',
        cooldown: 300000,
        channels: ['console'],
      };

      instance.addAlertRule(rule);
      await instance.initialize();

      jest.advanceTimersByTime(10000);
      await Promise.resolve();

      const alerts = instance.getActiveAlerts();
      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts[0].resolved).toBe(false);
    });

    it('should acknowledge alert', async () => {
      const rule: AlertRule = {
        id: 'ack_test',
        name: 'Acknowledge Test',
        condition: () => true,
        severity: 'low',
        cooldown: 300000,
        channels: ['console'],
      };

      instance.addAlertRule(rule);
      await instance.initialize();

      jest.advanceTimersByTime(10000);
      await Promise.resolve();

      const alerts = instance.getActiveAlerts();
      const alertId = alerts[0]?.id;

      if (alertId) {
        const result = instance.acknowledgeAlert(alertId);
        expect(result).toBe(true);
      }
    });

    it('should resolve alert', async () => {
      const rule: AlertRule = {
        id: 'resolve_test',
        name: 'Resolve Test',
        condition: () => true,
        severity: 'low',
        cooldown: 300000,
        channels: ['console'],
      };

      instance.addAlertRule(rule);
      await instance.initialize();

      jest.advanceTimersByTime(10000);
      await Promise.resolve();

      const alerts = instance.getActiveAlerts();
      const alertId = alerts[0]?.id;

      if (alertId) {
        const result = instance.resolveAlert(alertId);
        expect(result).toBe(true);

        // Resolved alerts should not appear in active alerts
        const activeAlerts = instance.getActiveAlerts();
        expect(activeAlerts.find(a => a.id === alertId)).toBeUndefined();
      }
    });

    it('should return false when acknowledging non-existent alert', () => {
      const result = instance.acknowledgeAlert('non_existent_id');
      expect(result).toBe(false);
    });

    it('should return false when resolving non-existent alert', () => {
      const result = instance.resolveAlert('non_existent_id');
      expect(result).toBe(false);
    });
  });

  describe('Alert Listeners', () => {
    it('should add and notify alert listeners', async () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      instance.addAlertListener(listener1);
      instance.addAlertListener(listener2);

      const rule: AlertRule = {
        id: 'listener_test',
        name: 'Listener Test',
        condition: () => true,
        severity: 'low',
        cooldown: 300000,
        channels: ['console'],
      };

      instance.addAlertRule(rule);
      await instance.initialize();

      jest.advanceTimersByTime(10000);
      await Promise.resolve();

      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });

    it('should remove alert listener', async () => {
      const listener = jest.fn();

      instance.addAlertListener(listener);
      instance.removeAlertListener(listener);

      const rule: AlertRule = {
        id: 'remove_listener_test',
        name: 'Remove Listener Test',
        condition: () => true,
        severity: 'low',
        cooldown: 300000,
        channels: ['console'],
      };

      instance.addAlertRule(rule);
      await instance.initialize();

      jest.advanceTimersByTime(10000);
      await Promise.resolve();

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('Webhook Integration', () => {
    it('should add webhook endpoint', () => {
      const url = 'https://example.com/webhook';
      instance.addWebhookEndpoint(url);
      expect(() => instance.addWebhookEndpoint(url)).not.toThrow();
    });
  });

  describe('System Health', () => {
    it('should get system health', async () => {
      await instance.initialize();

      jest.advanceTimersByTime(100);
      await Promise.resolve();

      const health = instance.getSystemHealth();
      expect(health).toBeDefined();
      expect(health.overall).toMatch(/healthy|degraded|critical/);
      expect(health.services).toBeInstanceOf(Map);
      expect(health.lastUpdated).toBeGreaterThan(0);
    });

    it('should mark system as degraded when non-critical service fails', async () => {
      const failingCheck: HealthCheck = {
        name: 'non_critical_failing',
        check: async () => ({
          healthy: false,
          message: 'Non-critical failure',
          timestamp: Date.now(),
        }),
        interval: 10000,
        timeout: 5000,
        critical: false,
      };

      instance.addHealthCheck(failingCheck);
      await instance.initialize();

      jest.advanceTimersByTime(100);
      await Promise.resolve();
      jest.advanceTimersByTime(10000);
      await Promise.resolve();

      const health = instance.getSystemHealth();
      expect(health.overall).toMatch(/degraded|critical/);
    });

    it('should mark system as critical when critical service fails', async () => {
      const criticalFailingCheck: HealthCheck = {
        name: 'critical_failing',
        check: async () => ({
          healthy: false,
          message: 'Critical failure',
          timestamp: Date.now(),
        }),
        interval: 10000,
        timeout: 5000,
        critical: true,
      };

      instance.addHealthCheck(criticalFailingCheck);
      await instance.initialize();

      jest.advanceTimersByTime(100);
      await Promise.resolve();
      jest.advanceTimersByTime(10000);
      await Promise.resolve();

      const health = instance.getSystemHealth();
      expect(health.overall).toBe('critical');
    });
  });

  describe('checkSystemHealth', () => {
    it('should return system health', async () => {
      await instance.initialize();
      const health = await instance.checkSystemHealth();
      expect(health).toBeDefined();
      expect(health.overall).toMatch(/healthy|degraded|critical/);
    });
  });

  describe('getAlertStatistics', () => {
    it('should return alert statistics', async () => {
      const rule: AlertRule = {
        id: 'stats_test',
        name: 'Stats Test',
        condition: () => true,
        severity: 'critical',
        cooldown: 300000,
        channels: ['console'],
      };

      instance.addAlertRule(rule);
      await instance.initialize();

      jest.advanceTimersByTime(10000);
      await Promise.resolve();

      const stats = instance.getAlertStatistics();
      expect(stats).toBeDefined();
      expect(stats.totalAlerts).toBeGreaterThanOrEqual(0);
      expect(stats.criticalAlerts).toBeGreaterThanOrEqual(0);
    });
  });

  describe('generateReport', () => {
    it('should generate monitoring report', async () => {
      await instance.initialize();

      jest.advanceTimersByTime(100);
      await Promise.resolve();

      const report = instance.generateReport();
      expect(report).toContain('System Monitoring Report');
      expect(report).toContain('Overall Health');
      expect(report).toContain('Service Health');
      expect(report).toContain('Performance Metrics');
    });

    it('should include active alerts in report', async () => {
      const rule: AlertRule = {
        id: 'report_alert',
        name: 'Report Alert Test',
        condition: () => true,
        severity: 'high',
        cooldown: 300000,
        channels: ['console'],
      };

      instance.addAlertRule(rule);
      await instance.initialize();

      jest.advanceTimersByTime(10000);
      await Promise.resolve();

      const report = instance.generateReport();
      expect(report).toContain('Active Alerts');
    });
  });

  describe('dispose', () => {
    it('should clean up resources', async () => {
      await instance.initialize();
      instance.dispose();

      // After disposal, should reinitialize cleanly
      await instance.initialize();
      expect(instance.getSystemHealth()).toBeDefined();
    });

    it('should clear all intervals', async () => {
      await instance.initialize();
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      instance.dispose();

      expect(clearIntervalSpy).toHaveBeenCalled();
      clearIntervalSpy.mockRestore();
    });
  });

  describe('Convenience Functions', () => {
    it('checkSystemHealth should return current health', async () => {
      await monitoringAndAlerting.initialize();
      const health = checkSystemHealth();
      expect(health).toBeDefined();
      expect(health.overall).toMatch(/healthy|degraded|critical/);
    });

    it('getActiveAlerts should return active alerts', async () => {
      await monitoringAndAlerting.initialize();
      const alerts = getActiveAlerts();
      expect(Array.isArray(alerts)).toBe(true);
    });

    it('generateHealthReport should return report string', async () => {
      await monitoringAndAlerting.initialize();

      jest.advanceTimersByTime(100);
      await Promise.resolve();

      const report = generateHealthReport();
      expect(typeof report).toBe('string');
      expect(report.length).toBeGreaterThan(0);
    });
  });

  describe('Default Health Checks', () => {
    it('should setup memory health check', async () => {
      await instance.initialize();

      jest.advanceTimersByTime(100);
      await Promise.resolve();

      const health = instance.getSystemHealth();
      expect(health.services.has('memory')).toBe(true);
    });

    it('should setup app responsiveness check', async () => {
      await instance.initialize();

      jest.advanceTimersByTime(100);
      await Promise.resolve();

      const health = instance.getSystemHealth();
      expect(health.services.has('app_responsiveness')).toBe(true);
    });

    it('should setup error rate check', async () => {
      await instance.initialize();

      jest.advanceTimersByTime(100);
      await Promise.resolve();

      const health = instance.getSystemHealth();
      expect(health.services.has('error_rate')).toBe(true);
    });
  });

  describe('Alert Severity Levels', () => {
    it('should handle low severity alerts', async () => {
      const rule: AlertRule = {
        id: 'low_severity',
        name: 'Low Severity Alert',
        condition: () => true,
        severity: 'low',
        cooldown: 300000,
        channels: ['console'],
      };

      instance.addAlertRule(rule);
      await instance.initialize();

      jest.advanceTimersByTime(10000);
      await Promise.resolve();

      const alerts = instance.getActiveAlerts();
      expect(alerts.some(a => a.severity === 'low')).toBe(true);
    });

    it('should handle medium severity alerts', async () => {
      const rule: AlertRule = {
        id: 'medium_severity',
        name: 'Medium Severity Alert',
        condition: () => true,
        severity: 'medium',
        cooldown: 300000,
        channels: ['console'],
      };

      instance.addAlertRule(rule);
      await instance.initialize();

      jest.advanceTimersByTime(10000);
      await Promise.resolve();

      const alerts = instance.getActiveAlerts();
      expect(alerts.some(a => a.severity === 'medium')).toBe(true);
    });

    it('should handle high severity alerts', async () => {
      const rule: AlertRule = {
        id: 'high_severity',
        name: 'High Severity Alert',
        condition: () => true,
        severity: 'high',
        cooldown: 300000,
        channels: ['console'],
      };

      instance.addAlertRule(rule);
      await instance.initialize();

      jest.advanceTimersByTime(10000);
      await Promise.resolve();

      const alerts = instance.getActiveAlerts();
      expect(alerts.some(a => a.severity === 'high')).toBe(true);
    });

    it('should handle critical severity alerts', async () => {
      const rule: AlertRule = {
        id: 'critical_severity',
        name: 'Critical Severity Alert',
        condition: () => true,
        severity: 'critical',
        cooldown: 300000,
        channels: ['console'],
      };

      instance.addAlertRule(rule);
      await instance.initialize();

      jest.advanceTimersByTime(10000);
      await Promise.resolve();

      const alerts = instance.getActiveAlerts();
      expect(alerts.some(a => a.severity === 'critical')).toBe(true);
    });
  });
});
