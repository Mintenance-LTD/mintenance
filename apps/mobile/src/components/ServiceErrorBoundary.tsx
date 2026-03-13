import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { logger } from '../utils/logger';
import { handleError } from '../utils/errorHandler';

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
    padding: 20,
    backgroundColor: '#FEF3C7',
  },
  icon: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F59E0B',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    color: '#92400E',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  button: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 28,
    marginBottom: 16,
    minHeight: 48,
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  exhaustedText: {
    fontSize: 13,
    color: '#EF4444',
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 16,
  },
  debugContainer: {
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 12,
    marginTop: 16,
    width: '100%',
  },
  debugText: {
    fontSize: 12,
    color: '#92400E',
    fontFamily: 'monospace',
  },
});
