import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { me } from '../../../design-system/mint-editorial';

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
      iconColor: me.accent,
      iconBg: me.warnBg,
      value: rating > 0 ? rating.toFixed(1) : '—',
      label: 'Rating',
      sublabel: 'Customer score',
    },
    {
      icon: 'checkmark-circle',
      iconColor: me.brand,
      iconBg: me.brandSoft,
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
          backgroundColor: verified ? me.brandSoft : me.bg2,
        },
      ]}
    >
      <Ionicons name={icon} size={15} color={verified ? me.brand : me.ink3} />
    </View>
    <Text style={styles.verificationText}>{label}</Text>
    <View
      style={[
        styles.verifyBadge,
        {
          backgroundColor: verified ? me.brandSoft : me.bg2,
        },
      ]}
    >
      <Text
        style={[
          styles.verifyBadgeText,
          {
            color: verified ? me.brand : me.ink3,
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
    color: me.ink,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  card: {
    width: '47.5%',
    backgroundColor: me.surface,
    borderRadius: 16,
    padding: 14,
    ...me.shadow.card,
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
    color: me.ink,
    marginBottom: 2,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: me.ink,
    marginBottom: 2,
  },
  sublabel: {
    fontSize: 11,
    color: me.ink2,
  },
  verificationCard: {
    backgroundColor: me.surface,
    borderRadius: 16,
    padding: 16,
    ...me.shadow.card,
  },
  verificationTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: me.ink,
    marginBottom: 12,
  },
  verificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: me.line,
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
    color: me.ink,
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
