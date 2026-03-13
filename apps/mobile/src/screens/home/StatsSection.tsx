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
    iconColor: '#10B981',
    iconBg: '#D1FAE5',
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
    iconColor: '#F59E0B',
    iconBg: '#FEF3C7',
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
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle} accessibilityRole="header">
          Your Stats
        </Text>
        <Text style={styles.sectionSubtitle}>Overview</Text>
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
            <Text style={styles.value}>{cfg.getValue(stats)}</Text>
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
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#222222',
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#B0B0B0',
    fontWeight: '400',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FFFFFF',
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
    color: '#222222',
    marginBottom: 2,
    letterSpacing: -0.5,
  },
  label: {
    fontSize: 13,
    color: '#717171',
    fontWeight: '400',
  },
});
