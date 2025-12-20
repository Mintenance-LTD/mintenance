import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { performanceMonitor } from '../utils/performance';
import type { PerformanceBudget, PerformanceReport } from '../utils/performance/types';
import { logger } from '../utils/logger';

export const PerformanceDashboardScreen: React.FC = () => {
  const [report, setReport] = useState<PerformanceReport | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'violations'>('all');

  useEffect(() => {
    loadReport();
  }, []);

  const loadReport = async () => {
    try {
      const latestReport = performanceMonitor.generateReport();
      setReport(latestReport);
      logger.debug('Performance report loaded', {
        metricsCount: latestReport.metrics.length,
        budgetsCount: latestReport.budgets.length,
      });
    } catch (error) {
      logger.error('Failed to load performance report', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadReport();
    setRefreshing(false);
  };

  const getBudgetStatusColor = (budget: PerformanceBudget): string => {
    if (budget.status === 'pass') return '#10b981'; // green
    if (budget.status === 'warning') return '#f59e0b'; // orange
    return '#ef4444'; // red
  };

  const getBudgetStatusIcon = (budget: PerformanceBudget): string => {
    if (budget.status === 'pass') return '✓';
    if (budget.status === 'warning') return '⚠';
    return '✕';
  };

  const formatValue = (value: number, metric: string): string => {
    if (metric.includes('time') || metric.includes('duration')) {
      return `${Math.round(value)}ms`;
    }
    if (metric.includes('memory') || metric.includes('size')) {
      return `${(value / 1024 / 1024).toFixed(2)}MB`;
    }
    if (metric.includes('fps')) {
      return `${Math.round(value)} FPS`;
    }
    return value.toFixed(2);
  };

  if (!report) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading performance data...</Text>
      </View>
    );
  }

  const filteredBudgets =
    selectedCategory === 'violations'
      ? report.budgets.filter(b => b.status !== 'pass')
      : report.budgets;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Performance Dashboard</Text>
        <Text style={styles.subtitle}>
          {report.metrics.length} metrics tracked
        </Text>
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{report.budgets.length}</Text>
          <Text style={styles.summaryLabel}>Total Budgets</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text
            style={[
              styles.summaryValue,
              { color: report.violations.length > 0 ? '#ef4444' : '#10b981' },
            ]}
          >
            {report.violations.length}
          </Text>
          <Text style={styles.summaryLabel}>Violations</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text
            style={[
              styles.summaryValue,
              {
                color:
                  report.summary.healthScore > 80
                    ? '#10b981'
                    : report.summary.healthScore > 60
                      ? '#f59e0b'
                      : '#ef4444',
              },
            ]}
          >
            {Math.round(report.summary.healthScore)}
          </Text>
          <Text style={styles.summaryLabel}>Health Score</Text>
        </View>
      </View>

      {/* Category Filter */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[
            styles.filterButton,
            selectedCategory === 'all' && styles.filterButtonActive,
          ]}
          onPress={() => setSelectedCategory('all')}
        >
          <Text
            style={[
              styles.filterText,
              selectedCategory === 'all' && styles.filterTextActive,
            ]}
          >
            All Budgets
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterButton,
            selectedCategory === 'violations' && styles.filterButtonActive,
          ]}
          onPress={() => setSelectedCategory('violations')}
        >
          <Text
            style={[
              styles.filterText,
              selectedCategory === 'violations' && styles.filterTextActive,
            ]}
          >
            Violations Only
          </Text>
        </TouchableOpacity>
      </View>

      {/* Budget Status List */}
      <View style={styles.budgetsContainer}>
        <Text style={styles.sectionTitle}>Performance Budgets</Text>

        {filteredBudgets.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              {selectedCategory === 'violations'
                ? '🎉 No violations found!'
                : 'No budgets configured'}
            </Text>
          </View>
        ) : (
          filteredBudgets.map((budget, index) => (
            <View key={index} style={styles.budgetCard}>
              <View style={styles.budgetHeader}>
                <View style={styles.budgetInfo}>
                  <Text style={styles.budgetName}>{budget.metric}</Text>
                  <Text style={styles.budgetCategory}>{budget.category}</Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getBudgetStatusColor(budget) },
                  ]}
                >
                  <Text style={styles.statusIcon}>
                    {getBudgetStatusIcon(budget)}
                  </Text>
                </View>
              </View>

              <View style={styles.budgetDetails}>
                <View style={styles.budgetRow}>
                  <Text style={styles.budgetLabel}>Current:</Text>
                  <Text
                    style={[
                      styles.budgetValue,
                      budget.status !== 'pass' && { color: '#ef4444' },
                    ]}
                  >
                    {formatValue(budget.current, budget.metric)}
                  </Text>
                </View>

                <View style={styles.budgetRow}>
                  <Text style={styles.budgetLabel}>Budget:</Text>
                  <Text style={styles.budgetValue}>
                    {formatValue(budget.budget, budget.metric)}
                  </Text>
                </View>

                <View style={styles.budgetRow}>
                  <Text style={styles.budgetLabel}>Usage:</Text>
                  <Text
                    style={[
                      styles.budgetValue,
                      budget.percentage > 100 && { color: '#ef4444' },
                    ]}
                  >
                    {Math.round(budget.percentage)}%
                  </Text>
                </View>
              </View>

              {/* Progress Bar */}
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.min(budget.percentage, 100)}%`,
                      backgroundColor: getBudgetStatusColor(budget),
                    },
                  ]}
                />
              </View>
            </View>
          ))
        )}
      </View>

      {/* Recent Violations */}
      {report.violations.length > 0 && (
        <View style={styles.violationsContainer}>
          <Text style={styles.sectionTitle}>Recent Violations</Text>

          {report.violations.slice(0, 5).map((violation, index) => (
            <View key={index} style={styles.violationCard}>
              <View style={styles.violationHeader}>
                <Text style={styles.violationMetric}>{violation.metric}</Text>
                <View
                  style={[
                    styles.severityBadge,
                    {
                      backgroundColor:
                        violation.severity === 'critical'
                          ? '#ef4444'
                          : '#f59e0b',
                    },
                  ]}
                >
                  <Text style={styles.severityText}>
                    {violation.severity.toUpperCase()}
                  </Text>
                </View>
              </View>

              <Text style={styles.violationTime}>
                {new Date(violation.timestamp).toLocaleString()}
              </Text>

              <View style={styles.violationDetails}>
                <Text style={styles.violationLabel}>
                  Expected: {formatValue(violation.threshold, violation.metric)}
                </Text>
                <Text style={styles.violationLabel}>
                  Actual: {formatValue(violation.actual, violation.metric)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Performance Summary */}
      <View style={styles.summaryTextContainer}>
        <Text style={styles.sectionTitle}>Summary</Text>
        <Text style={styles.summaryDescription}>
          {report.summary.totalMetrics} metrics collected across{' '}
          {report.summary.categories.length} categories. Average response time:{' '}
          {Math.round(report.summary.averageResponseTime)}ms
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 50,
  },
  header: {
    padding: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  summaryContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#3b82f6',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  filterTextActive: {
    color: '#ffffff',
  },
  budgetsContainer: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
  },
  budgetCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  budgetInfo: {
    flex: 1,
  },
  budgetName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  budgetCategory: {
    fontSize: 12,
    color: '#6b7280',
    textTransform: 'capitalize',
  },
  statusBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusIcon: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  budgetDetails: {
    gap: 8,
    marginBottom: 12,
  },
  budgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  budgetLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  budgetValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  violationsContainer: {
    padding: 16,
  },
  violationCard: {
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  violationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  violationMetric: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  severityText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  violationTime: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
  },
  violationDetails: {
    gap: 4,
  },
  violationLabel: {
    fontSize: 13,
    color: '#374151',
  },
  summaryTextContainer: {
    padding: 16,
  },
  summaryDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
});
