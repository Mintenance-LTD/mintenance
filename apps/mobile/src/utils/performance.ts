// ============================================================================
// PERFORMANCE MONITORING SYSTEM
// Comprehensive performance tracking and optimization
// ============================================================================

import { InteractionManager, DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from './logger';

// ============================================================================
// PERFORMANCE TYPES
// ============================================================================

export interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  category: 'render' | 'network' | 'storage' | 'navigation' | 'custom';
  threshold?: number;
  tags?: Record<string, string>;
}

export interface PerformanceBudget {
  metric: string;
  budget: number;
  current: number;
  status: 'pass' | 'warn' | 'fail';
  percentage: number;
  target?: number;
  warning?: number;
  critical?: number;
  unit?: string;
  category?: 'performance' | 'resources' | 'quality' | 'user_experience';
  enabled?: boolean;
}

export interface BudgetEnforcementRule {
  id: string;
  name: string;
  metric: string;
  target: number;
  warning: number;
  critical: number;
  unit: string;
  category: 'performance' | 'resources' | 'quality' | 'user_experience';
  enabled: boolean;
  comparison: 'less_than' | 'greater_than' | 'equal_to';
  description?: string;
  enforcement: 'log' | 'warn' | 'error' | 'throw';
}

export interface PerformanceReport {
  timestamp: number;
  metrics: PerformanceMetric[];
  budgets: PerformanceBudget[];
  violations: PerformanceViolation[];
  summary: {
    totalMetrics: number;
    passedBudgets: number;
    failedBudgets: number;
    averageRenderTime: number;
    averageNetworkTime: number;
  };
}

export interface PerformanceViolation {
  metric: string;
  threshold: number;
  actual: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;
  stackTrace?: string;
}

export interface ComponentPerformance {
  componentName: string;
  renderCount: number;
  totalRenderTime: number;
  averageRenderTime: number;
  lastRenderTime: number;
  mountTime: number;
  updateTimes: number[];
}

