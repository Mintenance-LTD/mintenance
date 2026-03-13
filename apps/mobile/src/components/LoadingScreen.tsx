import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet, ViewStyle, TextStyle, DimensionValue, Platform } from 'react-native';

interface LoadingScreenProps {
  message?: string;
  size?: 'small' | 'large';
  color?: string;
  fullScreen?: boolean;
  overlay?: boolean;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = 'Loading...', size = 'large', color = '#222222', fullScreen = true, overlay = false,
}) => (
  <View style={[styles.container, fullScreen && styles.fullScreen, overlay && styles.overlay]}>
    <ActivityIndicator size={size} color={color} />
    {message && <Text style={styles.message}>{message}</Text>}
  </View>
);

export const LoadingIndicator: React.FC<{ size?: 'small' | 'large'; color?: string; style?: ViewStyle }> = ({
  size = 'small', color = '#222222', style,
}) => <ActivityIndicator size={size} color={color} style={style} />;

export const LoadingButton: React.FC<{
  loading: boolean; onPress: () => void; title: string; style?: ViewStyle; textStyle?: TextStyle; loadingColor?: string; disabled?: boolean;
}> = ({ loading, onPress, title, style, textStyle, loadingColor = '#FFFFFF', disabled = false }) => (
  <View style={[styles.button, style, (loading || disabled) && styles.buttonDisabled]}>
    {loading ? <ActivityIndicator size="small" color={loadingColor} /> : <Text style={[styles.buttonText, textStyle]}>{title}</Text>}
  </View>
);

export const LoadingOverlay: React.FC<{ visible: boolean; message?: string }> = ({ visible, message }) => {
  if (!visible) return null;
  return (
    <View style={styles.overlayContainer}>
      <View style={styles.overlayContent}>
        <ActivityIndicator size="large" color="#222222" />
        {message && <Text style={styles.overlayMessage}>{message}</Text>}
      </View>
    </View>
  );
};

export const SkeletonLoader: React.FC<{ width?: DimensionValue; height?: number; borderRadius?: number; style?: ViewStyle }> = ({
  width = '100%', height = 20, borderRadius = 4, style,
}) => <View style={[styles.skeleton, { width, height, borderRadius }, style]} />;

export const ListSkeleton: React.FC<{ count?: number; style?: ViewStyle }> = ({ count = 5, style }) => (
  <View style={style}>
    {Array.from({ length: count }).map((_, index) => (
      <View key={index} style={styles.listItem}>
        <View style={styles.listItemHeader}>
          <SkeletonLoader width={40} height={40} borderRadius={20} />
          <View style={styles.listItemContent}>
            <SkeletonLoader width="70%" height={16} style={{ marginBottom: 4 }} />
            <SkeletonLoader width="50%" height={14} />
          </View>
        </View>
        <SkeletonLoader width="100%" height={14} style={{ marginTop: 8 }} />
        <SkeletonLoader width="80%" height={14} style={{ marginTop: 4 }} />
      </View>
    ))}
  </View>
);

export const CardSkeleton: React.FC<{ style?: ViewStyle }> = ({ style }) => (
  <View style={[styles.card, style]}>
    <SkeletonLoader width="100%" height={150} borderRadius={8} />
    <View style={styles.cardContent}>
      <SkeletonLoader width="80%" height={18} style={{ marginBottom: 8 }} />
      <SkeletonLoader width="60%" height={14} style={{ marginBottom: 4 }} />
      <SkeletonLoader width="100%" height={14} style={{ marginBottom: 4 }} />
      <SkeletonLoader width="90%" height={14} />
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { justifyContent: 'center', alignItems: 'center', padding: 20 },
  fullScreen: { flex: 1, backgroundColor: '#F7F7F7' },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.9)', zIndex: 1000 },
  message: { marginTop: 16, fontSize: 15, color: '#717171', textAlign: 'center' },
  button: { backgroundColor: '#222222', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 16, alignItems: 'center', justifyContent: 'center', minHeight: 44 },
  buttonDisabled: { backgroundColor: '#EBEBEB' },
  buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  overlayContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 9999 },
  overlayContent: {
    backgroundColor: '#FFFFFF', padding: 24, borderRadius: 16, alignItems: 'center', minWidth: 200,
    ...Platform.select({ ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 }, android: { elevation: 8 } }),
  },
  overlayMessage: { marginTop: 12, fontSize: 13, color: '#222222' },
  skeleton: { backgroundColor: '#EBEBEB', overflow: 'hidden' },
  listItem: { backgroundColor: '#FFFFFF', padding: 16, marginBottom: 8, borderRadius: 16 },
  listItemHeader: { flexDirection: 'row', alignItems: 'center' },
  listItemContent: { flex: 1, marginLeft: 12 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, marginBottom: 16, overflow: 'hidden' },
  cardContent: { padding: 16 },
});

export default LoadingScreen;
