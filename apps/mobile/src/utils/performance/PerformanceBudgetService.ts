/**
 * Performance Budget Service
 * Main orchestrator for the complete performance monitoring system
 */

import React from 'react';
import { logger } from '../logger';
import { PerformanceBudgetManager } from './PerformanceBudgetManager';
import { ReactNativePerformanceEnforcer } from './ReactNativePerformanceEnforcer';
import { PerformanceBudgetRepository } from './PerformanceBudgetRepository';
import { PerformanceMetricsCollector } from './PerformanceMetricsCollector';
import {
  PerformanceBudget,
  PerformanceMetrics,
  PerformanceAlert,
  PerformanceReport,
  ReactNativePerformanceConfig,
  PerformanceEvent,
  ServiceBudgetConfiguration,
} from './types';

interface PerformanceBudgetServiceConfig {
  enableContinuousMonitoring?: boolean;
  monitoringInterval?: number;
  enableReactNativeEnforcement?: boolean;
  reactNativeConfig?: ReactNativePerformanceConfig;
  enableAutomaticOptimization?: boolean;
  alertThresholds?: {
    maxWarningsPerHour: number;
    maxCriticalAlertsPerHour: number;
  };
}

export class PerformanceBudgetService {
  private manager: PerformanceBudgetManager;
  private enforcer: ReactNativePerformanceEnforcer;
  private repository: PerformanceBudgetRepository;
  private collector: PerformanceMetricsCollector;
  private config: Required<PerformanceBudgetServiceConfig>;
  private initialized = false;

  constructor(config: PerformanceBudgetServiceConfig = {}) {
    this.config = {
      enableContinuousMonitoring: true,
      monitoringInterval: 60000, // 1 minute
      enableReactNativeEnforcement: true,
      reactNativeConfig: {},
      enableAutomaticOptimization: true,
      alertThresholds: {
        maxWarningsPerHour: 10,
        maxCriticalAlertsPerHour: 3,
      },
      ...config,
    };

    this.repository = new PerformanceBudgetRepository();
    this.collector = new PerformanceMetricsCollector();
    this.manager = new PerformanceBudgetManager(this.repository, this.collector);
    this.enforcer = new ReactNativePerformanceEnforcer(this.config.reactNativeConfig);

    this.setupIntegrations();
  }

  /**
   * Setup integrations between components
   */
  private setupIntegrations(): void {
    // Connect manager alerts to our alert handling
    this.manager.onAlert('service_orchestrator', (alert: PerformanceAlert) => {
      this.handleAlert(alert);
    });

    // Connect enforcer events to our event handling
    this.enforcer.addEventListener((event: PerformanceEvent) => {
      this.handlePerformanceEvent(event);
    });

    logger.info('PerformanceBudgetService', 'Component integrations configured');
  }

  /**
   * Initialize the complete performance monitoring system
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      logger.warn('PerformanceBudgetService', 'Service already initialized');
      return;
    }

    try {
      logger.info('PerformanceBudgetService', 'Initializing performance monitoring system', this.config);

      // Initialize React Native enforcer if enabled
      if (this.config.enableReactNativeEnforcement) {
        await this.enforcer.initialize();
      }

      // Start continuous monitoring if enabled
      if (this.config.enableContinuousMonitoring) {
        this.manager.startMonitoring(this.config.monitoringInterval);
      }

      this.initialized = true;

      logger.info('PerformanceBudgetService', 'Performance monitoring system initialized successfully');

      // Emit initialization event
      this.emitEvent({
        type: 'monitoring_started',
        serviceName: 'performance_budget_service',
        timestamp: Date.now(),
        data: { config: this.config },
      });
    } catch (error) {
      logger.error('PerformanceBudgetService', 'Failed to initialize performance monitoring system', error);
      throw error;
    }
  }

  /**
   * Shutdown the performance monitoring system
   */
  async shutdown(): Promise<void> {
    if (!this.initialized) {
      logger.warn('PerformanceBudgetService', 'Service not initialized');
      return;
    }

    try {
      logger.info('PerformanceBudgetService', 'Shutting down performance monitoring system');

      // Stop monitoring
      this.manager.stopMonitoring();

      // Shutdown enforcer
      this.enforcer.shutdown();

      this.initialized = false;

      logger.info('PerformanceBudgetService', 'Performance monitoring system shutdown completed');

      // Emit shutdown event
      this.emitEvent({
        type: 'monitoring_stopped',
        serviceName: 'performance_budget_service',
        timestamp: Date.now(),
        data: {},
      });
    } catch (error) {
      logger.error('PerformanceBudgetService', 'Error during shutdown', error);
      throw error;
    }
  }

