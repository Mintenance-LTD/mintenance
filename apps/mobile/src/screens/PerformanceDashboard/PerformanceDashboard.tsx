import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { performanceMonitor, usePerformanceMonitoring } from '../../utils/performance';
import type { PerformanceReport, PerformanceBudget, ComponentPerformance, PerformanceViolation } from '../../utils/performance/types';
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
  const [reportData, setReportData] = useState<PerformanceReport | null>(null);
  const [budgetStatus, setBudgetStatus] = useState<PerformanceBudget[]>([]);
  const [componentMetrics, setComponentMetrics] = useState<ComponentPerformance[]>([]);

  useEffect(() => {
    loadPerformanceData();
    const interval = setInterval(loadPerformanceData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadPerformanceData = async () => {
    try {
      const report = performance.generateReport();
      const budgets = performance.getBudgetStatus();
      const components = performanceMonitor.getComponentMetrics();

      setReportData(report);
      setBudgetStatus(budgets);
      setComponentMetrics(components.slice(0, 10));
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
      <View style={styles.container}>
        <View style={styles.loading}>
          <Body1 style={{ color: '#717171' }}>Loading performance data...</Body1>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#222222" colors={['#222222']} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <H1 style={{ color: '#222222' }}>Performance Dashboard</H1>
          <Caption style={{ color: '#717171', marginTop: 4 }}>
            Real-time app performance monitoring
          </Caption>
        </View>

        {/* Controls */}
        <Card style={styles.controlsCard}>
          <CardBody>
            <View style={styles.controlRow}>
              <Body1 style={{ color: '#222222' }}>Real-time Monitoring</Body1>
              <Switch
                value={monitoringEnabled}
                onValueChange={toggleMonitoring}
                trackColor={{ false: '#EBEBEB', true: '#222222' }}
                thumbColor="#F7F7F7"
              />
            </View>
          </CardBody>
        </Card>

        {/* Overview Metrics */}
        <View style={styles.section}>
          <H2 style={{ color: '#222222', marginBottom: 16 }}>Overview</H2>
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
              value={Math.round(reportData.summary.averageRenderTime ?? 0)}
              unit="ms"
              status={(reportData.summary.averageRenderTime ?? 0) > 16 ? 'warning' : 'good'}
              icon="speedometer"
              description="Component render time"
            />
            <MetricCard
              title="Network Time"
              value={Math.round(reportData.summary.averageNetworkTime ?? 0)}
              unit="ms"
              status={(reportData.summary.averageNetworkTime ?? 0) > 2000 ? 'critical' : 'good'}
              icon="cloud"
              description="Average API response time"
            />
            <MetricCard
              title="Budget Violations"
              value={reportData.summary.failedBudgets ?? 0}
              status={(reportData.summary.failedBudgets ?? 0) > 0 ? 'critical' : 'good'}
              icon="warning"
              description="Performance budget failures"
            />
          </View>
        </View>

        {/* Budget Status */}
        <View style={styles.section}>
          <H2 style={{ color: '#222222', marginBottom: 16 }}>Budget Status</H2>
          <Card>
            <CardBody>
              {budgetStatus.slice(0, 8).map((budget, index) => (
                <BudgetStatusRow
                  key={index}
                  metric={budget.metric ?? 'unknown'}
                  current={budget.current ?? 0}
                  budget={budget.budget ?? 0}
                  status={budget.status ?? 'pass'}
                />
              ))}
            </CardBody>
          </Card>
        </View>

        {/* Component Performance */}
        {componentMetrics.length > 0 && (
          <View style={styles.section}>
            <H2 style={{ color: '#222222', marginBottom: 16 }}>
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
        {(reportData.violations?.length ?? 0) > 0 && (
          <View style={styles.section}>
            <H2 style={{ color: '#222222', marginBottom: 16 }}>Recent Violations</H2>
            <Card>
              <CardBody>
                {reportData.violations?.slice(0, 5).map((violation, index) => (
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
          <Caption style={{ color: '#B0B0B0', textAlign: 'center' }}>
            Last updated: {new Date(reportData.timestamp ?? Date.now()).toLocaleTimeString()}
          </Caption>
        </View>
      </ScrollView>
    </SafeAreaView>
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
      case 'good': return '#059669';
      case 'warning': return '#D97706';
      case 'critical': return '#DC2626';
      default: return '#717171';
    }
  };

  return (
    <Card style={styles.metricCard}>
      <CardBody>
        <View style={styles.metricHeader}>
          <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={24} color={getStatusColor()} />
          {trend && (
            <Ionicons
              name={trend === 'up' ? 'trending-up' : trend === 'down' ? 'trending-down' : 'remove'}
              size={16}
              color={trend === 'up' ? '#EF4444' : '#10B981'}
              style={styles.trendIcon}
            />
          )}
        </View>
        <H3 style={{ color: '#222222', marginTop: 12 }}>
          {value}
          {unit && <Caption style={{ color: '#717171' }}> {unit}</Caption>}
        </H3>
        <Body2 style={{ color: '#717171', marginTop: 4 }}>{title}</Body2>
        {description && (
          <Caption style={{ color: '#B0B0B0', marginTop: 4 }}>
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
      case 'pass': return 'success';
      case 'warn': return 'warning';
      case 'fail': return 'error';
      default: return 'neutral';
    }
  };

  return (
    <View style={styles.budgetRow}>
      <View style={styles.budgetInfo}>
        <Body1 style={{ color: '#222222' }}>{metric.replace(/_/g, ' ')}</Body1>
        <Caption style={{ color: '#717171' }}>
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

const ComponentMetricRow: React.FC<{ component: ComponentPerformance; rank: number }> = ({ component, rank }) => {
  return (
    <View style={styles.componentRow}>
      <View style={styles.rankBadge}>
        <Caption style={{ color: '#FFFFFF' }}>{rank}</Caption>
      </View>
      <View style={styles.componentInfo}>
        <Body1 style={{ color: '#222222' }}>{component.componentName}</Body1>
        <Caption style={{ color: '#717171' }}>
          Renders: {component.renderCount} • Avg: {component.averageRenderTime.toFixed(1)}ms
        </Caption>
      </View>
      <View style={styles.componentMetrics}>
        <Body2 style={{ color: '#222222' }}>
          {component.lastRenderTime.toFixed(1)}ms
        </Body2>
      </View>
    </View>
  );
};

// ============================================================================
// VIOLATION ROW
// ============================================================================

const ViolationRow: React.FC<{ violation: PerformanceViolation }> = ({ violation }) => {
  const getSeverityColor = () => {
    switch (violation.severity) {
      case 'critical': return '#DC2626';
      case 'high': return '#EF4444';
      case 'medium': return '#F59E0B';
      default: return '#717171';
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
        <Body1 style={{ color: '#222222' }}>
          {violation.metric.replace(/_/g, ' ')}
        </Body1>
        <Caption style={{ color: '#717171' }}>
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
    backgroundColor: '#F7F7F7',
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
    padding: 16,
    paddingBottom: 12,
  },
  controlsCard: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
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
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EBEBEB',
  },
  budgetInfo: {
    flex: 1,
  },
  componentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EBEBEB',
  },
  rankBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#222222',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
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
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EBEBEB',
  },
  violationIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  violationInfo: {
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
  footer: {
    padding: 16,
    paddingTop: 0,
  },
});

export default PerformanceDashboard;
