/**
 * MonthHero — amber-tinted "THIS MONTH" card per redesign-v2
 * contractor business deck screen 05.
 *
 * Replaces the legacy 3-stat row at the top of the Expenses screen
 * with a single editorial card: eyebrow + serif amount + meta line
 * with receipt count.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { me } from '../../../../design-system/mint-editorial';

interface Props {
  thisMonth: number;
  receiptCount: number;
  formatCurrency: (n: number) => string;
}

export const MonthHero: React.FC<Props> = ({
  thisMonth,
  receiptCount,
  formatCurrency,
}) => (
  <View style={styles.card}>
    <Text style={styles.eyebrow}>This month</Text>
    <Text style={styles.amount}>{formatCurrency(thisMonth)}</Text>
    <Text style={styles.sub}>
      {receiptCount} {receiptCount === 1 ? 'receipt' : 'receipts'} ·
      auto-categorised
    </Text>
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: me.warnBg,
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 20,
    marginHorizontal: 20,
    marginBottom: 22,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: me.warnFg,
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    marginBottom: 6,
  },
  amount: {
    fontFamily: me.font.display,
    fontSize: 36,
    color: me.warnFg,
    letterSpacing: me.displayTracking,
  },
  sub: {
    fontSize: 13,
    color: me.warnFg,
    marginTop: 6,
  },
});

export default MonthHero;
