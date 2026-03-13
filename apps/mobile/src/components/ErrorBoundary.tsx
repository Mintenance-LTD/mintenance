/**
 * Error Boundary Component
 *
 * Catches React errors and displays fallback UI
 * instead of crashing the entire app.
 */

import React, { Component, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { logger } from '@mintenance/shared';

interface Props {
  children: ReactNode;
  fallback?: ReactNode | ((error: Error, resetError: () => void) => ReactNode);
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log error to monitoring service
    logger.error('React Error Boundary caught an error', error, {
      service: 'ErrorBoundary',
      componentStack: errorInfo.componentStack
    });

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // Send to error tracking service
    this.reportErrorToService(error, errorInfo);
  }

  private reportErrorToService(error: Error, errorInfo: React.ErrorInfo): void {
    try {
      // Dynamic import to avoid circular dependencies and ensure Sentry is available
      import('@sentry/react-native').then((Sentry) => {
        Sentry.captureException(error, {
          contexts: {
            react: {
              componentStack: errorInfo.componentStack,
            },
          },
          level: 'error',
          tags: {
            errorBoundary: 'true',
            environment: process.env.NODE_ENV || 'development',
          },
        });
      }).catch((importError) => {
        // Fallback if Sentry fails to load
        logger.warn('Failed to report error to Sentry', { error: importError instanceof Error ? importError.message : String(importError) });
      });
    } catch (sentryError) {
      // Prevent Sentry errors from crashing the app
      logger.warn('Sentry error reporting failed', { error: sentryError instanceof Error ? sentryError.message : String(sentryError) });
    }
  }

  private handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        // Check if fallback is a function (render prop pattern)
        if (typeof this.props.fallback === 'function') {
          return this.props.fallback(this.state.error!, this.handleReset);
        }
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <View style={styles.container}>
          <View style={styles.content}>
            <Text style={styles.emoji}>😔</Text>
            <Text style={styles.title}>Oops! Something went wrong</Text>
            <Text style={styles.message}>
              We're sorry for the inconvenience. The error has been reported to our team.
            </Text>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <View style={styles.errorDetails}>
                <Text style={styles.errorTitle}>Error Details (Development Only):</Text>
                <Text style={styles.errorMessage}>{this.state.error.message}</Text>
                <Text style={styles.errorStack}>{this.state.error.stack}</Text>
              </View>
            )}

            <TouchableOpacity style={styles.button} onPress={this.handleReset}>
              <Text style={styles.buttonText}>Try Again</Text>
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
    backgroundColor: '#F7F7F7',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    maxWidth: 400,
    alignItems: 'center',
  },
  emoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
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
    lineHeight: 24,
  },
  button: {
    backgroundColor: '#222222',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 28,
    marginTop: 16,
    minHeight: 56,
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  errorDetails: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#FEE2E2',
    borderRadius: 16,
    width: '100%',
  },
  errorTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#EF4444',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 12,
    color: '#EF4444',
    marginBottom: 8,
    fontWeight: '600',
  },
  errorStack: {
    fontSize: 11,
    color: '#EF4444',
    fontFamily: 'monospace',
  },
});
