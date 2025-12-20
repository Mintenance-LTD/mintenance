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
import { theme } from '../../theme';

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
      <Ionicons name={icon} size={64} color={theme.colors.error} />
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
    padding: theme.spacing.xl,
  },
  fullScreen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  message: {
    marginTop: theme.spacing.lg,
    fontSize: theme.typography.fontSize.lg,
    color: theme.colors.textPrimary,
    textAlign: 'center',
    maxWidth: 300,
  },
  retryButton: {
    marginTop: theme.spacing.xl,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
  },
  retryButtonText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.white,
  },
});