// ============================================================================
// PERFORMANCE MONITOR CLASS
// ============================================================================

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetric[] = [];
  private budgets: Map<string, number> = new Map();
  private budgetRules: Map<string, BudgetEnforcementRule> = new Map();
  private componentMetrics: Map<string, ComponentPerformance> = new Map();
  private listeners: ((metric: PerformanceMetric) => void)[] = [];
  private budgetViolationListeners: ((violation: PerformanceViolation) => void)[] = [];
  private isEnabled = __DEV__;
  private maxMetrics = 1000; // Prevent memory leaks
  private reportInterval = 30000; // 30 seconds
  private reportTimer?: NodeJS.Timeout;
  private enforcementEnabled = true;
  private violationCooldowns: Map<string, number> = new Map();

  private constructor() {
    this.initializeDefaultBudgets();
    this.initializeAdvancedBudgets();
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

  private initializeDefaultBudgets(): void {
    this.budgets.set('app_start_time', 3000); // 3 seconds
    this.budgets.set('screen_transition_time', 300); // 300ms
    this.budgets.set('component_render_time', 16); // 60fps = 16ms per frame
    this.budgets.set('api_response_time', 2000); // 2 seconds
    this.budgets.set('storage_operation_time', 100); // 100ms
    this.budgets.set('bundle_size', 20 * 1024 * 1024); // 20MB
    this.budgets.set('memory_usage', 150 * 1024 * 1024); // 150MB
    this.budgets.set('js_heap_size', 100 * 1024 * 1024); // 100MB
  }

  setBudget(metric: string, budget: number): void {
    this.budgets.set(metric, budget);
  }

  getBudget(metric: string): number | undefined {
    return this.budgets.get(metric);
  }

  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  setEnforcementEnabled(enabled: boolean): void {
    this.enforcementEnabled = enabled;
  }

  // ============================================================================
  // BUDGET ENFORCEMENT RULES
  // ============================================================================

  addBudgetRule(rule: BudgetEnforcementRule): void {
    this.budgetRules.set(rule.id, rule);
    // Also set the legacy budget for compatibility
    this.budgets.set(rule.metric, rule.critical);

    logger.debug('PerformanceMonitor', 'Budget rule added', {
      id: rule.id,
      metric: rule.metric,
      target: `${rule.target}${rule.unit}`
    });
  }

  removeBudgetRule(ruleId: string): boolean {
    const rule = this.budgetRules.get(ruleId);
    if (rule) {
      this.budgetRules.delete(ruleId);
      // Remove from legacy budgets if it was the only rule for this metric
      const hasOtherRules = Array.from(this.budgetRules.values()).some(r => r.metric === rule.metric);
      if (!hasOtherRules) {
        this.budgets.delete(rule.metric);
      }

      logger.debug('PerformanceMonitor', 'Budget rule removed', { id: ruleId });
      return true;
    }
    return false;
  }

  updateBudgetRule(ruleId: string, updates: Partial<BudgetEnforcementRule>): boolean {
    const rule = this.budgetRules.get(ruleId);
    if (rule) {
      const updatedRule = { ...rule, ...updates };
      this.budgetRules.set(ruleId, updatedRule);

      // Update legacy budget if metric changed
      if (updates.metric && updates.critical) {
        this.budgets.set(updates.metric, updates.critical);
      }

      logger.debug('PerformanceMonitor', 'Budget rule updated', { id: ruleId });
      return true;
    }
    return false;
  }

  getBudgetRule(ruleId: string): BudgetEnforcementRule | undefined {
    return this.budgetRules.get(ruleId);
  }

  getAllBudgetRules(): BudgetEnforcementRule[] {
    return Array.from(this.budgetRules.values());
  }

  setBudgetRuleEnabled(ruleId: string, enabled: boolean): boolean {
    return this.updateBudgetRule(ruleId, { enabled });
  }

  initializeAdvancedBudgets(): void {
    // App Performance Rules
    this.addBudgetRule({
      id: 'app_startup_time_enhanced',
      name: 'App Startup Time',
      metric: 'app_start_time',
      target: 2000,
      warning: 3000,
      critical: 5000,
      unit: 'ms',
      category: 'performance',
      enabled: true,
      comparison: 'less_than',
      description: 'Time from app launch to first interactive screen',
      enforcement: 'warn'
    });

    this.addBudgetRule({
      id: 'memory_usage_enhanced',
      name: 'Memory Usage',
      metric: 'memory_usage',
      target: 100 * 1024 * 1024, // 100MB
      warning: 150 * 1024 * 1024, // 150MB
      critical: 300 * 1024 * 1024, // 300MB
      unit: 'bytes',
      category: 'resources',
      enabled: true,
      comparison: 'less_than',
      description: 'JavaScript heap memory usage',
      enforcement: 'error'
    });

    this.addBudgetRule({
      id: 'api_response_time_enhanced',
      name: 'API Response Time',
      metric: 'api_response_time',
      target: 1000,
      warning: 2000,
      critical: 5000,
      unit: 'ms',
      category: 'performance',
      enabled: true,
      comparison: 'less_than',
      description: 'Average API request response time',
      enforcement: 'warn'
    });

    this.addBudgetRule({
      id: 'component_render_time_enhanced',
      name: 'Component Render Time',
      metric: 'component_render_time',
      target: 8, // 120fps target
      warning: 16, // 60fps
      critical: 33, // 30fps
      unit: 'ms',
      category: 'user_experience',
      enabled: true,
      comparison: 'less_than',
      description: 'Component render duration for smooth UI',
      enforcement: 'warn'
    });

    this.addBudgetRule({
      id: 'frame_rate_enhanced',
      name: 'Frame Rate (FPS)',
      metric: 'fps',
      target: 60,
      warning: 55,
      critical: 30,
      unit: 'fps',
      category: 'user_experience',
      enabled: true,
      comparison: 'greater_than',
      description: 'Frames per second for smooth animations',
      enforcement: 'warn'
    });
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
    if (!this.isEnabled) return;

    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      category,
      threshold: this.budgets.get(name),
      tags,
    };

    this.metrics.push(metric);
    this.notifyListeners(metric);

    // Enhanced budget enforcement
    if (this.enforcementEnabled) {
      this.enforceAdvancedBudgets(metric);
    }

    // Legacy violation check for backward compatibility
    if (metric.threshold && value > metric.threshold) {
      this.recordViolation(metric);
    }

    // Prevent memory leaks
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics / 2);
    }

    // Log significant violations
    if (metric.threshold && value > metric.threshold * 2) {
      logger.warn(`Performance violation: ${name}`, {
        data: { expected: metric.threshold, actual: value, tags },
      });
    }
  }

  private enforceAdvancedBudgets(metric: PerformanceMetric): void {
    const relevantRules = Array.from(this.budgetRules.values())
      .filter(rule => rule.enabled && rule.metric === metric.name);

    for (const rule of relevantRules) {
      this.checkRuleViolation(rule, metric);
    }
  }

  private checkRuleViolation(rule: BudgetEnforcementRule, metric: PerformanceMetric): void {
    const violation = this.evaluateRuleCondition(rule, metric.value);
    if (!violation) return;

    // Check cooldown to prevent spam
    const cooldownKey = `${rule.id}_${violation.severity}`;
    const lastViolationTime = this.violationCooldowns.get(cooldownKey) || 0;
    const cooldownPeriod = violation.severity === 'critical' ? 30000 : 60000; // 30s for critical, 60s for others

    if (Date.now() - lastViolationTime < cooldownPeriod) {
      return;
    }

    this.violationCooldowns.set(cooldownKey, Date.now());

    // Record the violation
    this.recordAdvancedViolation(rule, violation, metric);

    // Enforce according to rule settings
    this.enforceViolation(rule, violation, metric);
  }

  private evaluateRuleCondition(rule: BudgetEnforcementRule, value: number): { severity: PerformanceViolation['severity'] } | null {
    let isViolation = false;
    let severity: PerformanceViolation['severity'] = 'low';

    switch (rule.comparison) {
      case 'less_than':
        if (value >= rule.critical) {
          isViolation = true;
          severity = 'critical';
        } else if (value >= rule.warning) {
          isViolation = true;
          severity = 'medium';
        } else if (value > rule.target) {
          isViolation = true;
          severity = 'low';
        }
        break;
      case 'greater_than':
        if (value <= rule.critical) {
          isViolation = true;
          severity = 'critical';
        } else if (value <= rule.warning) {
          isViolation = true;
          severity = 'medium';
        } else if (value < rule.target) {
          isViolation = true;
          severity = 'low';
        }
        break;
      case 'equal_to':
        const targetDiff = Math.abs(value - rule.target);
        const warningDiff = Math.abs(rule.warning - rule.target);
        const criticalDiff = Math.abs(rule.critical - rule.target);

        if (targetDiff >= criticalDiff) {
          isViolation = true;
          severity = 'critical';
        } else if (targetDiff >= warningDiff) {
          isViolation = true;
          severity = 'medium';
        } else if (targetDiff > 0) {
          isViolation = true;
          severity = 'low';
        }
        break;
    }

    return isViolation ? { severity } : null;
  }

  private recordAdvancedViolation(rule: BudgetEnforcementRule, violation: { severity: PerformanceViolation['severity'] }, metric: PerformanceMetric): void {
    const advancedViolation: PerformanceViolation = {
      metric: rule.metric,
      threshold: this.getThresholdForSeverity(rule, violation.severity),
      actual: metric.value,
      severity: violation.severity,
      timestamp: metric.timestamp,
      stackTrace: new Error().stack,
    };

    // Notify violation listeners
    this.budgetViolationListeners.forEach(listener => {
      try {
        listener(advancedViolation);
      } catch (error) {
        logger.warn('Budget violation listener error', { data: error });
      }
    });

    DeviceEventEmitter.emit('performance_budget_violation', advancedViolation);
  }

  private getThresholdForSeverity(rule: BudgetEnforcementRule, severity: PerformanceViolation['severity']): number {
    switch (severity) {
      case 'critical': return rule.critical;
      case 'high':
      case 'medium': return rule.warning;
      case 'low': return rule.target;
      default: return rule.target;
    }
  }

  private enforceViolation(rule: BudgetEnforcementRule, violation: { severity: PerformanceViolation['severity'] }, metric: PerformanceMetric): void {
    const message = `Performance budget violation: ${rule.name} (${metric.value}${rule.unit} > ${this.getThresholdForSeverity(rule, violation.severity)}${rule.unit})`;

    switch (rule.enforcement) {
      case 'log':
        logger.debug(message, {
          rule: rule.id,
          metric: metric.name,
          value: metric.value,
          severity: violation.severity
        });
        break;
      case 'warn':
        logger.warn(message, {
          rule: rule.id,
          metric: metric.name,
          value: metric.value,
          severity: violation.severity
        });
        break;
      case 'error':
        logger.error(message, undefined, {
          rule: rule.id,
          metric: metric.name,
          value: metric.value,
          severity: violation.severity
        });
        break;
      case 'throw':
        if (violation.severity === 'critical') {
          throw new Error(message);
        } else {
          logger.error(message, undefined, {
            rule: rule.id,
            metric: metric.name,
            value: metric.value,
            severity: violation.severity
          });
        }
        break;
    }
  }

  private recordViolation(metric: PerformanceMetric): void {
    const severity = this.calculateSeverity(metric);
    const violation: PerformanceViolation = {
      metric: metric.name,
      threshold: metric.threshold!,
      actual: metric.value,
      severity,
      timestamp: metric.timestamp,
      stackTrace: new Error().stack,
    };

    DeviceEventEmitter.emit('performance_violation', violation);
  }

  private calculateSeverity(metric: PerformanceMetric): PerformanceViolation['severity'] {
    const threshold = metric.threshold!;
    const actual = metric.value;
    const ratio = actual / threshold;

    if (ratio >= 3) return 'critical';
    if (ratio >= 2) return 'high';
    if (ratio >= 1.5) return 'medium';
    return 'low';
  }

  // ============================================================================
  // TIMING UTILITIES
  // ============================================================================

  startTimer(name: string, tags?: Record<string, string>): () => void {
    const startTime = performance.now();

    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      this.recordMetric(name, duration, 'custom', tags);
    };
  }

  measureAsync<T>(
    name: string,
    fn: () => Promise<T>,
    category: PerformanceMetric['category'] = 'custom',
    tags?: Record<string, string>
  ): Promise<T> {
    const startTime = performance.now();

    return fn().then(
      (result) => {
        const duration = performance.now() - startTime;
        this.recordMetric(name, duration, category, { ...tags, status: 'success' });
        return result;
      },
      (error) => {
        const duration = performance.now() - startTime;
        this.recordMetric(name, duration, category, { ...tags, status: 'error' });
        throw error;
      }
    );
  }

  measureSync<T>(
    name: string,
    fn: () => T,
    category: PerformanceMetric['category'] = 'custom',
    tags?: Record<string, string>
  ): T {
    const startTime = performance.now();
    try {
      const result = fn();
      const duration = performance.now() - startTime;
      this.recordMetric(name, duration, category, { ...tags, status: 'success' });
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      this.recordMetric(name, duration, category, { ...tags, status: 'error' });
      throw error;
    }
  }

  // ============================================================================
  // COMPONENT PERFORMANCE TRACKING
  // ============================================================================

  trackComponentRender(componentName: string, renderTime: number): void {
    if (!this.isEnabled) return;

    let component = this.componentMetrics.get(componentName);
    if (!component) {
      component = {
        componentName,
        renderCount: 0,
        totalRenderTime: 0,
        averageRenderTime: 0,
        lastRenderTime: 0,
        mountTime: Date.now(),
        updateTimes: [],
      };
      this.componentMetrics.set(componentName, component);
    }

    component.renderCount++;
    component.totalRenderTime += renderTime;
    component.averageRenderTime = component.totalRenderTime / component.renderCount;
    component.lastRenderTime = renderTime;
    component.updateTimes.push(renderTime);

    // Keep only last 10 render times
    if (component.updateTimes.length > 10) {
      component.updateTimes = component.updateTimes.slice(-10);
    }

    this.recordMetric(
      'component_render_time',
      renderTime,
      'render',
      { component: componentName }
    );
  }

  getComponentMetrics(componentName?: string): ComponentPerformance[] {
    if (componentName) {
      const component = this.componentMetrics.get(componentName);
      return component ? [component] : [];
    }
    return Array.from(this.componentMetrics.values());
  }

  // ============================================================================
  // MEMORY MONITORING
  // ============================================================================

  recordMemoryUsage(): void {
    if (!this.isEnabled || !(global.performance as any)?.memory) return;

    const memory = (global.performance as any).memory;

    this.recordMetric('js_heap_size_used', memory.usedJSHeapSize, 'custom');
    this.recordMetric('js_heap_size_total', memory.totalJSHeapSize, 'custom');
    this.recordMetric('js_heap_size_limit', memory.jsHeapSizeLimit, 'custom');
  }

  // ============================================================================
  // NETWORK PERFORMANCE
  // ============================================================================

  trackNetworkRequest(url: string, startTime: number, endTime: number, success: boolean): void {
    const duration = endTime - startTime;
    this.recordMetric(
      'api_response_time',
      duration,
      'network',
      {
        url: this.sanitizeUrl(url),
        success: success.toString(),
      }
    );
  }

  private sanitizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      return `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;
    } catch {
      return 'invalid_url';
    }
  }

  // ============================================================================
  // REPORTING & ANALYTICS
  // ============================================================================

  private startPeriodicReporting(): void {
    if (!this.isEnabled) return;

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
    const recentMetrics = this.metrics.filter(m => now - m.timestamp < this.reportInterval);

    const budgets = Array.from(this.budgets.entries()).map(([metric, budget]) => {
      const recentValues = recentMetrics
        .filter(m => m.name === metric)
        .map(m => m.value);

      const current = recentValues.length > 0
        ? Math.max(...recentValues)
        : 0;

      const percentage = (current / budget) * 100;

      return {
        metric,
        budget,
        current,
        percentage,
        status: (percentage > 100 ? 'fail' : percentage > 80 ? 'warn' : 'pass') as PerformanceBudget['status'],
      };
    });

    const violations = recentMetrics
      .filter(m => m.threshold && m.value > m.threshold)
      .map(m => ({
        metric: m.name,
        threshold: m.threshold!,
        actual: m.value,
        severity: this.calculateSeverity(m),
        timestamp: m.timestamp,
      }));

    const renderMetrics = recentMetrics.filter(m => m.category === 'render');
    const networkMetrics = recentMetrics.filter(m => m.category === 'network');

    const report: PerformanceReport = {
      timestamp: now,
      metrics: recentMetrics,
      budgets,
      violations,
      summary: {
        totalMetrics: recentMetrics.length,
        passedBudgets: budgets.filter(b => b.status === 'pass').length,
        failedBudgets: budgets.filter(b => b.status === 'fail').length,
        averageRenderTime: renderMetrics.length > 0
          ? renderMetrics.reduce((sum, m) => sum + m.value, 0) / renderMetrics.length
          : 0,
        averageNetworkTime: networkMetrics.length > 0
          ? networkMetrics.reduce((sum, m) => sum + m.value, 0) / networkMetrics.length
          : 0,
      },
    };

    // Store report for analytics
    this.storeReport(report);

    return report;
  }

  private async storeReport(report: PerformanceReport): Promise<void> {
    try {
      const key = `perf_report_${report.timestamp}`;
      await AsyncStorage.setItem(key, JSON.stringify(report));

      // Clean old reports (keep last 10)
      const keys = await AsyncStorage.getAllKeys();
      const reportKeys = keys
        .filter(k => k.startsWith('perf_report_'))
        .sort()
        .reverse();

      if (reportKeys.length > 10) {
        const oldKeys = reportKeys.slice(10);
        await AsyncStorage.multiRemove(oldKeys);
      }
    } catch (error) {
      logger.warn('Failed to store performance report', { data: error });
    }
  }

  async getStoredReports(): Promise<PerformanceReport[]> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const reportKeys = keys.filter(k => k.startsWith('perf_report_'));
      const reports = await AsyncStorage.multiGet(reportKeys);

      return reports
        .map(([, value]) => value ? JSON.parse(value) : null)
        .filter(Boolean)
        .sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      logger.warn('Failed to retrieve performance reports', { data: error });
      return [];
    }
  }

  // ============================================================================
  // EVENT LISTENERS
  // ============================================================================

  onMetric(listener: (metric: PerformanceMetric) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  onBudgetViolation(listener: (violation: PerformanceViolation) => void): () => void {
    this.budgetViolationListeners.push(listener);
    return () => {
      this.budgetViolationListeners = this.budgetViolationListeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(metric: PerformanceMetric): void {
    this.listeners.forEach(listener => {
      try {
        listener(metric);
      } catch (error) {
        logger.warn('Performance listener error', { data: error });
      }
    });
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  clearMetrics(): void {
    this.metrics = [];
    this.componentMetrics.clear();
  }

  getMetrics(category?: PerformanceMetric['category']): PerformanceMetric[] {
    if (category) {
      return this.metrics.filter(m => m.category === category);
    }
    return [...this.metrics];
  }

  getBudgetStatus(): PerformanceBudget[] {
    return this.generateReport().budgets;
  }

  getAdvancedBudgetStatus(): PerformanceBudget[] {
    const now = Date.now();
    const recentMetrics = this.metrics.filter(m => now - m.timestamp < this.reportInterval);

    return Array.from(this.budgetRules.values())
      .filter(rule => rule.enabled)
      .map(rule => {
        const relevantMetrics = recentMetrics
          .filter(m => m.name === rule.metric)
          .map(m => m.value);

        const current = relevantMetrics.length > 0
          ? (rule.comparison === 'greater_than' ? Math.min(...relevantMetrics) : Math.max(...relevantMetrics))
          : 0;

        let status: PerformanceBudget['status'] = 'pass';
        let percentage = 0;

        switch (rule.comparison) {
          case 'less_than':
            percentage = (current / rule.target) * 100;
            if (current >= rule.critical) status = 'fail';
            else if (current >= rule.warning) status = 'warn';
            break;
          case 'greater_than':
            percentage = (rule.target / Math.max(current, 1)) * 100;
            if (current <= rule.critical) status = 'fail';
            else if (current <= rule.warning) status = 'warn';
            break;
          case 'equal_to':
            const diff = Math.abs(current - rule.target);
            percentage = 100 - (diff / rule.target) * 100;
            if (diff >= Math.abs(rule.critical - rule.target)) status = 'fail';
            else if (diff >= Math.abs(rule.warning - rule.target)) status = 'warn';
            break;
        }

        return {
          metric: rule.metric,
          budget: rule.target,
          current,
          status,
          percentage,
          target: rule.target,
          warning: rule.warning,
          critical: rule.critical,
          unit: rule.unit,
          category: rule.category,
          enabled: rule.enabled
        };
      });
  }

  generateBudgetReport(): string {
    const budgetStatus = this.getAdvancedBudgetStatus();
    const violations = this.metrics
      .filter(m => Date.now() - m.timestamp < this.reportInterval)
      .map(m => Array.from(this.budgetRules.values())
        .filter(rule => rule.enabled && rule.metric === m.name)
        .map(rule => this.evaluateRuleCondition(rule, m.value))
        .filter(Boolean))
      .flat();

    let report = '# 📊 Performance Budget Report\n\n';
    report += `**Generated:** ${new Date().toLocaleString()}\n`;
    report += `**Rules:** ${this.budgetRules.size} total, ${budgetStatus.length} enabled\n\n`;

    // Summary
    const passed = budgetStatus.filter(b => b.status === 'pass').length;
    const warned = budgetStatus.filter(b => b.status === 'warn').length;
    const failed = budgetStatus.filter(b => b.status === 'fail').length;

    report += `## Summary\n`;
    report += `- ✅ **Passed:** ${passed}\n`;
    report += `- ⚠️ **Warnings:** ${warned}\n`;
    report += `- ❌ **Failed:** ${failed}\n\n`;

    // Budget Status by Category
    const categories = ['performance', 'resources', 'quality', 'user_experience'] as const;
    categories.forEach(category => {
      const categoryBudgets = budgetStatus.filter(b => b.category === category);
      if (categoryBudgets.length === 0) return;

      report += `## ${category.charAt(0).toUpperCase() + category.slice(1).replace('_', ' ')}\n\n`;
      categoryBudgets.forEach(budget => {
        const emoji = budget.status === 'pass' ? '✅' : budget.status === 'warn' ? '⚠️' : '❌';
        const value = this.formatValue(budget.current, budget.unit || '');
        const target = this.formatValue(budget.target || budget.budget, budget.unit || '');

        report += `${emoji} **${budget.metric}**: ${value} / ${target} (${budget.percentage.toFixed(1)}%)\n`;
      });
      report += '\n';
    });

    return report;
  }

  private formatValue(value: number, unit: string): string {
    switch (unit) {
      case 'bytes':
        if (value > 1024 * 1024 * 1024) return `${(value / (1024 * 1024 * 1024)).toFixed(2)}GB`;
        if (value > 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(2)}MB`;
        if (value > 1024) return `${(value / 1024).toFixed(2)}KB`;
        return `${value}B`;
      case 'ms':
        if (value > 1000) return `${(value / 1000).toFixed(2)}s`;
        return `${value}ms`;
      default:
        return `${value}${unit}`;
    }
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
    this.recordMetric(`${serviceName}_response_time`, responseTime, 'api');
    if (context) {
      logger.info('PerformanceMonitor', `Recorded metrics for ${serviceName}`, context);
    }
  }
}

// ============================================================================
// PERFORMANCE HOOKS & UTILITIES
// ============================================================================

export const performanceMonitor = PerformanceMonitor.getInstance();

// Decorator for measuring function performance
export function measurePerformance(
  name?: string,
  category: PerformanceMetric['category'] = 'custom'
) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const methodName = name || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = function (...args: any[]) {
      return performanceMonitor.measureSync(
        methodName,
        () => originalMethod.apply(this, args),
        category
      );
    };

    return descriptor;
  };
}

// React hook for performance monitoring
export const usePerformanceMonitoring = () => {
  return {
    recordMetric: performanceMonitor.recordMetric.bind(performanceMonitor),
    startTimer: performanceMonitor.startTimer.bind(performanceMonitor),
    measureAsync: performanceMonitor.measureAsync.bind(performanceMonitor),
    measureSync: performanceMonitor.measureSync.bind(performanceMonitor),
    trackComponentRender: performanceMonitor.trackComponentRender.bind(performanceMonitor),
    recordMemoryUsage: performanceMonitor.recordMemoryUsage.bind(performanceMonitor),
    generateReport: performanceMonitor.generateReport.bind(performanceMonitor),
    getBudgetStatus: performanceMonitor.getBudgetStatus.bind(performanceMonitor),
    getAdvancedBudgetStatus: performanceMonitor.getAdvancedBudgetStatus.bind(performanceMonitor),
    generateBudgetReport: performanceMonitor.generateBudgetReport.bind(performanceMonitor),
    addBudgetRule: performanceMonitor.addBudgetRule.bind(performanceMonitor),
    removeBudgetRule: performanceMonitor.removeBudgetRule.bind(performanceMonitor),
    updateBudgetRule: performanceMonitor.updateBudgetRule.bind(performanceMonitor),
    setBudgetRuleEnabled: performanceMonitor.setBudgetRuleEnabled.bind(performanceMonitor),
    getAllBudgetRules: performanceMonitor.getAllBudgetRules.bind(performanceMonitor),
    setEnforcementEnabled: performanceMonitor.setEnforcementEnabled.bind(performanceMonitor),
    onMetric: performanceMonitor.onMetric.bind(performanceMonitor),
    onBudgetViolation: performanceMonitor.onBudgetViolation.bind(performanceMonitor),
  };
};

export default performanceMonitor;