/**
 * JobCard Component
 *
 * Airbnb listing-style job card. Full-width with rounded corners,
 * status overlay, category badge, budget display. No heavy borders.
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Job } from '@mintenance/types';
import { theme } from '../theme';
const getPriorityColor = (priority: string): string => {
  switch (priority) {
    case 'high':
      return theme.colors.error;
    case 'medium':
      return theme.colors.accent;
    case 'low':
      return theme.colors.primary;
    default:
      return theme.colors.textSecondary;
  }
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  posted: { bg: '#3B82F6', text: theme.colors.textInverse },
  assigned: { bg: theme.colors.accent, text: theme.colors.textInverse },
  in_progress: { bg: theme.colors.primary, text: theme.colors.textInverse },
  completed: { bg: '#6B7280', text: theme.colors.textInverse },
  cancelled: { bg: theme.colors.error, text: theme.colors.textInverse },
};

const STATUS_LABELS: Record<string, string> = {
  posted: 'Posted',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  plumbing: 'water',
  electrical: 'flash',
  roofing: 'home',
  painting: 'color-palette',
  carpentry: 'hammer',
  landscaping: 'leaf',
  cleaning: 'sparkles',
  hvac: 'thermometer',
  general: 'construct',
};

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
  const formatBudget = (amount: number) =>
    `\u00A3${Math.round(amount).toLocaleString()}`;
  const statusColors = STATUS_COLORS[job.status] ?? STATUS_COLORS.cancelled;
  const statusLabel = STATUS_LABELS[job.status] ?? job.status;
  const priorityColor = job.priority
    ? getPriorityColor(job.priority)
    : theme.colors.textSecondary;
  const categoryIcon =
    CATEGORY_ICONS[job.category?.toLowerCase() ?? ''] ?? 'construct';

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(job)}
      testID='job-card'
      accessibilityRole='button'
      accessibilityLabel={`Job: ${job.title}, ${job.category || ''}, ${job.status}`}
      activeOpacity={0.95}
    >
      {/* Top row: category icon + title + budget */}
      <View style={styles.topRow}>
        <View style={styles.categoryCircle}>
          <Ionicons
            name={categoryIcon}
            size={18}
            color={theme.colors.textSecondary}
          />
        </View>
        <View style={styles.titleBlock}>
          <Text style={styles.title} numberOfLines={2}>
            {job.title}
          </Text>
          {job.category && (
            <Text style={styles.categoryText}>
              {job.category.charAt(0).toUpperCase() + job.category.slice(1)}
            </Text>
          )}
        </View>
        <Text style={styles.budget}>{formatBudget(job.budget ?? 0)}</Text>
      </View>

      {/* Description */}
      <Text style={styles.description} numberOfLines={2}>
        {job.description}
      </Text>

      {/* Bottom row: status + priority + photos */}
      <View style={styles.bottomRow}>
        <View style={[styles.statusPill, { backgroundColor: statusColors.bg }]}>
          <Text style={[styles.statusText, { color: statusColors.text }]}>
            {statusLabel}
          </Text>
        </View>

        {job.priority && (
          <View style={styles.priorityChip}>
            <View
              style={[styles.priorityDot, { backgroundColor: priorityColor }]}
            />
            <Text style={[styles.priorityText, { color: priorityColor }]}>
              {job.priority.charAt(0).toUpperCase() + job.priority.slice(1)}
            </Text>
          </View>
        )}

        {job.photos && job.photos.length > 0 && (
          <View style={styles.photoChip} testID='photo-indicator'>
            <Ionicons
              name='image-outline'
              size={14}
              color={theme.colors.textSecondary}
            />
            <Text style={styles.photoCount}>{job.photos.length}</Text>
          </View>
        )}

        <View style={styles.spacer} />

        <Ionicons
          name='chevron-forward'
          size={16}
          color={theme.colors.textTertiary}
        />
      </View>

      {/* Bid button */}
      {showBidButton && onBid && (
        <TouchableOpacity
          style={styles.bidButton}
          onPress={() => onBid(job)}
          accessibilityRole='button'
          accessibilityLabel={`Place bid on ${job.title}`}
        >
          <Text style={styles.bidButtonText}>Place Bid</Text>
          <Ionicons
            name='arrow-forward'
            size={14}
            color={theme.colors.textInverse}
          />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 18,
    marginHorizontal: 4,
    marginVertical: 6,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  categoryCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  titleBlock: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    lineHeight: 22,
  },
  categoryText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  budget: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    letterSpacing: -0.3,
  },
  description: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: 14,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  priorityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  priorityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '500',
  },
  photoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  photoCount: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  spacer: {
    flex: 1,
  },
  bidButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 14,
  },
  bidButtonText: {
    color: theme.colors.textInverse,
    fontSize: 15,
    fontWeight: '600',
  },
});
