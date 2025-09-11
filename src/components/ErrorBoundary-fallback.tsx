import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: any;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, resetError: () => void) => React.ReactNode;
  onError?: (error: Error, errorInfo: any) => void;
}

class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught an error:', error);
    console.error('Error info:', errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      try {
        this.props.onError(error, errorInfo);
      } catch (e) {
        console.error('Error in onError callback:', e);
      }
    }
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback && this.state.error) {
        try {
          return this.props.fallback(this.state.error, this.resetError);
        } catch (e) {
          console.error('Error in fallback component:', e);
          // Fall through to default error UI
        }
      }

      // Default error UI
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Oops! Something went wrong</Text>
          <Text style={styles.errorMessage}>
            The app encountered an unexpected error. This is likely a temporary
            issue.
          </Text>

          <View style={styles.errorDetails}>
            <Text style={styles.errorDetailsTitle}>Error Details:</Text>
            <Text style={styles.errorDetailsText}>
              {this.state.error?.name}: {this.state.error?.message}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.retryButton}
            onPress={this.resetError}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>

          <Text style={styles.helpText}>
            If this problem persists, please restart the app.
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#fff5f5',
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#d32f2f',
    textAlign: 'center',
    marginBottom: 15,
  },
  errorMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 25,
  },
  errorDetails: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 8,
    marginBottom: 25,
    width: '100%',
    maxWidth: 400,
  },
  errorDetailsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  errorDetailsText: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
    lineHeight: 16,
  },
  retryButton: {
    backgroundColor: '#1a73e8',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  helpText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default ErrorBoundary;
