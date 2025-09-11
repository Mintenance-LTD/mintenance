import React, { Component, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { logger } from '../utils/logger';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, resetError: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: any) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorId?: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    // Generate error ID for tracking
    const errorId =
      Date.now().toString(36) + Math.random().toString(36).substr(2);
    this.setState({ errorId });

    // Create safe context for logging
    const safeContext = {
      message: error.message,
      stack: error.stack?.substring(0, 500) || 'No stack trace',
      componentStack:
        errorInfo.componentStack?.substring(0, 500) || 'No component stack',
      errorId,
    };

    // Safely log the error without potential circular references
    try {
      logger.error('Error caught by boundary:', error, safeContext);
    } catch (logError) {
      console.error(
        'Error boundary caught error, but failed to log it:',
        error.message
      );
    }

    // Call custom error handler if provided
    if (this.props.onError) {
      try {
        this.props.onError(error, errorInfo);
      } catch (handlerError) {
        console.error('Custom error handler failed:', handlerError);
      }
    }

    // Import Sentry dynamically to avoid issues
    import('@sentry/react-native')
      .then(({ captureException }) => {
        captureException(error, {
          contexts: {
            errorBoundary: {
              componentStack:
                errorInfo.componentStack?.substring(0, 500) || 'N/A', // Limit length
              errorId,
            },
          },
        });
      })
      .catch((e) => {
        console.warn('Sentry not available:', e.message);
      });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  handleReportError = () => {
    if (this.state.error && this.state.errorId) {
      Alert.alert(
        'Report Error',
        `Error ID: ${this.state.errorId}\n\nWould you like to report this error to help us improve the app?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Report',
            onPress: () => {
              // Here you could integrate with your error reporting system
              logger.debug('Error reported:', { data: this.state.errorId });
            },
          },
        ]
      );
    }
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback && this.state.error) {
        return this.props.fallback(this.state.error, this.handleRetry);
      }

      return (
        <View style={styles.container}>
          <Ionicons
            name='warning-outline'
            size={64}
            color={theme.colors.error}
          />

          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>
            An unexpected error occurred. Please try again.
          </Text>

          {this.state.errorId && (
            <Text style={styles.errorId}>Error ID: {this.state.errorId}</Text>
          )}

          {__DEV__ && this.state.error && (
            <View style={styles.debugInfo}>
              <Text style={styles.debugTitle}>Debug Info:</Text>
              <Text style={styles.debugText}>{this.state.error.message}</Text>
              <Text style={styles.debugText} numberOfLines={10}>
                {this.state.error.stack}
              </Text>
            </View>
          )}

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={this.handleRetry}
            >
              <Ionicons
                name='refresh'
                size={16}
                color='#fff'
                style={styles.buttonIcon}
              />
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.reportButton}
              onPress={this.handleReportError}
            >
              <Ionicons
                name='bug-outline'
                size={16}
                color={theme.colors.primary}
                style={styles.buttonIcon}
              />
              <Text style={styles.reportButtonText}>Report Issue</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing[6],
    backgroundColor: theme.colors.background,
  },
  title: {
    fontSize: theme.typography.fontSize['3xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing[4],
    textAlign: 'center',
  },
  message: {
    fontSize: theme.typography.fontSize.lg,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing[6],
    lineHeight: 22,
    paddingHorizontal: theme.spacing[4],
  },
  errorId: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textTertiary,
    textAlign: 'center',
    marginBottom: theme.spacing[4],
    fontFamily: 'monospace',
  },
  debugInfo: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing[4],
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing[5],
    width: '100%',
    maxHeight: 200,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  debugTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing[2],
  },
  debugText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
    fontFamily: 'monospace',
    marginBottom: theme.spacing[1],
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: theme.spacing[3],
  },
  retryButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing[6],
    paddingVertical: theme.spacing[3],
    borderRadius: theme.borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  reportButton: {
    backgroundColor: 'transparent',
    paddingHorizontal: theme.spacing[6],
    paddingVertical: theme.spacing[3],
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
  },
  retryButtonText: {
    color: theme.colors.textInverse,
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  reportButtonText: {
    color: theme.colors.primary,
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.medium,
  },
  buttonIcon: {
    marginRight: theme.spacing[1],
  },
});

export default ErrorBoundary;
