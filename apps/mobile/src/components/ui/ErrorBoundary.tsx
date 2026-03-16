import React, { Component, ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { logger } from '../../utils/logger';
import { theme } from '../../theme';

export interface ErrorInfo {
  componentStack: string;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
}

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackComponent?: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetOnPropsChange?: boolean;
  resetKeys?: string[];
}

export interface ErrorFallbackProps {
  error: Error;
  errorInfo: ErrorInfo;
  resetError: () => void;
  errorId: string;
}

const DefaultErrorFallback: React.FC<ErrorFallbackProps> = ({ error, resetError, errorId }) => (
  <View style={styles.container}>
    <View style={styles.errorContent}>
      <Ionicons name="alert-circle" size={64} color={theme.colors.error} style={styles.errorIcon} />
      <Text style={styles.errorTitle}>Something went wrong</Text>
      <Text style={styles.errorMessage}>We're sorry, but an unexpected error occurred. Please try again.</Text>
      {__DEV__ && (
        <ScrollView style={styles.errorDetails}>
          <Text style={styles.errorDetailsTitle}>Error Details:</Text>
          <Text style={styles.errorDetailsText}>{error.message}</Text>
          <Text style={styles.errorDetailsTitle}>Error ID:</Text>
          <Text style={styles.errorDetailsText}>{errorId}</Text>
        </ScrollView>
      )}
      <TouchableOpacity style={styles.retryButton} onPress={resetError} accessibilityRole="button" accessibilityLabel="Try again">
        <Ionicons name="refresh" size={20} color={theme.colors.textInverse} />
        <Text style={styles.retryButtonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  </View>
);

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private resetTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, errorId: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error, errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    logger.error('React Error Boundary caught error', {
      error: error.message, stack: error.stack, componentStack: errorInfo.componentStack, errorId, timestamp: new Date().toISOString(),
    });
    this.setState({ errorInfo, errorId });
    this.props.onError?.(error, errorInfo);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    const { resetKeys, resetOnPropsChange } = this.props;
    const { hasError } = this.state;
    if (hasError && prevProps.children !== this.props.children && resetOnPropsChange) this.resetError();
    if (hasError && resetKeys) {
      const prevResetKeys = prevProps.resetKeys || [];
      if (resetKeys.some((key, index) => prevResetKeys[index] !== key)) this.resetError();
    }
  }

  componentWillUnmount() { if (this.resetTimeoutId) clearTimeout(this.resetTimeoutId); }

  resetError = () => {
    if (this.resetTimeoutId) clearTimeout(this.resetTimeoutId);
    this.setState({ hasError: false, error: null, errorInfo: null, errorId: null });
  };

  render() {
    const { hasError, error, errorInfo, errorId } = this.state;
    const { children, fallbackComponent: FallbackComponent = DefaultErrorFallback } = this.props;
    if (hasError && error && errorInfo && errorId) {
      return <FallbackComponent error={error} errorInfo={errorInfo} resetError={this.resetError} errorId={errorId} />;
    }
    return children;
  }
}

export const withErrorBoundary = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) => {
  const WithErrorBoundaryComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}><WrappedComponent {...props} /></ErrorBoundary>
  );
  WithErrorBoundaryComponent.displayName = `withErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name})`;
  return WithErrorBoundaryComponent;
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.backgroundSecondary, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorContent: { maxWidth: 400, alignItems: 'center' },
  errorIcon: { marginBottom: 20 },
  errorTitle: { fontSize: 24, fontWeight: '600', color: theme.colors.textPrimary, textAlign: 'center', marginBottom: 16 },
  errorMessage: { fontSize: 16, color: theme.colors.textSecondary, textAlign: 'center', lineHeight: 24, marginBottom: 24 },
  errorDetails: { maxHeight: 200, width: '100%', backgroundColor: theme.colors.backgroundSecondary, borderRadius: 12, padding: 16, marginBottom: 20 },
  errorDetailsTitle: { fontSize: 14, fontWeight: '600', color: theme.colors.textPrimary, marginTop: 8, marginBottom: 6 },
  errorDetailsText: { fontSize: 12, color: theme.colors.textSecondary, fontFamily: 'monospace', lineHeight: 18 },
  retryButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.textPrimary, paddingHorizontal: 20, paddingVertical: 16, borderRadius: 12, minHeight: 44 },
  retryButtonText: { color: theme.colors.textInverse, fontSize: 16, fontWeight: '600', marginLeft: 8 },
});
