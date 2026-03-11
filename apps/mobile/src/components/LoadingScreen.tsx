import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet, ViewStyle, TextStyle, DimensionValue } from 'react-native';
import { theme } from '../theme';

interface LoadingScreenProps {
  message?: string;
  size?: 'small' | 'large';
  color?: string;
  fullScreen?: boolean;
  overlay?: boolean;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = 'Loading...',
  size = 'large',
  color = theme.colors.primary,
  fullScreen = true,
  overlay = false,
}) => {
  const containerStyle = [
    styles.container,
    fullScreen && styles.fullScreen,
    overlay && styles.overlay,
  ];

  return (
    <View style={containerStyle}>
      <ActivityIndicator size={size} color={color} />
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
};

// Inline loading indicator for smaller components
export const LoadingIndicator: React.FC<{
  size?: 'small' | 'large';
  color?: string;
  style?: ViewStyle;
}> = ({ size = 'small', color = theme.colors.primary, style }) => {
  return <ActivityIndicator size={size} color={color} style={style} />;
};

// Button with loading state
export const LoadingButton: React.FC<{
  loading: boolean;
  onPress: () => void;
  title: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
  loadingColor?: string;
  disabled?: boolean;
}> = ({
  loading,
  onPress,
  title,
  style,
  textStyle,
  loadingColor = theme.colors.textInverse,
  disabled = false,
}) => {
  return (
    <View
      style={[
        styles.button,
        style,
        (loading || disabled) && styles.buttonDisabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={loadingColor} />
      ) : (
        <Text style={[styles.buttonText, textStyle]}>{title}</Text>
      )}
    </View>
  );
};

// Loading overlay for async operations
export const LoadingOverlay: React.FC<{
  visible: boolean;
  message?: string;
}> = ({ visible, message }) => {
  if (!visible) return null;

  return (
    <View style={styles.overlayContainer}>
      <View style={styles.overlayContent}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        {message && <Text style={styles.overlayMessage}>{message}</Text>}
      </View>
    </View>
  );
};

// Skeleton loader component
export const SkeletonLoader: React.FC<{
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}> = ({ width = '100%', height = 20, borderRadius = 4, style }) => {
  return (
    <View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
        },
        style,
      ]}
    />
  );
};

// List skeleton for loading lists
export const ListSkeleton: React.FC<{
  count?: number;
  style?: ViewStyle;
}> = ({ count = 5, style }) => {
  return (
    <View style={style}>
      {Array.from({ length: count }).map((_, index) => (
        <View key={index} style={styles.listItem}>
          <View style={styles.listItemHeader}>
            <SkeletonLoader width={40} height={40} borderRadius={20} />
            <View style={styles.listItemContent}>
              <SkeletonLoader width="70%" height={16} style={styles.mb4} />
              <SkeletonLoader width="50%" height={14} />
            </View>
          </View>
          <SkeletonLoader width="100%" height={14} style={styles.mt8} />
          <SkeletonLoader width="80%" height={14} style={styles.mt4} />
        </View>
      ))}
    </View>
  );
};

// Card skeleton for loading cards
export const CardSkeleton: React.FC<{
  style?: ViewStyle;
}> = ({ style }) => {
  return (
    <View style={[styles.card, style]}>
      <SkeletonLoader width="100%" height={150} borderRadius={8} />
      <View style={styles.cardContent}>
        <SkeletonLoader width="80%" height={18} style={styles.mb8} />
        <SkeletonLoader width="60%" height={14} style={styles.mb4} />
        <SkeletonLoader width="100%" height={14} style={styles.mb4} />
        <SkeletonLoader width="90%" height={14} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  fullScreen: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.overlayWhite20,
    zIndex: 1000,
  },
  message: {
    marginTop: theme.spacing.md,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  button: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing[3],
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: theme.layout.minTouchTarget,
  },
  buttonDisabled: {
    backgroundColor: theme.colors.border,
  },
  buttonText: {
    color: theme.colors.textInverse,
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.overlayDark50,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  overlayContent: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.xl,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    minWidth: 200,
  },
  overlayMessage: {
    marginTop: theme.spacing[3],
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textPrimary,
  },
  skeleton: {
    backgroundColor: theme.colors.borderLight,
    overflow: 'hidden',
  },
  listItem: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  listItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listItemContent: {
    flex: 1,
    marginLeft: theme.spacing[3],
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    marginBottom: theme.spacing.md,
    overflow: 'hidden',
  },
  cardContent: {
    padding: theme.spacing.md,
  },
  mb4: {
    marginBottom: theme.spacing.xs,
  },
  mb8: {
    marginBottom: theme.spacing.sm,
  },
  mt4: {
    marginTop: theme.spacing.xs,
  },
  mt8: {
    marginTop: theme.spacing.sm,
  },
});

export default LoadingScreen;