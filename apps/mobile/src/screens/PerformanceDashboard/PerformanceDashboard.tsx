import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Alert,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { performanceMonitor, usePerformanceMonitoring } from '../../utils/performance';
import { useHaptics } from '../../utils/haptics';
import { logger } from '../../utils/logger';
import {
  H1,
  H2,
  H3,
  Body1,
  Body2,
  Caption,
  Badge,
} from '../../components/ui';
import { Button } from '../../components/ui/Button/Button';
import { Card, CardHeader, CardBody } from '../../components/ui/Card/Card';

// ============================================================================
// TYPES
// ============================================================================

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  status: 'good' | 'warning' | 'critical';
  trend?: 'up' | 'down' | 'stable';
  description?: string;
  icon: string;
}

interface BudgetStatusProps {
  metric: string;
  current: number;
  budget: number;
  status: 'pass' | 'warn' | 'fail';
}

// ============================================================================
// PERFORMANCE DASHBOARD SCREEN
// ============================================================================

export const PerformanceDashboard: React.FC = () => {
  const haptics = useHaptics();
  const performance = usePerformanceMonitoring();

  const [refreshing, setRefreshing] = useState(false);
  const [monitoringEnabled, setMonitoringEnabled] = useState(true);
  const [reportData, setReportData] = useState<unknown>(null);
  const [budgetStatus, setBudgetStatus] = useState<unknown[]>([]);
  const [componentMetrics, setComponentMetrics] = useState<unknown[]>([]);

  useEffect(() => {
    loadPerformanceData();
    const interval = setInterval(loadPerformanceData, 30000); // Update every 30s
    return () => clearInterval(interval);
  }, []);

  const loadPerformanceData = async () => {
    try {
      const report = performance.generateReport();
      const budgets = performance.getBudgetStatus();
      const components = performanceMonitor.getComponentMetrics();

      setReportData(report);
      setBudgetStatus(budgets);
      setComponentMetrics(components.slice(0, 10)); // Top 10 components
    } catch (error) {
      logger.error('Failed to load performance data', { data: error });
    }
  };

  const handleRefresh = async () => {
    haptics.light();
    setRefreshing(true);
    await loadPerformanceData();
    setRefreshing(false);
  };

  const handleClearMetrics = () => {
    Alert.alert(
      'Clear Performance Data',
      'This will clear all collected performance metrics. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            haptics.medium();
            performanceMonitor.clearMetrics();
            loadPerformanceData();
          },
        },
      ]
    );
  };

  const handleExportReport = async () => {
    try {
      haptics.light();
      const reports = await performanceMonitor.getStoredReports();
      const exportData = {
        timestamp: Date.now(),
        currentReport: reportData,
        historicalReports: reports,
        budgetStatus,
        componentMetrics,
      };

      // In a real app, you'd export this to a file or send to analytics service
      logger.info('Performance report exported', { data: exportData });
      Alert.alert('Export Complete', 'Performance report has been exported to logs');
    } catch (error) {
      logger.error('Failed to export performance report', { data: error });
      Alert.alert('Export Failed', 'Could not export performance report');
    }
  };

  const toggleMonitoring = (enabled: boolean) => {
    setMonitoringEnabled(enabled);
    performanceMonitor.setEnabled(enabled);
    haptics.selection();
  };

  if (!reportData) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loading}>
          <Body1 style={{ color: theme.colors.textSecondary }}>Loading performance data...</Body1>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <H1 style={{ color: theme.colors.textPrimary }}>Performance Dashboard</H1>
          <Caption style={{ color: theme.colors.textSecondary, marginTop: 4 }}>
            Real-time app performance monitoring
          </Caption>
        </View>

        {/* Controls */}
        <Card style={styles.controlsCard}>
          <CardBody>
            <View style={styles.controlRow}>
              <Body1 style={{ color: theme.colors.textPrimary }}>Real-time Monitoring</Body1>
              <Switch
                value={monitoringEnabled}
                onValueChange={toggleMonitoring}
                trackColor={{
                  false: theme.colors.surfaceTertiary,
                  true: theme.colors.primary,
                }}
                thumbColor={theme.colors.background}
              />
            </View>
          </CardBody>
        </Card>

        {/* Overview Metrics */}
        <View style={styles.section}>
          <H2 style={{ color: theme.colors.textPrimary, marginBottom: 16 }}>Overview</H2>
          <View style={styles.metricsGrid}>
            <MetricCard
              title="Total Metrics"
              value={reportData.summary.totalMetrics}
              status="good"
              icon="analytics"
              description="Metrics collected in last 30 minutes"
            />
            <MetricCard
              title="Average Render"
              value={Math.round(reportData.summary.averageRenderTime)}
              unit="ms"
              status={reportData.summary.averageRenderTime > 16 ? 'warning' : 'good'}
              icon="speedometer"
              description="Component render time"
            />
            <MetricCard
              title="Network Time"
              value={Math.round(reportData.summary.averageNetworkTime)}
              unit="ms"
              status={reportData.summary.averageNetworkTime > 2000 ? 'critical' : 'good'}
              icon="cloud"
              description="Average API response time"
            />
            <MetricCard
              title="Budget Violations"
              value={reportData.summary.failedBudgets}
              status={reportData.summary.failedBudgets > 0 ? 'critical' : 'good'}
              icon="warning"
              description="Performance budget failures"
            />
          </View>
        </View>

        {/* Budget Status */}
        <View style={styles.section}>
          <H2 style={{ color: theme.colors.textPrimary, marginBottom: 16 }}>Budget Status</H2>
          <Card>
            <CardBody>
              {budgetStatus.slice(0, 8).map((budget, index) => (
                <BudgetStatusRow key={index} {...budget} />
              ))}
            </CardBody>
          </Card>
        </View>

        {/* Component Performance */}
        {componentMetrics.length > 0 && (
          <View style={styles.section}>
            <H2 style={{ color: theme.colors.textPrimary, marginBottom: 16 }}>
              Top Components by Render Time
            </H2>
            <Card>
              <CardBody>
                {componentMetrics.map((component, index) => (
                  <ComponentMetricRow key={index} component={component} rank={index + 1} />
                ))}
              </CardBody>
            </Card>
          </View>
        )}

        {/* Recent Violations */}
        {reportData.violations.length > 0 && (
          <View style={styles.section}>
            <H2 style={{ color: theme.colors.textPrimary, marginBottom: 16 }}>Recent Violations</H2>
            <Card>
              <CardBody>
                {reportData.violations.slice(0, 5).map((violation: unknown, index: number) => (
                  <ViolationRow key={index} violation={violation} />
                ))}
              </CardBody>
            </Card>
          </View>
        )}

        {/* Actions */}
        <View style={styles.section}>
          <View style={styles.actionButtons}>
            <Button
              variant="outline"
              leftIcon="download"
              onPress={handleExportReport}
              style={styles.actionButton}
            >
              Export Report
            </Button>
            <Button
              variant="outline"
              leftIcon="trash"
              onPress={handleClearMetrics}
              style={styles.actionButton}
            >
              Clear Data
            </Button>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Caption style={{ color: theme.colors.textTertiary, textAlign: 'center' }}>
            Last updated: {new Date(reportData.timestamp).toLocaleTimeString()}
          </Caption>
        </View>
      </ScrollView>
    </View>
  );
};

