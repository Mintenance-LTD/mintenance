import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../theme';

interface ContractorPerformanceProps {
  rating: number;
  responseTime: string;
}

export const ContractorPerformance: React.FC<ContractorPerformanceProps> = ({
  rating,
  responseTime,
}) => {
  return (
    <View style={styles.statsSection}>
      <Text style={styles.sectionTitle} accessibilityRole='header'>Performance Metrics</Text>
      <View style={styles.performanceGrid}>
        <View style={styles.performanceItem} accessibilityLabel={`Overall rating: ${rating.toFixed(1)} stars, based on 127 reviews`}>
          <View style={styles.performanceHeader}>
            <Ionicons name='star' size={18} color={theme.colors.warning} accessible={false} />
            <Text style={styles.performanceValue}>
              {rating.toFixed(1)}
            </Text>
          </View>
          <Text style={styles.performanceLabel}>Overall Rating</Text>
          <Text style={styles.performanceSubtext}>
            Based on 127 reviews
          </Text>
        </View>

        <View style={styles.performanceItem} accessibilityLabel='Success rate: 98%, jobs completed successfully'>
          <View style={styles.performanceHeader}>
            <Ionicons name='checkmark-circle' size={18} color={theme.colors.success} accessible={false} />
            <Text style={styles.performanceValue}>98%</Text>
          </View>
          <Text style={styles.performanceLabel}>Success Rate</Text>
          <Text style={styles.performanceSubtext}>
            Jobs completed successfully
          </Text>
        </View>

        <View style={styles.performanceItem} accessibilityLabel={`Response time: ${responseTime}, average response`}>
          <View style={styles.performanceHeader}>
            <Ionicons name='time' size={18} color={theme.colors.statusInProgress} accessible={false} />
            <Text style={styles.performanceValue}>
              {responseTime}
            </Text>
          </View>
          <Text style={styles.performanceLabel}>Response Time</Text>
          <Text style={styles.performanceSubtext}>Average response</Text>
        </View>

        <View style={styles.performanceItem} accessibilityLabel='85 jobs completed in total'>
          <View style={styles.performanceHeader}>
            <Ionicons
              name='briefcase'
              size={18}
              color={theme.colors.primary}
              accessible={false}
            />
            <Text style={styles.performanceValue}>85</Text>
          </View>
          <Text style={styles.performanceLabel}>Jobs Completed</Text>
          <Text style={styles.performanceSubtext}>Total completed</Text>
        </View>
      </View>

      <View style={styles.verificationSection}>
        <Text style={styles.verificationTitle}>Verification Status</Text>
        <VerificationItem label='Identity Verified' icon='checkmark-circle' />
        <VerificationItem label='Licensed & Insured' icon='shield-checkmark' />
        <VerificationItem label='Payment Method Verified' icon='card' />
        <VerificationItem label='Phone Number Verified' icon='call' />
      </View>
    </View>
  );
};

interface VerificationItemProps {
  label: string;
  icon: 'checkmark-circle' | 'shield-checkmark' | 'card' | 'call';
}

const VerificationItem: React.FC<VerificationItemProps> = ({ label, icon }) => (
  <View style={styles.verificationItem} accessibilityLabel={label}>
    <Ionicons name={icon} size={20} color={theme.colors.success} accessible={false} />
    <Text style={styles.verificationText}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  statsSection: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: 16,
    marginBottom: 20,
    padding: 20,
    borderRadius: 12,
    ...theme.shadows.base,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 16,
  },
  performanceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 16,
  },
  performanceItem: {
    width: '48%',
    backgroundColor: theme.colors.surfaceSecondary,
    padding: 16,
    borderRadius: 12,
    marginRight: '2%',
    marginBottom: 12,
  },
  performanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  performanceValue: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginLeft: 8,
  },
  performanceLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  performanceSubtext: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  verificationSection: {
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  verificationTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 16,
  },
  verificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  verificationText: {
    fontSize: 16,
    color: theme.colors.textPrimary,
    marginLeft: 12,
    fontWeight: '500',
  },
});
