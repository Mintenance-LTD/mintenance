/**
 * LoadingSpinner Component
 *
 * Consistent loading indicator for all screens.
 *
 * @filesize Target: <50 lines
 * @compliance Single Responsibility - Loading state only
 */

import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { theme } from '../../theme';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'small' | 'large';
  color?: string;
  fullScreen?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = 'Loading...',
  size = 'large',
  fullScreen = true,
}) => {
  return (
    <View style={[styles.container, fullScreen && styles.fullScreen]}>
      <ActivityIndicator size={size} color={theme.colors.textPrimary} />
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  fullScreen: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  message: {
    marginTop: 16,
    fontSize: 15,
    color: theme.colors.textSecondary,
  },
});
