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
  fallback?: ReactNode;
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
        logger.warn('Failed to report error to Sentry', importError);
      });
    } catch (sentryError) {
      // Prevent Sentry errors from crashing the app
      logger.warn('Sentry error reporting failed', sentryError);
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
    backgroundColor: '#F9FAFB',
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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  button: {
    backgroundColor: '#0EA5E9',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  errorDetails: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EF4444',
    width: '100%',
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#991B1B',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 13,
    color: '#7F1D1D',
    marginBottom: 8,
    fontWeight: '600',
  },
  errorStack: {
    fontSize: 11,
    color: '#991B1B',
    fontFamily: 'monospace',
  },
});
