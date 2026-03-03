import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { styles } from './businessDashboardStyles';
import {
  useBusinessDashboard,
  useBusinessSuiteFormatters,
  businessSuiteUtils,
} from '../hooks/useBusinessSuite';

interface BusinessDashboardProps {
  contractorId: string;
  onNavigate?: (screen: string, params?: Record<string, unknown>) => void;
}

export const BusinessDashboard: React.FC<BusinessDashboardProps> = ({
  contractorId,
  onNavigate,
}) => {
  const [refreshing, setRefreshing] = useState(false);
  const [selectedKPI, setSelectedKPI] = useState<
    'revenue' | 'jobs' | 'satisfaction' | 'profitability'
  >('revenue');

  const dashboard = useBusinessDashboard(contractorId);
  const {
    formatCurrency,
    formatPercentage,
    getPerformanceColor,
    calculateGrowthTrend,
  } = useBusinessSuiteFormatters();

  const handleRefresh = async () => {
    setRefreshing(true);
    // Refresh would be handled by react-query's refetch
    setTimeout(() => setRefreshing(false), 1000);
  };

  if (dashboard.isLoading && !dashboard.kpis) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size='large' color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading business dashboard...</Text>
      </View>
    );
  }

  const renderKPICard = (
    title: string,
    value: string | number,
    subtitle: string,
    trend: { trend: string; percentage: number } | null = null,
    icon: string,
    color: string,
    onPress?: () => void
  ) => (
    <TouchableOpacity
      style={[styles.kpiCard, { borderLeftColor: color }]}
      onPress={onPress}
    >
      <View style={styles.kpiHeader}>
        <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={24} color={color} />
        <Text style={styles.kpiTitle}>{title}</Text>
      </View>

      <Text style={[styles.kpiValue, { color }]}>
        {typeof value === 'number' ? formatCurrency(value) : value}
      </Text>

      <Text style={styles.kpiSubtitle}>{subtitle}</Text>

      {trend && (
        <View style={styles.trendContainer}>
          <Ionicons
            name={
              trend.trend === 'growing'
                ? 'trending-up'
                : trend.trend === 'declining'
                  ? 'trending-down'
                  : 'remove'
            }
            size={16}
            color={
              trend.trend === 'growing'
                ? theme.colors.success
                : trend.trend === 'declining'
                  ? theme.colors.error
                  : theme.colors.textSecondary
            }
          />
          <Text
            style={[
              styles.trendText,
              {
                color:
                  trend.trend === 'growing'
                    ? theme.colors.success
                    : trend.trend === 'declining'
                      ? theme.colors.error
                      : theme.colors.textSecondary,
              },
            ]}
          >
            {trend.percentage > 0 ? '+' : ''}
            {trend.percentage.toFixed(1)}%
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderInsightCard = (insight: { type: string; icon: string; title: string; message: string }, index: number) => (
    <View
      key={index}
      style={[
        styles.insightCard,
        {
          borderLeftColor:
            insight.type === 'success'
              ? theme.colors.success
              : insight.type === 'warning'
                ? theme.colors.warning
                : theme.colors.info,
        },
      ]}
    >
      <View style={styles.insightHeader}>
        <Text style={styles.insightIcon}>{insight.icon}</Text>
        <Text style={styles.insightTitle}>{insight.title}</Text>
      </View>
      <Text style={styles.insightMessage}>{insight.message}</Text>
    </View>
  );

  const renderActionItem = (item: { type: string; title: string; dueDate?: string; priority?: string }, index: number) => (
    <TouchableOpacity
      key={index}
      style={[
        styles.actionItem,
        {
          borderColor:
            item.type === 'urgent' ? theme.colors.error : theme.colors.warning,
        },
      ]}
    >
      <View style={styles.actionHeader}>
        <Ionicons
          name={item.type === 'urgent' ? 'alert-circle' : 'warning'}
          size={20}
          color={
            item.type === 'urgent' ? theme.colors.error : theme.colors.warning
          }
        />
        <Text style={styles.actionTitle}>{item.title}</Text>
      </View>
      <Text style={styles.actionDescription}>{item.description}</Text>
      <Text style={styles.actionText}>{item.action}</Text>
    </TouchableOpacity>
  );

  const renderQuickActions = () => (
    <View style={styles.quickActionsContainer}>
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.quickActionsGrid}>
        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={() => onNavigate?.('CreateInvoice')}
        >
          <Ionicons
            name='document-text'
            size={24}
            color={theme.colors.primary}
          />
          <Text style={styles.quickActionText}>Create Invoice</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={() => onNavigate?.('RecordExpense')}
        >
          <Ionicons name='receipt' size={24} color={theme.colors.primary} />
          <Text style={styles.quickActionText}>Log Expense</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={() => onNavigate?.('UpdateSchedule')}
        >
          <Ionicons name='calendar' size={24} color={theme.colors.primary} />
          <Text style={styles.quickActionText}>Update Schedule</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={() => onNavigate?.('ViewClients')}
        >
          <Ionicons name='people' size={24} color={theme.colors.primary} />
          <Text style={styles.quickActionText}>Manage Clients</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.colors.primary} colors={[theme.colors.primary]} />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Business Dashboard</Text>
        <Text style={styles.headerSubtitle}>
          Last updated: {new Date(dashboard.lastUpdated).toLocaleTimeString()}
        </Text>
      </View>

      {/* Key Performance Indicators */}
      {dashboard.kpis && (
        <View style={styles.kpiSection}>
          <Text style={styles.sectionTitle}>Key Performance Indicators</Text>
          <View style={styles.kpiGrid}>
            {renderKPICard(
              'Revenue',
              dashboard.kpis.revenue.current,
              'This month',
              dashboard.kpis.revenue.trend,
              'cash',
              theme.colors.success,
              () => onNavigate?.('FinancialSummary')
            )}

            {renderKPICard(
              'Jobs Completed',
              dashboard.kpis.jobs.completed,
              `${dashboard.kpis.jobs.total} total jobs`,
              null,
              'hammer',
              theme.colors.primary,
              () => onNavigate?.('JobsAnalytics')
            )}

            {renderKPICard(
              'Client Satisfaction',
              `${dashboard.kpis.satisfaction.rating.toFixed(1)}/5`,
              'Average rating',
              null,
              'star',
              theme.colors.warning,
              () => onNavigate?.('ClientAnalytics')
            )}

            {renderKPICard(
              'Profit Margin',
              `${dashboard.kpis.profitability.margin.toFixed(1)}%`,
              'Current margin',
              null,
              'trending-up',
              getPerformanceColor(dashboard.kpis.profitability.margin, {
                excellent: 35,
                good: 25,
                average: 15,
              }),
              () => onNavigate?.('ProfitAnalysis')
            )}
          </View>
        </View>
      )}

      {/* Business Health Score */}
      {dashboard.kpis && (
        <View style={styles.healthScoreContainer}>
          <Text style={styles.sectionTitle}>Business Health</Text>
          <View style={styles.healthScoreCard}>
            <View style={styles.healthScoreMain}>
              <View style={styles.healthScoreCircle}>
                <Text style={styles.healthScoreValue}>85</Text>
                <Text style={styles.healthScoreLabel}>Excellent</Text>
              </View>
              <View style={styles.healthScoreBreakdown}>
                <View style={styles.healthMetric}>
                  <Text style={styles.healthMetricLabel}>Profitability</Text>
                  <View style={styles.healthBar}>
                    <View
                      style={[
                        styles.healthBarFill,
                        { width: '85%', backgroundColor: theme.colors.success },
                      ]}
                    />
                  </View>
                </View>
                <View style={styles.healthMetric}>
                  <Text style={styles.healthMetricLabel}>Efficiency</Text>
                  <View style={styles.healthBar}>
                    <View
                      style={[
                        styles.healthBarFill,
                        { width: '92%', backgroundColor: theme.colors.success },
                      ]}
                    />
                  </View>
                </View>
                <View style={styles.healthMetric}>
                  <Text style={styles.healthMetricLabel}>Growth</Text>
                  <View style={styles.healthBar}>
                    <View
                      style={[
                        styles.healthBarFill,
                        { width: '78%', backgroundColor: theme.colors.warning },
                      ]}
                    />
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Business Insights */}
      {dashboard.insights.length > 0 && (
        <View style={styles.insightsSection}>
          <Text style={styles.sectionTitle}>Business Insights</Text>
          {dashboard.insights.map((insight, index) =>
            renderInsightCard(insight, index)
          )}
        </View>
      )}

      {/* Action Items */}
      {dashboard.actionItems.length > 0 && (
        <View style={styles.actionItemsSection}>
          <Text style={styles.sectionTitle}>Action Required</Text>
          {dashboard.actionItems.map((item, index) =>
            renderActionItem(item, index)
          )}
        </View>
      )}

      {/* Quick Actions */}
      {renderQuickActions()}

      {/* Business Tools */}
      <View style={styles.businessToolsContainer}>
        <Text style={styles.sectionTitle}>Business Tools</Text>
        <View style={styles.toolsGrid}>
          <TouchableOpacity
            style={styles.toolCard}
            onPress={() => onNavigate?.('InvoiceManager')}
          >
            <Ionicons
              name='document-text'
              size={32}
              color={theme.colors.primary}
            />
            <Text style={styles.toolTitle}>Invoice Manager</Text>
            <Text style={styles.toolDescription}>
              Create and track invoices
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.toolCard}
            onPress={() => onNavigate?.('ExpenseTracker')}
          >
            <Ionicons name='receipt' size={32} color={theme.colors.primary} />
            <Text style={styles.toolTitle}>Expense Tracker</Text>
            <Text style={styles.toolDescription}>
              Log and categorize expenses
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.toolCard}
            onPress={() => onNavigate?.('ScheduleManager')}
          >
            <Ionicons name='calendar' size={32} color={theme.colors.primary} />
            <Text style={styles.toolTitle}>Schedule Manager</Text>
            <Text style={styles.toolDescription}>
              Manage availability and bookings
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.toolCard}
            onPress={() => onNavigate?.('ClientCRM')}
          >
            <Ionicons name='people' size={32} color={theme.colors.primary} />
            <Text style={styles.toolTitle}>Client CRM</Text>
            <Text style={styles.toolDescription}>
              Manage client relationships
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.toolCard}
            onPress={() => onNavigate?.('MarketingHub')}
          >
            <Ionicons name='megaphone' size={32} color={theme.colors.primary} />
            <Text style={styles.toolTitle}>Marketing Hub</Text>
            <Text style={styles.toolDescription}>Promote your services</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.toolCard}
            onPress={() => onNavigate?.('BusinessGoals')}
          >
            <Ionicons name='flag' size={32} color={theme.colors.primary} />
            <Text style={styles.toolTitle}>Business Goals</Text>
            <Text style={styles.toolDescription}>Set and track objectives</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.reportButton}
          onPress={() => onNavigate?.('BusinessReport')}
        >
          <Ionicons name='bar-chart' size={20} color='#fff' />
          <Text style={styles.reportButtonText}>Generate Business Report</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

export default BusinessDashboard;
