import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme';
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
        metricsCount: latestReport.metrics?.length ?? 0,
        budgetsCount: latestReport.budgets?.length ?? 0,
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
    if (budget.status === 'pass') return theme.colors.primary; // green
    if (budget.status === 'warn') return theme.colors.warning; // orange
    return theme.colors.error; // red
  };

  const getBudgetStatusIcon = (budget: PerformanceBudget): string => {
    if (budget.status === 'pass') return '✓';
    if (budget.status === 'warn') return '⚠';
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

  const budgets = report.budgets ?? [];
  const violations = report.violations ?? [];
  const metrics = report.metrics ?? [];
  const healthScore = budgets.length > 0
    ? Math.round((budgets.filter(b => b.status === 'pass').length / budgets.length) * 100)
    : 100;

  const filteredBudgets =
    selectedCategory === 'violations'
      ? budgets.filter(b => b.status !== 'pass')
      : budgets;

  return (
    <SafeAreaView style={styles.container}>
    <ScrollView
      style={{ flex: 1 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole='header'>Performance Dashboard</Text>
        <Text style={styles.subtitle}>
          {metrics.length} metrics tracked
        </Text>
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard} accessibilityLabel={`${budgets.length} total budgets`}>
          <Text style={styles.summaryValue}>{budgets.length}</Text>
          <Text style={styles.summaryLabel}>Total Budgets</Text>
        </View>

        <View style={styles.summaryCard} accessibilityLabel={`${violations.length} violations`}>
          <Text
            style={[
              styles.summaryValue,
              { color: violations.length > 0 ? theme.colors.error : theme.colors.primary },
            ]}
          >
            {violations.length}
          </Text>
          <Text style={styles.summaryLabel}>Violations</Text>
        </View>

        <View style={styles.summaryCard} accessibilityLabel={`Health score: ${healthScore}`}>
          <Text
            style={[
              styles.summaryValue,
              {
                color:
                  healthScore > 80
                    ? theme.colors.primary
                    : healthScore > 60
                      ? theme.colors.warning
                      : theme.colors.error,
              },
            ]}
          >
            {healthScore}
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
          accessibilityRole='button'
          accessibilityLabel='Show all budgets'
          accessibilityState={{ selected: selectedCategory === 'all' }}
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
          accessibilityRole='button'
          accessibilityLabel='Show violations only'
          accessibilityState={{ selected: selectedCategory === 'violations' }}
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
        <Text style={styles.sectionTitle} accessibilityRole='header'>Performance Budgets</Text>

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
                      budget.status !== 'pass' && { color: theme.colors.error },
                    ]}
                  >
                    {formatValue(budget.current ?? 0, budget.metric ?? '')}
                  </Text>
                </View>

                <View style={styles.budgetRow}>
                  <Text style={styles.budgetLabel}>Budget:</Text>
                  <Text style={styles.budgetValue}>
                    {formatValue(budget.budget ?? 0, budget.metric ?? '')}
                  </Text>
                </View>

                <View style={styles.budgetRow}>
                  <Text style={styles.budgetLabel}>Usage:</Text>
                  <Text
                    style={[
                      styles.budgetValue,
                      (budget.percentage ?? 0) > 100 && { color: theme.colors.error },
                    ]}
                  >
                    {Math.round(budget.percentage ?? 0)}%
                  </Text>
                </View>
              </View>

              {/* Progress Bar */}
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.min(budget.percentage ?? 0, 100)}%`,
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
      {violations.length > 0 && (
        <View style={styles.violationsContainer}>
          <Text style={styles.sectionTitle} accessibilityRole='header'>Recent Violations</Text>

          {violations.slice(0, 5).map((violation, index) => (
            <View key={index} style={styles.violationCard}>
              <View style={styles.violationHeader}>
                <Text style={styles.violationMetric}>{violation.metric}</Text>
                <View
                  style={[
                    styles.severityBadge,
                    {
                      backgroundColor:
                        violation.severity === 'critical'
                          ? theme.colors.error
                          : theme.colors.warning,
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
          {report.summary.totalMetrics} metrics collected.
          Average response time:{' '}
          {Math.round(report.summary.averageResponseTime ?? 0)}ms
        </Text>
      </View>
    </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  loadingText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 50,
  },
  header: {
    padding: 20,
    backgroundColor: theme.colors.surface,
  },
  title: {
    fontSize: 24,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  summaryContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: theme.colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
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
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: theme.colors.info,
  },
  filterText: {
    fontSize: 14,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textSecondary,
  },
  filterTextActive: {
    color: theme.colors.white,
  },
  budgetsContainer: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: 12,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  budgetCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: theme.colors.black,
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
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  budgetCategory: {
    fontSize: 12,
    color: theme.colors.textSecondary,
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
    color: theme.colors.white,
    fontWeight: theme.typography.fontWeight.bold,
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
    color: theme.colors.textSecondary,
  },
  budgetValue: {
    fontSize: 14,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  progressBar: {
    height: 6,
    backgroundColor: theme.colors.border,
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
    backgroundColor: theme.colors.accentLight,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.error,
  },
  violationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  violationMetric: {
    fontSize: 16,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    flex: 1,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  severityText: {
    fontSize: 10,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.white,
  },
  violationTime: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  violationDetails: {
    gap: 4,
  },
  violationLabel: {
    fontSize: 13,
    color: theme.colors.textPrimary,
  },
  summaryTextContainer: {
    padding: 16,
  },
  summaryDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
});
