import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { FinancialSummary } from '../../services/contractor-business';

interface FinancialInsightsProps {
  financialData: FinancialSummary;
  formatCurrency: (amount: number) => string;
}

export const FinancialInsights: React.FC<FinancialInsightsProps> = ({
  financialData,
  formatCurrency,
}) => {
  const insights: { icon: keyof typeof Ionicons.glyphMap; iconColor: string; iconBg: string; text: string; sub: string }[] = [
    {
      icon: 'trending-up',
      iconColor: '#10B981',
      iconBg: '#D1FAE5',
      text: `Revenue grew ${financialData.quarterly_growth.toFixed(1)}% this quarter`,
      sub: 'Keep up the momentum!',
    },
  ];

  if (financialData.overdue_amount > 0) {
    insights.push({
      icon: 'warning',
      iconColor: '#F59E0B',
      iconBg: '#FEF3C7',
      text: `${formatCurrency(financialData.overdue_amount)} in overdue invoices`,
      sub: 'Send reminders to improve cash flow',
    });
  }

  insights.push({
    icon: 'bulb',
    iconColor: '#8B5CF6',
    iconBg: '#EDE9FE',
    text: 'Bulk purchasing could save ~15% on materials',
    sub: 'Negotiate better supplier rates',
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Insights</Text>

      {insights.map((insight, i) => {
        const isLast = i === insights.length - 1;
        return (
          <View key={i} style={[styles.row, isLast && styles.rowLast]}>
            <View style={[styles.iconWrap, { backgroundColor: insight.iconBg }]}>
              <Ionicons name={insight.icon} size={18} color={insight.iconColor} />
            </View>
            <View style={styles.textWrap}>
              <Text style={styles.insightText}>{insight.text}</Text>
              <Text style={styles.insightSub}>{insight.sub}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 32,
    ...Platform.select({
      ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 12 },
      android: { elevation: 2 },
    }),
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222222',
    letterSpacing: -0.3,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F0F0F0',
  },
  rowLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textWrap: {
    flex: 1,
  },
  insightText: {
    fontSize: 14,
    color: '#222222',
    fontWeight: '600',
    lineHeight: 20,
    marginBottom: 2,
  },
  insightSub: {
    fontSize: 12,
    color: '#717171',
    lineHeight: 16,
  },
});
