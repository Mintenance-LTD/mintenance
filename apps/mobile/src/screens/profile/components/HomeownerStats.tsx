import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../theme';

interface HomeownerStatsProps {
  totalJobs: number;
  completedJobs: number;
  activeJobs: number;
}

interface StatCard {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
  valueColor: string;
  value: number;
  label: string;
}

export const HomeownerStats: React.FC<HomeownerStatsProps> = ({
  totalJobs,
  completedJobs,
  activeJobs,
}) => {
  const stats: StatCard[] = [
    {
      icon: 'list',
      iconColor: '#717171',
      iconBg: '#F7F7F7',
      valueColor: theme.colors.textPrimary,
      value: totalJobs,
      label: 'Posted',
    },
    {
      icon: 'checkmark-circle',
      iconColor: '#717171',
      iconBg: '#F7F7F7',
      valueColor: theme.colors.textPrimary,
      value: completedJobs,
      label: 'Completed',
    },
    {
      icon: 'time',
      iconColor: '#717171',
      iconBg: '#F7F7F7',
      valueColor: theme.colors.textPrimary,
      value: activeJobs,
      label: 'Active',
    },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle} accessibilityRole="header">
        Your Activity
      </Text>
      <View style={styles.row}>
        {stats.map((s) => (
          <View key={s.label} style={styles.card} accessibilityLabel={`${s.value} ${s.label}`}>
            <View style={[styles.iconChip, { backgroundColor: s.iconBg }]}>
              <Ionicons name={s.icon} size={18} color={s.iconColor} />
            </View>
            <Text style={[styles.value, { color: s.valueColor }]}>{s.value}</Text>
            <Text style={styles.label}>{s.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 8,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  card: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 14,
    alignItems: 'flex-start',
    ...theme.shadows.sm,
  },
  iconChip: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  value: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
});
