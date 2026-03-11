/**
 * JobHeader Component
 *
 * Airbnb-style job header with clean status badge and date.
 */

import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Job } from '@mintenance/types';

interface JobHeaderProps {
  job: Job;
}

const STATUS_STYLES: Record<string, { color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  completed:   { color: '#10B981', bg: '#D1FAE5', icon: 'checkmark-circle' },
  in_progress: { color: '#F59E0B', bg: '#FEF3C7', icon: 'time' },
  pending:     { color: '#3B82F6', bg: '#DBEAFE', icon: 'hourglass' },
  posted:      { color: '#3B82F6', bg: '#DBEAFE', icon: 'hourglass' },
  assigned:    { color: '#8B5CF6', bg: '#EDE9FE', icon: 'person' },
  cancelled:   { color: '#EF4444', bg: '#FEE2E2', icon: 'close-circle' },
};

export const JobHeader: React.FC<JobHeaderProps> = ({ job }) => {
  const status = STATUS_STYLES[job.status] || { color: '#717171', bg: '#F7F7F7', icon: 'help-circle' as keyof typeof Ionicons.glyphMap };

  return (
    <View style={styles.container}>
      <Text style={styles.jobTitle} accessibilityRole='header'>{job.title}</Text>

      <View style={styles.statusRow}>
        <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
          <Ionicons name={status.icon} size={14} color={status.color} accessible={false} />
          <Text style={[styles.statusText, { color: status.color }]}>
            {job.status.replace('_', ' ').toUpperCase()}
          </Text>
        </View>

        <View style={styles.dateRow}>
          <Ionicons name="calendar-outline" size={14} color="#B0B0B0" />
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
    backgroundColor: '#FFFFFF',
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
  jobTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#222222',
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
    color: '#717171',
  },
  description: {
    fontSize: 15,
    color: '#717171',
    lineHeight: 22,
  },
});
