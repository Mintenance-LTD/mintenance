import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'small' | 'large';
  color?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = 'Loading...',
  size = 'large',
  color = '#007AFF',
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
      <ActivityIndicator size="large" color="#007AFF" />
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
    backgroundColor: '#f5f5f5',
  },
  fullScreenMessage: {
    marginTop: 20,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});

export default LoadingSpinner;