import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Dimensions,
  ViewStyle,
  DimensionValue,
} from 'react-native';
import { theme } from '../../theme';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface LoadingProps {
  size?: 'small' | 'large';
  color?: string;
  text?: string;
  overlay?: boolean;
}

export interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export interface SkeletonCardProps {
  showAvatar?: boolean;
  showTitle?: boolean;
  showSubtitle?: boolean;
  showDescription?: boolean;
  lines?: number;
  style?: ViewStyle;
}

// ============================================================================
// BASIC LOADING INDICATORS
// ============================================================================

/**
 * Standard loading spinner with optional text
 */
export const LoadingSpinner: React.FC<LoadingProps> = ({
  size = 'large',
  color = theme.colors.primary,
  text,
  overlay = false,
}) => {
  const containerStyle = overlay ? styles.overlayContainer : styles.inlineContainer;

  return (
    <View style={containerStyle}>
      <ActivityIndicator
        size={size}
        color={color}
        accessibilityLabel="Loading"
        accessibilityHint="Content is loading, please wait"
      />
      {text && <Text style={styles.loadingText}>{text}</Text>}
    </View>
  );
};

/**
 * Full screen loading overlay
 */
export const LoadingOverlay: React.FC<LoadingProps> = ({
  size = 'large',
  color = theme.colors.primary,
  text = 'Loading...',
}) => (
  <View style={styles.fullScreenOverlay}>
    <View style={styles.overlayContent}>
      <ActivityIndicator size={size} color={color} />
      <Text style={styles.overlayText}>{text}</Text>
    </View>
  </View>
);

/**
 * Inline loading for buttons and small components
 */
export const InlineLoader: React.FC<{ color?: string }> = ({
  color = theme.colors.textInverse,
}) => (
  <ActivityIndicator
    size="small"
    color={color}
    style={styles.inlineLoader}
  />
);

// ============================================================================
// SKELETON LOADING COMPONENTS
// ============================================================================

/**
 * Basic skeleton placeholder with shimmer animation
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 16,
  borderRadius = theme.borderRadius.sm,
  style,
}) => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shimmer = () => {
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]).start(() => shimmer());
    };

    shimmer();
  }, [shimmerAnim]);

  const shimmerStyle = {
    opacity: shimmerAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 0.7],
    }),
  };

  return (
    <View
      style={[
        styles.skeletonBase,
        {
          width,
          height,
          borderRadius,
        },
        style,
      ]}
    >
      <Animated.View style={[styles.shimmer, shimmerStyle]} />
    </View>
  );
};

/**
 * Skeleton card for job listings, contractor cards, etc.
 */
export const SkeletonCard: React.FC<SkeletonCardProps> = ({
  showAvatar = true,
  showTitle = true,
  showSubtitle = true,
  showDescription = true,
  lines = 3,
  style,
}) => (
  <View style={[styles.skeletonCard, style]}>
    <View style={styles.skeletonHeader}>
      {showAvatar && (
        <Skeleton
          width={48}
          height={48}
          borderRadius={24}
          style={styles.skeletonAvatar}
        />
      )}
      <View style={styles.skeletonHeaderText}>
        {showTitle && (
          <Skeleton width="70%" height={16} style={styles.skeletonTitle} />
        )}
        {showSubtitle && (
          <Skeleton width="50%" height={12} style={styles.skeletonSubtitle} />
        )}
      </View>
    </View>

    {showDescription && (
      <View style={styles.skeletonContent}>
        {Array.from({ length: lines }, (_, index) => (
          <Skeleton
            key={index}
            width={index === lines - 1 ? '80%' : '100%'}
            height={12}
            style={styles.skeletonLine}
          />
        ))}
      </View>
    )}
  </View>
);

/**
 * Skeleton list for loading multiple items
 */
export const SkeletonList: React.FC<{
  itemCount?: number;
  itemHeight?: number;
  showSeparator?: boolean;
}> = ({ itemCount = 5, itemHeight = 80, showSeparator = true }) => (
  <View style={styles.skeletonList}>
    {Array.from({ length: itemCount }, (_, index) => (
      <View key={index}>
        <SkeletonCard />
        {showSeparator && index < itemCount - 1 && (
          <View style={styles.skeletonSeparator} />
        )}
      </View>
    ))}
  </View>
);

// ============================================================================
// SPECIALIZED LOADING STATES
// ============================================================================

/**
 * Loading state for dashboard/home screen
 */
export const SkeletonDashboard: React.FC = () => (
  <View style={styles.skeletonDashboard}>
    {/* Header section */}
    <View style={styles.skeletonDashboardHeader}>
      <Skeleton width="60%" height={24} style={{ marginBottom: 8 }} />
      <Skeleton width="40%" height={16} />
    </View>

    {/* Stats cards */}
    <View style={styles.skeletonStatsRow}>
      {[1, 2, 3].map((item) => (
        <View key={item} style={styles.skeletonStatCard}>
          <Skeleton width="100%" height={32} style={{ marginBottom: 8 }} />
          <Skeleton width="60%" height={14} />
        </View>
      ))}
    </View>

    {/* Content list */}
    <View style={styles.skeletonDashboardContent}>
      <Skeleton width="50%" height={18} style={{ marginBottom: 16 }} />
      <SkeletonList itemCount={3} />
    </View>
  </View>
);

