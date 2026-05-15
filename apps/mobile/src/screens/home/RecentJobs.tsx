/**
 * RecentJobs Component
 *
 * Airbnb listing-style cards: borderless, full-width images,
 * heart overlay, status badge, category + budget below.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { OptimizedImage } from '../../components/optimized/OptimizedImage';
import { Skeleton } from '../../components/skeletons/Skeleton';
import { getStatusBadge } from '../../theme';
import { me } from '../../design-system/mint-editorial';
import { normalizePhotoUrls } from '../../utils/photoUrls';

interface RecentJob {
  id: string;
  title: string;
  status?: string;
  category?: string;
  budget?: number;
  budget_min?: number;
  photos?: string[];
  images?: string[];
  contractor?: { first_name?: string; last_name?: string } | null;
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

const CATEGORY_COLORS: Record<
  string,
  { bg: string; icon: string; accent: string }
> = {
  plumbing: { bg: '#E0F7FA', icon: '#00ACC1', accent: '#B2EBF2' },
  electrical: { bg: '#FFF8E1', icon: '#F9A825', accent: '#FFECB3' },
  roofing: { bg: '#E8F5E9', icon: '#43A047', accent: '#C8E6C9' },
  painting: { bg: '#E3F2FD', icon: '#1E88E5', accent: '#BBDEFB' },
  carpentry: { bg: '#FBE9E7', icon: '#D84315', accent: '#FFCCBC' },
  landscaping: { bg: '#E8F5E9', icon: '#2E7D32', accent: '#A5D6A7' },
  cleaning: { bg: '#F3E5F5', icon: '#8E24AA', accent: '#E1BEE7' },
  hvac: { bg: '#FFF3E0', icon: '#EF6C00', accent: '#FFE0B2' },
  general: { bg: '#F5F5F5', icon: '#616161', accent: '#E0E0E0' },
};

function formatStatus(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export const RecentJobs: React.FC<RecentJobsProps> = ({
  isLoading,
  jobs,
  onViewAllPress,
  onJobPress,
  savedJobIds = [],
  onSavePress,
}) => {
  if (isLoading) {
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Active Projects</Text>
        </View>
        {[1, 2].map((key) => (
          <View key={key} style={styles.listing}>
            <Skeleton width='100%' height={200} borderRadius={18} />
            <View style={styles.listingContent}>
              <Skeleton width='70%' height={17} borderRadius={4} />
              <Skeleton
                width={100}
                height={20}
                borderRadius={12}
                style={{ marginTop: 6 }}
              />
            </View>
          </View>
        ))}
      </View>
    );
  }

  const activeStatuses = ['posted', 'assigned', 'in_progress'];
  const activeJobs = jobs.filter((j) =>
    activeStatuses.includes(j.status || '')
  );
  const displayJobs = activeJobs.slice(0, 3);

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Active Projects</Text>
        <TouchableOpacity
          onPress={onViewAllPress}
          accessibilityRole='button'
          accessibilityLabel='View all recent jobs'
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.viewAllLink}>View All</Text>
        </TouchableOpacity>
      </View>

      {displayJobs.length > 0 ? (
        displayJobs.map((job) => {
          const statusBadge = getStatusBadge(job.status || 'posted');
          const photos = normalizePhotoUrls(job.photos || job.images);
          const hasPhoto = photos.length > 0;
          const budget = job.budget || job.budget_min || 0;
          const categoryIcon =
            CATEGORY_ICONS[job.category?.toLowerCase() ?? ''] ??
            'construct-outline';
          const catColors = CATEGORY_COLORS[
            job.category?.toLowerCase() ?? ''
          ] ??
            CATEGORY_COLORS.general ?? {
              bg: '#F5F5F5',
              icon: '#616161',
              accent: '#E0E0E0',
            };

          return (
            <TouchableOpacity
              key={job.id}
              style={styles.listing}
              onPress={() => onJobPress?.(job.id)}
              accessibilityRole='button'
              accessibilityLabel={`${job.title}, ${formatStatus(job.status || 'posted')}`}
              activeOpacity={0.95}
            >
              {/* Image */}
              <View style={styles.imageContainer}>
                {hasPhoto ? (
                  <OptimizedImage
                    source={{ uri: photos[0] ?? '' }}
                    style={styles.heroImage}
                    contentFit='cover'
                    cachePolicy='memory-disk'
                    quality='low'
                  />
                ) : (
                  <View
                    style={[
                      styles.placeholderHero,
                      { backgroundColor: catColors.bg },
                    ]}
                  >
                    <View
                      style={[
                        styles.placeholderDecor,
                        { backgroundColor: catColors.accent, opacity: 0.5 },
                      ]}
                    />
                    <View
                      style={[
                        styles.placeholderDecor2,
                        { backgroundColor: catColors.accent, opacity: 0.3 },
                      ]}
                    />
                    <View
                      style={[
                        styles.placeholderIconCircle,
                        { backgroundColor: catColors.accent },
                      ]}
                    >
                      <Ionicons
                        name={categoryIcon}
                        size={36}
                        color={catColors.icon}
                      />
                    </View>
                    {job.category && (
                      <Text
                        style={[
                          styles.placeholderCategory,
                          { color: catColors.icon },
                        ]}
                      >
                        {job.category.charAt(0).toUpperCase() +
                          job.category.slice(1)}
                      </Text>
                    )}
                  </View>
                )}

                {/* Heart overlay (only shown when save handler is provided) */}
                {onSavePress && (
                  <TouchableOpacity
                    style={styles.heartOverlay}
                    onPress={() => onSavePress(job.id)}
                    accessibilityRole='button'
                    accessibilityLabel={
                      savedJobIds.includes(job.id) ? 'Unsave job' : 'Save job'
                    }
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons
                      name={
                        savedJobIds.includes(job.id) ? 'heart' : 'heart-outline'
                      }
                      size={22}
                      color={
                        savedJobIds.includes(job.id) ? me.errFg : me.onBrand
                      }
                    />
                  </TouchableOpacity>
                )}

                {/* Status badge */}
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: statusBadge.bg },
                  ]}
                >
                  <Text
                    style={[styles.statusText, { color: statusBadge.text }]}
                  >
                    {statusBadge.label}
                  </Text>
                </View>
              </View>

              {/* Content below image */}
              <View style={styles.listingContent}>
                <View style={styles.titleRow}>
                  <View style={styles.titleLeft}>
                    {job.category && (
                      <Text style={styles.categoryLabel}>
                        {job.category.toUpperCase()}
                      </Text>
                    )}
                    <Text style={styles.jobTitle} numberOfLines={1}>
                      {job.title}
                    </Text>
                  </View>
                  {budget > 0 && (
                    <Text style={styles.budgetText}>
                      {'\u00A3'}
                      {budget.toLocaleString()}
                    </Text>
                  )}
                </View>

                {/* Contractor info row (assigned/in_progress jobs) */}
                {job.contractor &&
                  (job.status === 'assigned' ||
                    job.status === 'in_progress') && (
                    <View style={styles.contractorRow}>
                      <View style={styles.contractorAvatar}>
                        <Ionicons name='person' size={12} color={me.ink2} />
                      </View>
                      <Text style={styles.contractorText}>
                        Contractor: {job.contractor.first_name}{' '}
                        {job.contractor.last_name?.charAt(0)}.
                      </Text>
                    </View>
                  )}

                {/* Awaiting quotes for posted jobs */}
                {job.status === 'posted' && (
                  <View style={styles.contractorRow}>
                    <View style={styles.contractorAvatar}>
                      <Ionicons
                        name='hourglass-outline'
                        size={12}
                        color={me.ink2}
                      />
                    </View>
                    <Text style={styles.contractorText}>
                      Awaiting quotes...
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })
      ) : (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name='briefcase-outline' size={28} color={me.ink3} />
          </View>
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
    fontFamily: me.font.display,
    fontSize: 22,
    color: me.ink,
    letterSpacing: me.displayTracking,
  },
  viewAllLink: {
    fontSize: 14,
    color: me.brand,
    fontWeight: '600',
  },
  listing: {
    marginBottom: 20,
    backgroundColor: me.surface,
    borderRadius: me.radius.card,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: me.line,
    ...me.shadow.pop,
  },
  imageContainer: {
    position: 'relative',
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: 200,
  },
  placeholderHero: {
    width: '100%',
    height: 180,
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
    color: me.onBrand,
  },
  listingContent: {
    padding: 16,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleLeft: {
    flex: 1,
    marginRight: 12,
  },
  categoryLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: me.brand,
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  jobTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: me.ink,
    letterSpacing: -0.3,
  },
  budgetText: {
    fontFamily: me.font.display,
    fontSize: 22,
    color: me.ink,
    letterSpacing: me.displayTracking,
  },
  contractorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: me.line2,
  },
  contractorAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: me.bg2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contractorText: {
    fontSize: 13,
    fontWeight: '500',
    color: me.ink2,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    backgroundColor: me.surface,
    borderRadius: me.radius.card,
    borderWidth: 1,
    borderColor: me.line,
    ...me.shadow.card,
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: me.bg2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: me.ink,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: me.ink2,
    marginTop: 4,
  },
});
