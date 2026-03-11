/**
 * StatsCards Component
 *
 * Web-dashboard-style KPI cards in a 2x2 grid.
 * Each card: icon in colored circle, bold metric, label.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { Skeleton } from '../../components/skeletons/Skeleton';

interface StatsCardsProps {
  isLoading?: boolean;
  activeJobs?: number;
  completedJobs?: number;
  totalSpent?: number;
  savedPros?: number;
}

interface StatConfig {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
  getValue: (props: StatsCardsProps) => string;
}

const STATS: StatConfig[] = [
  {
    label: 'Active Jobs',
    icon: 'briefcase',
    iconColor: theme.colors.primary,
    iconBg: theme.colors.primaryLight,
    getValue: (p) => `${p.activeJobs ?? 0}`,
  },
  {
    label: 'Total Spent',
    icon: 'card',
    iconColor: theme.colors.success,
    iconBg: theme.colors.primaryLight,
    getValue: (p) => {
      const v = p.totalSpent ?? 0;
      return v > 0 ? `\u00A3${v.toLocaleString()}` : '\u00A30';
    },
  },
  {
    label: 'Completed',
    icon: 'checkmark-circle',
    iconColor: theme.colors.success,
    iconBg: theme.colors.primaryLight,
    getValue: (p) => `${p.completedJobs ?? 0}`,
  },
  {
    label: 'Saved Pros',
    icon: 'star',
    iconColor: theme.colors.warning,
    iconBg: theme.colors.accentLight,
    getValue: (p) => `${p.savedPros ?? 0}`,
  },
];

export const StatsCards: React.FC<StatsCardsProps> = (props) => {
  if (props.isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.grid}>
          {STATS.map((stat) => (
            <View key={stat.label} style={styles.card}>
              <Skeleton width={40} height={40} borderRadius={12} />
              <Skeleton width={60} height={26} borderRadius={6} style={{ marginTop: 12 }} />
              <Skeleton width={80} height={12} borderRadius={4} style={{ marginTop: 6 }} />
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        {STATS.map((stat) => (
          <View
            key={stat.label}
            style={styles.card}
            accessibilityLabel={`${stat.label}: ${stat.getValue(props)}`}
          >
            <View style={[styles.iconCircle, { backgroundColor: stat.iconBg }]}>
              <Ionicons name={stat.icon} size={20} color={stat.iconColor} />
            </View>
            <Text style={styles.value}>{stat.getValue(props)}</Text>
            <Text style={styles.label}>{stat.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.lg,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  card: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  iconCircle: {
    width: theme.spacing[10],
    height: theme.spacing[10],
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing[3],
  },
  value: {
    fontSize: 26,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  label: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: theme.typography.fontWeight.medium,
  },
});
