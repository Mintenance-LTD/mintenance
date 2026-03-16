/**
 * StatsSection Component
 *
 * Airbnb-style contractor stat cards in a 2x2 grid.
 * Borderless, soft shadow, tinted icon circle,
 * large bold number, muted label.
 */

import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ContractorStats } from '../../services/UserService';
import { theme } from '../../theme';

interface StatsSectionProps {
  stats: ContractorStats | null;
}

interface StatConfig {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
  getValue: (s: ContractorStats | null) => string;
  label: string;
}

const STAT_CONFIG: StatConfig[] = [
  {
    icon: 'cash',
    iconColor: theme.colors.primary,
    iconBg: theme.colors.primaryLight,
    getValue: (s) => `\u00A3${s?.monthlyEarnings?.toFixed(0) || '0'}`,
    label: 'Earnings',
  },
  {
    icon: 'checkmark-circle',
    iconColor: '#3B82F6',
    iconBg: '#DBEAFE',
    getValue: (s) => `${s?.completedJobs || 0}`,
    label: 'Completed',
  },
  {
    icon: 'star',
    iconColor: theme.colors.accent,
    iconBg: theme.colors.accentLight,
    getValue: (s) => s?.rating?.toFixed(1) || 'New',
    label: 'Rating',
  },
  {
    icon: 'trophy',
    iconColor: '#8B5CF6',
    iconBg: '#EDE9FE',
    getValue: (s) => s?.successRate ? `${s.successRate}%` : 'N/A',
    label: 'Success Rate',
  },
];

export const StatsSection: React.FC<StatsSectionProps> = ({ stats }) => {
  return (
    <View style={styles.grid}>
      {STAT_CONFIG.map((cfg) => (
        <View
          key={cfg.label}
          style={styles.card}
          accessibilityLabel={`${cfg.label}: ${cfg.getValue(stats)}`}
        >
          <View style={[styles.iconWrap, { backgroundColor: cfg.iconBg }]}>
            <Ionicons name={cfg.icon} size={20} color={cfg.iconColor} accessible={false} />
          </View>
          <Text style={styles.value}>{cfg.getValue(stats)}</Text>
          <Text style={styles.label}>{cfg.label}</Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: theme.colors.surface,
    padding: 18,
    borderRadius: 16,
    alignItems: 'flex-start',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  value: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 2,
    letterSpacing: -0.5,
  },
  label: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: '400',
  },
});
