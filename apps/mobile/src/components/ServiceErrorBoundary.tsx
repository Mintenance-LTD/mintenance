import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { logger } from '../utils/logger';
import { handleError } from '../utils/errorHandler';
import { theme } from '../theme';

interface Props {
  children: ReactNode;
  serviceName: string;
  onError?: (error: Error) => void;
  fallbackComponent?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  retryCount: number;
}

export class ServiceErrorBoundary extends Component<Props, State> {
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error(`Service error in ${this.props.serviceName}:`, error, {
      componentStack: errorInfo.componentStack,
      errorBoundary: 'ServiceErrorBoundary',
      retryCount: this.state.retryCount,
    });

    // Call custom error handler
    if (this.props.onError) {
      this.props.onError(error);
    } else {
      handleError(error, `${this.props.serviceName} Service`);
    }
  }

  retry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState((prevState) => ({
        hasError: false,
        error: undefined,
        retryCount: prevState.retryCount + 1,
      }));
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallbackComponent) {
        return this.props.fallbackComponent;
      }

      const canRetry = this.state.retryCount < this.maxRetries;

      return (
        <View style={styles.container}>
          <Text style={styles.icon}>⚠️</Text>
          <Text style={styles.title}>Service Unavailable</Text>
          <Text style={styles.message}>
            The {this.props.serviceName} service is temporarily unavailable.
            {canRetry ? ' Please try again.' : ' Please refresh the app.'}
          </Text>

          {canRetry && (
            <TouchableOpacity style={styles.button} onPress={this.retry}>
              <Text style={styles.buttonText}>
                Retry ({this.maxRetries - this.state.retryCount} attempts left)
              </Text>
            </TouchableOpacity>
          )}

          {!canRetry && (
            <Text style={styles.exhaustedText}>
              Maximum retry attempts reached. Please restart the app.
            </Text>
          )}

          {__DEV__ && this.state.error && (
            <View style={styles.debugContainer}>
              <Text style={styles.debugText}>
                Error: {this.state.error.message}
              </Text>
            </View>
          )}
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
    padding: theme.spacing[5],
    backgroundColor: theme.colors.accentLight,
  },
  icon: {
    fontSize: 48,
    marginBottom: theme.spacing[4],
  },
  title: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.warning,
    marginBottom: theme.spacing[2],
    textAlign: 'center',
  },
  message: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.warning,
    textAlign: 'center',
    marginBottom: theme.spacing[6],
    lineHeight: 22,
  },
  button: {
    backgroundColor: theme.colors.accent,
    paddingHorizontal: theme.spacing[6],
    paddingVertical: theme.spacing[3],
    borderRadius: theme.borderRadius.base,
    marginBottom: theme.spacing[4],
  },
  buttonText: {
    color: theme.colors.textInverse,
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  exhaustedText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.error,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: theme.spacing[4],
  },
  debugContainer: {
    backgroundColor: theme.colors.accentLight,
    padding: theme.spacing[3],
    borderRadius: theme.borderRadius.sm,
    marginTop: theme.spacing[4],
    width: '100%',
  },
  debugText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.warning,
    fontFamily: 'monospace',
  },
});
