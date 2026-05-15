/**
 * ScheduleSection Component — Direction A · Mint Editorial.
 *
 * Timeline-style schedule section with vertical timeline indicator,
 * clean cards, and a minimal empty state.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ContractorStats } from '../../services/UserService';
import { me } from '../../design-system/mint-editorial';

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
  onFindJobsPress?: () => void;
}

export const ScheduleSection: React.FC<ScheduleSectionProps> = ({
  upcomingJobs = [],
  recentlyCompleted = [],
  onViewAllPress,
  onJobDetailsPress,
  onFindJobsPress,
}) => {
  const hasContent = upcomingJobs.length > 0 || recentlyCompleted.length > 0;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle} accessibilityRole='header'>
          Today&apos;s Schedule
        </Text>
        <TouchableOpacity
          onPress={onViewAllPress}
          accessibilityRole='button'
          accessibilityLabel='View full schedule'
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.viewAllLink}>View All</Text>
        </TouchableOpacity>
      </View>

      {!hasContent ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name='calendar-outline' size={32} color={me.ink3} />
          </View>
          <Text style={styles.emptyTitle}>Today&apos;s Schedule</Text>
          <Text style={styles.emptySubtitle}>
            No schedule items yet. Your daily earnings and job timeline will
            appear here when assigned.
          </Text>
          {onFindJobsPress && (
            <TouchableOpacity
              style={styles.findJobsButton}
              onPress={onFindJobsPress}
              accessibilityRole='button'
              accessibilityLabel='Find new jobs'
              activeOpacity={0.8}
            >
              <Text style={styles.findJobsButtonText}>Find New Jobs</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View style={styles.timeline}>
          {upcomingJobs.map((job, index) => (
            <TouchableOpacity
              key={job.id}
              style={styles.timelineItem}
              onPress={() => onJobDetailsPress(job.id)}
              accessibilityRole='button'
              accessibilityLabel={`${job.title}, ${job.time || ''}, ${job.status}`}
              activeOpacity={0.8}
            >
              {/* Timeline indicator */}
              <View style={styles.timelineTrack}>
                <View style={styles.timelineDot} />
                {index < upcomingJobs.length - 1 && (
                  <View style={styles.timelineLine} />
                )}
              </View>

              {/* Card */}
              <View style={styles.scheduleCard}>
                <View style={styles.cardContent}>
                  <Text style={styles.scheduleTitle} numberOfLines={1}>
                    {job.title}
                  </Text>
                  {job.time && (
                    <View style={styles.timeRow}>
                      <Ionicons name='time-outline' size={13} color={me.ink2} />
                      <Text style={styles.timeText}>{job.time}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.statusChip}>
                  <Text style={styles.statusText}>{job.status}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}

          {recentlyCompleted.length > 0 && (
            <View style={styles.completedSection}>
              <Text style={styles.completedLabel}>Recently Completed</Text>
              {recentlyCompleted.map((job) => (
                <TouchableOpacity
                  key={job.id}
                  style={styles.completedCard}
                  onPress={() => onJobDetailsPress(job.id)}
                  accessibilityRole='button'
                  accessibilityLabel={`Completed: ${job.title}`}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name='checkmark-circle'
                    size={18}
                    color={me.brand}
                  />
                  <Text style={styles.completedTitle} numberOfLines={1}>
                    {job.title}
                  </Text>
                  <Ionicons name='chevron-forward' size={14} color={me.ink3} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: me.font.display,
    fontSize: 22,
    color: me.ink,
    letterSpacing: me.displayTracking,
  },
  viewAllLink: {
    fontSize: 14,
    color: me.brand,
    fontWeight: '600',
  },
  emptyState: {
    backgroundColor: me.surface,
    borderRadius: me.radius.card,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: me.line,
    ...me.shadow.card,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: me.bg2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: me.font.display,
    fontSize: 22,
    color: me.ink,
    marginBottom: 8,
    letterSpacing: me.displayTracking,
  },
  emptySubtitle: {
    fontSize: 14,
    color: me.ink2,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 260,
  },
  findJobsButton: {
    marginTop: 24,
    backgroundColor: me.brandSoft,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: me.radius.btn,
  },
  findJobsButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: me.brand2,
  },
  timeline: {
    paddingLeft: 4,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  timelineTrack: {
    width: 24,
    alignItems: 'center',
    paddingTop: 18,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: me.brand,
    borderWidth: 2,
    borderColor: me.brandSoft,
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: me.line,
    marginTop: 4,
  },
  scheduleCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: me.surface,
    borderRadius: me.radius.card,
    padding: 16,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: me.line,
  },
  cardContent: {
    flex: 1,
  },
  scheduleTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: me.ink,
    marginBottom: 4,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 13,
    color: me.ink2,
  },
  statusChip: {
    backgroundColor: me.brandSoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  statusText: {
    fontSize: 11,
    color: me.brand2,
    fontWeight: '600',
  },
  completedSection: {
    marginTop: 20,
  },
  completedLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: me.ink2,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  completedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: me.bg2,
    borderRadius: 12,
    marginBottom: 6,
  },
  completedTitle: {
    flex: 1,
    fontSize: 14,
    color: me.ink,
    fontWeight: '500',
  },
});
