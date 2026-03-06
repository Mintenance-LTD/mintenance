/**
 * JobPreviewCard Component
 *
 * Airbnb-style bottom sheet card shown when a map marker is tapped.
 * Provides clear labeled actions: Bid Now, View Details, Skip.
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

const CATEGORY_COLORS: Record<string, { icon: string; bg: string }> = {
  plumbing:   { icon: '#717171', bg: '#F7F7F7' },
  electrical: { icon: '#717171', bg: '#F7F7F7' },
  roofing:    { icon: '#717171', bg: '#F7F7F7' },
  painting:   { icon: '#717171', bg: '#F7F7F7' },
  carpentry:  { icon: '#717171', bg: '#F7F7F7' },
  cleaning:   { icon: '#717171', bg: '#F7F7F7' },
  hvac:       { icon: '#717171', bg: '#F7F7F7' },
  general:    { icon: '#717171', bg: '#F7F7F7' },
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
  const categoryKey = job.category.toLowerCase();
  const iconName = CATEGORY_ICONS[categoryKey] || 'construct';
  const colors = CATEGORY_COLORS[categoryKey] || CATEGORY_COLORS.general;
  const budget = job.budget_max || job.budget_min;
  const budgetText = budget ? `£${budget.toLocaleString()}` : 'Budget TBD';
  const categoryLabel = job.category.charAt(0).toUpperCase() + job.category.slice(1);
  const isUrgent = job.urgency === 'urgent';

  return (
    <View style={styles.container}>
      {/* Drag handle */}
      <View style={styles.handle} />

      {/* Main card */}
      <View style={styles.card}>
        {/* Top section: icon chip + info + dismiss */}
        <View style={styles.topRow}>
          {/* Category icon chip */}
          <View style={[styles.iconChip, { backgroundColor: colors.bg }]}>
            <Ionicons name={iconName} size={26} color={colors.icon} />
            {isUrgent && <View style={styles.urgentDot} />}
          </View>

          {/* Job info */}
          <View style={styles.info}>
            <Text style={styles.title} numberOfLines={2}>
              {job.title}
            </Text>
            <Text style={styles.meta} numberOfLines={1}>
              {categoryLabel} · {job.distance} km away · {timeAgo(job.created_at)}
            </Text>
            <View style={styles.budgetRow}>
              <Text style={styles.budget}>{budgetText}</Text>
              {isUrgent && (
                <View style={styles.urgentBadge}>
                  <Text style={styles.urgentText}>Urgent</Text>
                </View>
              )}
            </View>
          </View>

          {/* Dismiss button */}
          <TouchableOpacity
            style={styles.dismissButton}
            onPress={onDismiss}
            accessibilityRole="button"
            accessibilityLabel="Dismiss job preview"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={16} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Action row */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.bidButton}
            onPress={onBidNow}
            accessibilityRole="button"
            accessibilityLabel="Bid on this job"
            activeOpacity={0.85}
          >
            <Ionicons name="cash-outline" size={15} color="#FFFFFF" />
            <Text style={styles.bidButtonText}>Bid Now</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.detailsButton}
            onPress={onViewDetails}
            accessibilityRole="button"
            accessibilityLabel="View job details"
            activeOpacity={0.7}
          >
            <Text style={styles.detailsButtonText}>View Details</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipButton}
            onPress={onDismiss}
            accessibilityRole="button"
            accessibilityLabel="Skip this job"
            hitSlop={{ top: 4, bottom: 4, left: 8, right: 8 }}
            activeOpacity={0.6}
          >
            <Text style={styles.skipButtonText}>Skip</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.borderLight,
    marginBottom: 8,
  },
  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  iconChip: {
    width: 64,
    height: 64,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  urgentDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  info: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    lineHeight: 20,
  },
  meta: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '400',
  },
  budgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  budget: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  urgentBadge: {
    backgroundColor: '#FEE2E2',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  urgentText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  dismissButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: -2,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.borderLight,
    marginBottom: 14,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bidButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    paddingVertical: 11,
  },
  bidButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  detailsButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    paddingVertical: 11,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },
  detailsButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  skipButton: {
    paddingHorizontal: 12,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
});
