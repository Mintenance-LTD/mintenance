import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ErrorBoundary } from './ErrorBoundary';
import { theme } from '../theme';
import { logger } from '../utils/logger';

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

  const handleAsyncError = (error: Error, errorInfo: any) => {
    logger.error(`Async operation error in ${operationName}:`, error, {
      operationName,
      componentStack: errorInfo.componentStack?.substring(0, 500),
    });

    // Track async operation errors
    try {
      import('../config/sentry').then(({ captureException }) => {
        captureException(error, {
          tags: {
            errorBoundary: 'async',
            operationName,
          },
          extra: errorInfo,
        });
      });
    } catch (sentryError) {
      console.warn('Sentry tracking failed:', sentryError);
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
        <Ionicons 
          name="alert-circle-outline" 
          size={54} 
          color="#FF3B30" 
        />
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
        accessibilityRole="button"
        accessibilityLabel={`Retry ${operationName} operation`}
      >
        {isRetrying ? (
          <Ionicons name="hourglass-outline" size={16} color={theme.colors.textInverse} style={styles.buttonIcon} />
        ) : (
          <Ionicons name="refresh" size={16} color={theme.colors.textInverse} style={styles.buttonIcon} />
        )}
        <Text style={styles.retryButtonText}>
          {isRetrying ? 'Retrying...' : 'Try Again'}
        </Text>
      </TouchableOpacity>

      {__DEV__ && (
        <View style={styles.debugInfo}>
          <Text style={styles.debugText}>Operation: {operationName}</Text>
          <Text style={styles.debugText}>Error: {error.message}</Text>
          <Text style={styles.debugText}>Stack: {error.stack?.substring(0, 200) || 'N/A'}</Text>
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
    backgroundColor: theme.colors.surface,
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  retryButton: {
    backgroundColor: theme.colors.info,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  retryButtonDisabled: {
    backgroundColor: theme.colors.textTertiary,
  },
  retryButtonText: {
    color: theme.colors.textInverse,
    fontSize: 16,
    fontWeight: '600',
  },
  buttonIcon: {
    marginRight: 8,
  },
  debugInfo: {
    backgroundColor: theme.colors.surfaceSecondary,
    padding: 12,
    borderRadius: 6,
    marginTop: 16,
    width: '100%',
    maxHeight: 150,
  },
  debugText: {
    fontSize: 11,
    color: theme.colors.textTertiary,
    fontFamily: 'monospace',
    marginBottom: 4,
  },
});
