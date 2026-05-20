/**
 * StatsSection Component — Direction A · Mint Editorial.
 *
 * Bento-grid layout:
 * - Full-width "Active Portfolio" hero card with teal corner accent
 * - 2x2 grid of stat cards below (Earnings, Completed, Rating, Success Rate)
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { ContractorStats } from '../../services/UserService';
import { me } from '../../design-system/mint-editorial';
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

// `Completed` + `Success Rate` keep their decorative identity colours;
// `Earnings` + `Rating` use the Mint Editorial brand / warm tokens.
const STAT_CONFIG: StatConfig[] = [
  {
    icon: 'cash',
    iconColor: me.brand,
    iconBg: me.brandSoft,
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
    iconColor: me.warm,
    iconBg: me.warnBg,
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
        <LinearGradient
          colors={[me.brand2, me.brand]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCornerAccent}
        />

        <View style={styles.heroTop}>
          <View style={styles.heroBadge}>
            <Ionicons name='rocket' size={16} color={me.brand} />
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
    borderRadius: me.radius.card,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: me.surface,
    borderWidth: 1,
    borderColor: me.line,
    ...me.shadow.pop,
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
    backgroundColor: me.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: me.brand,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  heroValue: {
    fontFamily: me.font.display,
    fontSize: 52,
    color: me.ink,
    letterSpacing: me.displayTracking,
  },
  heroLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: me.ink2,
    marginBottom: 24,
  },
  heroBottom: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  heroPayoutValue: {
    fontFamily: me.font.display,
    fontSize: 28,
    color: me.brand,
    letterSpacing: me.displayTracking,
  },
  heroPayoutLabel: {
    fontSize: 13,
    color: me.ink2,
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
    backgroundColor: me.surface,
    padding: 18,
    borderRadius: me.radius.card,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: me.line,
    ...me.shadow.card,
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
    fontFamily: me.font.display,
    fontSize: 26,
    color: me.ink,
    marginBottom: 2,
    letterSpacing: me.displayTracking,
  },
  label: {
    fontSize: 11,
    color: me.ink2,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
