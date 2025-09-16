import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { theme } from '../theme';
import { useI18n } from '../hooks/useI18n';
import { useAuth } from '../contexts/AuthContext';
import {
  contractorBusinessSuite,
  type FinancialSummary,
} from '../services/ContractorBusinessSuite';
import { FinanceChart } from '../components/FinanceChart';
import { LoadingSpinner } from '../components/LoadingSpinner';

const { width: screenWidth } = Dimensions.get('window');

interface FinanceDashboardScreenProps {
  navigation: StackNavigationProp<any>;
}

export const FinanceDashboardScreen: React.FC<FinanceDashboardScreenProps> = ({
  navigation,
}) => {
  const { user } = useAuth();
  const { formatters } = useI18n();
  const [financialData, setFinancialData] = useState<FinancialSummary | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'3m' | '6m' | '12m'>(
    '6m'
  );

  useEffect(() => {
    loadFinancialData();
  }, [selectedPeriod]);

  const loadFinancialData = async () => {
    if (!user) return;

    try {
      const data = await contractorBusinessSuite.getFinancialSummary(user.id);
      setFinancialData(data);
    } catch (error) {
      console.error('Error loading financial data:', error);
      Alert.alert('Error', 'Failed to load financial data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadFinancialData();
    setRefreshing(false);
  };

  const formatCurrency = (amount: number) => formatters.currency(amount);

  const getRevenueChartData = () => {
    if (!financialData) return { labels: [], datasets: [{ data: [] }] };

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    return {
      labels: months,
      datasets: [
        {
          data: financialData.monthly_revenue.slice(-6),
          color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
          strokeWidth: 2,
        },
      ],
    };
  };

  const getProfitChartData = () => {
    if (!financialData) return { labels: [], datasets: [{ data: [] }] };

    return {
      labels: financialData.profit_trends.map((trend) =>
        trend.month.slice(0, 3)
      ),
      datasets: [
        {
          data: financialData.profit_trends.map((trend) => trend.profit),
          color: (opacity = 1) => `rgba(52, 199, 89, ${opacity})`,
          strokeWidth: 2,
        },
      ],
    };
  };

  const getCashFlowChartData = () => {
    if (!financialData) return { labels: [], datasets: [{ data: [] }] };

    return {
      labels: financialData.cash_flow_forecast
        .slice(0, 4)
        .map((flow) => `W${flow.week}`),
      datasets: [
        {
          data: financialData.cash_flow_forecast
            .slice(0, 4)
            .map((flow) => flow.net_flow),
          colors: financialData.cash_flow_forecast
            .slice(0, 4)
            .map((flow) =>
              flow.net_flow >= 0 ? theme.colors.success : theme.colors.error
            ),
        },
      ],
    };
  };

  const getExpenseBredownData = () => {
    // Mock expense categories data - would come from actual expense tracking
    return [
      {
        name: 'Materials',
        value: 45,
        color: '#007AFF',
        legendFontColor: theme.colors.textSecondary,
      },
      {
        name: 'Labor',
        value: 30,
        color: '#34C759',
        legendFontColor: theme.colors.textSecondary,
      },
      {
        name: 'Transport',
        value: 15,
        color: '#FF9500',
        legendFontColor: theme.colors.textSecondary,
      },
      {
        name: 'Equipment',
        value: 10,
        color: '#FF3B30',
        legendFontColor: theme.colors.textSecondary,
      },
    ];
  };

  const renderKPICard = (
    title: string,
    value: string,
    icon: string,
    color: string,
    change?: { value: number; isPositive: boolean },
    onPress?: () => void
  ) => (
    <TouchableOpacity
      style={[styles.kpiCard, { borderLeftColor: color }]}
      onPress={onPress}
    >
      <View style={styles.kpiHeader}>
        <Ionicons name={icon as any} size={20} color={color} />
        <Text style={styles.kpiTitle}>{title}</Text>
      </View>
      <Text style={[styles.kpiValue, { color }]}>{value}</Text>
      {change && (
        <View style={styles.changeContainer}>
          <Ionicons
            name={change.isPositive ? 'trending-up' : 'trending-down'}
            size={12}
            color={
              change.isPositive ? theme.colors.success : theme.colors.error
            }
          />
          <Text
            style={[
              styles.changeText,
              {
                color: change.isPositive
                  ? theme.colors.success
                  : theme.colors.error,
              },
            ]}
          >
            {change.isPositive ? '+' : ''}
            {change.value.toFixed(1)}%
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderPeriodButton = (period: typeof selectedPeriod, label: string) => (
    <TouchableOpacity
      style={[
        styles.periodButton,
        selectedPeriod === period && styles.periodButtonActive,
      ]}
      onPress={() => setSelectedPeriod(period)}
    >
      <Text
        style={[
          styles.periodButtonText,
          selectedPeriod === period && styles.periodButtonTextActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return <LoadingSpinner message='Loading financial dashboard...' />;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name='arrow-back' size={24} color='#fff' />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Finance Dashboard</Text>
        <TouchableOpacity
          style={styles.exportButton}
          onPress={() => navigation.navigate('FinanceReports')}
        >
          <Ionicons name='document-text' size={24} color='#fff' />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Period Selector */}
        <View style={styles.periodSelector}>
          {renderPeriodButton('3m', '3 Months')}
          {renderPeriodButton('6m', '6 Months')}
          {renderPeriodButton('12m', '12 Months')}
        </View>

        {financialData && (
          <>
            {/* Key Performance Indicators */}
            <View style={styles.kpiContainer}>
              {renderKPICard(
                'Total Revenue',
                formatCurrency(
                  financialData.monthly_revenue.reduce(
                    (sum, rev) => sum + rev,
                    0
                  )
                ),
                'cash',
                theme.colors.primary,
                {
                  value: financialData.quarterly_growth,
                  isPositive: financialData.quarterly_growth > 0,
                },
                () => navigation.navigate('RevenueDetail')
              )}

              {renderKPICard(
                'Outstanding',
                formatCurrency(financialData.outstanding_invoices),
                'time',
                theme.colors.warning,
                undefined,
                () => navigation.navigate('InvoiceManagement')
              )}

              {renderKPICard(
                'Overdue',
                formatCurrency(financialData.overdue_amount),
                'warning',
                theme.colors.error,
                undefined,
                () => navigation.navigate('OverdueInvoices')
              )}

              {renderKPICard(
                'Tax Due',
                formatCurrency(financialData.tax_obligations),
                'receipt',
                theme.colors.textSecondary,
                undefined,
                () => navigation.navigate('TaxCenter')
              )}
            </View>

            {/* Revenue Trend Chart */}
            <FinanceChart
              type='line'
              data={getRevenueChartData()}
              title='Revenue Trend'
              subtitle={`Last 6 months • ${formatCurrency(financialData.yearly_projection)} projected annually`}
              height={200}
            />

            {/* Profit Analysis Chart */}
            <FinanceChart
              type='bar'
              data={getProfitChartData()}
              title='Profit Analysis'
              subtitle='Monthly profit after expenses'
              height={200}
            />

            {/* Cash Flow Forecast */}
            <FinanceChart
              type='bar'
              data={getCashFlowChartData()}
              title='Cash Flow Forecast'
              subtitle='Next 4 weeks projection'
              height={180}
            />

            {/* Expense Breakdown */}
            <FinanceChart
              type='pie'
              data={getExpenseBredownData()}
              title='Expense Breakdown'
              subtitle='Current period distribution'
              height={200}
            />

            {/* Quick Actions */}
            <View style={styles.actionsContainer}>
              <Text style={styles.actionsTitle}>Quick Actions</Text>
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => navigation.navigate('CreateInvoice')}
                >
                  <Ionicons
                    name='receipt-outline'
                    size={24}
                    color={theme.colors.primary}
                  />
                  <Text style={styles.actionButtonText}>Create Invoice</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => navigation.navigate('AddExpense')}
                >
                  <Ionicons
                    name='card-outline'
                    size={24}
                    color={theme.colors.primary}
                  />
                  <Text style={styles.actionButtonText}>Add Expense</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => navigation.navigate('RecordPayment')}
                >
                  <Ionicons
                    name='checkmark-circle-outline'
                    size={24}
                    color={theme.colors.primary}
                  />
                  <Text style={styles.actionButtonText}>Record Payment</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => navigation.navigate('FinanceReports')}
                >
                  <Ionicons
                    name='analytics-outline'
                    size={24}
                    color={theme.colors.primary}
                  />
                  <Text style={styles.actionButtonText}>View Reports</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Financial Insights */}
            <View style={styles.insightsContainer}>
              <Text style={styles.insightsTitle}>Financial Insights</Text>

              <View style={styles.insightCard}>
                <Ionicons
                  name='trending-up'
                  size={20}
                  color={theme.colors.success}
                />
                <View style={styles.insightContent}>
                  <Text style={styles.insightText}>
                    Your revenue has grown by{' '}
                    {financialData.quarterly_growth.toFixed(1)}% this quarter
                  </Text>
                  <Text style={styles.insightSubtext}>
                    Keep up the excellent work!
                  </Text>
                </View>
              </View>

              {financialData.overdue_amount > 0 && (
                <View style={styles.insightCard}>
                  <Ionicons
                    name='warning'
                    size={20}
                    color={theme.colors.warning}
                  />
                  <View style={styles.insightContent}>
                    <Text style={styles.insightText}>
                      You have {formatCurrency(financialData.overdue_amount)} in
                      overdue invoices
                    </Text>
                    <Text style={styles.insightSubtext}>
                      Consider sending reminders to improve cash flow
                    </Text>
                  </View>
                </View>
              )}

              <View style={styles.insightCard}>
                <Ionicons name='bulb' size={20} color={theme.colors.primary} />
                <View style={styles.insightContent}>
                  <Text style={styles.insightText}>
                    Based on your trends, you could save 15% on material costs
                    by bulk purchasing
                  </Text>
                  <Text style={styles.insightSubtext}>
                    Consider negotiating better supplier rates
                  </Text>
                </View>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surfaceSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: theme.colors.primary,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.textInverse,
  },
  exportButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  periodSelector: {
    flexDirection: 'row',
    paddingVertical: 16,
    gap: 8,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
  },
  periodButtonActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary,
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textPrimary,
  },
  periodButtonTextActive: {
    color: theme.colors.textInverse,
  },
  kpiContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  kpiCard: {
    flex: 1,
    minWidth: (screenWidth - 44) / 2, // 2 cards per row with margins
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    padding: 16,
    borderLeftWidth: 4,
    ...theme.shadows.base,
  },
  kpiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  kpiTitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginLeft: 8,
    fontWeight: '500',
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  changeText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  actionsContainer: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    padding: 16,
    marginBottom: 16,
    ...theme.shadows.base,
  },
  actionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    minWidth: (screenWidth - 72) / 2,
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSecondary,
  },
  actionButtonText: {
    fontSize: 12,
    color: theme.colors.textPrimary,
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '500',
  },
  insightsContainer: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    padding: 16,
    marginBottom: 32,
    ...theme.shadows.base,
  },
  insightsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 16,
  },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  insightContent: {
    flex: 1,
    marginLeft: 12,
  },
  insightText: {
    fontSize: 14,
    color: theme.colors.textPrimary,
    marginBottom: 4,
    lineHeight: 20,
  },
  insightSubtext: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 16,
  },
});

export default FinanceDashboardScreen;
