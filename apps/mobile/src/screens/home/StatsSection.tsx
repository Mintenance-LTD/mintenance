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
    iconColor: '#717171',
    iconBg: '#F7F7F7',
    getValue: (s) => `£${s?.monthlyEarnings?.toFixed(0) || '0'}`,
    label: 'Monthly Earnings',
    valueColor: theme.colors.textPrimary,
  },
  {
    icon: 'checkmark-circle',
    iconColor: '#717171',
    iconBg: '#F7F7F7',
    getValue: (s) => `${s?.completedJobs || 0}`,
    label: 'Jobs Completed',
    valueColor: theme.colors.textPrimary,
  },
  {
    icon: 'star',
    iconColor: '#717171',
    iconBg: '#F7F7F7',
    getValue: (s) => s?.rating?.toFixed(1) || 'New',
    label: 'Avg Rating',
    valueColor: theme.colors.textPrimary,
  },
  {
    icon: 'flash',
    iconColor: '#717171',
    iconBg: '#F7F7F7',
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
    marginTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: theme.colors.textTertiary,
    fontWeight: '500',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  card: {
    backgroundColor: '#F7F7F7',
    flex: 1,
    minWidth: '45%',
    padding: 18,
    borderRadius: 12,
    alignItems: 'flex-start',
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  value: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 3,
    letterSpacing: -0.3,
  },
  label: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
});
