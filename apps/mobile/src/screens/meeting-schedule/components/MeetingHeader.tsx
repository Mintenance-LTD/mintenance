/**
 * MeetingHeader Component
 * 
 * Header with contractor and job information.
 * 
 * @filesize Target: <80 lines
 * @compliance Single Responsibility - Header display
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../theme';
import type { User, Job } from '../../../types';

interface MeetingHeaderProps {
  contractor?: User;
  job?: Job;
}

export const MeetingHeader: React.FC<MeetingHeaderProps> = ({ contractor, job }) => {
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Ionicons name="calendar-outline" size={24} color={theme.colors.primary} />
        <Text style={styles.title}>Schedule Meeting</Text>
      </View>

      {contractor && (
        <View style={styles.infoRow}>
          <Ionicons name="person-outline" size={16} color={theme.colors.textSecondary} />
          <Text style={styles.infoText}>With: {contractor.first_name} {contractor.last_name}</Text>
        </View>
      )}

      {job && (
        <View style={styles.infoRow}>
          <Ionicons name="briefcase-outline" size={16} color={theme.colors.textSecondary} />
          <Text style={styles.infoText}>Job: {job.title}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    ...theme.shadows.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  title: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
    gap: theme.spacing.sm,
  },
  infoText: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.textSecondary,
  },
});
