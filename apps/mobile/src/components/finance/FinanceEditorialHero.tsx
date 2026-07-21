/**
 * FinanceEditorialHero — dark forest-mint hero card for the Finance
 * dashboard, per redesign-v2 contractor business deck screen 02.
 *
 * Shows: "NET REVENUE · <month>" eyebrow, big serif amount, growth
 * delta vs prior month, then a sparkline of the trailing series.
 *
 * The delta calculation is deliberately defensive: if we have fewer
 * than 2 datapoints we omit the delta line entirely rather than show
 * a misleading "+0%" or a NaN.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, type LayoutChangeEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { me } from '../../design-system/mint-editorial';
import { Sparkline } from './Sparkline';

interface Props {
  monthlyRevenue: readonly number[];
  formatCurrency: (n: number) => string;
  /** Months the trend covers, from the dashboard's period selector. */
  periodMonths?: number;
}

const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export const FinanceEditorialHero: React.FC<Props> = ({
  monthlyRevenue,
  formatCurrency,
  periodMonths,
}) => {
  const [sparkWidth, setSparkWidth] = useState(0);
  const handleSparkLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    setSparkWidth((prev) => (Math.abs(prev - w) > 1 ? w : prev));
  };

  const monthLabel = MONTH_LABELS[new Date().getMonth()] ?? '';
  const series =
    monthlyRevenue && monthlyRevenue.length > 0 ? monthlyRevenue : [0];
  const latest = series[series.length - 1] ?? 0;
  const prior = series.length >= 2 ? (series[series.length - 2] ?? 0) : null;

  const hasDelta = prior !== null && prior > 0;
  const deltaPct = hasDelta
    ? ((latest - (prior as number)) / (prior as number)) * 100
    : 0;
  const deltaPositive = deltaPct >= 0;

  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>
        Net revenue · {monthLabel.toUpperCase()}
      </Text>
      <Text style={styles.amount}>{formatCurrency(latest)}</Text>
      {hasDelta && (
        <View style={styles.deltaRow}>
          <Ionicons
            name={deltaPositive ? 'arrow-up' : 'arrow-down'}
            size={12}
            color='rgba(255,255,255,0.85)'
          />
          <Text style={styles.deltaText}>
            {deltaPositive ? '+' : ''}
            {deltaPct.toFixed(0)}% vs prior · {formatCurrency(prior as number)}
          </Text>
        </View>
      )}
      {/* 2026-07-20 fix: the Sparkline was rendered without a width, so it
          fell back to its 220px default inside this full-bleed card and
          painted a graph that stopped ~60% across — the stray block on the
          hero. Measure the real width and pass it. */}
      {periodMonths ? (
        <Text style={styles.trendLabel}>
          Trend · last {periodMonths} months
        </Text>
      ) : null}
      <View style={styles.sparkWrap} onLayout={handleSparkLayout}>
        {sparkWidth > 0 && (
          <Sparkline data={series} width={sparkWidth} height={64} />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: me.brand2,
    borderRadius: 20,
    paddingVertical: 22,
    paddingHorizontal: 22,
    overflow: 'hidden',
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.65)',
    textTransform: 'uppercase',
    letterSpacing: 1.6,
    marginBottom: 8,
  },
  amount: {
    fontFamily: me.font.display,
    fontSize: 40,
    color: me.onBrand,
    letterSpacing: me.displayTracking,
  },
  deltaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  deltaText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '600',
  },
  trendLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
    marginTop: 16,
  },
  sparkWrap: {
    marginTop: 8,
    marginHorizontal: -22,
    marginBottom: -22,
    paddingHorizontal: 0,
  },
});

export default FinanceEditorialHero;
