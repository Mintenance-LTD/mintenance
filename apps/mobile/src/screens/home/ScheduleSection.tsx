/**
 * ScheduleSection Component
 *
 * Timeline-style schedule section with vertical timeline indicator,
 * clean cards, and Airbnb-minimal empty state.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
  upcomingJobs = [],
  recentlyCompleted = [],
  onViewAllPress,
  onJobDetailsPress,
}) => {
  const hasContent = upcomingJobs.length > 0 || recentlyCompleted.length > 0;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle} accessibilityRole="header">Today's Schedule</Text>
        <TouchableOpacity
          onPress={onViewAllPress}
          accessibilityRole="button"
          accessibilityLabel="View full schedule"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.viewAllLink}>View All</Text>
        </TouchableOpacity>
      </View>

      {!hasContent ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="calendar-outline" size={28} color="#B0B0B0" />
          </View>
          <Text style={styles.emptyTitle}>No jobs scheduled</Text>
          <Text style={styles.emptySubtitle}>Browse available jobs to fill your schedule</Text>
        </View>
      ) : (
        <View style={styles.timeline}>
          {upcomingJobs.map((job, index) => (
            <TouchableOpacity
              key={job.id}
              style={styles.timelineItem}
              onPress={() => onJobDetailsPress(job.id)}
              accessibilityRole="button"
              accessibilityLabel={`${job.title}, ${job.time || ''}, ${job.status}`}
              activeOpacity={0.8}
            >
              {/* Timeline indicator */}
              <View style={styles.timelineTrack}>
                <View style={styles.timelineDot} />
                {index < upcomingJobs.length - 1 && <View style={styles.timelineLine} />}
              </View>

              {/* Card */}
              <View style={styles.scheduleCard}>
                <View style={styles.cardContent}>
                  <Text style={styles.scheduleTitle} numberOfLines={1}>{job.title}</Text>
                  {job.time && (
                    <View style={styles.timeRow}>
                      <Ionicons name="time-outline" size={13} color="#717171" />
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
                  accessibilityRole="button"
                  accessibilityLabel={`Completed: ${job.title}`}
                  activeOpacity={0.8}
                >
                  <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                  <Text style={styles.completedTitle} numberOfLines={1}>{job.title}</Text>
                  <Ionicons name="chevron-forward" size={14} color="#B0B0B0" />
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
    fontSize: 20,
    fontWeight: '700',
    color: '#222222',
    letterSpacing: -0.3,
  },
  viewAllLink: {
    fontSize: 14,
    color: '#222222',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F7F7F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222222',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#717171',
    textAlign: 'center',
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
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#D1FAE5',
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: '#EBEBEB',
    marginTop: 4,
  },
  scheduleCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginLeft: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  cardContent: {
    flex: 1,
  },
  scheduleTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#222222',
    marginBottom: 4,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 13,
    color: '#717171',
  },
  statusChip: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  statusText: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '600',
  },
  completedSection: {
    marginTop: 20,
  },
  completedLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#717171',
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
    backgroundColor: '#F7F7F7',
    borderRadius: 12,
    marginBottom: 6,
  },
  completedTitle: {
    flex: 1,
    fontSize: 14,
    color: '#222222',
    fontWeight: '500',
  },
});
