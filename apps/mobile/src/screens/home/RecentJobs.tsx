/**
 * RecentJobs Component
 *
 * Airbnb listing-style cards: borderless, full-width images,
 * heart overlay, status badge, category + budget below.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme, getStatusColor } from '../../theme';
import { OptimizedImage } from '../../components/optimized/OptimizedImage';
import { Skeleton } from '../../components/skeletons/Skeleton';

interface RecentJob {
  id: string;
  title: string;
  status?: string;
  category?: string;
  budget?: number;
  budget_min?: number;
  photos?: string[];
  images?: string[];
}

interface RecentJobsProps {
  isLoading?: boolean;
  jobs: RecentJob[];
  onViewAllPress: () => void;
  onJobPress?: (jobId: string) => void;
  savedJobIds?: string[];
  onSavePress?: (jobId: string) => void;
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

export const RecentJobs: React.FC<RecentJobsProps> = ({ isLoading, jobs, onViewAllPress, onJobPress, savedJobIds = [], onSavePress }) => {
  if (isLoading) {
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Active Projects</Text>
        </View>
        {[1, 2].map((key) => (
          <View key={key} style={styles.listing}>
            <Skeleton width="100%" height={200} borderRadius={18} />
            <View style={styles.listingContent}>
              <Skeleton width="70%" height={17} borderRadius={4} />
              <Skeleton width={100} height={20} borderRadius={12} style={{ marginTop: 6 }} />
            </View>
          </View>
        ))}
      </View>
    );
  }

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
              {/* Image */}
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
                      <Ionicons name={categoryIcon} size={32} color="#717171" />
                    </View>
                    {job.category && (
                      <Text style={styles.placeholderCategory}>
                        {job.category.charAt(0).toUpperCase() + job.category.slice(1)}
                      </Text>
                    )}
                  </View>
                )}

                {/* Heart overlay */}
                <TouchableOpacity
                  style={styles.heartOverlay}
                  onPress={() => onSavePress?.(job.id)}
                  accessibilityRole="button"
                  accessibilityLabel={savedJobIds.includes(job.id) ? 'Unsave job' : 'Save job'}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name={savedJobIds.includes(job.id) ? 'heart' : 'heart-outline'}
                    size={22}
                    color={savedJobIds.includes(job.id) ? '#EF4444' : '#FFFFFF'}
                  />
                </TouchableOpacity>

                {/* Status badge */}
                <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                  <Text style={styles.statusText}>{formatStatus(job.status || 'posted')}</Text>
                </View>
              </View>

              {/* Content below image */}
              <View style={styles.listingContent}>
                <Text style={styles.jobTitle} numberOfLines={1}>{job.title}</Text>

                <View style={styles.metaRow}>
                  {job.category && (
                    <View style={styles.categoryChip}>
                      <Ionicons name={categoryIcon} size={12} color="#717171" />
                      <Text style={styles.categoryText}>
                        {job.category.charAt(0).toUpperCase() + job.category.slice(1)}
                      </Text>
                    </View>
                  )}

                  {budget > 0 && (
                    <Text style={styles.budgetText}>{'\u00A3'}{budget.toLocaleString()}</Text>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          );
        })
      ) : (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="briefcase-outline" size={28} color="#B0B0B0" />
          </View>
          <Text style={styles.emptyText}>No jobs posted yet</Text>
          <Text style={styles.emptySubtext}>Post your first job to get started!</Text>
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
    height: 200,
    borderRadius: 18,
  },
  placeholderHero: {
    width: '100%',
    height: 180,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7F7F7',
  },
  placeholderIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EBEBEB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderCategory: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: '600',
    color: '#717171',
  },
  heartOverlay: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  listingContent: {
    paddingTop: 10,
  },
  jobTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#222222',
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  categoryText: {
    fontSize: 13,
    color: '#717171',
    fontWeight: '500',
  },
  budgetText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#222222',
    letterSpacing: -0.3,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
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
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222222',
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#717171',
    marginTop: 4,
  },
});
