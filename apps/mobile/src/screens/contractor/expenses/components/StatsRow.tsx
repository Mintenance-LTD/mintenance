import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../theme/styles';
import { STAT_PALETTE } from '../theme/statColors';

/**
 * Three-stat row across the top of the Expenses screen.
 * Extracted 2026-05-09 (AUDIT_PUNCH_LIST P2 #44a).
 */
export function StatsRow({
  totalExpenses,
  thisMonth,
  billableTotal,
}: {
  totalExpenses: number;
  thisMonth: number;
  billableTotal: number;
}) {
  const stats = [
    {
      label: 'Total',
      value: `£${totalExpenses.toFixed(2)}`,
      icon: 'wallet-outline' as const,
      color: STAT_PALETTE.total.color,
      bg: STAT_PALETTE.total.bg,
    },
    {
      label: 'This Month',
      value: `£${thisMonth.toFixed(2)}`,
      icon: 'calendar-outline' as const,
      color: STAT_PALETTE.thisMonth.color,
      bg: STAT_PALETTE.thisMonth.bg,
    },
    {
      label: 'Billable',
      value: `£${billableTotal.toFixed(2)}`,
      icon: 'checkmark-circle-outline' as const,
      color: STAT_PALETTE.billable.color,
      bg: STAT_PALETTE.billable.bg,
    },
  ];

  return (
    <View style={styles.statsRow}>
      {stats.map((stat) => (
        <View key={stat.label} style={styles.statCard}>
          <View style={[styles.statIconWrap, { backgroundColor: stat.bg }]}>
            <Ionicons name={stat.icon} size={16} color={stat.color} />
          </View>
          <Text style={styles.statValue}>{stat.value}</Text>
          <Text style={styles.statLabel}>{stat.label}</Text>
        </View>
      ))}
    </View>
  );
}
