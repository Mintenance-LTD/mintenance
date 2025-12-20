import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ErrorBoundary } from './ErrorBoundary';
import { theme } from '../theme';
import { logger } from '../utils/logger';
import { captureException } from '../config/sentry';

interface QueryErrorBoundaryProps {
  children: React.ReactNode;
  queryName: string;
  onRetry?: () => void;
}

export const QueryErrorBoundary: React.FC<QueryErrorBoundaryProps> = ({
  children,
  queryName,
  onRetry,
}) => {
  const handleQueryError = (error: Error, errorInfo: any) => {
    logger.error(`Query error in ${queryName}:`, error, {
      queryName,
      componentStack: errorInfo.componentStack?.substring(0, 500),
    });

    // Track query-specific errors
    try {
      captureException(error, {
        tags: {
          errorBoundary: 'query',
          queryName,
        },
        extra: errorInfo,
      });
    } catch (sentryError) {
      logger.warn('Sentry tracking failed', sentryError);
    }
  };

  const renderQueryErrorFallback = (error: Error, resetError: () => void) => (
    <View style={styles.container}>
      <Ionicons
        name='cloud-offline-outline'
        size={48}
        color={theme.colors.warning}
      />

      <Text style={styles.title}>Data Load Error</Text>
      <Text style={styles.message}>
        Unable to load {queryName} data. Please check your connection and try
        again.
      </Text>

      <TouchableOpacity
        style={styles.retryButton}
        onPress={() => {
          resetError();
          onRetry?.();
        }}
        accessibilityRole='button'
        accessibilityLabel={`Retry loading ${queryName}`}
      >
        <Ionicons
          name='refresh'
          size={16}
          color={theme.colors.textInverse}
          style={styles.buttonIcon}
        />
        <Text style={styles.retryButtonText}>Retry</Text>
      </TouchableOpacity>

      {__DEV__ && (
        <View style={styles.debugInfo}>
          <Text style={styles.debugText}>Query: {queryName}</Text>
          <Text style={styles.debugText}>Error: {error.message}</Text>
        </View>
      )}
    </View>
  );

  return (
    <ErrorBoundary
      fallback={renderQueryErrorFallback}
      onError={handleQueryError}
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
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  retryButton: {
    backgroundColor: theme.colors.info,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  retryButtonText: {
    color: theme.colors.textInverse,
    fontSize: 14,
    fontWeight: '600',
  },
  buttonIcon: {
    marginRight: 6,
  },
  debugInfo: {
    backgroundColor: theme.colors.surfaceSecondary,
    padding: 12,
    borderRadius: 6,
    marginTop: 16,
    width: '100%',
  },
  debugText: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    fontFamily: 'monospace',
  },
});
