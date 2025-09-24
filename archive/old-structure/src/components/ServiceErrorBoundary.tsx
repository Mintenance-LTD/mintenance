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
    backgroundColor: '#fff8e1',
  },
  icon: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f57c00',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#e65100',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  button: {
    backgroundColor: '#ff9800',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  exhaustedText: {
    fontSize: 14,
    color: '#d84315',
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 16,
  },
  debugContainer: {
    backgroundColor: '#fff3e0',
    padding: 12,
    borderRadius: 6,
    marginTop: 16,
    width: '100%',
  },
  debugText: {
    fontSize: 12,
    color: '#e65100',
    fontFamily: 'monospace',
  },
});
