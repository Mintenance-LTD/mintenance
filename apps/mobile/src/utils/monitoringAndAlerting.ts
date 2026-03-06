/**
 * Advanced Monitoring and Alerting System
 * Comprehensive health monitoring, real-time alerts, and performance tracking
 *
 * Facade — all implementation lives in utils/monitoring/
 */

export type { HealthCheck, HealthStatus, SystemHealth, AlertRule, AlertChannel, Alert, MetricThreshold } from './monitoring/types';
export { MonitoringAndAlerting } from './monitoring/MonitoringAndAlerting';
export { dispatchAlert, summariseHealth } from './monitoring/alertDispatchers';

import { MonitoringAndAlerting } from './monitoring/MonitoringAndAlerting';
import { performanceMonitor } from './performanceMonitor';
import { logger } from './logger';
import type { SystemHealth, Alert } from './monitoring/types';

// Singleton instance
export const monitoringAndAlerting = MonitoringAndAlerting.getInstance();

// Enhanced performance monitor with alerting integration
export const recordMetric = (name: string, value: number): void => {
  performanceMonitor.recordMetric?.(name, value);
};

// Convenience functions for common monitoring tasks
export const checkSystemHealth = (): SystemHealth => monitoringAndAlerting.getSystemHealth();
export const getActiveAlerts = (): Alert[] => monitoringAndAlerting.getActiveAlerts();
export const generateHealthReport = (): string => monitoringAndAlerting.generateReport();

// Auto-initialize in production
if (!__DEV__) {
  monitoringAndAlerting.initialize().catch((error) => {
    logger.error('MonitoringAndAlerting', 'Failed to auto-initialize monitoring', error);
  });
}
