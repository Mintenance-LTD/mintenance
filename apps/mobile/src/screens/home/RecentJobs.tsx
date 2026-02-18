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

function formatStatus(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export const RecentJobs: React.FC<RecentJobsProps> = ({ jobs, onViewAllPress, onJobPress }) => {
  const displayJobs = jobs.slice(0, 3);

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Active Projects</Text>
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
                    <View style={styles.placeholderIconCircle}>
                      <Ionicons name={categoryIcon} size={32} color={theme.colors.textSecondary} />
                    </View>
                    {job.category && (
                      <Text style={styles.placeholderCategory}>
                        {job.category.charAt(0).toUpperCase() + job.category.slice(1)}
                      </Text>
                    )}
                    <Text style={styles.placeholderHint}>No photos yet</Text>
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

              {/* Content below image - Web dashboard style */}
              <View style={styles.listingContent}>
                <View style={styles.titleRow}>
                  <Text style={styles.jobTitle} numberOfLines={1}>{job.title}</Text>
                </View>
                {job.category && (
                  <View style={styles.categoryBadge}>
                    <Ionicons name={categoryIcon} size={12} color={theme.colors.primary} />
                    <Text style={styles.categoryBadgeText}>
                      {job.category.charAt(0).toUpperCase() + job.category.slice(1)}
                    </Text>
                  </View>
                )}
                {budget > 0 && (
                  <View style={styles.budgetRow}>
                    <Text style={styles.budgetLabel}>Budget</Text>
                    <Text style={styles.budgetAmount}>{'\u00A3'}{budget.toLocaleString()}</Text>
                  </View>
                )}
                <TouchableOpacity
                  style={styles.viewDetailsButton}
                  onPress={() => onJobPress?.(job.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`View details for ${job.title}`}
                >
                  <Text style={styles.viewDetailsText}>View Details</Text>
                  <Ionicons name="arrow-forward" size={14} color={theme.colors.textInverse} />
                </TouchableOpacity>
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
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  placeholderIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderCategory: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  placeholderHint: {
    marginTop: 4,
    fontSize: 12,
    color: theme.colors.textTertiary,
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
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  categoryBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  budgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  budgetLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  budgetAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 12,
    gap: 6,
  },
  viewDetailsText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textInverse,
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
