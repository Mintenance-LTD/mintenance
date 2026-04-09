/**
 * JobPreviewCard — Budget-first bottom card on map marker tap.
 *
 * Matches the redesigned JobCard style: budget prominent,
 * category pill + bid count, quick bid CTA.
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
import type { JobMapItem } from '../viewmodels/ExploreMapViewModel';
import { theme } from '../../../theme';

const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  plumbing: 'water',
  electrical: 'flash',
  roofing: 'home',
  painting: 'color-palette',
  carpentry: 'hammer',
  cleaning: 'sparkles',
  hvac: 'thermometer',
  landscaping: 'leaf',
  general: 'construct',
};

const CATEGORY_COLORS: Record<string, { icon: string; bg: string }> = {
  plumbing: { icon: theme.colors.primary, bg: theme.colors.primaryLight },
  electrical: { icon: theme.colors.accent, bg: theme.colors.accentLight },
  roofing: { icon: theme.colors.primary, bg: theme.colors.primaryLight },
  painting: { icon: '#3B82F6', bg: '#DBEAFE' },
  carpentry: { icon: theme.colors.accent, bg: theme.colors.accentLight },
  cleaning: { icon: '#3B82F6', bg: '#DBEAFE' },
  hvac: { icon: theme.colors.error, bg: '#FEE2E2' },
  landscaping: { icon: theme.colors.primary, bg: theme.colors.primaryLight },
  general: {
    icon: theme.colors.textSecondary,
    bg: theme.colors.backgroundSecondary,
  },
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
  const catKey = job.category.toLowerCase();
  const iconName = CATEGORY_ICONS[catKey] ?? 'construct';
  const colors = CATEGORY_COLORS[catKey] ??
    CATEGORY_COLORS.general ?? { icon: '#6B7280', bg: '#F3F4F6' };
  const amt =
    job.budget_max ??
    job.budget_min ??
    ((job as unknown as Record<string, unknown>).budget as number | null);
  const budgetText =
    job.budget_min && job.budget_max && job.budget_max !== job.budget_min
      ? `£${job.budget_min.toLocaleString()} – £${job.budget_max.toLocaleString()}`
      : amt
        ? `£${amt.toLocaleString()}`
        : 'Budget TBD';
  const categoryLabel =
    job.category.charAt(0).toUpperCase() + job.category.slice(1);
  const isUrgent = job.urgency === 'urgent';

  return (
    <View style={styles.container}>
      {/* Drag handle */}
      <View style={styles.handle} />

      <TouchableOpacity
        style={styles.card}
        onPress={onViewDetails}
        activeOpacity={0.95}
        accessibilityRole='button'
        accessibilityLabel={`${job.title}, ${budgetText}`}
      >
        {/* Dismiss button */}
        <TouchableOpacity
          style={styles.dismissBtn}
          onPress={onDismiss}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole='button'
          accessibilityLabel='Dismiss'
        >
          <Ionicons name='close' size={16} color={theme.colors.textSecondary} />
        </TouchableOpacity>

        {/* Budget — FIRST, large */}
        <Text style={styles.budget}>{budgetText}</Text>

        {/* Title */}
        <Text style={styles.title} numberOfLines={2}>
          {job.title}
        </Text>

        {/* Meta: category · distance · time */}
        <View style={styles.metaRow}>
          <Ionicons
            name='location-outline'
            size={13}
            color={theme.colors.textSecondary}
          />
          <Text style={styles.metaText}>
            {job.distance} km · {categoryLabel} · {timeAgo(job.created_at)}
          </Text>
        </View>

        {/* Tags row */}
        <View style={styles.tagsRow}>
          <View style={[styles.categoryPill, { backgroundColor: colors.bg }]}>
            <Ionicons name={iconName} size={12} color={colors.icon} />
            <Text style={[styles.categoryPillText, { color: colors.icon }]}>
              {categoryLabel}
            </Text>
          </View>
          {isUrgent && (
            <View style={styles.urgentBadge}>
              <Ionicons name='flame' size={11} color={theme.colors.error} />
              <Text style={styles.urgentText}>Urgent</Text>
            </View>
          )}
        </View>

        {/* Action row */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.bidButton}
            onPress={onBidNow}
            accessibilityRole='button'
            accessibilityLabel='Bid on this job'
            activeOpacity={0.85}
          >
            <Ionicons name='flash' size={15} color={theme.colors.textInverse} />
            <Text style={styles.bidButtonText}>Quick Bid</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.detailsButton}
            onPress={onViewDetails}
            accessibilityRole='button'
            accessibilityLabel='View job details'
            activeOpacity={0.7}
          >
            <Text style={styles.detailsButtonText}>Details</Text>
            <Ionicons
              name='arrow-forward'
              size={14}
              color={theme.colors.textPrimary}
            />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
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
    backgroundColor: 'rgba(255,255,255,0.6)',
    marginBottom: 8,
  },
  card: {
    width: '100%',
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    padding: 18,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
      },
      android: { elevation: 8 },
    }),
  },

  dismissBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },

  budget: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    lineHeight: 22,
    marginBottom: 6,
    paddingRight: 32,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 10,
  },
  metaText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },

  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    gap: 3,
  },
  urgentText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.error,
  },

  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  bidButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: theme.colors.primary,
    borderRadius: 14,
    paddingVertical: 13,
  },
  bidButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textInverse,
  },
  detailsButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: 14,
    paddingVertical: 12,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  detailsButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
});
