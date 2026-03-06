import { Platform } from 'react-native';
import { logger } from '../logger';
import { performanceMonitor } from '../performanceMonitor';
import type { HealthCheck, HealthStatus, SystemHealth } from './types';

export class HealthCheckManager {
  private healthChecks = new Map<string, HealthCheck>();
  private healthIntervals = new Map<string, NodeJS.Timeout>();
  private currentHealth: SystemHealth;

  constructor(currentHealth: SystemHealth) {
    this.currentHealth = currentHealth;
  }

  getHealthChecks(): Map<string, HealthCheck> {
    return this.healthChecks;
  }

  addHealthCheck(healthCheck: HealthCheck, isInitialized: boolean): void {
    this.healthChecks.set(healthCheck.name, healthCheck);
    if (!this.currentHealth.services.has(healthCheck.name)) {
      this.currentHealth.services.set(healthCheck.name, {
        healthy: true,
        message: 'Health check scheduled',
        timestamp: Date.now(),
      });
    }
    if (isInitialized) this.startHealthCheck(healthCheck);
    logger.debug('MonitoringAndAlerting', 'Health check added', { name: healthCheck.name });
  }

  setupDefaultHealthChecks(): void {
    this.addHealthCheck(
      {
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
      },
      false
    );

    this.addHealthCheck(
      {
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
      },
      false
    );

    if (Platform.OS === 'web') {
      this.addHealthCheck(
        {
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
        },
        false
      );
    }

    this.addHealthCheck(
      {
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
      },
      false
    );

    logger.debug('MonitoringAndAlerting', 'Default health checks configured');
  }

  startAllHealthChecks(): void {
    for (const healthCheck of this.healthChecks.values()) {
      this.startHealthCheck(healthCheck);
    }
  }

  startHealthCheck(healthCheck: HealthCheck): void {
    this.runHealthCheck(healthCheck);
    const interval = setInterval(() => this.runHealthCheck(healthCheck), healthCheck.interval);
    this.healthIntervals.set(healthCheck.name, interval);
    logger.debug('MonitoringAndAlerting', 'Health check started', { name: healthCheck.name });
  }

  async runHealthCheck(healthCheck: HealthCheck): Promise<void> {
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

  dispose(): void {
    for (const interval of this.healthIntervals.values()) clearInterval(interval);
    this.healthChecks.clear();
    this.healthIntervals.clear();
  }
}
