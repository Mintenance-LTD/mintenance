/**
 * ErrorView Component
 *
 * Consistent error display for all screens.
 *
 * @filesize Target: <80 lines
 * @compliance Single Responsibility - Error state only
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ErrorViewProps {
  message: string;
  onRetry?: () => void;
  fullScreen?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
}

export const ErrorView: React.FC<ErrorViewProps> = ({
  message,
  onRetry,
  fullScreen = true,
  icon = 'alert-circle-outline',
}) => {
  return (
    <View style={[styles.container, fullScreen && styles.fullScreen]}>
      <Ionicons name={icon} size={64} color="#EF4444" />
      <Text style={styles.message}>{message}</Text>
      {onRetry && (
        <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      )}
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
    backgroundColor: '#F7F7F7',
  },
  message: {
    marginTop: 20,
    fontSize: 18,
    color: '#222222',
    textAlign: 'center',
    maxWidth: 300,
  },
  retryButton: {
    marginTop: 24,
    backgroundColor: '#222222',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 16,
  },
  retryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
