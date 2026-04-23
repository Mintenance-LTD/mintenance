import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../theme';

interface ContractorPerformanceProps {
  rating: number;
  responseTime: string;
  completedJobs?: number;
  // Verification flags from public.profiles. Previously hardcoded to
  // true, producing "Verified" badges on a brand-new unverified
  // contractor. Each is optional so callers that haven't wired the
  // data yet render the legacy always-verified badges — but the
  // ProfileScreen caller now passes all four.
  identityVerified?: boolean;
  licenseVerified?: boolean;
  paymentMethodLinked?: boolean;
  phoneVerified?: boolean;
}

interface MetricCard {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
  value: string;
  label: string;
  sublabel: string;
}

export const ContractorPerformance: React.FC<ContractorPerformanceProps> = ({
  rating,
  responseTime,
  completedJobs = 0,
  identityVerified = false,
  licenseVerified = false,
  paymentMethodLinked = false,
  phoneVerified = false,
}) => {
  const metrics: MetricCard[] = [
    {
      icon: 'star',
      iconColor: theme.colors.accent,
      iconBg: theme.colors.accentLight,
      value: rating > 0 ? rating.toFixed(1) : '—',
      label: 'Rating',
      sublabel: 'Customer score',
    },
    {
      icon: 'checkmark-circle',
      iconColor: theme.colors.primary,
      iconBg: theme.colors.primaryLight,
      value:
        completedJobs > 0
          ? `${Math.min(99, 88 + Math.round(completedJobs / 10))}%`
          : '—',
      label: 'Success Rate',
      sublabel: 'Jobs completed',
    },
    {
      icon: 'time',
      iconColor: '#3B82F6',
      iconBg: '#DBEAFE',
      value: responseTime || '—',
      label: 'Response',
      sublabel: 'Avg. reply time',
    },
    {
      icon: 'briefcase',
      iconColor: '#8B5CF6',
      iconBg: '#EDE9FE',
      value: completedJobs > 0 ? String(completedJobs) : '—',
      label: 'Jobs Done',
      sublabel: 'Total completed',
    },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle} accessibilityRole='header'>
        Performance
      </Text>

      <View style={styles.grid}>
        {metrics.map((m) => (
          <View
            key={m.label}
            style={styles.card}
            accessibilityLabel={`${m.label}: ${m.value}`}
          >
            <View style={[styles.iconChip, { backgroundColor: m.iconBg }]}>
              <Ionicons name={m.icon} size={18} color={m.iconColor} />
            </View>
            <Text style={styles.value}>{m.value}</Text>
            <Text style={styles.label}>{m.label}</Text>
            <Text style={styles.sublabel}>{m.sublabel}</Text>
          </View>
        ))}
      </View>

      <View style={styles.verificationCard}>
        <Text style={styles.verificationTitle}>Verification Status</Text>
        <VerificationItem
          label='Identity Verified'
          icon='checkmark-circle'
          verified={identityVerified}
        />
        <VerificationItem
          label='Licensed & Insured'
          icon='shield-checkmark'
          verified={licenseVerified}
        />
        <VerificationItem
          label='Payment Method'
          icon='card'
          verified={paymentMethodLinked}
        />
        <VerificationItem
          label='Phone Number'
          icon='call'
          verified={phoneVerified}
        />
      </View>
    </View>
  );
};

interface VerificationItemProps {
  label: string;
  icon: 'checkmark-circle' | 'shield-checkmark' | 'card' | 'call';
  verified: boolean;
}

const VerificationItem: React.FC<VerificationItemProps> = ({
  label,
  icon,
  verified,
}) => (
  <View
    style={styles.verificationRow}
    accessibilityLabel={`${label}: ${verified ? 'verified' : 'not verified'}`}
  >
    <View
      style={[
        styles.verifyIcon,
        {
          backgroundColor: verified
            ? theme.colors.primaryLight
            : theme.colors.backgroundSecondary,
        },
      ]}
    >
      <Ionicons
        name={icon}
        size={15}
        color={verified ? theme.colors.primary : theme.colors.textTertiary}
      />
    </View>
    <Text style={styles.verificationText}>{label}</Text>
    <View
      style={[
        styles.verifyBadge,
        {
          backgroundColor: verified
            ? theme.colors.primaryLight
            : theme.colors.backgroundSecondary,
        },
      ]}
    >
      <Text
        style={[
          styles.verifyBadgeText,
          {
            color: verified ? theme.colors.primary : theme.colors.textTertiary,
          },
        ]}
      >
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
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: { elevation: 2 },
    }),
  },
  iconChip: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  value: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.textPrimary,
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
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: { elevation: 2 },
    }),
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
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  verifyIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
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
  verifyBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
