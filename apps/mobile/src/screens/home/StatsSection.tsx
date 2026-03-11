/**
 * StatsSection Component
 *
 * Monochrome stat cards with bold numbers — Airbnb style.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { ContractorStats } from '../../services/UserService';

interface StatsSectionProps {
  stats: ContractorStats | null;
}

interface StatConfig {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
  getValue: (s: ContractorStats | null) => string;
  label: string;
  valueColor: string;
}

const STAT_CONFIG: StatConfig[] = [
  {
    icon: 'cash',
    iconColor: theme.colors.success,
    iconBg: theme.colors.primaryLight,
    getValue: (s) => `\u00A3${s?.monthlyEarnings?.toFixed(0) || '0'}`,
    label: 'Monthly Earnings',
    valueColor: theme.colors.textPrimary,
  },
  {
    icon: 'checkmark-circle',
    iconColor: theme.colors.primary,
    iconBg: theme.colors.primaryLight,
    getValue: (s) => `${s?.completedJobs || 0}`,
    label: 'Jobs Completed',
    valueColor: theme.colors.textPrimary,
  },
  {
    icon: 'star',
    iconColor: theme.colors.warning,
    iconBg: theme.colors.accentLight,
    getValue: (s) => s?.rating?.toFixed(1) || 'New',
    label: 'Avg Rating',
    valueColor: theme.colors.textPrimary,
  },
  {
    icon: 'flash',
    iconColor: theme.colors.info,
    iconBg: theme.colors.backgroundSecondary,
    getValue: (s) => s?.responseTime || 'N/A',
    label: 'Response Time',
    valueColor: theme.colors.textPrimary,
  },
];

export const StatsSection: React.FC<StatsSectionProps> = ({ stats }) => {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle} accessibilityRole="header">
          Your Stats
        </Text>
        <Text style={styles.sectionSubtitle}>This month</Text>
      </View>

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
            <Text style={[styles.value, { color: cfg.valueColor }]}>
              {cfg.getValue(stats)}
            </Text>
            <Text style={styles.label}>{cfg.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: 28,
    marginTop: theme.spacing[5],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: theme.typography.briefSizes.secondary,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: theme.colors.textTertiary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  card: {
    backgroundColor: theme.colors.surface,
    flex: 1,
    minWidth: '45%',
    padding: 18,
    borderRadius: theme.borderRadius.xl,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  iconWrap: {
    width: theme.spacing[10],
    height: theme.spacing[10],
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing[3],
  },
  value: {
    fontSize: 28,
    fontWeight: theme.typography.fontWeight.bold,
    marginBottom: 3,
    letterSpacing: -0.3,
  },
  label: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: theme.typography.fontWeight.medium,
  },
});
