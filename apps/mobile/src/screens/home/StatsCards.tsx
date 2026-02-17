/**
 * StatsCards Component
 *
 * Displays KPI stat cards matching the web dashboard layout:
 * Active Jobs, Completed, Total Spent, Saved Pros
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';

interface StatItem {
  label: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

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
  const stats: StatItem[] = [
    {
      label: 'Active Jobs',
      value: activeJobs,
      icon: 'briefcase-outline',
      color: theme.colors.info,
    },
    {
      label: 'Completed',
      value: completedJobs,
      icon: 'checkmark-circle-outline',
      color: theme.colors.success,
    },
    {
      label: 'Total Spent',
      value: totalSpent > 0 ? `£${totalSpent.toLocaleString()}` : '£0',
      icon: 'card-outline',
      color: theme.colors.secondary,
    },
    {
      label: 'Saved Pros',
      value: savedPros,
      icon: 'heart-outline',
      color: theme.colors.error,
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        {stats.map((stat) => (
          <View key={stat.label} style={styles.card}>
            <View style={[styles.iconContainer, { backgroundColor: stat.color + '15' }]}>
              <Ionicons name={stat.icon} size={20} color={stat.color} />
            </View>
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
    marginBottom: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    ...theme.shadows.sm,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  value: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  label: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
});
