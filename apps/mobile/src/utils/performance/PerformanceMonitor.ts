// ============================================================================
// PERFORMANCE MONITOR
// Main orchestrator for performance monitoring system
// ============================================================================

import { logger } from '../logger';
import { MetricsCollector } from './MetricsCollector';
import { BudgetEnforcer } from './BudgetEnforcer';
import { Reporter } from './Reporter';
import {
  PerformanceMetric,
  PerformanceBudget,
  PerformanceReport,
  ComponentPerformance,
  BudgetEnforcementRule,
} from './types';

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metricsCollector: MetricsCollector;
  private budgetEnforcer: BudgetEnforcer;
  private reporter: Reporter;
  private reportInterval = 30000; // 30 seconds
  private reportTimer?: NodeJS.Timeout;

  private constructor() {
    this.metricsCollector = new MetricsCollector();
    this.budgetEnforcer = new BudgetEnforcer();
    this.reporter = new Reporter();
    this.startPeriodicReporting();
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  // ============================================================================
  // CONFIGURATION
  // ============================================================================

  setEnabled(enabled: boolean): void {
    this.metricsCollector.setEnabled(enabled);
  }

  setEnforcementEnabled(enabled: boolean): void {
    this.budgetEnforcer.setEnforcementEnabled(enabled);
  }

  setBudget(metric: string, budget: number): void {
    this.budgetEnforcer.setBudget(metric, budget);
  }

  getBudget(metric: string): number | undefined {
    return this.budgetEnforcer.getBudget(metric);
  }

  // ============================================================================
  // BUDGET RULES MANAGEMENT
  // ============================================================================

  addBudgetRule(rule: BudgetEnforcementRule): void {
    this.budgetEnforcer.addBudgetRule(rule);
  }

  removeBudgetRule(ruleId: string): boolean {
    return this.budgetEnforcer.removeBudgetRule(ruleId);
  }

  updateBudgetRule(ruleId: string, updates: Partial<BudgetEnforcementRule>): boolean {
    return this.budgetEnforcer.updateBudgetRule(ruleId, updates);
  }

  getBudgetRule(ruleId: string): BudgetEnforcementRule | undefined {
    return this.budgetEnforcer.getBudgetRule(ruleId);
  }

  getAllBudgetRules(): BudgetEnforcementRule[] {
    return this.budgetEnforcer.getAllBudgetRules();
  }

  setBudgetRuleEnabled(ruleId: string, enabled: boolean): boolean {
    return this.budgetEnforcer.setBudgetRuleEnabled(ruleId, enabled);
  }

  // ============================================================================
  // METRIC COLLECTION
  // ============================================================================

  recordMetric(
    name: string,
    value: number,
    category: PerformanceMetric['category'] = 'custom',
    tags?: Record<string, string>
  ): void {
    const threshold = this.budgetEnforcer.getBudget(name);
    const metric = this.metricsCollector.recordMetric(name, value, category, tags, threshold);

    // Enforce budget
    const violation = this.budgetEnforcer.enforceMetric(metric);

    // Log significant violations
    if (violation && violation.severity === 'critical') {
      logger.warn(`Performance violation: ${name}`, {
        data: { expected: violation.threshold, actual: violation.actual, tags },
      });
    }
  }

  // ============================================================================
  // TIMING UTILITIES
  // ============================================================================

  startTimer(name: string, tags?: Record<string, string>): () => void {
    return this.metricsCollector.startTimer(name, tags);
  }

  measureAsync<T>(
    name: string,
    fn: () => Promise<T>,
    category: PerformanceMetric['category'] = 'custom',
    tags?: Record<string, string>
  ): Promise<T> {
    return this.metricsCollector.measureAsync(name, fn, category, tags);
  }

  measureSync<T>(
    name: string,
    fn: () => T,
    category: PerformanceMetric['category'] = 'custom',
    tags?: Record<string, string>
  ): T {
    return this.metricsCollector.measureSync(name, fn, category, tags);
  }

  // ============================================================================
  // COMPONENT PERFORMANCE TRACKING
  // ============================================================================

  trackComponentRender(componentName: string, renderTime: number): void {
    this.metricsCollector.trackComponentRender(componentName, renderTime);
  }

  getComponentMetrics(componentName?: string): ComponentPerformance[] {
    return this.metricsCollector.getComponentMetrics(componentName);
  }

  // ============================================================================
  // MEMORY & NETWORK MONITORING
  // ============================================================================

  recordMemoryUsage(): void {
    this.metricsCollector.recordMemoryUsage();
  }

  trackNetworkRequest(url: string, startTime: number, endTime: number, success: boolean): void {
    this.metricsCollector.trackNetworkRequest(url, startTime, endTime, success);
  }

  // ============================================================================
  // REPORTING & ANALYTICS
  // ============================================================================

  private startPeriodicReporting(): void {
    if (!this.metricsCollector.getEnabled()) return;

    this.reportTimer = setInterval(() => {
      this.generateReport();
    }, this.reportInterval);
  }

  stopPeriodicReporting(): void {
    if (this.reportTimer) {
      clearInterval(this.reportTimer);
      this.reportTimer = undefined;
    }
  }

  generateReport(): PerformanceReport {
    const now = Date.now();
    const recentMetrics = this.metricsCollector.getMetricsInTimeRange(
      now - this.reportInterval,
      now
    );

    const budgets = this.reporter.calculateBudgets(
      recentMetrics,
      this.budgetEnforcer.getAllBudgetRules()
    );
    const violations = this.reporter.calculateViolations(recentMetrics);

    return this.reporter.generateReport(recentMetrics, budgets, violations);
  }

  async getStoredReports(): Promise<PerformanceReport[]> {
    return this.reporter.getStoredReports();
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  clearMetrics(): void {
    this.metricsCollector.clearMetrics();
  }

  getMetrics(category?: PerformanceMetric['category']): PerformanceMetric[] {
    return this.metricsCollector.getMetrics(category);
  }

  getBudgetStatus(): PerformanceBudget[] {
    return this.generateReport().budgets;
  }

  getAdvancedBudgetStatus(): PerformanceBudget[] {
    const now = Date.now();
    const recentMetrics = this.metricsCollector.getMetricsInTimeRange(
      now - this.reportInterval,
      now
    );
    return this.reporter.calculateBudgets(
      recentMetrics,
      this.budgetEnforcer.getAllBudgetRules()
    );
  }

  generateBudgetReport(): string {
    const budgetStatus = this.getAdvancedBudgetStatus();
    return this.reporter.generateBudgetReport(
      budgetStatus,
      this.budgetEnforcer.getAllBudgetRules().length
    );
  }

  // ============================================================================
  // EVENT LISTENERS
  // ============================================================================

  onMetric(listener: (metric: PerformanceMetric) => void): () => void {
    return this.metricsCollector.onMetric(listener);
  }

  onBudgetViolation(listener: (violation: any) => void): () => void {
    return this.budgetEnforcer.onBudgetViolation(listener);
  }

  /**
   * Initialize performance monitoring (stub for compatibility)
   */
  async initialize(): Promise<void> {
    logger.info('PerformanceMonitor', 'Initializing performance monitoring');
    // Implementation would go here
  }

  /**
   * Record multiple metrics (stub for compatibility)
   */
  recordMetrics(serviceName: string, responseTime: number, context?: any): void {
    this.recordMetric(`${serviceName}_response_time`, responseTime, 'custom');
    if (context) {
      logger.info('PerformanceMonitor', `Recorded metrics for ${serviceName}`, context);
    }
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const performanceMonitor = PerformanceMonitor.getInstance();
export default performanceMonitor;
