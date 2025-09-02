import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { 
  useBusinessDashboard, 
  useBusinessSuiteFormatters,
  businessSuiteUtils
} from '../hooks/useBusinessSuite';

interface BusinessDashboardProps {
  contractorId: string;
  onNavigate?: (screen: string, params?: any) => void;
}

export const BusinessDashboard: React.FC<BusinessDashboardProps> = ({
  contractorId,
  onNavigate
}) => {
  const [refreshing, setRefreshing] = useState(false);
  const [selectedKPI, setSelectedKPI] = useState<'revenue' | 'jobs' | 'satisfaction' | 'profitability'>('revenue');

  const dashboard = useBusinessDashboard(contractorId);
  const { 
    formatCurrency, 
    formatPercentage, 
    getPerformanceColor,
    calculateGrowthTrend 
  } = useBusinessSuiteFormatters();

  const handleRefresh = async () => {
    setRefreshing(true);
    // Refresh would be handled by react-query's refetch
    setTimeout(() => setRefreshing(false), 1000);
  };

  if (dashboard.isLoading && !dashboard.kpis) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading business dashboard...</Text>
      </View>
    );
  }

  const renderKPICard = (
    title: string,
    value: string | number,
    subtitle: string,
    trend?: { trend: string; percentage: number } | null,
    icon: string,
    color: string,
    onPress?: () => void
  ) => (
    <TouchableOpacity 
      style={[styles.kpiCard, { borderLeftColor: color }]}
      onPress={onPress}
    >
      <View style={styles.kpiHeader}>
        <Ionicons name={icon as any} size={24} color={color} />
        <Text style={styles.kpiTitle}>{title}</Text>
      </View>
      
      <Text style={[styles.kpiValue, { color }]}>
        {typeof value === 'number' ? formatCurrency(value) : value}
      </Text>
      
      <Text style={styles.kpiSubtitle}>{subtitle}</Text>
      
      {trend && (
        <View style={styles.trendContainer}>
          <Ionicons 
            name={trend.trend === 'growing' ? 'trending-up' : 
                  trend.trend === 'declining' ? 'trending-down' : 'remove'} 
            size={16} 
            color={trend.trend === 'growing' ? theme.colors.success : 
                   trend.trend === 'declining' ? theme.colors.error : 
                   theme.colors.textSecondary} 
          />
          <Text style={[
            styles.trendText,
            { color: trend.trend === 'growing' ? theme.colors.success : 
                     trend.trend === 'declining' ? theme.colors.error : 
                     theme.colors.textSecondary }
          ]}>
            {trend.percentage > 0 ? '+' : ''}{trend.percentage.toFixed(1)}%
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderInsightCard = (insight: any, index: number) => (
    <View 
      key={index} 
      style={[
        styles.insightCard,
        { borderLeftColor: insight.type === 'success' ? theme.colors.success : 
                           insight.type === 'warning' ? theme.colors.warning : 
                           theme.colors.info }
      ]}
    >
      <View style={styles.insightHeader}>
        <Text style={styles.insightIcon}>{insight.icon}</Text>
        <Text style={styles.insightTitle}>{insight.title}</Text>
      </View>
      <Text style={styles.insightMessage}>{insight.message}</Text>
    </View>
  );

  const renderActionItem = (item: any, index: number) => (
    <TouchableOpacity 
      key={index} 
      style={[
        styles.actionItem,
        { borderColor: item.type === 'urgent' ? theme.colors.error : theme.colors.warning }
      ]}
    >
      <View style={styles.actionHeader}>
        <Ionicons 
          name={item.type === 'urgent' ? 'alert-circle' : 'warning'} 
          size={20} 
          color={item.type === 'urgent' ? theme.colors.error : theme.colors.warning} 
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
          <Ionicons name="document-text" size={24} color={theme.colors.primary} />
          <Text style={styles.quickActionText}>Create Invoice</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.quickActionButton}
          onPress={() => onNavigate?.('RecordExpense')}
        >
          <Ionicons name="receipt" size={24} color={theme.colors.primary} />
          <Text style={styles.quickActionText}>Log Expense</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.quickActionButton}
          onPress={() => onNavigate?.('UpdateSchedule')}
        >
          <Ionicons name="calendar" size={24} color={theme.colors.primary} />
          <Text style={styles.quickActionText}>Update Schedule</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.quickActionButton}
          onPress={() => onNavigate?.('ViewClients')}
        >
          <Ionicons name="people" size={24} color={theme.colors.primary} />
          <Text style={styles.quickActionText}>Manage Clients</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
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
                average: 15
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
                    <View style={[styles.healthBarFill, { width: '85%', backgroundColor: theme.colors.success }]} />
                  </View>
                </View>
                <View style={styles.healthMetric}>
                  <Text style={styles.healthMetricLabel}>Efficiency</Text>
                  <View style={styles.healthBar}>
                    <View style={[styles.healthBarFill, { width: '92%', backgroundColor: theme.colors.success }]} />
                  </View>
                </View>
                <View style={styles.healthMetric}>
                  <Text style={styles.healthMetricLabel}>Growth</Text>
                  <View style={styles.healthBar}>
                    <View style={[styles.healthBarFill, { width: '78%', backgroundColor: theme.colors.warning }]} />
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
          {dashboard.insights.map((insight, index) => renderInsightCard(insight, index))}
        </View>
      )}

      {/* Action Items */}
      {dashboard.actionItems.length > 0 && (
        <View style={styles.actionItemsSection}>
          <Text style={styles.sectionTitle}>Action Required</Text>
          {dashboard.actionItems.map((item, index) => renderActionItem(item, index))}
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
            <Ionicons name="document-text" size={32} color={theme.colors.primary} />
            <Text style={styles.toolTitle}>Invoice Manager</Text>
            <Text style={styles.toolDescription}>Create and track invoices</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.toolCard}
            onPress={() => onNavigate?.('ExpenseTracker')}
          >
            <Ionicons name="receipt" size={32} color={theme.colors.primary} />
            <Text style={styles.toolTitle}>Expense Tracker</Text>
            <Text style={styles.toolDescription}>Log and categorize expenses</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.toolCard}
            onPress={() => onNavigate?.('ScheduleManager')}
          >
            <Ionicons name="calendar" size={32} color={theme.colors.primary} />
            <Text style={styles.toolTitle}>Schedule Manager</Text>
            <Text style={styles.toolDescription}>Manage availability and bookings</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.toolCard}
            onPress={() => onNavigate?.('ClientCRM')}
          >
            <Ionicons name="people" size={32} color={theme.colors.primary} />
            <Text style={styles.toolTitle}>Client CRM</Text>
            <Text style={styles.toolDescription}>Manage client relationships</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.toolCard}
            onPress={() => onNavigate?.('MarketingHub')}
          >
            <Ionicons name="megaphone" size={32} color={theme.colors.primary} />
            <Text style={styles.toolTitle}>Marketing Hub</Text>
            <Text style={styles.toolDescription}>Promote your services</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.toolCard}
            onPress={() => onNavigate?.('BusinessGoals')}
          >
            <Ionicons name="flag" size={32} color={theme.colors.primary} />
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
          <Ionicons name="bar-chart" size={20} color="#fff" />
          <Text style={styles.reportButtonText}>Generate Business Report</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const { width } = Dimensions.get('window');
