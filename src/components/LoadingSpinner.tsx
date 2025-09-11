import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { theme } from '../theme';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'small' | 'large';
  color?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = 'Loading...',
  size = 'large',
  color = theme.colors.info,
}) => {
  return (
    <View style={styles.container} testID="loading-spinner">
      <ActivityIndicator size={size} color={color} />
      {message && <Text style={[styles.message, { color }]} testID="loading-text">{message}</Text>}
    </View>
  );
};

interface FullScreenLoadingProps {
  message?: string;
}

export const FullScreenLoading: React.FC<FullScreenLoadingProps> = ({
  message = 'Loading...',
}) => {
  return (
    <View style={styles.fullScreenContainer}>
      <ActivityIndicator size="large" color={theme.colors.info} />
      <Text style={styles.fullScreenMessage}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  message: {
    marginTop: 15,
    fontSize: 16,
    textAlign: 'center',
  },
  fullScreenContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceSecondary,
  },
  fullScreenMessage: {
    marginTop: 20,
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
});

export default LoadingSpinner;
