import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '../theme';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

const Skeleton: React.FC<SkeletonProps> = ({ 
  width = '100%', 
  height = 20, 
  borderRadius = 8,
  style 
}) => {
  const shimmerAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createShimmerAnimation = () => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(shimmerAnimation, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(shimmerAnimation, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const animation = createShimmerAnimation();
    animation.start();

    return () => animation.stop();
  }, [shimmerAnimation]);

  const opacity = shimmerAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
};

// Pre-built skeleton components for common UI patterns
export const SkeletonText: React.FC<{ lines?: number }> = ({ lines = 1 }) => (
  <View>
    {Array.from({ length: lines }, (_, index) => (
      <Skeleton
        key={index}
        height={16}
        width={index === lines - 1 ? '80%' : '100%'}
        style={{ marginBottom: 8 }}
      />
    ))}
  </View>
);

export const SkeletonAvatar: React.FC<{ size?: number }> = ({ size = 50 }) => (
  <Skeleton width={size} height={size} borderRadius={size / 2} />
);

export const SkeletonButton: React.FC = () => (
  <Skeleton height={48} borderRadius={20} />
);

export const SkeletonCard: React.FC = () => (
  <View style={styles.cardContainer}>
    <View style={styles.cardHeader}>
      <SkeletonAvatar size={48} />
      <View style={styles.cardHeaderText}>
        <Skeleton height={16} width="60%" style={{ marginBottom: 4 }} />
        <Skeleton height={12} width="40%" />
      </View>
    </View>
    <SkeletonText lines={3} />
    <View style={styles.cardActions}>
      <Skeleton height={32} width={80} borderRadius={16} />
      <Skeleton height={32} width={80} borderRadius={16} />
      <Skeleton height={32} width={80} borderRadius={16} />
    </View>
  </View>
);

export const SkeletonPostCard: React.FC = () => (
  <View style={styles.postCard}>
    {/* Post Header */}
    <View style={styles.postHeader}>
      <SkeletonAvatar size={48} />
      <View style={styles.postHeaderInfo}>
        <Skeleton height={16} width="70%" style={{ marginBottom: 4 }} />
        <Skeleton height={12} width="40%" />
      </View>
    </View>
    
    {/* Post Content */}
    <SkeletonText lines={2} />
    
    {/* Hashtags */}
    <View style={styles.hashtags}>
      <Skeleton height={24} width={60} borderRadius={12} style={{ marginRight: 8 }} />
      <Skeleton height={24} width={80} borderRadius={12} style={{ marginRight: 8 }} />
      <Skeleton height={24} width={70} borderRadius={12} />
    </View>
    
    {/* Engagement Row */}
    <View style={styles.engagementRow}>
      <Skeleton height={20} width={40} />
      <Skeleton height={20} width={40} />
      <Skeleton height={20} width={40} />
      <Skeleton height={20} width={20} />
    </View>
  </View>
);

export const SkeletonMessageCard: React.FC = () => (
  <View style={styles.messageCard}>
    <SkeletonAvatar size={50} />
    <View style={styles.messageContent}>
      <View style={styles.messageHeader}>
        <Skeleton height={16} width="50%" />
        <Skeleton height={12} width="30%" />
      </View>
      <Skeleton height={14} width="40%" style={{ marginBottom: 4 }} />
      <Skeleton height={14} width="70%" />
    </View>
  </View>
);

export const SkeletonStatCard: React.FC = () => (
  <View style={styles.statCard}>
    <Skeleton height={24} width="60%" style={{ marginBottom: 8 }} />
    <Skeleton height={14} width="80%" style={{ marginBottom: 8 }} />
    <SkeletonAvatar size={20} />
  </View>
);

export const SkeletonDashboard: React.FC = () => (
  <View>
    {/* Stats Grid */}
    <View style={styles.statsGrid}>
      <SkeletonStatCard />
      <SkeletonStatCard />
      <SkeletonStatCard />
      <SkeletonStatCard />
    </View>
    
    {/* Schedule Section */}
    <View style={styles.section}>
      <Skeleton height={20} width="40%" style={{ marginBottom: 16 }} />
      <View style={styles.scheduleCard}>
        <SkeletonText lines={2} />
      </View>
    </View>
  </View>
);

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#E5E7EB',
  },
  cardContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    ...theme.shadows.base,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardHeaderText: {
    marginLeft: 12,
    flex: 1,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  postCard: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 20,
    padding: 20,
    ...theme.shadows.base,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  postHeaderInfo: {
    marginLeft: 12,
    flex: 1,
  },
  hashtags: {
    flexDirection: 'row',
    marginVertical: 12,
  },
  engagementRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  messageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    ...theme.shadows.base,
  },
  messageContent: {
    marginLeft: 12,
    flex: 1,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    flex: 1,
    margin: 4,
    ...theme.shadows.base,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    margin: -4,
  },
  section: {
    marginVertical: 16,
    paddingHorizontal: 16,
  },
  scheduleCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    ...theme.shadows.base,
  },
});

export default Skeleton;