const isTablet = width > 768;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing[8],
  },
  loadingText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing[2],
  },
  header: {
    padding: theme.spacing[4],
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing[1],
  },
  headerSubtitle: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing[3],
  },
  kpiSection: {
    padding: theme.spacing[4],
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing[3],
  },
  kpiCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing[4],
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
    width: isTablet ? '48%' : '100%',
    minHeight: 120,
  },
  kpiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing[2],
  },
  kpiTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing[2],
  },
  kpiValue: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    marginBottom: theme.spacing[1],
  },
  kpiSubtitle: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing[2],
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.medium,
    marginLeft: theme.spacing[1],
  },
  healthScoreContainer: {
    padding: theme.spacing[4],
    paddingTop: 0,
  },
  healthScoreCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing[4],
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  healthScoreMain: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  healthScoreCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.success + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing[4],
  },
  healthScoreValue: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.success,
  },
  healthScoreLabel: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.success,
    fontWeight: theme.typography.fontWeight.medium,
  },
  healthScoreBreakdown: {
    flex: 1,
  },
  healthMetric: {
    marginBottom: theme.spacing[2],
  },
  healthMetricLabel: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing[1],
  },
  healthBar: {
    height: 6,
    backgroundColor: theme.colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  healthBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  insightsSection: {
    padding: theme.spacing[4],
    paddingTop: 0,
  },
  insightCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing[3],
    marginBottom: theme.spacing[2],
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing[1],
  },
  insightIcon: {
    fontSize: 16,
    marginRight: theme.spacing[2],
  },
  insightTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  insightMessage: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  actionItemsSection: {
    padding: theme.spacing[4],
    paddingTop: 0,
  },
  actionItem: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing[3],
    marginBottom: theme.spacing[2],
    borderWidth: 1,
  },
  actionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing[1],
  },
  actionTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginLeft: theme.spacing[2],
  },
  actionDescription: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing[1],
  },
  actionText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.primary,
  },
  quickActionsContainer: {
    padding: theme.spacing[4],
    paddingTop: 0,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing[2],
  },
  quickActionButton: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing[3],
    alignItems: 'center',
    width: isTablet ? '23%' : '48%',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  quickActionText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing[1],
    textAlign: 'center',
  },
  businessToolsContainer: {
    padding: theme.spacing[4],
    paddingTop: 0,
  },
  toolsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing[3],
  },
  toolCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing[4],
    alignItems: 'center',
    width: isTablet ? '31%' : '48%',
    borderWidth: 1,
    borderColor: theme.colors.border,
    minHeight: 130,
    justifyContent: 'center',
  },
  toolTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing[2],
    textAlign: 'center',
  },
  toolDescription: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing[1],
    textAlign: 'center',
  },
  footer: {
    padding: theme.spacing[4],
    paddingTop: 0,
    paddingBottom: theme.spacing[6],
  },
  reportButton: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing[3],
    borderRadius: theme.borderRadius.md,
  },
  reportButtonText: {
    color: '#fff',
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    marginLeft: theme.spacing[2],
  },
});

export default BusinessDashboard;