/**
 * Loading state for job details
 */
export const SkeletonJobDetails: React.FC = () => (
  <View style={styles.skeletonJobDetails}>
    {/* Job header */}
    <View style={styles.skeletonJobHeader}>
      <Skeleton width="80%" height={24} style={{ marginBottom: 8 }} />
      <Skeleton width="60%" height={16} style={{ marginBottom: 16 }} />
      <View style={styles.skeletonJobMeta}>
        <Skeleton width={80} height={14} />
        <Skeleton width={100} height={14} />
        <Skeleton width={120} height={14} />
      </View>
    </View>

    {/* Job description */}
    <View style={styles.skeletonJobContent}>
      <Skeleton width="100%" height={14} style={{ marginBottom: 8 }} />
      <Skeleton width="100%" height={14} style={{ marginBottom: 8 }} />
      <Skeleton width="75%" height={14} style={{ marginBottom: 16 }} />
    </View>

    {/* Action buttons */}
    <View style={styles.skeletonJobActions}>
      <Skeleton width="48%" height={44} />
      <Skeleton width="48%" height={44} />
    </View>
  </View>
);

/**
 * Loading state for profile screen
 */
export const SkeletonProfile: React.FC = () => (
  <View style={styles.skeletonProfile}>
    {/* Profile header */}
    <View style={styles.skeletonProfileHeader}>
      <Skeleton width={80} height={80} borderRadius={40} />
      <View style={styles.skeletonProfileInfo}>
        <Skeleton width="70%" height={20} style={{ marginBottom: 8 }} />
        <Skeleton width="50%" height={14} style={{ marginBottom: 8 }} />
        <Skeleton width="60%" height={14} />
      </View>
    </View>

    {/* Profile stats */}
    <View style={styles.skeletonProfileStats}>
      {[1, 2, 3, 4].map((item) => (
        <View key={item} style={styles.skeletonProfileStat}>
          <Skeleton width={40} height={24} style={{ marginBottom: 4 }} />
          <Skeleton width="100%" height={12} />
        </View>
      ))}
    </View>

    {/* Profile sections */}
    <View style={styles.skeletonProfileSections}>
      <SkeletonList itemCount={4} showSeparator={false} />
    </View>
  </View>
);

// ============================================================================
// STYLES
// ============================================================================

const { width: screenWidth } = Dimensions.get('window');

const styles = StyleSheet.create({
  // Basic loading containers
  inlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.md,
  },
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  fullScreenOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  overlayContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    alignItems: 'center',
    minWidth: 120,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  loadingText: {
    marginTop: theme.spacing.sm,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  overlayText: {
    marginTop: theme.spacing.md,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textPrimary,
    fontWeight: '500',
  },
  inlineLoader: {
    marginHorizontal: theme.spacing.sm,
  },

  // Skeleton styles
  skeletonBase: {
    backgroundColor: theme.colors.surfaceSecondary,
    overflow: 'hidden',
  },
  shimmer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.surfaceTertiary,
  },
  skeletonCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.base,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    ...theme.shadows.sm,
  },
  skeletonHeader: {
    flexDirection: 'row',
    marginBottom: theme.spacing.md,
  },
  skeletonAvatar: {
    marginRight: theme.spacing.sm,
  },
  skeletonHeaderText: {
    flex: 1,
  },
  skeletonTitle: {
    marginBottom: theme.spacing.xs,
  },
  skeletonSubtitle: {
    marginBottom: theme.spacing.xs,
  },
  skeletonContent: {
    marginTop: theme.spacing.sm,
  },
  skeletonLine: {
    marginBottom: theme.spacing.xs,
  },
  skeletonList: {
    flex: 1,
  },
  skeletonSeparator: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.sm,
  },

  // Specialized skeleton layouts
  skeletonDashboard: {
    flex: 1,
    padding: theme.spacing.md,
  },
  skeletonDashboardHeader: {
    marginBottom: theme.spacing.lg,
  },
  skeletonStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.lg,
  },
  skeletonStatCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.base,
    padding: theme.spacing.md,
    width: (screenWidth - theme.spacing.md * 4) / 3,
    ...theme.shadows.sm,
  },
  skeletonDashboardContent: {
    flex: 1,
  },

  skeletonJobDetails: {
    flex: 1,
    padding: theme.spacing.md,
  },
  skeletonJobHeader: {
    marginBottom: theme.spacing.lg,
  },
  skeletonJobMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  skeletonJobContent: {
    marginBottom: theme.spacing.xl,
  },
  skeletonJobActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  skeletonProfile: {
    flex: 1,
    padding: theme.spacing.md,
  },
  skeletonProfileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  skeletonProfileInfo: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  skeletonProfileStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.base,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    ...theme.shadows.sm,
  },
  skeletonProfileStat: {
    alignItems: 'center',
  },
  skeletonProfileSections: {
    flex: 1,
  },
});

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  LoadingSpinner,
  LoadingOverlay,
  InlineLoader,
  Skeleton,
  SkeletonCard,
  SkeletonList,
  SkeletonDashboard,
  SkeletonJobDetails,
  SkeletonProfile,
};