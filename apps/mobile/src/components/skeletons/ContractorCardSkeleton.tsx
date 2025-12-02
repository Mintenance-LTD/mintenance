/**
 * ContractorCardSkeleton Component (React Native)
 *
 * Mobile skeleton loader for contractor cards.
 * Includes avatar, name, rating, and skills badges.
 *
 * @example
 * <ContractorCardSkeleton />
 * <ContractorCardSkeleton count={4} />
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Skeleton, SkeletonAvatar, SkeletonGroup } from './Skeleton';

export interface ContractorCardSkeletonProps {
  /**
   * Number of skeleton cards to render
   * @default 1
   */
  count?: number;

  /**
   * Whether to show portfolio thumbnails
   * @default false
   */
  showPortfolio?: boolean;
}

const SingleContractorCardSkeleton: React.FC<Omit<ContractorCardSkeletonProps, 'count'>> = ({
  showPortfolio = false,
}) => {
  return (
    <View style={styles.card}>
      {/* Header with Avatar */}
      <View style={styles.header}>
        <SkeletonAvatar size={56} />

        <View style={styles.headerInfo}>
          <Skeleton width={120} height={18} borderRadius={6} style={styles.marginBottom} />
          <View style={styles.ratingRow}>
            <Skeleton width={70} height={14} borderRadius={6} />
            <Skeleton width={50} height={14} borderRadius={6} style={styles.marginLeft} />
          </View>
          <Skeleton width={80} height={20} borderRadius={10} style={styles.badge} />
        </View>

        <Skeleton width={32} height={32} borderRadius={16} />
      </View>

      {/* Bio */}
      <SkeletonGroup gap={8} style={styles.bio}>
        <Skeleton width="100%" height={14} borderRadius={6} />
        <Skeleton width="90%" height={14} borderRadius={6} />
        <Skeleton width="75%" height={14} borderRadius={6} />
      </SkeletonGroup>

      {/* Skills */}
      <View style={styles.skillsSection}>
        <Skeleton width={60} height={14} borderRadius={6} style={styles.marginBottom} />
        <View style={styles.skills}>
          <Skeleton width={70} height={24} borderRadius={12} />
          <Skeleton width={85} height={24} borderRadius={12} />
          <Skeleton width={90} height={24} borderRadius={12} />
          <Skeleton width={60} height={24} borderRadius={12} />
        </View>
      </View>

      {/* Portfolio */}
      {showPortfolio && (
        <View style={styles.portfolio}>
          <Skeleton width={80} height={14} borderRadius={6} style={styles.marginBottom} />
          <View style={styles.portfolioGrid}>
            {[1, 2, 3, 4].map((item) => (
              <Skeleton
                key={item}
                width="23%"
                height={80}
                borderRadius={8}
              />
            ))}
          </View>
        </View>
      )}

      {/* Stats */}
      <View style={styles.stats}>
        <View style={styles.stat}>
          <Skeleton width={40} height={20} borderRadius={6} style={styles.marginBottom} />
          <Skeleton width={50} height={12} borderRadius={6} />
        </View>
        <View style={styles.stat}>
          <Skeleton width={40} height={20} borderRadius={6} style={styles.marginBottom} />
          <Skeleton width={60} height={12} borderRadius={6} />
        </View>
        <View style={styles.stat}>
          <Skeleton width={40} height={20} borderRadius={6} style={styles.marginBottom} />
          <Skeleton width={70} height={12} borderRadius={6} />
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <Skeleton width="48%" height={44} borderRadius={12} />
        <Skeleton width="48%" height={44} borderRadius={12} />
      </View>
    </View>
  );
};

export const ContractorCardSkeleton: React.FC<ContractorCardSkeletonProps> = ({
  count = 1,
  showPortfolio = false,
}) => {
  return (
    <View style={styles.container}>
      {Array.from({ length: count }).map((_, index) => (
        <SingleContractorCardSkeleton key={index} showPortfolio={showPortfolio} />
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
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  headerInfo: {
    flex: 1,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    marginTop: 8,
  },
  bio: {
    marginBottom: 16,
  },
  skillsSection: {
    marginBottom: 16,
  },
  skills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  portfolio: {
    marginBottom: 16,
  },
  portfolioGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    marginBottom: 16,
  },
  stat: {
    alignItems: 'center',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  marginBottom: {
    marginBottom: 8,
  },
  marginLeft: {
    marginLeft: 8,
  },
});

export default ContractorCardSkeleton;
