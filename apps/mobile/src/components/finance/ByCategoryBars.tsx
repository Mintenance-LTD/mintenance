/**
 * ByCategoryBars — horizontal-bar breakdown shown below the bento.
 *
 * The deck (screen 02) labels this "BY TRADE · LAST 90 DAYS" with
 * revenue-by-job-category. The mobile FinancialSummary today exposes
 * `expense_breakdown` (expenses by category) rather than revenue by
 * trade — wiring a true revenue-by-category source would need a new
 * server endpoint. To stay honest we surface expense_breakdown under
 * its accurate label ("Top expenses · last 90 days") instead of
 * mis-titling it as revenue.
 *
 * Self-hides when there's nothing to show.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { me } from '../../design-system/mint-editorial';

interface Row {
  category: string;
  amount: number;
  percentage: number;
}

interface Props {
  breakdown: Row[] | undefined;
  formatCurrency: (n: number) => string;
}

export const ByCategoryBars: React.FC<Props> = ({
  breakdown,
  formatCurrency,
}) => {
  if (!breakdown || breakdown.length === 0) return null;
  const top = [...breakdown].sort((a, b) => b.amount - a.amount).slice(0, 5);
  const max = top[0]?.amount ?? 0;
  if (max <= 0) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.eyebrow}>Top expenses · last 90 days</Text>
      {top.map((row) => {
        const pct = max === 0 ? 0 : Math.max(8, (row.amount / max) * 100);
        return (
          <View key={row.category} style={styles.row}>
            <View style={styles.rowHeader}>
              <Text style={styles.rowLabel} numberOfLines={1}>
                {row.category}
              </Text>
              <Text style={styles.rowAmount}>{formatCurrency(row.amount)}</Text>
            </View>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${pct}%` }]} />
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    marginTop: 28,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '700',
    color: me.ink3,
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    marginBottom: 14,
  },
  row: {
    marginBottom: 12,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  rowLabel: {
    fontSize: 13,
    color: me.ink,
    fontWeight: '600',
    flex: 1,
    marginRight: 12,
  },
  rowAmount: {
    fontSize: 13,
    color: me.ink2,
    fontWeight: '600',
  },
  barTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: me.bg2,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: me.brand,
    borderRadius: 3,
  },
});

export default ByCategoryBars;
