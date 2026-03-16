/**
 * JobDetailsInfo Component
 *
 * Airbnb-style info grid with colored icon circles and clean typography.
 */

import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Job } from '@mintenance/types';
import { theme } from '../../../theme';

interface JobDetailsInfoProps {
  job: Job;
}

const INFO_ITEMS = [
  { key: 'location', label: 'Location', icon: 'location-outline' as const, color: theme.colors.error, bg: '#FEE2E2' },
  { key: 'budget', label: 'Budget Range', icon: 'cash-outline' as const, color: theme.colors.primary, bg: theme.colors.primaryLight },
  { key: 'timeline', label: 'Timeline', icon: 'calendar-outline' as const, color: '#3B82F6', bg: '#DBEAFE' },
  { key: 'created', label: 'Created', icon: 'time-outline' as const, color: '#8B5CF6', bg: '#EDE9FE' },
];

export const JobDetailsInfo: React.FC<JobDetailsInfoProps> = ({ job }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getValue = (key: string) => {
    switch (key) {
      case 'location':
        return typeof job.location === 'string' ? job.location : 'Not specified';
      case 'budget':
        return job.budget_min && job.budget_max
          ? `${formatCurrency(job.budget_min)} - ${formatCurrency(job.budget_max)}`
          : 'Not specified';
      case 'timeline':
        return job.timeline || 'Flexible';
      case 'created':
        return formatDate(job.created_at);
      default:
        return '';
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Job Details</Text>

      <View style={styles.infoGrid}>
        {INFO_ITEMS.map((item) => (
          <View key={item.key} style={styles.infoItem}>
            <View style={[styles.infoIcon, { backgroundColor: item.bg }]}>
              <Ionicons name={item.icon} size={18} color={item.color} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>{item.label}</Text>
              <Text style={styles.infoValue}>{getValue(item.key)}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  infoGrid: {
    gap: 14,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  infoIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.textTertiary,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    color: theme.colors.textPrimary,
    fontWeight: '500',
  },
});