// ============================================================================
// METRIC CARD COMPONENT
// ============================================================================

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit,
  status,
  trend,
  description,
  icon,
}) => {
  const getStatusColor = () => {
    switch (status) {
      case 'good':
        return theme.colors.successDark;
      case 'warning':
        return theme.colors.warningDark;
      case 'critical':
        return theme.colors.errorDark;
      default:
        return theme.colors.textSecondary;
    }
  };

  return (
    <Card style={styles.metricCard}>
      <CardBody>
        <View style={styles.metricHeader}>
          <Ionicons name={icon as unknown} size={24} color={getStatusColor()} />
          {trend && (
            <Ionicons
              name={trend === 'up' ? 'trending-up' : trend === 'down' ? 'trending-down' : 'remove'}
              size={16}
              color={trend === 'up' ? theme.colors.error : theme.colors.success}
              style={styles.trendIcon}
            />
          )}
        </View>
        <H3 style={{ color: theme.colors.textPrimary, marginTop: 12 }}>
          {value}
          {unit && <Caption style={{ color: theme.colors.textSecondary }}> {unit}</Caption>}
        </H3>
        <Body2 style={{ color: theme.colors.textSecondary, marginTop: 4 }}>{title}</Body2>
        {description && (
          <Caption style={{ color: theme.colors.textTertiary, marginTop: 4 }}>
            {description}
          </Caption>
        )}
      </CardBody>
    </Card>
  );
};

