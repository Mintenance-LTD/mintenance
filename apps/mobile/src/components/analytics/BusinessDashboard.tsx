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
  Platform,
} from 'react-native';
import { useI18n } from '../../hooks/useI18n';
import { PerformanceOptimizer } from '../../utils/PerformanceOptimizer';
import { theme } from '../../theme';

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
  color = theme.colors.textPrimary,
}) => {
  const trendColor = trend === 'up' ? theme.colors.primary : trend === 'down' ? theme.colors.error : theme.colors.textSecondary;

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
          color={theme.colors.primary}
        />
        <MetricCard
          title="Completed Jobs"
          value={metrics.completedJobs.toString()}
          change="+8% this month"
          trend="up"
          color={theme.colors.textPrimary}
        />
      </View>

      <View style={styles.metricsGrid}>
        <MetricCard
          title="Total Revenue"
          value={formatCurrency(metrics.totalRevenue)}
          change="+15% this month"
          trend="up"
          color={theme.colors.primary}
        />
        <MetricCard
          title="Avg Job Value"
          value={formatCurrency(metrics.averageJobValue)}
          change="-3% this week"
          trend="down"
          color={theme.colors.accent}
        />
      </View>

      <View style={styles.metricsGrid}>
        <MetricCard
          title="User Growth"
          value={formatPercentage(metrics.userGrowth)}
          change="+25% this quarter"
          trend="up"
          color={theme.colors.textPrimary}
        />
        <MetricCard
          title="Contractor Util."
          value={formatPercentage(metrics.contractorUtilization)}
          change="+5% this month"
          trend="up"
          color={theme.colors.textPrimary}
        />
      </View>

      {/* Performance Insights */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Performance Insights</Text>
        <View style={styles.insightCard}>
          <Text style={styles.insightTitle}>Peak Performance</Text>
          <Text style={styles.insightText}>
            Your platform is performing excellently with 95% user satisfaction
            and efficient contractor matching.
          </Text>
        </View>

        <View style={styles.insightCard}>
          <Text style={styles.insightTitle}>Growth Opportunities</Text>
          <Text style={styles.insightText}>
            Consider expanding to 3 new service categories based on high demand
            in plumbing and electrical work.
          </Text>
        </View>

        <View style={styles.insightCard}>
          <Text style={styles.insightTitle}>Attention Needed</Text>
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
            <Text style={styles.actionText}>Detailed Reports</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionText}>User Management</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionText}>Financial Overview</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionText}>Marketing Insights</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  refreshButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: theme.colors.textPrimary,
    borderRadius: 12,
  },
  refreshText: {
    color: theme.colors.textInverse,
    fontSize: 13,
    fontWeight: '500',
  },
  metricsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  metricTitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: '500',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  changeContainer: {
    marginTop: 4,
  },
  changeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 12,
  },
  insightCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  insightTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  insightText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionButton: {
    width: (width - 16 * 2 - 12) / 2,
    backgroundColor: theme.colors.textPrimary,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  actionText: {
    color: theme.colors.textInverse,
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default BusinessDashboard;