  /**
   * Configure performance budget for a service
   */
  setBudget(budget: PerformanceBudget): void {
    this.manager.setBudget(budget);
    logger.info('PerformanceBudgetService', 'Performance budget configured', {
      serviceName: budget.serviceName,
    });
  }

  /**
   * Configure multiple service budgets
   */
  setBudgets(budgets: PerformanceBudget[]): void {
    budgets.forEach(budget => this.setBudget(budget));
    logger.info('PerformanceBudgetService', 'Multiple performance budgets configured', {
      count: budgets.length,
    });
  }

  /**
   * Record performance metrics for a service
   */
  async recordMetrics(
    serviceName: string,
    responseTime: number,
    additionalMetrics?: {
      memoryUsage?: number;
      cpuUsage?: number;
      apiCallsPerMinute?: number;
      errorRate?: number;
      downloadSize?: number;
    }
  ): Promise<void> {
    await this.manager.recordMetrics(
      serviceName,
      responseTime,
      additionalMetrics?.memoryUsage,
      additionalMetrics?.cpuUsage,
      additionalMetrics?.apiCallsPerMinute,
      additionalMetrics?.errorRate,
      additionalMetrics?.downloadSize
    );
  }

  /**
   * Get performance report for a service
   */
  getReport(serviceName: string, timeRangeMs?: number): PerformanceReport {
    return this.manager.getPerformanceReport(serviceName, timeRangeMs);
  }

  /**
   * Get all performance alerts
   */
  getAlerts(serviceName?: string, severity?: 'warning' | 'critical'): PerformanceAlert[] {
    return this.manager.getAlerts(serviceName, severity);
  }

  /**
   * Get performance metrics for a service
   */
  getMetrics(serviceName: string, limit?: number): PerformanceMetrics[] {
    return this.manager.getMetrics(serviceName, limit);
  }

  /**
   * Get system status and health
   */
  getSystemStatus(): {
    initialized: boolean;
    monitoring: boolean;
    budgetCount: number;
    alertCount: number;
    recentMetrics: PerformanceMetrics[];
    systemHealth: 'healthy' | 'warning' | 'critical';
  } {
    const status = this.manager.getStatus();
    const recentAlerts = this.getAlerts().slice(0, 10);
    const criticalAlerts = recentAlerts.filter(a => a.severity === 'critical').length;
    const warningAlerts = recentAlerts.filter(a => a.severity === 'warning').length;

    let systemHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (criticalAlerts > 0) {
      systemHealth = 'critical';
    } else if (warningAlerts > 3) {
      systemHealth = 'warning';
    }

    return {
      initialized: this.initialized,
      monitoring: status.monitoring,
      budgetCount: status.budgetCount,
      alertCount: status.alertCount,
      recentMetrics: [], // Would collect recent metrics from all services
      systemHealth,
    };
  }

  /**
   * Handle performance alert
   */
  private async handleAlert(alert: PerformanceAlert): Promise<void> {
    logger.warn('PerformanceBudgetService', 'Performance alert received', {
      serviceName: alert.serviceName,
      metric: alert.metric,
      severity: alert.severity,
    });

    // Check if we should trigger automatic optimization
    if (this.config.enableAutomaticOptimization && alert.severity === 'critical') {
      await this.triggerAutomaticOptimization(alert);
    }

    // Check alert rate limits
    await this.checkAlertRateLimits(alert);
  }

