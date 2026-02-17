/**
 * Business Analytics Dashboard
 * 
 * Comprehensive business metrics and real-time analytics for the Mintenance app.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { theme } from '../../theme';
import { useI18n } from '../../hooks/useI18n';
import { PerformanceOptimizer } from '../../utils/PerformanceOptimizer';

const { width } = Dimensions.get('window');

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  color?: string;
}

interface BusinessMetrics {
  activeJobs: number;
  completedJobs: number;
  totalRevenue: number;
  averageJobValue: number;
  userGrowth: number;
  contractorUtilization: number;
}

interface DashboardProps {
  metrics: BusinessMetrics;
  onRefresh?: () => void;
  loading?: boolean;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  trend = 'neutral',
  color = theme.colors.primary,
}) => {
  const trendColor = trend === 'up' ? '#10B981' : trend === 'down' ? '#EF4444' : '#717171';
  
  return (
    <View style={[styles.metricCard, { borderLeftColor: color }]}>
      <Text style={styles.metricTitle}>{title}</Text>
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
      {change && (
        <View style={styles.changeContainer}>
          <Text style={[styles.changeText, { color: trendColor }]}>
            {trend === 'up' ? '↗ ' : trend === 'down' ? '↘ ' : '→ '}{change}
          </Text>
        </View>
      )}
    </View>
  );
};

const BusinessDashboard: React.FC<DashboardProps> = ({
  metrics,
  onRefresh,
  loading = false,
}) => {
  React.useEffect(() => {
    PerformanceOptimizer.startMetric('dashboard-render');
    return () => {
      PerformanceOptimizer.endMetric('dashboard-render');
    };
  }, []);

  const { formatters } = useI18n();
  const formatCurrency = (amount: number): string => formatters.currency(amount);

  const formatPercentage = (value: number): string => {
    return `${value.toFixed(1)}%`;
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Business Analytics</Text>
        {onRefresh && (
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={onRefresh}
            disabled={loading}
          >
            <Text style={styles.refreshText}>
              {loading ? 'Updating...' : 'Refresh'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Key Metrics Row */}
      <View style={styles.metricsGrid}>
        <MetricCard
          title="Active Jobs"
          value={metrics.activeJobs.toString()}
          change="+12% this week"
          trend="up"
          color={theme.colors.success}
        />
        <MetricCard
          title="Completed Jobs"
          value={metrics.completedJobs.toString()}
          change="+8% this month"
          trend="up"
          color={theme.colors.primary}
        />
      </View>

      <View style={styles.metricsGrid}>
        <MetricCard
          title="Total Revenue"
          value={formatCurrency(metrics.totalRevenue)}
          change="+15% this month"
          trend="up"
          color={theme.colors.success}
        />
        <MetricCard
          title="Avg Job Value"
          value={formatCurrency(metrics.averageJobValue)}
          change="-3% this week"
          trend="down"
          color={theme.colors.warning}
        />
      </View>

      <View style={styles.metricsGrid}>
        <MetricCard
          title="User Growth"
          value={formatPercentage(metrics.userGrowth)}
          change="+25% this quarter"
          trend="up"
          color={theme.colors.primary}
        />
        <MetricCard
          title="Contractor Util."
          value={formatPercentage(metrics.contractorUtilization)}
          change="+5% this month"
          trend="up"
          color={theme.colors.primary}
        />
      </View>

      {/* Performance Insights */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Performance Insights</Text>
        <View style={styles.insightCard}>
          <Text style={styles.insightTitle}>🚀 Peak Performance</Text>
          <Text style={styles.insightText}>
            Your platform is performing excellently with 95% user satisfaction
            and efficient contractor matching.
          </Text>
        </View>
        
        <View style={styles.insightCard}>
          <Text style={styles.insightTitle}>📈 Growth Opportunities</Text>
          <Text style={styles.insightText}>
            Consider expanding to 3 new service categories based on high demand
            in plumbing and electrical work.
          </Text>
        </View>
        
        <View style={styles.insightCard}>
          <Text style={styles.insightTitle}>⚠️ Attention Needed</Text>
          <Text style={styles.insightText}>
            Response times in North London area averaging 2.3 hours.
            Consider recruiting more contractors in this region.
          </Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionGrid}>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionText}>📊 Detailed Reports</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionText}>👥 User Management</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionText}>💰 Financial Overview</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionText}>🎯 Marketing Insights</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[3],
  },
  title: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: '700' as const,
    color: theme.colors.textPrimary,
  },
  refreshButton: {
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[2],
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
  },
  refreshText: {
    color: theme.colors.textInverse,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
  },
  metricsGrid: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[2],
    gap: theme.spacing[3],
  },
  metricCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: theme.spacing[4],
    borderLeftWidth: 4,
    ...theme.shadows.base,
  },
  metricTitle: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    fontWeight: theme.typography.fontWeight.medium,
    marginBottom: theme.spacing[1],
  },
  metricValue: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: '700' as const,
    marginBottom: theme.spacing[1],
  },
  changeContainer: {
    marginTop: theme.spacing[1],
  },
  changeText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.medium,
  },
  section: {
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[3],
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: '700' as const,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing[3],
  },
  insightCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: theme.spacing[4],
    marginBottom: theme.spacing[3],
    ...theme.shadows.base,
  },
  insightTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing[2],
  },
  insightText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionButton: {
    width: (width - theme.spacing[4] * 2 - 12) / 2,
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    padding: theme.spacing[3],
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 60,
  },
  actionText: {
    color: theme.colors.textInverse,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    textAlign: 'center',
  },
});

export default BusinessDashboard;
