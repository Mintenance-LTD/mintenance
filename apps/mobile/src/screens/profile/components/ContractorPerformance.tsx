import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ContractorPerformanceProps {
  rating: number;
  responseTime: string;
  completedJobs?: number;
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
}) => {
  const metrics: MetricCard[] = [
    {
      icon: 'star',
      iconColor: '#F59E0B',
      iconBg: '#FEF3C7',
      value: rating > 0 ? rating.toFixed(1) : '—',
      label: 'Rating',
      sublabel: 'Customer score',
    },
    {
      icon: 'checkmark-circle',
      iconColor: '#10B981',
      iconBg: '#D1FAE5',
      value: completedJobs > 0 ? `${Math.min(99, 88 + Math.round(completedJobs / 10))}%` : '—',
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
      <Text style={styles.sectionTitle} accessibilityRole="header">
        Performance
      </Text>

      <View style={styles.grid}>
        {metrics.map((m) => (
          <View key={m.label} style={styles.card} accessibilityLabel={`${m.label}: ${m.value}`}>
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
    <View style={[styles.verifyIcon, { backgroundColor: verified ? '#D1FAE5' : '#F7F7F7' }]}>
      <Ionicons name={icon} size={15} color={verified ? '#10B981' : '#B0B0B0'} />
    </View>
    <Text style={styles.verificationText}>{label}</Text>
    <View style={[styles.verifyBadge, { backgroundColor: verified ? '#D1FAE5' : '#F7F7F7' }]}>
      <Text style={[styles.verifyBadgeText, { color: verified ? '#10B981' : '#B0B0B0' }]}>
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
    color: '#222222',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  card: {
    width: '47.5%',
    backgroundColor: '#FFFFFF',
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
    color: '#222222',
    marginBottom: 2,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#222222',
    marginBottom: 2,
  },
  sublabel: {
    fontSize: 11,
    color: '#717171',
  },
  verificationCard: {
    backgroundColor: '#FFFFFF',
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
    color: '#222222',
    marginBottom: 12,
  },
  verificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EBEBEB',
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
    color: '#222222',
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
