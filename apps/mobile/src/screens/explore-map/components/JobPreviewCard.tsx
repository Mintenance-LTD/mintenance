/**
 * JobPreviewCard Component
 *
 * Displays a job preview card at the bottom of the map when a marker is tapped.
 * Shows key job info with "View Details" and "Bid Now" action buttons.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../theme';
import type { JobMapItem } from '../viewmodels/ExploreMapViewModel';

const URGENCY_COLORS: Record<string, string> = {
  low: theme.colors.success,
  medium: theme.colors.info,
  high: theme.colors.warning,
  emergency: theme.colors.error,
};

const CATEGORY_ICONS: Record<string, string> = {
  plumbing: 'water',
  electrical: 'flash',
  roofing: 'home',
  painting: 'color-palette',
  carpentry: 'hammer',
  cleaning: 'sparkles',
  general: 'construct',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

interface JobPreviewCardProps {
  job: JobMapItem;
  onViewDetails: () => void;
  onBidNow: () => void;
}

export const JobPreviewCard: React.FC<JobPreviewCardProps> = ({
  job,
  onViewDetails,
  onBidNow,
}) => {
  const urgencyColor = URGENCY_COLORS[job.urgency] || theme.colors.info;
  const iconName = CATEGORY_ICONS[job.category.toLowerCase()] || 'construct';

  const budgetText =
    job.budget_min && job.budget_max
      ? `£${job.budget_min} - £${job.budget_max}`
      : job.budget_max
        ? `Up to £${job.budget_max}`
        : 'Budget TBD';

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onViewDetails}
      accessibilityRole="button"
      accessibilityLabel={`${job.title}, ${job.distance} km away, ${budgetText}`}
      accessibilityHint="Double tap to view job details"
    >
      <View style={styles.topRow}>
        <View style={[styles.categoryIcon, { backgroundColor: urgencyColor + '20' }]}>
          <Ionicons name={iconName as keyof typeof Ionicons.glyphMap} size={22} color={urgencyColor} />
        </View>
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={1}>{job.title}</Text>
          <View style={styles.metaRow}>
            <View style={[styles.urgencyBadge, { backgroundColor: urgencyColor }]}>
              <Text style={styles.urgencyText}>{job.urgency}</Text>
            </View>
            <Text style={styles.distance}>{job.distance} km</Text>
            <Text style={styles.posted}>{timeAgo(job.created_at)}</Text>
          </View>
        </View>
      </View>

      <Text style={styles.budget}>{budgetText}</Text>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.detailsButton}
          onPress={onViewDetails}
          accessibilityRole="button"
          accessibilityLabel="View job details"
        >
          <Text style={styles.detailsButtonText}>View Details</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.bidButton}
          onPress={onBidNow}
          accessibilityRole="button"
          accessibilityLabel="Place a bid on this job"
        >
          <Text style={styles.bidButtonText}>Bid Now</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    ...theme.shadows.base,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  categoryIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  urgencyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  urgencyText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.white,
    textTransform: 'capitalize',
  },
  distance: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  posted: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textTertiary,
  },
  budget: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.secondary,
    marginBottom: theme.spacing.md,
  },
  actions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  detailsButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.base,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  detailsButtonText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.textPrimary,
  },
  bidButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.base,
    backgroundColor: theme.colors.secondary,
    alignItems: 'center',
  },
  bidButtonText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.white,
  },
});
