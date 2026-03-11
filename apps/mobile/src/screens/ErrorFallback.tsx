/**
 * Error Fallback Screen
 *
 * A comprehensive error screen shown when the app encounters
 * critical errors that can't be handled silently.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Updates from 'expo-updates';
import { logger } from '@mintenance/shared';
import { theme } from '../theme';

interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
  componentStack?: string;
}

export const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  resetError,
  componentStack,
}) => {
  const isDevelopment = __DEV__;

  const handleRestart = async () => {
    try {
      logger.info('[ErrorFallback] Attempting to restart app');

      if (!__DEV__ && Updates.isEnabled) {
        await Updates.reloadAsync();
      } else {
        resetError();
      }
    } catch (restartError) {
      logger.error('[ErrorFallback] Failed to restart app', {
        error: restartError,
      });
      resetError();
    }
  };

  const handleContactSupport = () => {
    const subject = encodeURIComponent('App Error Report');
    const body = encodeURIComponent(
      `Error: ${error.message}\n\nError ID: ${(error as Error & { digest?: string }).digest || 'N/A'}\n\nPlease describe what you were doing when this error occurred:`
    );
    const mailtoUrl = `mailto:support@mintenance.com?subject=${subject}&body=${body}`;

    Linking.openURL(mailtoUrl).catch((err) => {
      logger.error('[ErrorFallback] Failed to open email client', { error: err });
    });
  };

  const handleCheckUpdates = async () => {
    if (!__DEV__ && Updates.isEnabled) {
      try {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          await Updates.fetchUpdateAsync();
          await Updates.reloadAsync();
        }
      } catch (updateError) {
        logger.error('[ErrorFallback] Failed to check for updates', {
          error: updateError,
        });
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Error Icon */}
        <View style={styles.iconContainer}>
          <View style={styles.iconBackground}>
            <Ionicons name="warning" size={48} color={theme.colors.error} />
          </View>
        </View>

        {/* Error Title */}
        <Text style={styles.title} accessibilityRole='header'>Something went wrong</Text>

        {/* Error Message */}
        <Text style={styles.message}>
          We're sorry, but the app encountered an unexpected error.
          Our team has been notified and is working to fix this issue.
        </Text>

        {/* Error ID */}
        {(error as Error & { digest?: string }).digest && (
          <View style={styles.errorIdContainer}>
            <Text style={styles.errorIdLabel}>Error ID:</Text>
            <Text style={styles.errorId}>{(error as Error & { digest?: string }).digest}</Text>
          </View>
        )}

        {/* Common Causes */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Common causes:</Text>
          <Text style={styles.infoText}>• Network connectivity issues</Text>
          <Text style={styles.infoText}>• App needs to be updated</Text>
          <Text style={styles.infoText}>• Server temporarily unavailable</Text>
          <Text style={styles.infoText}>• Device storage is full</Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={handleRestart}
            activeOpacity={0.8}
            accessibilityRole='button'
            accessibilityLabel='Try again'
            accessibilityHint='Double tap to restart the application'
          >
            <Ionicons name="refresh" size={20} color={theme.colors.textInverse} />
            <Text style={styles.primaryButtonText}>Try Again</Text>
          </TouchableOpacity>

          {!__DEV__ && Updates.isEnabled && (
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={handleCheckUpdates}
              activeOpacity={0.8}
              accessibilityRole='button'
              accessibilityLabel='Check for updates'
              accessibilityHint='Double tap to check if a newer version is available'
            >
              <Ionicons name="download-outline" size={20} color={theme.colors.info} />
              <Text style={styles.secondaryButtonText}>Check for Updates</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.button, styles.outlineButton]}
            onPress={handleContactSupport}
            activeOpacity={0.8}
            accessibilityRole='button'
            accessibilityLabel='Contact support'
            accessibilityHint='Double tap to send an email to our support team'
          >
            <Ionicons name="mail-outline" size={20} color={theme.colors.textSecondary} />
            <Text style={styles.outlineButtonText}>Contact Support</Text>
          </TouchableOpacity>
        </View>

        {/* Troubleshooting Tips */}
        <View style={styles.tipsContainer}>
          <Text style={styles.tipsTitle}>Try these steps:</Text>
          <Text style={styles.tipItem}>1. Check your internet connection</Text>
          <Text style={styles.tipItem}>2. Close and reopen the app</Text>
          <Text style={styles.tipItem}>3. Clear the app cache</Text>
          <Text style={styles.tipItem}>4. Update to the latest version</Text>
          <Text style={styles.tipItem}>5. Restart your device</Text>
        </View>

        {/* Development Error Details */}
        {isDevelopment && (
          <View style={styles.debugContainer}>
            <Text style={styles.debugTitle}>Debug Information (Dev Only)</Text>
            <View style={styles.debugContent}>
              <Text style={styles.debugLabel}>Error Name:</Text>
              <Text style={styles.debugText}>{error.name}</Text>

              <Text style={styles.debugLabel}>Error Message:</Text>
              <Text style={styles.debugText}>{error.message}</Text>

              {error.stack && (
                <>
                  <Text style={styles.debugLabel}>Stack Trace:</Text>
                  <ScrollView style={styles.stackTrace} horizontal>
                    <Text style={styles.stackTraceText}>{error.stack}</Text>
                  </ScrollView>
                </>
              )}

              {componentStack && (
                <>
                  <Text style={styles.debugLabel}>Component Stack:</Text>
                  <ScrollView style={styles.stackTrace} horizontal>
                    <Text style={styles.stackTraceText}>{componentStack}</Text>
                  </ScrollView>
                </>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  scrollContent: {
    flexGrow: 1,
    padding: theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginBottom: theme.spacing.xl,
  },
  iconBackground: {
    width: 80,
    height: 80,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.errorLight ?? '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing[3],
    textAlign: 'center',
  },
  message: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
    lineHeight: 24,
    paddingHorizontal: theme.spacing.lg,
  },
  errorIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
    padding: theme.spacing[3],
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.lg,
  },
  errorIdLabel: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
    marginRight: theme.spacing.sm,
  },
  errorId: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textPrimary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  infoBox: {
    width: '100%',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.xl,
  },
  infoTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.info,
    marginBottom: theme.spacing.sm,
  },
  infoText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.info,
    marginVertical: 2,
  },
  buttonContainer: {
    width: '100%',
    marginBottom: theme.spacing.xl,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing[3],
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.lg,
    marginVertical: theme.spacing.xs,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
  },
  primaryButtonText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textInverse,
    marginLeft: theme.spacing.sm,
  },
  secondaryButton: {
    backgroundColor: theme.colors.primaryLight,
  },
  secondaryButtonText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.primary,
    marginLeft: theme.spacing.sm,
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  outlineButtonText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.sm,
  },
  tipsContainer: {
    width: '100%',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    marginBottom: theme.spacing.xl,
  },
  tipsTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing[3],
  },
  tipItem: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
    marginVertical: theme.spacing.xs,
    lineHeight: 20,
  },
  debugContainer: {
    width: '100%',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.errorLight ?? '#FEF2F2',
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.error,
  },
  debugTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.error,
    marginBottom: theme.spacing[3],
  },
  debugContent: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing[3],
    borderRadius: theme.borderRadius.lg,
  },
  debugLabel: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.error,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  debugText: {
    fontSize: 11,
    color: theme.colors.error,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: theme.spacing.sm,
  },
  stackTrace: {
    maxHeight: 120,
    backgroundColor: theme.colors.backgroundSecondary,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    marginBottom: theme.spacing.sm,
  },
  stackTraceText: {
    fontSize: 10,
    color: theme.colors.error,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});

export default ErrorFallback;