import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Job } from '../types';
import { theme, getStatusColor, getPriorityColor } from '../theme';

interface JobCardProps {
  job: Job;
  onPress: (job: Job) => void;
  onBid?: (job: Job) => void;
  showBidButton?: boolean;
}

export const JobCard: React.FC<JobCardProps> = ({
  job,
  onPress,
  onBid,
  showBidButton = false,
}) => {
  const formatBudget = (amount: number) => {
    return `$${Math.round(amount).toLocaleString()}`;
  };

  const statusColor = getStatusColor(job.status);
  const priorityColor = job.priority
    ? getPriorityColor(job.priority)
    : theme.colors.textSecondary;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(job)}
      testID='job-card'
    >
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={2}>
          {job.title}
        </Text>
        <Text style={styles.budget}>{formatBudget(job.budget)}</Text>
      </View>

      <Text style={styles.description} numberOfLines={3}>
        {job.description}
      </Text>

      <View style={styles.details}>
        {job.category && <Text style={styles.category}>{job.category}</Text>}

        {job.priority && (
          <Text style={[styles.priority, { color: priorityColor }]}>
            {job.priority.toUpperCase()} PRIORITY
          </Text>
        )}

        <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
          <Text style={styles.statusText}>{job.status.toUpperCase()}</Text>
        </View>
      </View>

      {job.photos && job.photos.length > 0 && (
        <View style={styles.photoIndicator} testID='photo-indicator'>
          <Text style={styles.photoCount}>📷 {job.photos.length}</Text>
        </View>
      )}

      {showBidButton && onBid && (
        <TouchableOpacity style={styles.bidButton} onPress={() => onBid(job)}>
          <Text style={styles.bidButtonText}>Place Bid</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[4],
    marginHorizontal: theme.spacing[4],
    marginVertical: theme.spacing[2],
    ...theme.shadows.base,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing[2],
  },
  title: {
    flex: 1,
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginRight: theme.spacing[2],
  },
  budget: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.primary,
  },
  description: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    lineHeight:
      theme.typography.fontSize.base * theme.typography.lineHeight.normal,
    marginBottom: theme.spacing[3],
  },
  details: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  category: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textTertiary,
    backgroundColor: theme.colors.surfaceSecondary,
    paddingHorizontal: theme.spacing[2],
    paddingVertical: theme.spacing[1],
    borderRadius: theme.borderRadius.sm,
  },
  priority: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  statusBadge: {
    paddingHorizontal: theme.spacing[2],
    paddingVertical: theme.spacing[1],
    borderRadius: theme.borderRadius.sm,
  },
  statusText: {
    color: theme.colors.textInverse,
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  photoIndicator: {
    marginTop: theme.spacing[2],
    alignSelf: 'flex-start',
  },
  photoCount: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textTertiary,
  },
  bidButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing[3],
    paddingHorizontal: theme.spacing[6],
    borderRadius: theme.borderRadius.base,
    marginTop: theme.spacing[3],
    alignSelf: 'center',
  },
  bidButtonText: {
    color: theme.colors.textInverse,
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
  },
});