// ============================================================================
// BUDGET STATUS ROW
// ============================================================================

const BudgetStatusRow: React.FC<BudgetStatusProps> = ({ metric, current, budget, status }) => {
  const percentage = Math.round((current / budget) * 100);
  const getBadgeVariant = () => {
    switch (status) {
      case 'pass':
        return 'success';
      case 'warn':
        return 'warning';
      case 'fail':
        return 'error';
      default:
        return 'neutral';
    }
  };

  return (
    <View style={styles.budgetRow}>
      <View style={styles.budgetInfo}>
        <Body1 style={{ color: theme.colors.textPrimary }}>{metric.replace(/_/g, ' ')}</Body1>
        <Caption style={{ color: theme.colors.textSecondary }}>
          {current.toFixed(0)} / {budget.toFixed(0)} ({percentage}%)
        </Caption>
      </View>
      <Badge variant={getBadgeVariant()}>{status.toUpperCase()}</Badge>
    </View>
  );
};

// ============================================================================
// COMPONENT METRIC ROW
// ============================================================================

const ComponentMetricRow: React.FC<{ component: unknown; rank: number }> = ({ component, rank }) => {
  return (
    <View style={styles.componentRow}>
      <View style={styles.rankBadge}>
        <Caption style={{ color: theme.colors.white }}>{rank}</Caption>
      </View>
      <View style={styles.componentInfo}>
        <Body1 style={{ color: theme.colors.textPrimary }}>{component.componentName}</Body1>
        <Caption style={{ color: theme.colors.textSecondary }}>
          Renders: {component.renderCount} • Avg: {component.averageRenderTime.toFixed(1)}ms
        </Caption>
      </View>
      <View style={styles.componentMetrics}>
        <Body2 style={{ color: theme.colors.textPrimary }}>
          {component.lastRenderTime.toFixed(1)}ms
        </Body2>
      </View>
    </View>
  );
};

// ============================================================================
// VIOLATION ROW
// ============================================================================

const ViolationRow: React.FC<{ violation: unknown }> = ({ violation }) => {
  const getSeverityColor = () => {
    switch (violation.severity) {
      case 'critical':
        return theme.colors.errorDark;
      case 'high':
        return theme.colors.error;
      case 'medium':
        return theme.colors.warning;
      default:
        return theme.colors.textSecondary;
    }
  };

  return (
    <View style={styles.violationRow}>
      <Ionicons
        name="warning"
        size={20}
        color={getSeverityColor()}
        style={styles.violationIcon}
      />
      <View style={styles.violationInfo}>
        <Body1 style={{ color: theme.colors.textPrimary }}>
          {violation.metric.replace(/_/g, ' ')}
        </Body1>
        <Caption style={{ color: theme.colors.textSecondary }}>
          Expected: {violation.threshold}ms • Actual: {violation.actual.toFixed(0)}ms
        </Caption>
        <Caption style={{ color: getSeverityColor() }}>
          {violation.severity.toUpperCase()} • {new Date(violation.timestamp).toLocaleTimeString()}
        </Caption>
      </View>
    </View>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  scrollView: {
    flex: 1,
  },

  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  header: {
    padding: theme.spacing[4],
    paddingBottom: theme.spacing[3],
  },

  controlsCard: {
    marginHorizontal: theme.spacing[4],
    marginBottom: theme.spacing[4],
  },

  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  section: {
    marginBottom: theme.spacing[6],
    paddingHorizontal: theme.spacing[4],
  },

  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing[3],
    justifyContent: 'space-between',
  },

  metricCard: {
    width: '48%',
    minHeight: 120,
  },

  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  trendIcon: {
    marginLeft: 'auto',
  },

  budgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },

  budgetInfo: {
    flex: 1,
  },

  componentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },

  rankBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.info,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing[3],
  },

  componentInfo: {
    flex: 1,
  },

  componentMetrics: {
    alignItems: 'flex-end',
  },

  violationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: theme.spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },

  violationIcon: {
    marginRight: theme.spacing[3],
    marginTop: 2,
  },

  violationInfo: {
    flex: 1,
  },

  actionButtons: {
    flexDirection: 'row',
    gap: theme.spacing[3],
  },

  actionButton: {
    flex: 1,
  },

  footer: {
    padding: theme.spacing[4],
    paddingTop: 0,
  },
});

export default PerformanceDashboard;
