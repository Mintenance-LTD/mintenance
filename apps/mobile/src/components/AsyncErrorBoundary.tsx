import React, { ErrorInfo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ErrorBoundary } from './ErrorBoundary';
import { logger } from '../utils/logger';
import { captureException } from '../config/sentry';

interface AsyncErrorBoundaryProps {
  children: React.ReactNode;
  operationName: string;
  onRetry?: () => Promise<void>;
  fallbackMessage?: string;
}

export const AsyncErrorBoundary: React.FC<AsyncErrorBoundaryProps> = ({
  children,
  operationName,
  onRetry,
  fallbackMessage,
}) => {
  const [isRetrying, setIsRetrying] = React.useState(false);

  const handleAsyncError = (error: Error, errorInfo: ErrorInfo) => {
    logger.error(`Async operation error in ${operationName}:`, error, {
      operationName,
      componentStack: errorInfo.componentStack?.substring(0, 500),
    });

    // Track async operation errors
    try {
      captureException(error, {
        tags: {
          errorBoundary: 'async',
          operationName,
        },
        extra: errorInfo,
      });
    } catch (sentryError) {
      logger.warn('Sentry tracking failed', sentryError);
    }
  };

  const handleRetry = async (resetError: () => void) => {
    if (!onRetry) {
      resetError();
      return;
    }

    setIsRetrying(true);
    try {
      await onRetry();
      resetError();
    } catch (error) {
      logger.error('Retry failed:', error);
      // Don't reset error on retry failure - let user try again
    } finally {
      setIsRetrying(false);
    }
  };

  const renderAsyncErrorFallback = (error: Error, resetError: () => void) => (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons name='alert-circle-outline' size={54} color='#EF4444' />
      </View>

      <Text style={styles.title}>Operation Failed</Text>
      <Text style={styles.message}>
        {fallbackMessage ||
          `The ${operationName} operation encountered an error. Please try again.`}
      </Text>

      <TouchableOpacity
        style={[styles.retryButton, isRetrying && styles.retryButtonDisabled]}
        onPress={() => handleRetry(resetError)}
        disabled={isRetrying}
        accessibilityRole='button'
        accessibilityLabel={`Retry ${operationName} operation`}
      >
        {isRetrying ? (
          <Ionicons
            name='hourglass-outline'
            size={16}
            color='#FFFFFF'
            style={styles.buttonIcon}
          />
        ) : (
          <Ionicons
            name='refresh'
            size={16}
            color='#FFFFFF'
            style={styles.buttonIcon}
          />
        )}
        <Text style={styles.retryButtonText}>
          {isRetrying ? 'Retrying...' : 'Try Again'}
        </Text>
      </TouchableOpacity>

      {__DEV__ && (
        <View style={styles.debugInfo}>
          <Text style={styles.debugText}>Operation: {operationName}</Text>
          <Text style={styles.debugText}>Error: {error.message}</Text>
          <Text style={styles.debugText}>
            Stack: {error.stack?.substring(0, 200) || 'N/A'}
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <ErrorBoundary
      fallback={renderAsyncErrorFallback}
      onError={handleAsyncError}
    >
      {children}
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FFFFFF',
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#222222',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#717171',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  retryButton: {
    backgroundColor: '#222222',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
  },
  retryButtonDisabled: {
    backgroundColor: '#B0B0B0',
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonIcon: {
    marginRight: 8,
  },
  debugInfo: {
    backgroundColor: '#F7F7F7',
    padding: 12,
    borderRadius: 12,
    marginTop: 16,
    width: '100%',
    maxHeight: 150,
  },
  debugText: {
    fontSize: 11,
    color: '#B0B0B0',
    fontFamily: 'monospace',
    marginBottom: 4,
  },
});
