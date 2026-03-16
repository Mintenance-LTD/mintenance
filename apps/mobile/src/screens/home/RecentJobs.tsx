/**
 * RecentJobs Component
 *
 * Airbnb listing-style cards: borderless, full-width images,
 * heart overlay, status badge, category + budget below.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
const STATUS_COLORS: Record<string, string> = {
  posted: '#3B82F6',
  assigned: '#8B5CF6',
  in_progress: theme.colors.accent,
  completed: theme.colors.primary,
  cancelled: theme.colors.error,
  disputed: theme.colors.error,
};
function getStatusColor(status: string): string {
  return STATUS_COLORS[status] || theme.colors.textSecondary;
}
import { OptimizedImage } from '../../components/optimized/OptimizedImage';
import { Skeleton } from '../../components/skeletons/Skeleton';
import { theme } from '../../theme';

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

const CATEGORY_COLORS: Record<string, { bg: string; icon: string; accent: string }> = {
  plumbing:    { bg: '#E0F7FA', icon: '#00ACC1', accent: '#B2EBF2' },
  electrical:  { bg: '#FFF8E1', icon: '#F9A825', accent: '#FFECB3' },
  roofing:     { bg: '#E8F5E9', icon: '#43A047', accent: '#C8E6C9' },
  painting:    { bg: '#E3F2FD', icon: '#1E88E5', accent: '#BBDEFB' },
  carpentry:   { bg: '#FBE9E7', icon: '#D84315', accent: '#FFCCBC' },
  landscaping: { bg: '#E8F5E9', icon: '#2E7D32', accent: '#A5D6A7' },
  cleaning:    { bg: '#F3E5F5', icon: '#8E24AA', accent: '#E1BEE7' },
  hvac:        { bg: '#FFF3E0', icon: '#EF6C00', accent: '#FFE0B2' },
  general:     { bg: '#F5F5F5', icon: '#616161', accent: '#E0E0E0' },
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

  const activeStatuses = ['posted', 'assigned', 'in_progress'];
  const activeJobs = jobs.filter((j) => activeStatuses.includes(j.status || ''));
  const displayJobs = activeJobs.slice(0, 3);

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
          const catColors = CATEGORY_COLORS[job.category?.toLowerCase() || ''] || CATEGORY_COLORS.general;

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
                  <View style={[styles.placeholderHero, { backgroundColor: catColors.bg }]}>
                    <View style={[styles.placeholderDecor, { backgroundColor: catColors.accent, opacity: 0.5 }]} />
                    <View style={[styles.placeholderDecor2, { backgroundColor: catColors.accent, opacity: 0.3 }]} />
                    <View style={[styles.placeholderIconCircle, { backgroundColor: catColors.accent }]}>
                      <Ionicons name={categoryIcon} size={36} color={catColors.icon} />
                    </View>
                    {job.category && (
                      <Text style={[styles.placeholderCategory, { color: catColors.icon }]}>
                        {job.category.charAt(0).toUpperCase() + job.category.slice(1)}
                      </Text>
                    )}
                  </View>
                )}

                {/* Heart overlay (only shown when save handler is provided) */}
                {onSavePress && (
                  <TouchableOpacity
                    style={styles.heartOverlay}
                    onPress={() => onSavePress(job.id)}
                    accessibilityRole="button"
                    accessibilityLabel={savedJobIds.includes(job.id) ? 'Unsave job' : 'Save job'}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons
                      name={savedJobIds.includes(job.id) ? 'heart' : 'heart-outline'}
                      size={22}
                      color={savedJobIds.includes(job.id) ? theme.colors.error : theme.colors.textInverse}
                    />
                  </TouchableOpacity>
                )}

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
                      <Ionicons name={categoryIcon} size={12} color={theme.colors.textSecondary} />
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
            <Ionicons name="briefcase-outline" size={28} color={theme.colors.textTertiary} />
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
    color: theme.colors.textPrimary,
    letterSpacing: -0.3,
  },
  viewAllLink: {
    fontSize: 14,
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
    height: 200,
    borderRadius: 18,
  },
  placeholderHero: {
    width: '100%',
    height: 180,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  placeholderDecor: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    top: -30,
    right: -20,
  },
  placeholderDecor2: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    bottom: -20,
    left: -10,
  },
  placeholderIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderCategory: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
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
    color: theme.colors.textInverse,
  },
  listingContent: {
    paddingTop: 10,
  },
  jobTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: theme.colors.textPrimary,
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
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  budgetText: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    letterSpacing: -0.3,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
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
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
});
