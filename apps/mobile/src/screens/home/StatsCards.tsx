/**
 * StatsCards Component
 *
 * Compact horizontal stat row for quick KPI overview.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';

interface StatsCardsProps {
  activeJobs?: number;
  completedJobs?: number;
  totalSpent?: number;
  savedPros?: number;
}

export const StatsCards: React.FC<StatsCardsProps> = ({
  activeJobs = 0,
  completedJobs = 0,
  totalSpent = 0,
  savedPros = 0,
}) => {
  const stats = [
    { label: 'Active', value: activeJobs, icon: 'briefcase-outline' as const, color: theme.colors.primary },
    { label: 'Done', value: completedJobs, icon: 'checkmark-circle-outline' as const, color: '#34C759' },
    { label: 'Spent', value: totalSpent > 0 ? `£${totalSpent.toLocaleString()}` : '£0', icon: 'card-outline' as const, color: '#FF9500' },
    { label: 'Saved', value: savedPros, icon: 'heart-outline' as const, color: '#FF6B6B' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {stats.map((stat) => (
          <View key={stat.label} style={styles.statItem}>
            <Ionicons name={stat.icon} size={18} color={stat.color} />
            <Text style={styles.value}>{stat.value}</Text>
            <Text style={styles.label}>{stat.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    paddingVertical: 14,
  },
  value: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  label: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
});
