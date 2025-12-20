/**
 * ListSkeleton Component (React Native)
 *
 * Generic mobile skeleton loader for list items.
 * Flexible component that can be used for various list types.
 *
 * @example
 * <ListSkeleton />
 * <ListSkeleton count={10} showImage />
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Skeleton, SkeletonAvatar, SkeletonGroup } from './Skeleton';

export interface ListSkeletonProps {
  /**
   * Number of list items to render
   * @default 5
   */
  count?: number;

  /**
   * Whether to show image/avatar
   * @default true
   */
  showImage?: boolean;

  /**
   * Image variant
   * @default 'circular'
   */
  imageVariant?: 'circular' | 'square';
}

const SingleListItemSkeleton: React.FC<{
  showImage?: boolean;
  imageVariant?: 'circular' | 'square';
}> = ({ showImage = true, imageVariant = 'circular' }) => {
  return (
    <View style={styles.item}>
      {/* Image/Avatar */}
      {showImage && (
        imageVariant === 'circular' ? (
          <SkeletonAvatar size={48} />
        ) : (
          <Skeleton width={48} height={48} borderRadius={8} />
        )
      )}

      {/* Content */}
      <View style={styles.content}>
        <Skeleton width="70%" height={16} borderRadius={6} style={styles.marginBottom} />
        <Skeleton width="50%" height={14} borderRadius={6} />
      </View>

      {/* Right Content */}
      <Skeleton width={24} height={24} borderRadius={12} />
    </View>
  );
};

export const ListSkeleton: React.FC<ListSkeletonProps> = ({
  count = 5,
  showImage = true,
  imageVariant = 'circular',
}) => {
  return (
    <View style={styles.container}>
      {Array.from({ length: count }).map((_, index) => (
        <SingleListItemSkeleton
          key={index}
          showImage={showImage}
          imageVariant={imageVariant}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  marginBottom: {
    marginBottom: 8,
  },
});

export default ListSkeleton;
