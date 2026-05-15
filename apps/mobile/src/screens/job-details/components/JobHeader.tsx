/**
 * JobHeader Component
 *
 * Airbnb-style job header with clean status badge and date.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Job } from '@mintenance/types';
import { getStatusBadge } from '../../../theme';
import { me } from '../../../design-system/mint-editorial';

interface JobHeaderProps {
  job: Job;
}

const STATUS_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  posted: 'hourglass',
  pending: 'hourglass',
  assigned: 'person',
  in_progress: 'time',
  completed: 'checkmark-circle',
  accepted: 'checkmark-circle',
  rejected: 'close-circle',
  cancelled: 'close-circle',
  draft: 'document',
};

export const JobHeader: React.FC<JobHeaderProps> = ({ job }) => {
  const badge = getStatusBadge(job.status);
  const status = {
    color: badge.text,
    bg: badge.bg,
    icon:
      STATUS_ICONS[job.status] ||
      ('help-circle' as keyof typeof Ionicons.glyphMap),
  };

  return (
    <View style={styles.container}>
      <Text style={styles.jobTitle} accessibilityRole='header'>
        {job.title}
      </Text>

      <View style={styles.statusRow}>
        <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
          <Ionicons
            name={status.icon}
            size={14}
            color={status.color}
            accessible={false}
          />
          <Text style={[styles.statusText, { color: status.color }]}>
            {job.status.replace('_', ' ').toUpperCase()}
          </Text>
        </View>

        <View style={styles.dateRow}>
          <Ionicons name='calendar-outline' size={14} color={me.ink3} />
          <Text style={styles.dateText}>
            {new Date(job.created_at).toLocaleDateString()}
          </Text>
        </View>
      </View>

      {job.description && (
        <Text style={styles.description}>{job.description}</Text>
      )}
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
  jobTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: me.ink,
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 13,
    color: me.ink2,
  },
  description: {
    fontSize: 15,
    color: me.ink2,
    lineHeight: 22,
  },
});
