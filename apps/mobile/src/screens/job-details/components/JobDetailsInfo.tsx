/**
 * JobDetailsInfo Component
 *
 * Airbnb-style info grid with colored icon circles and clean typography.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Job } from '@mintenance/types';
import { me } from '../../../design-system/mint-editorial';

interface JobDetailsInfoProps {
  job: Job;
}

// 2026-05-22: budget row removed. Contractors quote their own price on
// each bid — no homeowner-set budget is displayed.
const INFO_ITEMS = [
  {
    key: 'location',
    label: 'Location',
    icon: 'location-outline' as const,
    color: me.errFg,
    bg: me.errBg,
  },
  {
    key: 'timeline',
    label: 'Timeline',
    icon: 'calendar-outline' as const,
    color: '#3B82F6',
    bg: '#DBEAFE',
  },
  {
    key: 'created',
    label: 'Created',
    icon: 'time-outline' as const,
    color: '#8B5CF6',
    bg: '#EDE9FE',
  },
];

export const JobDetailsInfo: React.FC<JobDetailsInfoProps> = ({ job }) => {
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
        return typeof job.location === 'string'
          ? job.location
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
    backgroundColor: me.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    ...me.shadow.card,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: me.ink,
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
    color: me.ink3,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    color: me.ink,
    fontWeight: '500',
  },
});
