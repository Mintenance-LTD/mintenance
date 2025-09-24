/**
 * ScheduleSection Component
 * 
 * Displays contractor's upcoming schedule and recent jobs.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { ContractorStats } from '../../services/UserService';

interface ScheduleSectionProps {
  stats: ContractorStats | null;
  onViewAllPress: () => void;
  onJobDetailsPress: (jobId: string) => void;
}

export const ScheduleSection: React.FC<ScheduleSectionProps> = ({
  stats,
  onViewAllPress,
  onJobDetailsPress,
}) => {
  return (
    <View style={styles.scheduleSection}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Today's Schedule</Text>
        <TouchableOpacity onPress={onViewAllPress}>
          <Text style={styles.viewAllLink}>View All</Text>
        </TouchableOpacity>
      </View>

      {/* Upcoming Jobs */}
      <View style={styles.scheduleCard}>
        <View style={styles.scheduleHeader}>
          <View style={styles.scheduleIcon}>
            <Ionicons name="calendar" size={16} color={theme.colors.primary} />
          </View>
          <View style={styles.scheduleInfo}>
            <Text style={styles.scheduleTitle}>Kitchen Renovation</Text>
            <Text style={styles.scheduleMeta}>9:00 AM - 12:00 PM</Text>
          </View>
          <View style={styles.scheduleStatus}>
            <Text style={styles.scheduleStatusText}>Upcoming</Text>
          </View>
        </View>
      </View>

      <View style={styles.scheduleCard}>
        <View style={styles.scheduleHeader}>
          <View style={styles.scheduleIcon}>
            <Ionicons name="construct" size={16} color={theme.colors.accent} />
          </View>
          <View style={styles.scheduleInfo}>
            <Text style={styles.scheduleTitle}>Bathroom Repair</Text>
            <Text style={styles.scheduleMeta}>2:00 PM - 4:00 PM</Text>
          </View>
          <View style={styles.scheduleStatus}>
            <Text style={styles.scheduleStatusText}>Confirmed</Text>
          </View>
        </View>
      </View>

      {/* Recent Completed Jobs */}
      <View style={styles.completedSection}>
        <Text style={styles.completedTitle}>Recently Completed</Text>
        
        <View style={styles.completedCard}>
          <View style={styles.completedHeader}>
            <View style={styles.completedIcon}>
              <Ionicons name="checkmark-circle" size={16} color={theme.colors.successDark} />
            </View>
            <View style={styles.completedInfo}>
              <Text style={styles.completedTitle}>Plumbing Repair</Text>
              <Text style={styles.completedMeta}>Completed yesterday</Text>
            </View>
            <TouchableOpacity
              onPress={() => onJobDetailsPress('completed-job-1')}
            >
              <Text style={styles.viewDetailsLink}>View Details</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
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
  scheduleCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    ...theme.shadows.base,
  },
  scheduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scheduleIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
    paddingHorizontal: 12,
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
  completedTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 12,
  },
  completedCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    ...theme.shadows.base,
  },
  completedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  completedIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  completedInfo: {
    flex: 1,
  },
  viewDetailsLink: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '600',
  },
});
