import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import type { FinancialSummary } from '../../services/contractor-business';

interface FinancialInsightsProps {
  financialData: FinancialSummary;
  formatCurrency: (amount: number) => string;
}

export const FinancialInsights: React.FC<FinancialInsightsProps> = ({
  financialData,
  formatCurrency,
}) => {
  return (
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
  );
};

const styles = StyleSheet.create({
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
