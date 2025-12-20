// ============================================================================
// PERFORMANCE REPORTER
// Report generation and analytics storage
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../logger';
import {
  PerformanceMetric,
  PerformanceBudget,
  PerformanceReport,
  PerformanceViolation,
  BudgetEnforcementRule,
} from './types';

export class Reporter {
  private reportInterval = 30000; // 30 seconds

  generateReport(
    metrics: PerformanceMetric[],
    budgets: PerformanceBudget[],
    violations: PerformanceViolation[]
  ): PerformanceReport {
    const now = Date.now();
    const renderMetrics = metrics.filter(m => m.category === 'render');
    const networkMetrics = metrics.filter(m => m.category === 'network');

    const report: PerformanceReport = {
      timestamp: now,
      metrics,
      budgets,
      violations,
      summary: {
        totalMetrics: metrics.length,
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

  generateBudgetReport(budgetStatus: PerformanceBudget[], totalRules: number): string {
    let report = '# =Ê Performance Budget Report\n\n';
    report += `**Generated:** ${new Date().toLocaleString()}\n`;
    report += `**Rules:** ${totalRules} total, ${budgetStatus.length} enabled\n\n`;

    // Summary
    const passed = budgetStatus.filter(b => b.status === 'pass').length;
    const warned = budgetStatus.filter(b => b.status === 'warn').length;
    const failed = budgetStatus.filter(b => b.status === 'fail').length;

    report += `## Summary\n`;
    report += `-  **Passed:** ${passed}\n`;
    report += `-   **Warnings:** ${warned}\n`;
    report += `- L **Failed:** ${failed}\n\n`;

    // Budget Status by Category
    const categories = ['performance', 'resources', 'quality', 'user_experience'] as const;
    categories.forEach(category => {
      const categoryBudgets = budgetStatus.filter(b => b.category === category);
      if (categoryBudgets.length === 0) return;

      report += `## ${category.charAt(0).toUpperCase() + category.slice(1).replace('_', ' ')}\n\n`;
      categoryBudgets.forEach(budget => {
        const emoji = budget.status === 'pass' ? '' : budget.status === 'warn' ? ' ' : 'L';
        const value = this.formatValue(budget.current, budget.unit || '');
        const target = this.formatValue(budget.target || budget.budget, budget.unit || '');

        report += `${emoji} **${budget.metric}**: ${value} / ${target} (${budget.percentage.toFixed(1)}%)\n`;
      });
      report += '\n';
    });

    return report;
  }

  formatValue(value: number, unit: string): string {
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

  async storeReport(report: PerformanceReport): Promise<void> {
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

  calculateBudgets(
    recentMetrics: PerformanceMetric[],
    budgetRules: BudgetEnforcementRule[]
  ): PerformanceBudget[] {
    return budgetRules
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

  calculateViolations(recentMetrics: PerformanceMetric[]): PerformanceViolation[] {
    return recentMetrics
      .filter(m => m.threshold && m.value > m.threshold)
      .map(m => ({
        metric: m.name,
        threshold: m.threshold!,
        actual: m.value,
        severity: this.calculateSeverity(m),
        timestamp: m.timestamp,
      }));
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
}
