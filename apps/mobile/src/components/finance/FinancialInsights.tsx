/**
 * FinancialInsights — short, true statements derived from this contractor's
 * own figures.
 *
 * 2026-07-20 rewrite. The previous version had two honesty problems:
 *   1. The growth line rendered unconditionally, so a contractor with no
 *      revenue read "Revenue grew 0.0% this quarter · Keep up the momentum!".
 *      It also said "grew" for negative values — a 20% drop rendered as
 *      "Revenue grew -20.0%".
 *   2. It appended a hardcoded "Bulk purchasing could save ~15% on materials"
 *      to every contractor regardless of their data. Invented advice inside a
 *      panel labelled "Insights" implies it was derived from their numbers.
 *
 * Every entry below is now conditional on data that supports it, and the card
 * renders nothing at all when there is nothing true to say.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { FinancialSummary } from '../../services/contractor-business';
import { me } from '../../design-system/mint-editorial';

interface FinancialInsightsProps {
  financialData: FinancialSummary;
  formatCurrency: (amount: number) => string;
}

export interface Insight {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  fg: string;
  bg: string;
  text: string;
  sub: string;
}

/**
 * Pure so every branch is directly testable. Order is deliberate: money the
 * contractor is waiting on comes before commentary on trends.
 */
export function buildInsights(
  data: FinancialSummary,
  formatCurrency: (amount: number) => string
): Insight[] {
  const insights: Insight[] = [];

  const escrow = data.escrow_in_flight ?? 0;
  if (escrow > 0) {
    insights.push({
      key: 'escrow',
      icon: 'time-outline',
      fg: me.warnFg,
      bg: me.warnBg,
      text: `${formatCurrency(escrow)} waiting on approval`,
      sub: 'Released once the homeowner approves the work',
    });
  }

  if (data.overdue_amount > 0) {
    insights.push({
      key: 'overdue',
      icon: 'alert-circle-outline',
      fg: me.errFg,
      bg: me.errBg,
      text: `${formatCurrency(data.overdue_amount)} in overdue invoices`,
      sub: 'Send a reminder to improve cash flow',
    });
  }

  // Exactly 0 means "no basis to comment" — getFinancialSummary returns 0
  // both for a flat quarter and when there isn't enough history to compare.
  // Saying nothing beats saying "grew 0.0%".
  if (data.quarterly_growth !== 0) {
    const up = data.quarterly_growth > 0;
    insights.push({
      key: 'growth',
      icon: up ? 'trending-up' : 'trending-down',
      fg: up ? me.okFg : me.errFg,
      bg: up ? me.okBg : me.errBg,
      text: `Revenue ${up ? 'grew' : 'fell'} ${Math.abs(
        data.quarterly_growth
      ).toFixed(1)}% this quarter`,
      sub: 'Compared with the previous quarter',
    });
  }

  const breakdown = data.expense_breakdown ?? [];
  const totalExpenses = data.total_expenses ?? 0;
  if (breakdown.length > 0 && totalExpenses > 0) {
    const top = breakdown.reduce((a, b) => (b.amount > a.amount ? b : a));
    insights.push({
      key: 'top-expense',
      icon: 'pie-chart-outline',
      fg: me.brand2,
      bg: me.brandSoft,
      text: `${top.category} is ${Math.round(top.percentage)}% of your costs`,
      sub: `${formatCurrency(top.amount)} of ${formatCurrency(totalExpenses)}`,
    });
  }

  return insights;
}

export const FinancialInsights: React.FC<FinancialInsightsProps> = ({
  financialData,
  formatCurrency,
}) => {
  const insights = buildInsights(financialData, formatCurrency);
  // Nothing true to say — render nothing rather than pad the screen.
  if (insights.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Insights</Text>
      {insights.map((insight, i) => (
        <View
          key={insight.key}
          style={[styles.row, i === insights.length - 1 && styles.rowLast]}
        >
          <View style={[styles.iconWrap, { backgroundColor: insight.bg }]}>
            <Ionicons name={insight.icon} size={18} color={insight.fg} />
          </View>
          <View style={styles.textWrap}>
            <Text style={styles.insightText}>{insight.text}</Text>
            <Text style={styles.insightSub}>{insight.sub}</Text>
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: me.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: me.line,
    ...me.shadow.card,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: me.ink,
    letterSpacing: -0.3,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: me.line2,
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
    color: me.ink,
    fontWeight: '600',
    lineHeight: 20,
    marginBottom: 2,
  },
  insightSub: {
    fontSize: 12,
    color: me.ink3,
    lineHeight: 16,
  },
});
