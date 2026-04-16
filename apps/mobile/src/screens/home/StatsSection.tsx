/**
 * StatsSection Component
 *
 * Bento-grid layout inspired by the contractor dashboard HTML mockup:
 * - Full-width "Active Portfolio" hero card with gradient bg
 * - 2x2 grid of stat cards below (Earnings, Completed, Rating, Success Rate)
 */

import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { ContractorStats } from '../../services/UserService';
import { theme, gradients } from '../../theme';
import { formatCurrency } from '../../utils/formatCurrency';

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
    getValue: (s) => formatCurrency(s?.monthlyEarnings ?? 0),
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
    getValue: (s) => (s?.successRate ? `${s.successRate}%` : 'N/A'),
    label: 'Success Rate',
  },
];

export const StatsSection: React.FC<StatsSectionProps> = ({ stats }) => {
  const activeJobs = stats?.activeJobs ?? 0;
  const pendingPayouts = stats?.monthlyEarnings ?? 0;

  return (
    <View style={styles.container}>
      {/* Hero portfolio card — white with teal corner accent */}
      <View style={styles.heroCard}>
        {/* Teal corner accent */}
        <LinearGradient
          colors={gradients.heroGreen}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCornerAccent}
        />

        <View style={styles.heroTop}>
          <View style={styles.heroBadge}>
            <Ionicons name='rocket' size={16} color={theme.colors.primary} />
          </View>
          <Text style={styles.heroBadgeText}>Active Portfolio</Text>
        </View>

        <Text style={styles.heroValue}>{activeJobs}</Text>
        <Text style={styles.heroLabel}>Active Jobs in Pipeline</Text>

        <View style={styles.heroBottom}>
          <Text style={styles.heroPayoutValue}>
            {formatCurrency(pendingPayouts)}
          </Text>
          <Text style={styles.heroPayoutLabel}>Pending Payouts</Text>
        </View>
      </View>

      {/* 2x2 stat grid */}
      <View style={styles.grid}>
        {STAT_CONFIG.map((cfg) => (
          <View
            key={cfg.label}
            style={styles.card}
            accessibilityLabel={`${cfg.label}: ${cfg.getValue(stats)}`}
          >
            <View style={[styles.iconWrap, { backgroundColor: cfg.iconBg }]}>
              <Ionicons
                name={cfg.icon}
                size={20}
                color={cfg.iconColor}
                accessible={false}
              />
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
  container: {
    gap: 12,
  },
  // Hero portfolio card — white with teal corner
  heroCard: {
    padding: 24,
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  heroCornerAccent: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  heroBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  heroValue: {
    fontSize: 52,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    letterSpacing: -2,
  },
  heroLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    marginBottom: 24,
  },
  heroBottom: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  heroPayoutValue: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.primary,
    letterSpacing: -0.5,
  },
  heroPayoutLabel: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  // 2x2 stat grid
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
    borderRadius: 20,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
      android: {
        elevation: 1,
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
    fontSize: 26,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 2,
    letterSpacing: -0.5,
  },
  label: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
