import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';

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
  color = '#0066CC',
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
}> = ({ size = 'small', color = '#0066CC', style }) => {
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
  loadingColor = '#FFFFFF',
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
        <ActivityIndicator size="large" color="#0066CC" />
        {message && <Text style={styles.overlayMessage}>{message}</Text>}
      </View>
    </View>
  );
};

// Skeleton loader component
export const SkeletonLoader: React.FC<{
  width?: number | string;
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
    padding: 20,
  },
  fullScreen: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    zIndex: 1000,
  },
  message: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#0066CC',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  buttonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  overlayContent: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 200,
  },
  overlayMessage: {
    marginTop: 12,
    fontSize: 14,
    color: '#333333',
  },
  skeleton: {
    backgroundColor: '#E0E0E0',
    overflow: 'hidden',
  },
  listItem: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  listItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listItemContent: {
    flex: 1,
    marginLeft: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 16,
    overflow: 'hidden',
  },
  cardContent: {
    padding: 16,
  },
  mb4: {
    marginBottom: 4,
  },
  mb8: {
    marginBottom: 8,
  },
  mt4: {
    marginTop: 4,
  },
  mt8: {
    marginTop: 8,
  },
});

export default LoadingScreen;