  /**
   * Handle performance event
   */
  private handlePerformanceEvent(event: PerformanceEvent): void {
    logger.info('PerformanceBudgetService', 'Performance event received', {
      type: event.type,
      serviceName: event.serviceName,
    });

    // Additional event processing can be added here
    this.emitEvent(event);
  }

  /**
   * Trigger automatic optimization
   */
  private async triggerAutomaticOptimization(alert: PerformanceAlert): Promise<void> {
    try {
      logger.info('PerformanceBudgetService', 'Triggering automatic optimization', {
        serviceName: alert.serviceName,
        metric: alert.metric,
      });

      switch (alert.metric) {
        case 'memoryUsage':
          // Trigger memory optimization through enforcer
          await this.enforcer.checkMemoryUsage();
          break;

        case 'bundleSize':
          // Trigger bundle optimization through enforcer
          await this.enforcer.checkBundleSize();
          break;

        default:
          logger.info('PerformanceBudgetService', `No automatic optimization available for metric: ${alert.metric}`);
      }
    } catch (error) {
      logger.error('PerformanceBudgetService', 'Automatic optimization failed', error);
    }
  }

  /**
   * Check alert rate limits
   */
  private async checkAlertRateLimits(alert: PerformanceAlert): Promise<void> {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    const recentAlerts = this.getAlerts(alert.serviceName)
      .filter(a => a.timestamp > oneHourAgo);

    const warningCount = recentAlerts.filter(a => a.severity === 'warning').length;
    const criticalCount = recentAlerts.filter(a => a.severity === 'critical').length;

    if (criticalCount > this.config.alertThresholds.maxCriticalAlertsPerHour) {
      logger.error('PerformanceBudgetService', 'Critical alert rate limit exceeded', {
        serviceName: alert.serviceName,
        count: criticalCount,
        limit: this.config.alertThresholds.maxCriticalAlertsPerHour,
      });

      // Could trigger emergency protocols here
    }

    if (warningCount > this.config.alertThresholds.maxWarningsPerHour) {
      logger.warn('PerformanceBudgetService', 'Warning alert rate limit exceeded', {
        serviceName: alert.serviceName,
        count: warningCount,
        limit: this.config.alertThresholds.maxWarningsPerHour,
      });
    }
  }

  /**
   * Emit performance event
   */
  private emitEvent(event: PerformanceEvent): void {
    // This could be connected to external monitoring systems
    logger.info('PerformanceBudgetService', 'Performance event emitted', {
      type: event.type,
      serviceName: event.serviceName,
    });
  }

  /**
   * React component for performance monitoring dashboard
   */
  getPerformanceDashboard(): React.ComponentType<any> {
    return React.memo(() => {
      // This would be a complete React component for monitoring
      // For now, return a placeholder
      return React.createElement('div', {
        children: 'Performance Dashboard - To be implemented'
      });
    });
  }

  /**
   * Export performance data
   */
  exportPerformanceData(serviceName?: string, timeRange?: number): {
    reports: PerformanceReport[];
    alerts: PerformanceAlert[];
    metrics: PerformanceMetrics[];
    exportTimestamp: number;
  } {
    const allBudgets = this.repository.getAllBudgets();
    const services = serviceName ? [serviceName] : Array.from(allBudgets.keys());

    const reports = services.map(service => this.getReport(service, timeRange));
    const alerts = serviceName ? this.getAlerts(serviceName) : this.getAlerts();
    const metrics = services.flatMap(service => this.getMetrics(service));

    return {
      reports,
      alerts,
      metrics,
      exportTimestamp: Date.now(),
    };
  }

  /**
   * Check if service is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get current configuration
   */
  getConfig(): PerformanceBudgetServiceConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<PerformanceBudgetServiceConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('PerformanceBudgetService', 'Configuration updated', newConfig);

    // Update enforcer config if needed
    if (newConfig.reactNativeConfig) {
      this.enforcer.updateConfig(newConfig.reactNativeConfig);
    }
  }
}

// Export singleton instance
export const performanceBudgetService = new PerformanceBudgetService();

// Export for custom instantiation
export default PerformanceBudgetService;