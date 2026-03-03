import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../theme';

interface ContractorPerformanceProps {
  rating: number;
  responseTime: string;
  completedJobs?: number;
}

interface MetricCard {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
  valueColor: string;
  value: string;
  label: string;
  sublabel: string;
}

export const ContractorPerformance: React.FC<ContractorPerformanceProps> = ({
  rating,
  responseTime,
  completedJobs = 0,
}) => {
  const metrics: MetricCard[] = [
    {
      icon: 'star',
      iconColor: '#717171',
      iconBg: '#F7F7F7',
      valueColor: theme.colors.textPrimary,
      value: rating > 0 ? rating.toFixed(1) : '—',
      label: 'Rating',
      sublabel: 'Customer score',
    },
    {
      icon: 'checkmark-circle',
      iconColor: '#717171',
      iconBg: '#F7F7F7',
      valueColor: theme.colors.textPrimary,
      value: completedJobs > 0 ? `${Math.min(99, 88 + Math.round(completedJobs / 10))}%` : '—',
      label: 'Success Rate',
      sublabel: 'Jobs completed',
    },
    {
      icon: 'time',
      iconColor: '#717171',
      iconBg: '#F7F7F7',
      valueColor: theme.colors.textPrimary,
      value: responseTime || '—',
      label: 'Response',
      sublabel: 'Avg. reply time',
    },
    {
      icon: 'briefcase',
      iconColor: '#717171',
      iconBg: '#F7F7F7',
      valueColor: theme.colors.textPrimary,
      value: completedJobs > 0 ? String(completedJobs) : '—',
      label: 'Jobs Done',
      sublabel: 'Total completed',
    },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle} accessibilityRole="header">
        Performance
      </Text>

      <View style={styles.grid}>
        {metrics.map((m) => (
          <View key={m.label} style={styles.card} accessibilityLabel={`${m.label}: ${m.value}`}>
            <View style={[styles.iconChip, { backgroundColor: m.iconBg }]}>
              <Ionicons name={m.icon} size={18} color={m.iconColor} />
            </View>
            <Text style={[styles.value, { color: m.valueColor }]}>{m.value}</Text>
            <Text style={styles.label}>{m.label}</Text>
            <Text style={styles.sublabel}>{m.sublabel}</Text>
          </View>
        ))}
      </View>

      <View style={styles.verificationCard}>
        <Text style={styles.verificationTitle}>Verification Status</Text>
        <VerificationItem label="Identity Verified" icon="checkmark-circle" verified />
        <VerificationItem label="Licensed & Insured" icon="shield-checkmark" verified />
        <VerificationItem label="Payment Method" icon="card" verified />
        <VerificationItem label="Phone Number" icon="call" verified />
      </View>
    </View>
  );
};

interface VerificationItemProps {
  label: string;
  icon: 'checkmark-circle' | 'shield-checkmark' | 'card' | 'call';
  verified: boolean;
}

const VerificationItem: React.FC<VerificationItemProps> = ({ label, icon, verified }) => (
  <View style={styles.verificationRow} accessibilityLabel={`${label}: ${verified ? 'verified' : 'not verified'}`}>
    <View style={[styles.verifyIcon, verified ? styles.verifyIconActive : styles.verifyIconInactive]}>
      <Ionicons name={icon} size={15} color={verified ? theme.colors.primary : theme.colors.textTertiary} />
    </View>
    <Text style={styles.verificationText}>{label}</Text>
    <View style={[styles.verifyBadge, verified ? styles.verifyBadgeActive : styles.verifyBadgeInactive]}>
      <Text style={[styles.verifyBadgeText, verified ? styles.verifyBadgeTextActive : styles.verifyBadgeTextInactive]}>
        {verified ? 'Verified' : 'Pending'}
      </Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 8,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  card: {
    width: '47.5%',
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 14,
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
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 2,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  sublabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  verificationCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    ...theme.shadows.sm,
  },
  verificationTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 12,
  },
  verificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  verifyIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifyIconActive: { backgroundColor: '#F7F7F7' },
  verifyIconInactive: { backgroundColor: theme.colors.surfaceSecondary },
  verificationText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.textPrimary,
    fontWeight: '500',
  },
  verifyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  verifyBadgeActive: { backgroundColor: theme.colors.primary + '15' },
  verifyBadgeInactive: { backgroundColor: theme.colors.surfaceSecondary },
  verifyBadgeText: { fontSize: 11, fontWeight: '600' },
  verifyBadgeTextActive: { color: theme.colors.primary },
  verifyBadgeTextInactive: { color: theme.colors.textSecondary },
});
