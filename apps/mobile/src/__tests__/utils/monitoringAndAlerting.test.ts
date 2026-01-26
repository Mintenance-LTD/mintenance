import { MonitoringAndAlerting, monitoringAndAlerting } from '../../utils/monitoringAndAlerting';
import { logger } from '../../utils/logger';
import { performanceMonitor } from '../../utils/performanceMonitor';
import { Platform } from 'react-native';

// Mock dependencies
jest.mock('../../utils/logger');
jest.mock('../../utils/performanceMonitor');
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    select: jest.fn((options) => options.default || options.ios),
  },
}));

// Mock fetch for webhook tests
global.fetch = jest.fn();

describe('MonitoringAndAlerting', () => {
  let monitoring: MonitoringAndAlerting;
  const mockMetrics = {
    startupTime: 1000,
    memoryUsage: 100 * 1024 * 1024, // 100MB
    navigationTime: 200,
    apiResponseTime: 500,
    fps: 60,
  };

  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Reset singleton
    (MonitoringAndAlerting as any).instance = undefined;
    monitoring = MonitoringAndAlerting.getInstance();

    // Mock performance metrics
    (performanceMonitor.getMetrics as jest.Mock).mockReturnValue(mockMetrics);

    // Mock global __DEV__
    global.__DEV__ = true;
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    monitoring.dispose();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = MonitoringAndAlerting.getInstance();
      const instance2 = MonitoringAndAlerting.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      await monitoring.initialize();

      expect(logger.info).toHaveBeenCalledWith(
        'MonitoringAndAlerting',
        'Initializing monitoring and alerting system'
      );
      expect(logger.info).toHaveBeenCalledWith(
        'MonitoringAndAlerting',
        'Monitoring and alerting system initialized successfully'
      );
    });

    it('should only initialize once', async () => {
      await monitoring.initialize();
      const logCallCount = (logger.info as jest.Mock).mock.calls.length;

      await monitoring.initialize();
      expect((logger.info as jest.Mock).mock.calls.length).toBe(logCallCount);
    });

    it('should handle initialization errors', async () => {
      const error = new Error('Init failed');
      jest.spyOn(monitoring as any, 'setupDefaultHealthChecks').mockImplementation(() => {
        throw error;
      });

      await expect(monitoring.initialize()).rejects.toThrow('Init failed');
      expect(logger.error).toHaveBeenCalledWith(
        'MonitoringAndAlerting',
        'Failed to initialize monitoring system',
        error
      );
    });
  });

  describe('Health Checks', () => {
    beforeEach(async () => {
      await monitoring.initialize();
    });

    it('should add health checks', () => {
      const healthCheck = {
        name: 'test-check',
        check: jest.fn().mockResolvedValue({
          healthy: true,
          message: 'Test check passed',
          timestamp: Date.now(),
        }),
        interval: 30000,
        timeout: 5000,
        critical: false,
      };

      monitoring.addHealthCheck(healthCheck);

      expect(logger.debug).toHaveBeenCalledWith(
        'MonitoringAndAlerting',
        'Health check added',
        { name: 'test-check' }
      );
    });

    it('should run health checks periodically', async () => {
      const checkFn = jest.fn().mockResolvedValue({
        healthy: true,
        message: 'OK',
        timestamp: Date.now(),
      });

      monitoring.addHealthCheck({
        name: 'periodic-check',
        check: checkFn,
        interval: 10000,
        timeout: 5000,
        critical: false,
      });

      // Initial check
      await jest.advanceTimersByTimeAsync(0);
      expect(checkFn).toHaveBeenCalledTimes(1);

      // Periodic checks
      await jest.advanceTimersByTimeAsync(10000);
      expect(checkFn).toHaveBeenCalledTimes(2);

      await jest.advanceTimersByTimeAsync(10000);
      expect(checkFn).toHaveBeenCalledTimes(3);
    });

    it('should handle health check timeouts', async () => {
      const checkFn = jest.fn().mockImplementation(() =>
        new Promise(resolve => setTimeout(resolve, 10000))
      );

      monitoring.addHealthCheck({
        name: 'slow-check',
        check: checkFn,
        interval: 30000,
        timeout: 1000,
        critical: true,
      });

      await jest.advanceTimersByTimeAsync(1100);

      expect(logger.error).toHaveBeenCalledWith(
        'MonitoringAndAlerting',
        'Critical health check error: slow-check',
        expect.any(Error)
      );
    });

    it('should handle health check failures', async () => {
      const error = new Error('Check failed');
      const checkFn = jest.fn().mockRejectedValue(error);

      monitoring.addHealthCheck({
        name: 'failing-check',
        check: checkFn,
        interval: 30000,
        timeout: 5000,
        critical: true,
      });

      await jest.advanceTimersByTimeAsync(0);

      expect(logger.error).toHaveBeenCalledWith(
        'MonitoringAndAlerting',
        'Critical health check error: failing-check',
        error
      );
    });

    it('should update system health based on checks', async () => {
      monitoring.addHealthCheck({
        name: 'healthy-service',
        check: jest.fn().mockResolvedValue({
          healthy: true,
          message: 'Service is healthy',
          timestamp: Date.now(),
        }),
        interval: 10000,
        timeout: 5000,
        critical: false,
      });

      monitoring.addHealthCheck({
        name: 'unhealthy-service',
        check: jest.fn().mockResolvedValue({
          healthy: false,
          message: 'Service is down',
          timestamp: Date.now(),
        }),
        interval: 10000,
        timeout: 5000,
        critical: false,
      });

      await jest.advanceTimersByTimeAsync(0);
      await jest.advanceTimersByTimeAsync(10000); // Trigger monitoring update

      const health = monitoring.getSystemHealth();
      expect(health.overall).toBe('degraded');
      expect(health.services.get('healthy-service')?.healthy).toBe(true);
      expect(health.services.get('unhealthy-service')?.healthy).toBe(false);
    });

    it('should mark system as critical when critical service fails', async () => {
      monitoring.addHealthCheck({
        name: 'critical-service',
        check: jest.fn().mockResolvedValue({
          healthy: false,
          message: 'Critical service failed',
          timestamp: Date.now(),
        }),
        interval: 10000,
        timeout: 5000,
        critical: true,
      });

      await jest.advanceTimersByTimeAsync(0);
      await jest.advanceTimersByTimeAsync(10000);

      const health = monitoring.getSystemHealth();
      expect(health.overall).toBe('critical');
    });
  });

  describe('Alert Rules', () => {
    beforeEach(async () => {
      await monitoring.initialize();
    });

    it('should add alert rules', () => {
      const rule = {
        id: 'test-rule',
        name: 'Test Alert',
        condition: jest.fn().mockReturnValue(false),
        severity: 'medium' as const,
        cooldown: 60000,
        channels: ['console'] as const,
      };

      monitoring.addAlertRule(rule);

      expect(logger.debug).toHaveBeenCalledWith(
        'MonitoringAndAlerting',
        'Alert rule added',
        { id: 'test-rule', name: 'Test Alert' }
      );
    });

    it('should trigger alerts when conditions are met', async () => {
      const condition = jest.fn().mockReturnValue(true);

      monitoring.addAlertRule({
        id: 'trigger-rule',
        name: 'Test Trigger',
        condition,
        severity: 'high',
        cooldown: 60000,
        channels: ['console'],
      });

      await jest.advanceTimersByTimeAsync(10000); // Monitoring check interval

      expect(condition).toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('ALERT')
      );
    });

    it('should respect alert cooldowns', async () => {
      const condition = jest.fn().mockReturnValue(true);

      monitoring.addAlertRule({
        id: 'cooldown-rule',
        name: 'Cooldown Test',
        condition,
        severity: 'medium',
        cooldown: 30000,
        channels: ['console'],
      });

      // First trigger
      await jest.advanceTimersByTimeAsync(10000);
      expect(condition).toHaveBeenCalledTimes(1);

      // Should not trigger again within cooldown
      condition.mockClear();
      await jest.advanceTimersByTimeAsync(10000);
      expect(condition).toHaveBeenCalledTimes(1);

      // Should trigger after cooldown
      await jest.advanceTimersByTimeAsync(20000);
      expect(condition).toHaveBeenCalledTimes(2);
    });

    it('should handle different severity levels', async () => {
      const severities = ['low', 'medium', 'high', 'critical'] as const;

      for (const severity of severities) {
        monitoring.addAlertRule({
          id: `${severity}-alert`,
          name: `${severity} Alert`,
          condition: () => true,
          severity,
          cooldown: 60000,
          channels: ['console'],
        });
      }

      await jest.advanceTimersByTimeAsync(10000);

      const alerts = monitoring.getActiveAlerts();
      expect(alerts).toHaveLength(4);
      expect(alerts.map(a => a.severity).sort()).toEqual(['critical', 'high', 'low', 'medium']);
    });
  });

  describe('Alert Channels', () => {
    beforeEach(async () => {
      await monitoring.initialize();
    });

    it('should send console alerts', async () => {
      monitoring.addAlertRule({
        id: 'console-alert',
        name: 'Console Test',
        condition: () => true,
        severity: 'high',
        cooldown: 60000,
        channels: ['console'],
      });

      await jest.advanceTimersByTimeAsync(10000);

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('🔴 ALERT [HIGH]')
      );
    });

    it('should send sentry alerts', async () => {
      monitoring.addAlertRule({
        id: 'sentry-alert',
        name: 'Sentry Test',
        condition: () => true,
        severity: 'critical',
        cooldown: 60000,
        channels: ['sentry'],
      });

      await jest.advanceTimersByTimeAsync(10000);

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('ALERT'),
        undefined,
        expect.objectContaining({
          alertId: expect.any(String),
          severity: 'critical',
        })
      );
    });

    it('should send webhook alerts on web platform', async () => {
      (Platform as any).OS = 'web';
      monitoring.addWebhookEndpoint('https://example.com/webhook');

      (global.fetch as jest.Mock).mockResolvedValue({ ok: true });

      monitoring.addAlertRule({
        id: 'webhook-alert',
        name: 'Webhook Test',
        condition: () => true,
        severity: 'high',
        cooldown: 60000,
        channels: ['webhook'],
      });

      await jest.advanceTimersByTimeAsync(10000);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://example.com/webhook',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: expect.stringContaining('alert'),
        })
      );
    });

    it('should handle webhook failures gracefully', async () => {
      (Platform as any).OS = 'web';
      monitoring.addWebhookEndpoint('https://example.com/webhook');

      const error = new Error('Webhook failed');
      (global.fetch as jest.Mock).mockRejectedValue(error);

      monitoring.addAlertRule({
        id: 'webhook-fail',
        name: 'Webhook Fail Test',
        condition: () => true,
        severity: 'high',
        cooldown: 60000,
        channels: ['webhook'],
      });

      await jest.advanceTimersByTimeAsync(10000);

      expect(logger.error).toHaveBeenCalledWith(
        'MonitoringAndAlerting',
        'Webhook alert failed',
        error
      );
    });

    it('should send placeholder email alerts', async () => {
      monitoring.addAlertRule({
        id: 'email-alert',
        name: 'Email Test',
        condition: () => true,
        severity: 'medium',
        cooldown: 60000,
        channels: ['email'],
      });

      await jest.advanceTimersByTimeAsync(10000);

      expect(logger.debug).toHaveBeenCalledWith(
        'MonitoringAndAlerting',
        'Email alert (placeholder)',
        expect.objectContaining({ alert: expect.any(String) })
      );
    });

    it('should send placeholder push alerts', async () => {
      monitoring.addAlertRule({
        id: 'push-alert',
        name: 'Push Test',
        condition: () => true,
        severity: 'low',
        cooldown: 60000,
        channels: ['push'],
      });

      await jest.advanceTimersByTimeAsync(10000);

      expect(logger.debug).toHaveBeenCalledWith(
        'MonitoringAndAlerting',
        'Push alert (placeholder)',
        expect.objectContaining({ alert: expect.any(String) })
      );
    });
  });

  describe('Alert Management', () => {
    beforeEach(async () => {
      await monitoring.initialize();
    });

    it('should get active alerts', async () => {
      monitoring.addAlertRule({
        id: 'active-alert',
        name: 'Active Alert',
        condition: () => true,
        severity: 'medium',
        cooldown: 60000,
        channels: ['console'],
      });

      await jest.advanceTimersByTimeAsync(10000);

      const alerts = monitoring.getActiveAlerts();
      expect(alerts).toHaveLength(1);
      expect(alerts[0]).toMatchObject({
        ruleId: 'active-alert',
        message: 'Alert: Active Alert',
        severity: 'medium',
        acknowledged: false,
        resolved: false,
      });
    });

    it('should acknowledge alerts', async () => {
      monitoring.addAlertRule({
        id: 'ack-alert',
        name: 'Acknowledge Test',
        condition: () => true,
        severity: 'high',
        cooldown: 60000,
        channels: ['console'],
      });

      await jest.advanceTimersByTimeAsync(10000);

      const alerts = monitoring.getActiveAlerts();
      const alertId = alerts[0].id;

      const result = monitoring.acknowledgeAlert(alertId);
      expect(result).toBe(true);
      expect(alerts[0].acknowledged).toBe(true);

      expect(logger.info).toHaveBeenCalledWith(
        'MonitoringAndAlerting',
        'Alert acknowledged',
        { alertId }
      );
    });

    it('should resolve alerts', async () => {
      monitoring.addAlertRule({
        id: 'resolve-alert',
        name: 'Resolve Test',
        condition: () => true,
        severity: 'critical',
        cooldown: 60000,
        channels: ['console'],
      });

      await jest.advanceTimersByTimeAsync(10000);

      const alertsBefore = monitoring.getActiveAlerts();
      const alertId = alertsBefore[0].id;

      const result = monitoring.resolveAlert(alertId);
      expect(result).toBe(true);

      const alertsAfter = monitoring.getActiveAlerts();
      expect(alertsAfter).toHaveLength(0);

      expect(logger.info).toHaveBeenCalledWith(
        'MonitoringAndAlerting',
        'Alert resolved',
        { alertId }
      );
    });

    it('should return false for non-existent alert operations', () => {
      const result1 = monitoring.acknowledgeAlert('non-existent');
      expect(result1).toBe(false);

      const result2 = monitoring.resolveAlert('non-existent');
      expect(result2).toBe(false);
    });
  });

  describe('Alert Listeners', () => {
    beforeEach(async () => {
      await monitoring.initialize();
    });

    it('should add and notify alert listeners', async () => {
      const listener = jest.fn();
      monitoring.addAlertListener(listener);

      monitoring.addAlertRule({
        id: 'listener-alert',
        name: 'Listener Test',
        condition: () => true,
        severity: 'medium',
        cooldown: 60000,
        channels: ['console'],
      });

      await jest.advanceTimersByTimeAsync(10000);

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          ruleId: 'listener-alert',
          message: 'Alert: Listener Test',
          severity: 'medium',
        })
      );
    });

    it('should remove alert listeners', async () => {
      const listener = jest.fn();
      monitoring.addAlertListener(listener);
      monitoring.removeAlertListener(listener);

      monitoring.addAlertRule({
        id: 'removed-listener',
        name: 'Removed Listener',
        condition: () => true,
        severity: 'low',
        cooldown: 60000,
        channels: ['console'],
      });

      await jest.advanceTimersByTimeAsync(10000);

      expect(listener).not.toHaveBeenCalled();
    });

    it('should handle listener errors gracefully', async () => {
      const errorListener = jest.fn().mockImplementation(() => {
        throw new Error('Listener error');
      });
      const goodListener = jest.fn();

      monitoring.addAlertListener(errorListener);
      monitoring.addAlertListener(goodListener);

      monitoring.addAlertRule({
        id: 'error-listener',
        name: 'Error Listener Test',
        condition: () => true,
        severity: 'high',
        cooldown: 60000,
        channels: ['console'],
      });

      await jest.advanceTimersByTimeAsync(10000);

      expect(errorListener).toHaveBeenCalled();
      expect(goodListener).toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(
        'MonitoringAndAlerting',
        'Alert listener error',
        expect.any(Error)
      );
    });
  });

  describe('Default Configurations', () => {
    beforeEach(async () => {
      await monitoring.initialize();
    });

    it('should configure default health checks', async () => {
      const health = monitoring.getSystemHealth();

      // Should have default health checks
      expect(health.services.has('memory')).toBe(true);
      expect(health.services.has('app_responsiveness')).toBe(true);
      expect(health.services.has('error_rate')).toBe(true);
    });

    it('should trigger high memory alert', async () => {
      (performanceMonitor.getMetrics as jest.Mock).mockReturnValue({
        ...mockMetrics,
        memoryUsage: 260 * 1024 * 1024, // 260MB
      });

      await jest.advanceTimersByTimeAsync(10000);

      const alerts = monitoring.getActiveAlerts();
      const memoryAlert = alerts.find(a => a.ruleId === 'high_memory_usage');
      expect(memoryAlert).toBeDefined();
      expect(memoryAlert?.severity).toBe('high');
    });

    it('should trigger slow startup alert', async () => {
      (performanceMonitor.getMetrics as jest.Mock).mockReturnValue({
        ...mockMetrics,
        startupTime: 6000, // 6 seconds
      });

      await jest.advanceTimersByTimeAsync(10000);

      const alerts = monitoring.getActiveAlerts();
      const startupAlert = alerts.find(a => a.ruleId === 'slow_startup');
      expect(startupAlert).toBeDefined();
      expect(startupAlert?.severity).toBe('medium');
    });

    it('should trigger slow API response alert', async () => {
      (performanceMonitor.getMetrics as jest.Mock).mockReturnValue({
        ...mockMetrics,
        apiResponseTime: 6000, // 6 seconds
      });

      await jest.advanceTimersByTimeAsync(10000);

      const alerts = monitoring.getActiveAlerts();
      const apiAlert = alerts.find(a => a.ruleId === 'slow_api_response');
      expect(apiAlert).toBeDefined();
      expect(apiAlert?.severity).toBe('medium');
    });

    it('should trigger low FPS alert', async () => {
      (performanceMonitor.getMetrics as jest.Mock).mockReturnValue({
        ...mockMetrics,
        fps: 25, // Below 30 FPS
      });

      await jest.advanceTimersByTimeAsync(10000);

      const alerts = monitoring.getActiveAlerts();
      const fpsAlert = alerts.find(a => a.ruleId === 'low_fps');
      expect(fpsAlert).toBeDefined();
      expect(fpsAlert?.severity).toBe('medium');
    });
  });

  describe('Reporting', () => {
    beforeEach(async () => {
      await monitoring.initialize();
    });

    it('should generate comprehensive report', async () => {
      // Add some test data
      monitoring.addHealthCheck({
        name: 'test-service',
        check: jest.fn().mockResolvedValue({
          healthy: true,
          message: 'Service healthy',
          responseTime: 50,
          details: { version: '1.0.0' },
          timestamp: Date.now(),
        }),
        interval: 30000,
        timeout: 5000,
        critical: false,
      });

      monitoring.addAlertRule({
        id: 'report-alert',
        name: 'Report Alert',
        condition: () => true,
        severity: 'high',
        cooldown: 60000,
        channels: ['console'],
      });

      await jest.advanceTimersByTimeAsync(10000);

      const report = monitoring.generateReport();

      expect(report).toContain('System Monitoring Report');
      expect(report).toContain('Overall Health:');
      expect(report).toContain('Active Alerts');
      expect(report).toContain('Service Health');
      expect(report).toContain('Performance Metrics');
      expect(report).toContain('test-service');
      expect(report).toContain('Report Alert');
    });

    it('should show no alerts when system is healthy', () => {
      const report = monitoring.generateReport();
      expect(report).toContain('No Active Alerts');
    });
  });

  describe('Cleanup', () => {
    it('should dispose resources properly', async () => {
      await monitoring.initialize();

      // Add some data
      monitoring.addHealthCheck({
        name: 'dispose-check',
        check: jest.fn().mockResolvedValue({
          healthy: true,
          timestamp: Date.now(),
        }),
        interval: 10000,
        timeout: 5000,
        critical: false,
      });

      monitoring.addAlertRule({
        id: 'dispose-alert',
        name: 'Dispose Alert',
        condition: () => false,
        severity: 'low',
        cooldown: 60000,
        channels: ['console'],
      });

      const listener = jest.fn();
      monitoring.addAlertListener(listener);

      monitoring.dispose();

      expect(logger.info).toHaveBeenCalledWith(
        'MonitoringAndAlerting',
        'Monitoring system disposed'
      );

      // Verify cleanup
      const health = monitoring.getSystemHealth();
      expect(health.services.size).toBe(0);
      expect(monitoring.getActiveAlerts()).toHaveLength(0);
    });
  });

  describe('Utility Functions', () => {
    it('should provide checkSystemHealth alias', async () => {
      await monitoring.initialize();
      const health = await monitoring.checkSystemHealth();
      expect(health).toEqual(monitoring.getSystemHealth());
    });

    it('should provide alert statistics', () => {
      const stats = monitoring.getAlertStatistics();
      expect(stats).toMatchObject({
        totalAlerts: expect.any(Number),
        criticalAlerts: expect.any(Number),
        warningAlerts: expect.any(Number),
        infoAlerts: expect.any(Number),
      });
    });
  });

  describe('Exported Functions', () => {
    it('should export singleton instance', () => {
      expect(monitoringAndAlerting).toBe(MonitoringAndAlerting.getInstance());
    });

    it('should export convenience functions', async () => {
      const { checkSystemHealth, getActiveAlerts, generateHealthReport } =
        require('../../utils/monitoringAndAlerting');

      await monitoring.initialize();

      const health = checkSystemHealth();
      expect(health).toEqual(monitoring.getSystemHealth());

      const alerts = getActiveAlerts();
      expect(alerts).toEqual(monitoring.getActiveAlerts());

      const report = generateHealthReport();
      expect(report).toEqual(monitoring.generateReport());
    });
  });

  describe('Production Auto-initialization', () => {
    it('should auto-initialize in production', async () => {
      global.__DEV__ = false;

      // Re-import to trigger auto-init
      jest.resetModules();
      const { monitoringAndAlerting: prodMonitoring } =
        require('../../utils/monitoringAndAlerting');

      await jest.advanceTimersByTimeAsync(100);

      // Should have attempted initialization
      // Note: The actual initialization may fail in test environment
      // but we're testing that it attempts to initialize
      expect(logger.info).toHaveBeenCalledWith(
        'MonitoringAndAlerting',
        expect.stringContaining('Initializing')
      );
    });
  });
});
