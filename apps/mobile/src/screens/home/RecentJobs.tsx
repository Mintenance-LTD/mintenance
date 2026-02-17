/**
 * RecentJobs Component
 *
 * Airbnb listing-style cards: borderless, full-width rounded images,
 * heart overlay, title + location + star rating layout.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme, getStatusColor } from '../../theme';
import { OptimizedImage } from '../../components/optimized/OptimizedImage';

interface RecentJobsProps {
  jobs: any[];
  onViewAllPress: () => void;
  onJobPress?: (jobId: string) => void;
}

const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  plumbing: 'water-outline',
  electrical: 'flash-outline',
  roofing: 'home-outline',
  painting: 'color-palette-outline',
  carpentry: 'hammer-outline',
  landscaping: 'leaf-outline',
  cleaning: 'sparkles-outline',
  hvac: 'thermometer-outline',
  general: 'construct-outline',
};

function getRelativeTime(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function formatStatus(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export const RecentJobs: React.FC<RecentJobsProps> = ({ jobs, onViewAllPress, onJobPress }) => {
  const displayJobs = jobs.slice(0, 3);

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Service Requests</Text>
        <TouchableOpacity
          onPress={onViewAllPress}
          accessibilityRole="button"
          accessibilityLabel="View all recent jobs"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.viewAllLink}>View All</Text>
        </TouchableOpacity>
      </View>

      {displayJobs.length > 0 ? (
        displayJobs.map((job) => {
          const statusColor = getStatusColor(job.status || 'posted');
          const photos = job.photos || job.images || [];
          const hasPhoto = photos.length > 0;
          const budget = job.budget || job.budget_min || 0;
          const categoryIcon = CATEGORY_ICONS[job.category?.toLowerCase() || ''] || 'construct-outline';

          return (
            <TouchableOpacity
              key={job.id}
              style={styles.listing}
              onPress={() => onJobPress?.(job.id)}
              accessibilityRole="button"
              accessibilityLabel={`${job.title}, ${formatStatus(job.status || 'posted')}`}
              activeOpacity={0.95}
            >
              {/* Image - Airbnb style with rounded corners, no card wrapper */}
              <View style={styles.imageContainer}>
                {hasPhoto ? (
                  <OptimizedImage
                    source={{ uri: photos[0] }}
                    style={styles.heroImage}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                  />
                ) : (
                  <View style={styles.placeholderHero}>
                    <Ionicons name={categoryIcon} size={48} color={theme.colors.textTertiary} />
                  </View>
                )}

                {/* Heart/save overlay (top-right) */}
                <View style={styles.heartOverlay}>
                  <Ionicons name="heart-outline" size={22} color="#FFFFFF" />
                </View>

                {/* Status badge overlay (top-left) */}
                <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                  <Text style={styles.statusText}>{formatStatus(job.status || 'posted')}</Text>
                </View>
              </View>

              {/* Content below image - Airbnb listing layout */}
              <View style={styles.listingContent}>
                <View style={styles.titleRow}>
                  <Text style={styles.jobTitle} numberOfLines={1}>{job.title}</Text>
                  {budget > 0 && (
                    <View style={styles.ratingContainer}>
                      <Ionicons name="star" size={12} color={theme.colors.textPrimary} />
                      <Text style={styles.ratingText}>New</Text>
                    </View>
                  )}
                </View>
                {job.category && (
                  <Text style={styles.subtitleText}>
                    {job.category.charAt(0).toUpperCase() + job.category.slice(1)}
                  </Text>
                )}
                <Text style={styles.dateText}>
                  {job.created_at ? getRelativeTime(job.created_at) : ''}
                </Text>
                {budget > 0 && (
                  <Text style={styles.priceText}>
                    <Text style={styles.priceBold}>{'\u00A3'}{budget.toLocaleString()}</Text> estimated
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          );
        })
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="briefcase-outline" size={32} color={theme.colors.textTertiary} />
          <Text style={styles.emptyText}>No jobs posted yet</Text>
          <Text style={styles.emptySubtext}>
            Post your first job to get started!
          </Text>
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
    color: theme.colors.textPrimary,
  },
  viewAllLink: {
    fontSize: 16,
    color: theme.colors.textPrimary,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  listing: {
    marginBottom: 24,
  },
  imageContainer: {
    position: 'relative',
    borderRadius: 18,
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: 290,
    borderRadius: 18,
  },
  placeholderHero: {
    width: '100%',
    height: 180,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartOverlay: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  listingContent: {
    paddingTop: 12,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  jobTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    flex: 1,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 8,
  },
  ratingText: {
    fontSize: 16,
    color: theme.colors.textPrimary,
  },
  subtitleText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  dateText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  priceText: {
    fontSize: 17,
    color: theme.colors.textPrimary,
    marginTop: 6,
  },
  priceBold: {
    fontWeight: '600',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
});
