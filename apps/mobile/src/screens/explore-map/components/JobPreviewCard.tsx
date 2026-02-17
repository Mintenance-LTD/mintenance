/**
 * JobPreviewCard Component
 *
 * Airbnb-style horizontal listing preview card shown at the bottom
 * of the map when a marker is tapped. Image + info + dismiss.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../theme';
import type { JobMapItem } from '../viewmodels/ExploreMapViewModel';

const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  plumbing: 'water',
  electrical: 'flash',
  roofing: 'home',
  painting: 'color-palette',
  carpentry: 'hammer',
  cleaning: 'sparkles',
  hvac: 'thermometer',
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
  onDismiss: () => void;
}

export const JobPreviewCard: React.FC<JobPreviewCardProps> = ({
  job,
  onViewDetails,
  onBidNow,
  onDismiss,
}) => {
  const iconName = CATEGORY_ICONS[job.category.toLowerCase()] || 'construct';
  const budget = job.budget_max || job.budget_min;
  const budgetText = budget ? `\u00A3${budget.toLocaleString()} total` : 'Budget TBD';
  const categoryLabel = job.category.charAt(0).toUpperCase() + job.category.slice(1);

  return (
    <View style={styles.container}>
      {/* Dismiss button */}
      <TouchableOpacity
        style={styles.dismissButton}
        onPress={onDismiss}
        accessibilityRole="button"
        accessibilityLabel="Dismiss job preview"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="close" size={16} color={theme.colors.textInverse} />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.cardContent}
        onPress={onViewDetails}
        accessibilityRole="button"
        accessibilityLabel={`${job.title}, ${job.distance} km away, ${budgetText}`}
        accessibilityHint="Double tap to view job details"
        activeOpacity={0.95}
      >
        {/* Thumbnail */}
        <View style={styles.thumbnail}>
          <Ionicons name={iconName} size={28} color={theme.colors.textSecondary} />
        </View>

        {/* Info */}
        <View style={styles.info}>
          <Text style={styles.location} numberOfLines={1}>
            {job.homeowner_name} · {categoryLabel}
          </Text>
          <Text style={styles.dates}>
            {timeAgo(job.created_at)} · {job.distance} km away
          </Text>
          <View style={styles.priceRow}>
            <Text style={styles.price}>{budgetText}</Text>
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={12} color={theme.colors.textPrimary} />
              <Text style={styles.ratingText}>New</Text>
            </View>
          </View>
        </View>

        {/* Heart / save icon */}
        <TouchableOpacity
          style={styles.heartButton}
          onPress={onBidNow}
          accessibilityRole="button"
          accessibilityLabel="Bid on this job"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="heart-outline" size={22} color={theme.colors.textPrimary} />
        </TouchableOpacity>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  dismissButton: {
    position: 'absolute',
    top: -12,
    left: -4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 3,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 10,
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  location: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  dates: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  price: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    fontSize: 13,
    color: theme.colors.textPrimary,
  },
  heartButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
