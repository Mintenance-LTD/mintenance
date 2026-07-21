/**
 * FinanceBento — 4-up bento grid below the dark hero per
 * redesign-v2 contractor business deck screen 02:
 *   Cash in · Expenses · In escrow · Outstanding
 *
 * Each tile is a paper card with a coloured eyebrow + serif amount.
 * Values come from the existing FinancialSummary shape:
 *   - cashIn      → escrow_revenue (terminal escrow releases)
 *   - expenses    → total_expenses
 *   - inEscrow    → escrow_in_flight (held + release_pending)
 *   - outstanding → outstanding_invoices
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { me } from '../../design-system/mint-editorial';

interface Props {
  cashIn: number;
  expenses: number;
  inEscrow: number;
  outstanding: number;
  formatCurrency: (n: number) => string;
}

interface TileSpec {
  label: string;
  amount: number;
  fg: string;
}

export const FinanceBento: React.FC<Props> = ({
  cashIn,
  expenses,
  inEscrow,
  outstanding,
  formatCurrency,
}) => {
  const tiles: TileSpec[] = [
    // 2026-07-20: was "Cash in", which overpromises — this is
    // `escrow_revenue`, i.e. escrow that has actually been released to the
    // contractor. "Received" is what that money is.
    { label: 'Received', amount: cashIn, fg: me.brand },
    { label: 'Expenses', amount: expenses, fg: me.errFg },
    { label: 'In escrow', amount: inEscrow, fg: me.warnFg },
    { label: 'Outstanding', amount: outstanding, fg: me.ink2 },
  ];
  return (
    <View style={styles.grid}>
      {tiles.map((t) => (
        <View key={t.label} style={styles.tile}>
          <Text style={[styles.tileLabel, { color: t.fg }]}>
            {t.label.toUpperCase()}
          </Text>
          <Text style={styles.tileAmount}>{formatCurrency(t.amount)}</Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
  },
  tile: {
    width: '47.5%',
    flexGrow: 1,
    backgroundColor: me.surface,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: me.line2,
    ...me.shadow.card,
  },
  tileLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  tileAmount: {
    fontFamily: me.font.display,
    fontSize: 22,
    color: me.ink,
    letterSpacing: me.displayTracking,
  },
});

export default FinanceBento;
