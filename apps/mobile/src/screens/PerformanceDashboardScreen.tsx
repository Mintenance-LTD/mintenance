import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { performanceMonitor } from '../utils/performance';
import type { PerformanceBudget, PerformanceReport } from '../utils/performance/types';
import { logger } from '../utils/logger';
import { theme } from '../theme';

const SUMMARY_ITEMS = [
  { key: 'budgets', icon: 'layers-outline' as const, color: '#3B82F6', bg: '#DBEAFE' },
  { key: 'violations', icon: 'alert-circle-outline' as const, color: theme.colors.error, bg: '#FEE2E2' },
  { key: 'health', icon: 'heart-outline' as const, color: theme.colors.primary, bg: theme.colors.primaryLight },
];

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
    if (budget.status === 'pass') return theme.colors.primary;
    if (budget.status === 'warn') return theme.colors.accent;
    return theme.colors.error;
  };

  const getBudgetStatusIcon = (budget: PerformanceBudget): keyof typeof Ionicons.glyphMap => {
    if (budget.status === 'pass') return 'checkmark';
    if (budget.status === 'warn') return 'warning-outline';
    return 'close';
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

  const summaryValues = [
    { ...SUMMARY_ITEMS[0], value: String(budgets.length), label: 'Total Budgets' },
    { ...SUMMARY_ITEMS[1], value: String(violations.length), label: 'Violations' },
    { ...SUMMARY_ITEMS[2], value: String(healthScore), label: 'Health Score' },
  ];

  return (
    <SafeAreaView style={styles.container}>
    <ScrollView
      style={{ flex: 1 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.textPrimary} colors={[theme.colors.textPrimary]} />
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
        {summaryValues.map((item) => (
          <View key={item.key} style={styles.summaryCard} accessibilityLabel={`${item.value} ${item.label}`}>
            <View style={[styles.summaryIconWrap, { backgroundColor: item.bg }]}>
              <Ionicons name={item.icon} size={16} color={item.color} />
            </View>
            <Text style={[
              styles.summaryValue,
              item.key === 'violations' && violations.length > 0 && { color: theme.colors.error },
              item.key === 'health' && {
                color: healthScore > 80 ? theme.colors.primary : healthScore > 60 ? theme.colors.accent : theme.colors.error,
              },
            ]}>
              {item.value}
            </Text>
            <Text style={styles.summaryLabel}>{item.label}</Text>
          </View>
        ))}
      </View>

      {/* Category Filter */}
      <View style={styles.filterContainer}>
        {(['all', 'violations'] as const).map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[
              styles.filterButton,
              selectedCategory === cat && styles.filterButtonActive,
            ]}
            onPress={() => setSelectedCategory(cat)}
            accessibilityRole='button'
            accessibilityLabel={cat === 'all' ? 'Show all budgets' : 'Show violations only'}
            accessibilityState={{ selected: selectedCategory === cat }}
          >
            <Text
              style={[
                styles.filterText,
                selectedCategory === cat && styles.filterTextActive,
              ]}
            >
              {cat === 'all' ? 'All Budgets' : 'Violations Only'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Budget Status List */}
      <View style={styles.budgetsContainer}>
        <Text style={styles.sectionTitle} accessibilityRole='header'>PERFORMANCE BUDGETS</Text>

        {filteredBudgets.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name={selectedCategory === 'violations' ? 'checkmark-circle-outline' : 'layers-outline'} size={28} color={theme.colors.textTertiary} />
            </View>
            <Text style={styles.emptyText}>
              {selectedCategory === 'violations'
                ? 'No violations found!'
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
                  <Ionicons name={getBudgetStatusIcon(budget)} size={14} color={theme.colors.textInverse} />
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
          <Text style={styles.sectionTitle} accessibilityRole='header'>RECENT VIOLATIONS</Text>

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
                          ? '#FEE2E2'
                          : theme.colors.accentLight,
                    },
                  ]}
                >
                  <Text style={[styles.severityText, {
                    color: violation.severity === 'critical' ? theme.colors.error : theme.colors.accent,
                  }]}>
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
        <Text style={styles.sectionTitle}>SUMMARY</Text>
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
    fontSize: 15,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 50,
  },
  header: {
    padding: 20,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
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
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: { elevation: 2 },
    }),
  },
  summaryIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  summaryLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 10,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
      android: { elevation: 1 },
    }),
  },
  filterButtonActive: {
    backgroundColor: theme.colors.textPrimary,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  filterTextActive: {
    color: theme.colors.textInverse,
  },
  budgetsContainer: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 15,
    color: theme.colors.textSecondary,
  },
  budgetCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: { elevation: 2 },
    }),
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
    fontSize: 15,
    fontWeight: '700',
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
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
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
    fontWeight: '700',
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
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.error,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: { elevation: 2 },
    }),
  },
  violationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  violationMetric: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    flex: 1,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  severityText: {
    fontSize: 10,
    fontWeight: '700',
  },
  violationTime: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    marginBottom: 8,
  },
  violationDetails: {
    gap: 4,
  },
  violationLabel: {
    fontSize: 13,
    color: theme.colors.textSecondary,
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
