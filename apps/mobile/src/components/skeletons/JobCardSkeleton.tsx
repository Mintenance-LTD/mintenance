/**
 * JobCardSkeleton Component (React Native)
 *
 * Mobile skeleton loader for job cards.
 * Matches the layout of mobile job card components.
 *
 * @example
 * <JobCardSkeleton />
 * <JobCardSkeleton count={3} />
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Skeleton, SkeletonGroup, SkeletonImage } from './Skeleton';

export interface JobCardSkeletonProps {
  /**
   * Number of skeleton cards to render
   * @default 1
   */
  count?: number;

  /**
   * Whether to show the image placeholder
   * @default true
   */
  showImage?: boolean;
}

const SingleJobCardSkeleton: React.FC<Omit<JobCardSkeletonProps, 'count'>> = ({
  showImage = true,
}) => {
  return (
    <View style={styles.card}>
      {/* Image Section */}
      {showImage && (
        <SkeletonImage width="100%" aspectRatio={16 / 9} borderRadius={0} style={styles.image} />
      )}

      {/* Content */}
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          {/* Title and Location */}
          <View style={styles.headerLeft}>
            <Skeleton width="80%" height={20} borderRadius={6} style={styles.marginBottom} />
            <View style={styles.locationRow}>
              <Skeleton width={16} height={16} borderRadius={8} />
              <Skeleton width={120} height={14} borderRadius={6} style={styles.marginLeft} />
            </View>
          </View>

          {/* Budget */}
          <View style={styles.budget}>
            <Skeleton width={80} height={28} borderRadius={6} style={styles.marginBottom} />
            <Skeleton width={50} height={12} borderRadius={6} />
          </View>
        </View>

        {/* Description */}
        <SkeletonGroup gap={8} style={styles.description}>
          <Skeleton width="100%" height={14} borderRadius={6} />
          <Skeleton width="85%" height={14} borderRadius={6} />
        </SkeletonGroup>

        {/* Badges */}
        <View style={styles.badges}>
          <Skeleton width={70} height={24} borderRadius={12} />
          <Skeleton width={80} height={24} borderRadius={12} />
          <Skeleton width={90} height={24} borderRadius={12} />
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Skeleton width={100} height={14} borderRadius={6} />
          <Skeleton width={90} height={14} borderRadius={6} />
        </View>
      </View>
    </View>
  );
};

export const JobCardSkeleton: React.FC<JobCardSkeletonProps> = ({
  count = 1,
  showImage = true,
}) => {
  return (
    <View style={styles.container}>
      {Array.from({ length: count }).map((_, index) => (
        <SingleJobCardSkeleton key={index} showImage={showImage} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  image: {
    marginBottom: 0,
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  headerLeft: {
    flex: 1,
    minWidth: 0,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  budget: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  description: {
    marginBottom: 16,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  marginBottom: {
    marginBottom: 8,
  },
  marginLeft: {
    marginLeft: 8,
  },
});

export default JobCardSkeleton;
