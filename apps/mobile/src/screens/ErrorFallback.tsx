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
            <Ionicons name="warning" size={36} color="#EF4444" />
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
          <Text style={styles.infoTitle}>COMMON CAUSES</Text>
          <Text style={styles.infoText}>Network connectivity issues</Text>
          <Text style={styles.infoText}>App needs to be updated</Text>
          <Text style={styles.infoText}>Server temporarily unavailable</Text>
          <Text style={styles.infoText}>Device storage is full</Text>
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
            <Ionicons name="refresh" size={20} color="#FFFFFF" />
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
              <Ionicons name="download-outline" size={20} color="#3B82F6" />
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
            <Ionicons name="mail-outline" size={20} color="#717171" />
            <Text style={styles.outlineButtonText}>Contact Support</Text>
          </TouchableOpacity>
        </View>

        {/* Troubleshooting Tips */}
        <View style={styles.tipsContainer}>
          <Text style={styles.tipsTitle}>TRY THESE STEPS</Text>
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
    backgroundColor: '#F7F7F7',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginBottom: 24,
  },
  iconBackground: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#222222',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    color: '#717171',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  errorIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#F7F7F7',
    borderRadius: 12,
  },
  errorIdLabel: {
    fontSize: 12,
    color: '#717171',
    marginRight: 8,
  },
  errorId: {
    fontSize: 12,
    color: '#222222',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  infoBox: {
    width: '100%',
    padding: 16,
    backgroundColor: '#DBEAFE',
    borderRadius: 16,
    marginBottom: 24,
  },
  infoTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3B82F6',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#3B82F6',
    marginVertical: 2,
  },
  buttonContainer: {
    width: '100%',
    marginBottom: 24,
    gap: 8,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 28,
    gap: 8,
  },
  primaryButton: {
    backgroundColor: '#222222',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryButton: {
    backgroundColor: '#DBEAFE',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B82F6',
  },
  outlineButton: {
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  outlineButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#717171',
  },
  tipsContainer: {
    width: '100%',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 24,
    ...Platform.select({
      ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  tipsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B0B0B0',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  tipItem: {
    fontSize: 13,
    color: '#717171',
    marginVertical: 3,
    lineHeight: 20,
  },
  debugContainer: {
    width: '100%',
    padding: 16,
    backgroundColor: '#FEE2E2',
    borderRadius: 16,
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#EF4444',
    marginBottom: 12,
  },
  debugContent: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 12,
  },
  debugLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#EF4444',
    marginTop: 8,
    marginBottom: 2,
  },
  debugText: {
    fontSize: 11,
    color: '#EF4444',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 6,
  },
  stackTrace: {
    maxHeight: 120,
    backgroundColor: '#F7F7F7',
    padding: 8,
    borderRadius: 8,
    marginBottom: 6,
  },
  stackTraceText: {
    fontSize: 10,
    color: '#EF4444',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});

export default ErrorFallback;
