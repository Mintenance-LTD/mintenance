/**
 * HomeScreenError Component
 * 
 * Displays error state for the home screen.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../../hooks/useI18n';
import { theme } from '../../theme';

interface HomeScreenErrorProps {
  error?: string;
  onRetry?: () => void;
}

export const HomeScreenError: React.FC<HomeScreenErrorProps> = ({
  error,
  onRetry,
}) => {
  const { t } = useI18n();
  const displayError = error || String(t('errors.somethingWentWrong'));
  return (
    <View style={styles.container}>
      <View style={styles.errorContent}>
        <View style={styles.iconWrap}>
          <Ionicons
            name="alert-circle-outline"
            size={36}
            color={theme.colors.error}
          />
        </View>
        <Text style={styles.errorTitle}>{String(t('errors.oops'))}</Text>
        <Text style={styles.errorMessage}>{displayError}</Text>

        {onRetry && (
          <TouchableOpacity
            style={styles.retryButton}
            onPress={onRetry}
            accessibilityRole="button"
            accessibilityLabel="Retry loading"
          >
            <Ionicons name="refresh" size={20} color={theme.colors.textInverse} />
            <Text style={styles.retryButtonText}>{String(t('errors.tryAgain'))}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorContent: {
    alignItems: 'center',
    maxWidth: 300,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: theme.colors.textPrimary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 28,
    gap: 8,
  },
  retryButtonText: {
    color: theme.colors.textInverse,
    fontSize: 16,
    fontWeight: '600',
  },
});
