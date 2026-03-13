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
  Platform,
} from 'react-native';

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

export const LoadingSpinner: React.FC<LoadingProps> = ({
  size = 'large', color = '#222222', text, overlay = false,
}) => (
  <View style={overlay ? styles.overlayContainer : styles.inlineContainer}>
    <ActivityIndicator size={size} color={color} accessibilityLabel="Loading" accessibilityHint="Content is loading, please wait" />
    {text && <Text style={styles.loadingText}>{text}</Text>}
  </View>
);

export const LoadingOverlay: React.FC<LoadingProps> = ({
  size = 'large', color = '#222222', text = 'Loading...',
}) => (
  <View style={styles.fullScreenOverlay}>
    <View style={styles.overlayContent}>
      <ActivityIndicator size={size} color={color} />
      <Text style={styles.overlayText}>{text}</Text>
    </View>
  </View>
);

export const InlineLoader: React.FC<{ color?: string }> = ({ color = '#FFFFFF' }) => (
  <ActivityIndicator size="small" color={color} style={styles.inlineLoader} />
);

export const Skeleton: React.FC<SkeletonProps> = ({ width = '100%', height = 16, borderRadius = 6, style }) => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const shimmer = () => {
      Animated.sequence([
        Animated.timing(shimmerAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(shimmerAnim, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ]).start(() => shimmer());
    };
    shimmer();
  }, [shimmerAnim]);
  return (
    <View style={[styles.skeletonBase, { width, height, borderRadius }, style]}>
      <Animated.View style={[styles.shimmer, { opacity: shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] }) }]} />
    </View>
  );
};

export const SkeletonCard: React.FC<SkeletonCardProps> = ({ showAvatar = true, showTitle = true, showSubtitle = true, showDescription = true, lines = 3, style }) => (
  <View style={[styles.skeletonCard, style]}>
    <View style={styles.skeletonHeader}>
      {showAvatar && <Skeleton width={48} height={48} borderRadius={24} style={{ marginRight: 8 }} />}
      <View style={styles.skeletonHeaderText}>
        {showTitle && <Skeleton width="70%" height={16} style={{ marginBottom: 6 }} />}
        {showSubtitle && <Skeleton width="50%" height={12} style={{ marginBottom: 6 }} />}
      </View>
    </View>
    {showDescription && (
      <View style={{ marginTop: 8 }}>
        {Array.from({ length: lines }, (_, i) => (
          <Skeleton key={i} width={i === lines - 1 ? '80%' : '100%'} height={12} style={{ marginBottom: 6 }} />
        ))}
      </View>
    )}
  </View>
);

export const SkeletonList: React.FC<{ itemCount?: number; itemHeight?: number; showSeparator?: boolean }> = ({ itemCount = 5, showSeparator = true }) => (
  <View style={{ flex: 1 }}>
    {Array.from({ length: itemCount }, (_, i) => (
      <View key={i}>
        <SkeletonCard />
        {showSeparator && i < itemCount - 1 && <View style={styles.skeletonSeparator} />}
      </View>
    ))}
  </View>
);

export const SkeletonDashboard: React.FC = () => (
  <View style={{ flex: 1, padding: 16 }}>
    <View style={{ marginBottom: 20 }}>
      <Skeleton width="60%" height={24} style={{ marginBottom: 8 }} />
      <Skeleton width="40%" height={16} />
    </View>
    <View style={styles.skeletonStatsRow}>
      {[1, 2, 3].map((item) => (
        <View key={item} style={styles.skeletonStatCard}>
          <Skeleton width="100%" height={32} style={{ marginBottom: 8 }} />
          <Skeleton width="60%" height={14} />
        </View>
      ))}
    </View>
    <View style={{ flex: 1 }}>
      <Skeleton width="50%" height={18} style={{ marginBottom: 16 }} />
      <SkeletonList itemCount={3} />
    </View>
  </View>
);

export const SkeletonJobDetails: React.FC = () => (
  <View style={{ flex: 1, padding: 16 }}>
    <View style={{ marginBottom: 20 }}>
      <Skeleton width="80%" height={24} style={{ marginBottom: 8 }} />
      <Skeleton width="60%" height={16} style={{ marginBottom: 16 }} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Skeleton width={80} height={14} />
        <Skeleton width={100} height={14} />
        <Skeleton width={120} height={14} />
      </View>
    </View>
    <View style={{ marginBottom: 24 }}>
      <Skeleton width="100%" height={14} style={{ marginBottom: 8 }} />
      <Skeleton width="100%" height={14} style={{ marginBottom: 8 }} />
      <Skeleton width="75%" height={14} style={{ marginBottom: 16 }} />
    </View>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Skeleton width="48%" height={44} />
      <Skeleton width="48%" height={44} />
    </View>
  </View>
);

export const SkeletonProfile: React.FC = () => (
  <View style={{ flex: 1, padding: 16 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
      <Skeleton width={80} height={80} borderRadius={40} />
      <View style={{ flex: 1, marginLeft: 16 }}>
        <Skeleton width="70%" height={20} style={{ marginBottom: 8 }} />
        <Skeleton width="50%" height={14} style={{ marginBottom: 8 }} />
        <Skeleton width="60%" height={14} />
      </View>
    </View>
    <View style={styles.skeletonProfileStats}>
      {[1, 2, 3, 4].map((item) => (
        <View key={item} style={{ alignItems: 'center' }}>
          <Skeleton width={40} height={24} style={{ marginBottom: 4 }} />
          <Skeleton width={60} height={12} />
        </View>
      ))}
    </View>
    <SkeletonList itemCount={4} showSeparator={false} />
  </View>
);

const { width: screenWidth } = Dimensions.get('window');

const styles = StyleSheet.create({
  inlineContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16 },
  overlayContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255, 255, 255, 0.9)', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  fullScreenOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 9999 },
  overlayContent: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 24, alignItems: 'center', minWidth: 120,
    ...Platform.select({ ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 }, android: { elevation: 8 } }),
  },
  loadingText: { marginTop: 8, fontSize: 13, color: '#717171', textAlign: 'center' },
  overlayText: { marginTop: 16, fontSize: 15, color: '#222222', fontWeight: '500' },
  inlineLoader: { marginHorizontal: 8 },
  skeletonBase: { backgroundColor: '#F7F7F7', overflow: 'hidden' },
  shimmer: { ...StyleSheet.absoluteFillObject, backgroundColor: '#EBEBEB' },
  skeletonCard: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 8,
    ...Platform.select({ ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4 }, android: { elevation: 1 } }),
  },
  skeletonHeader: { flexDirection: 'row', marginBottom: 16 },
  skeletonHeaderText: { flex: 1 },
  skeletonSeparator: { height: 1, backgroundColor: '#EBEBEB', marginVertical: 8 },
  skeletonStatsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  skeletonStatCard: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, width: (screenWidth - 80) / 3,
    ...Platform.select({ ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4 }, android: { elevation: 1 } }),
  },
  skeletonProfileStats: {
    flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 20,
    ...Platform.select({ ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4 }, android: { elevation: 1 } }),
  },
});

export default { LoadingSpinner, LoadingOverlay, InlineLoader, Skeleton, SkeletonCard, SkeletonList, SkeletonDashboard, SkeletonJobDetails, SkeletonProfile };
