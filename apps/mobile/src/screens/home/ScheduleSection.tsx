/**
 * ScheduleSection Component
 *
 * Displays contractor's upcoming schedule and recent jobs.
 * Renders real data or an empty state when no jobs are scheduled.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { ContractorStats } from '../../services/UserService';

interface ScheduleJob {
  id: string;
  title: string;
  time?: string;
  status: string;
}

interface ScheduleSectionProps {
  stats: ContractorStats | null;
  upcomingJobs?: ScheduleJob[];
  recentlyCompleted?: ScheduleJob[];
  onViewAllPress: () => void;
  onJobDetailsPress: (jobId: string) => void;
}

export const ScheduleSection: React.FC<ScheduleSectionProps> = ({
  stats,
  upcomingJobs = [],
  recentlyCompleted = [],
  onViewAllPress,
  onJobDetailsPress,
}) => {
  const hasContent = upcomingJobs.length > 0 || recentlyCompleted.length > 0;

  return (
    <View style={styles.scheduleSection}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle} accessibilityRole='header'>Today's Schedule</Text>
        <TouchableOpacity
          onPress={onViewAllPress}
          accessibilityRole='button'
          accessibilityLabel='View full schedule'
        >
          <Text style={styles.viewAllLink}>View All</Text>
        </TouchableOpacity>
      </View>

      {!hasContent ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Ionicons name="calendar-outline" size={32} color={theme.colors.textTertiary} />
          </View>
          <Text style={styles.emptyTitle}>No jobs scheduled today</Text>
          <Text style={styles.emptySubtitle}>Browse available jobs to fill your schedule</Text>
        </View>
      ) : (
        <>
          {upcomingJobs.map((job) => (
            <TouchableOpacity
              key={job.id}
              style={styles.scheduleCard}
              onPress={() => onJobDetailsPress(job.id)}
              accessibilityLabel={`${job.title}, ${job.time || ''}, ${job.status}`}
            >
              <View style={styles.scheduleHeader}>
                <View style={styles.scheduleIcon}>
                  <Ionicons name="calendar" size={16} color={theme.colors.primary} accessible={false} />
                </View>
                <View style={styles.scheduleInfo}>
                  <Text style={styles.scheduleTitle} numberOfLines={1}>{job.title}</Text>
                  {job.time && <Text style={styles.scheduleMeta}>{job.time}</Text>}
                </View>
                <View style={styles.scheduleStatus}>
                  <Text style={styles.scheduleStatusText}>{job.status}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}

          {recentlyCompleted.length > 0 && (
            <View style={styles.completedSection}>
              <Text style={styles.completedSectionTitle}>Recently Completed</Text>
              {recentlyCompleted.map((job) => (
                <View key={job.id} style={styles.completedCard}>
                  <View style={styles.completedHeader}>
                    <View style={styles.completedIcon}>
                      <Ionicons name="checkmark-circle" size={16} color={theme.colors.successDark} />
                    </View>
                    <View style={styles.completedInfo}>
                      <Text style={styles.completedTitle} numberOfLines={1}>{job.title}</Text>
                      <Text style={styles.completedMeta}>Completed</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => onJobDetailsPress(job.id)}
                      accessibilityRole='button'
                      accessibilityLabel={`View details for ${job.title}`}
                    >
                      <Text style={styles.viewDetailsLink}>View Details</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  scheduleSection: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  viewAllLink: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  emptyState: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  scheduleCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    ...theme.shadows.sm,
  },
  scheduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scheduleIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  scheduleInfo: {
    flex: 1,
  },
  scheduleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  scheduleMeta: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  scheduleStatus: {
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  scheduleStatusText: {
    fontSize: 11,
    color: theme.colors.textInverse,
    fontWeight: '600',
  },
  completedSection: {
    marginTop: 24,
  },
  completedSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 12,
  },
  completedCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    ...theme.shadows.sm,
  },
  completedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  completedIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  completedInfo: {
    flex: 1,
  },
  completedTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  completedMeta: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  viewDetailsLink: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '600',
  },
});
