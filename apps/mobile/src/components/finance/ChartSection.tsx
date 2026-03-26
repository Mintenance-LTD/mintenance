import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FinanceChart } from '../FinanceChart';
import type { FinancialSummary } from '../../services/contractor-business';
import { theme } from '../../theme';

interface ChartSectionProps {
  financialData: FinancialSummary;
  formatCurrency: (amount: number) => string;
}

const EXPENSE_CATEGORIES = [
  { key: 'materials', label: 'Materials', icon: 'cube-outline' as const, color: theme.colors.textPrimary },
  { key: 'labor', label: 'Labour', icon: 'people-outline' as const, color: theme.colors.primary },
  { key: 'transport', label: 'Transport', icon: 'car-outline' as const, color: theme.colors.accent },
  { key: 'equipment', label: 'Equipment', icon: 'hammer-outline' as const, color: '#3B82F6' },
  { key: 'other', label: 'Other', icon: 'ellipsis-horizontal-outline' as const, color: '#8B5CF6' },
];

// Expense percentages are computed from real data when available;
// fallback to empty (no fake data shown)
const DEFAULT_EXPENSE_PERCENTAGES = [0, 0, 0, 0, 0];

export const ChartSection: React.FC<ChartSectionProps> = ({
  financialData,
  formatCurrency,
}) => {
  // Revenue trend data with dynamic month labels
  const revenueData = {
    labels: financialData.monthly_revenue.slice(-6).map((_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      return d.toLocaleString('en-GB', { month: 'short' });
    }),
    datasets: [
      {
        data: financialData.monthly_revenue.slice(-6).map((v) => Math.max(v, 0)),
        color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
        strokeWidth: 2,
      },
    ],
  };

  // Use real expense data if available, otherwise show zero
  const realExpenseTotal = financialData.total_expenses ?? 0;
  const totalExpenses = realExpenseTotal > 0 ? realExpenseTotal : 0;
  const EXPENSE_PERCENTAGES = financialData.expense_breakdown?.length
    ? financialData.expense_breakdown.map((e: { percentage: number }) => e.percentage)
    : DEFAULT_EXPENSE_PERCENTAGES;
  const hasExpenses = totalExpenses > 0;

  return (
    <>
      {/* Revenue Trend */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Revenue Trend</Text>
          <Text style={styles.cardSubtitle}>
            {formatCurrency(financialData.yearly_projection)} projected / yr
          </Text>
        </View>
        <FinanceChart
          type="line"
          data={revenueData}
          title=""
          height={180}
        />
      </View>

      {/* Expense Breakdown — Donut + Progress Bars */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Expense Breakdown</Text>

        {!hasExpenses ? (
          <View style={{ alignItems: 'center', paddingVertical: 24 }}>
            <Ionicons name="receipt-outline" size={40} color={theme.colors.textTertiary} />
            <Text style={{ color: theme.colors.textSecondary, marginTop: 8, fontSize: 14 }}>
              No expenses recorded yet
            </Text>
            <Text style={{ color: theme.colors.textTertiary, fontSize: 12, marginTop: 4 }}>
              Track expenses to see your breakdown
            </Text>
          </View>
        ) : (
        <>
        {/* Donut + legend row */}
        <View style={styles.donutRow}>
          <View style={styles.donutOuter}>
            <View style={styles.donutInner}>
              <Text style={styles.donutValue}>{formatCurrency(totalExpenses)}</Text>
              <Text style={styles.donutLabel}>Total</Text>
            </View>
          </View>

          <View style={styles.legendColumn}>
            {EXPENSE_CATEGORIES.map((cat, i) => (
              <View key={cat.key} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: cat.color }]} />
                <Text style={styles.legendText}>{cat.label}</Text>
                <Text style={styles.legendPercent}>{EXPENSE_PERCENTAGES[i]}%</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Category progress bars */}
        <View style={styles.progressSection}>
          {EXPENSE_CATEGORIES.map((cat, i) => {
            const amount = (EXPENSE_PERCENTAGES[i] / 100) * totalExpenses;
            const pct = EXPENSE_PERCENTAGES[i];
            return (
              <View key={cat.key} style={styles.categoryRow}>
                <View style={[styles.catIconWrap, { backgroundColor: `${cat.color}15` }]}>
                  <Ionicons name={cat.icon} size={16} color={cat.color} />
                </View>
                <View style={styles.catInfo}>
                  <View style={styles.catTopRow}>
                    <Text style={styles.catName}>{cat.label}</Text>
                    <Text style={styles.catAmount}>{formatCurrency(amount)}</Text>
                  </View>
                  <View style={styles.barBg}>
                    <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: cat.color }]} />
                  </View>
                </View>
              </View>
            );
          })}
        </View>
        </>
        )}
      </View>

      {/* Monthly Profit */}
      {financialData.profit_trends.length > 0 && (
        <FinanceChart
          type="bar"
          data={{
            labels: financialData.profit_trends.map((t) => t.month.slice(0, 3)),
            datasets: [{
              data: financialData.profit_trends.map((t) => Math.max(t.profit, 0)),
              color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
              strokeWidth: 2,
            }],
          }}
          title="Monthly Profit"
          subtitle="After expenses"
          height={180}
        />
      )}
    </>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    ...Platform.select({
      ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 12 },
      android: { elevation: 2 },
    }),
  },
  cardHeader: {
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },

  // Donut
  donutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  donutOuter: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 12,
    borderColor: theme.colors.border,
    backgroundColor: '#FAFAFA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutInner: {
    alignItems: 'center',
  },
  donutValue: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  donutLabel: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    fontWeight: '500',
    marginTop: 1,
  },

  legendColumn: {
    flex: 1,
    marginLeft: 20,
    gap: 6,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 13,
    color: theme.colors.textPrimary,
    fontWeight: '500',
    flex: 1,
  },
  legendPercent: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },

  // Progress bars
  progressSection: {
    gap: 12,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  catIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  catInfo: {
    flex: 1,
  },
  catTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  catName: {
    fontSize: 14,
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
  catAmount: {
    fontSize: 14,
    color: theme.colors.textPrimary,
    fontWeight: '700',
  },
  barBg: {
    height: 6,
    backgroundColor: theme.colors.backgroundTertiary,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: 6,
    borderRadius: 3,
  },
});
