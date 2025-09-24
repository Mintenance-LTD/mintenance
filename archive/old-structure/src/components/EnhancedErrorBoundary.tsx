/**
 * Enhanced Error Boundary
 *
 * Intelligent error boundary that uses ErrorRecoveryManager for smart recovery strategies.
 * Provides better UX with contextual error messages and recovery options.
 */

import React, { Component, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { logger } from '../utils/logger';
import ErrorRecoveryManager, {
  ErrorContext,
  RecoveryStrategy,
  EnhancedErrorBoundaryProps,
} from '../utils/ErrorRecoveryManager';
import AccessibilityManager from '../utils/AccessibilityManager';

interface Props extends EnhancedErrorBoundaryProps {
  onNavigate?: (target: string) => void;
  onRefresh?: () => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorId?: string;
  strategy?: RecoveryStrategy;
  isRecovering: boolean;
  recoveryAttempt: number;
}

export class EnhancedErrorBoundary extends Component<Props, State> {
  private errorRecoveryManager = ErrorRecoveryManager;
  private accessibilityManager = AccessibilityManager;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      isRecovering: false,
      recoveryAttempt: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: Date.now().toString(36) + Math.random().toString(36).substr(2),
    };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    const errorId = this.state.errorId || 'unknown';
    const context: ErrorContext = {
      ...this.props.context,
      componentStack: errorInfo.componentStack?.substring(0, 500),
      timestamp: Date.now(),
      errorId,
    };

    // Log the error
    logger.error('Enhanced error boundary caught error', error, {
      context,
      recoveryAttempt: this.state.recoveryAttempt,
    });

    // Get recovery strategy
    const strategy = this.errorRecoveryManager.getRecoveryStrategy(error, context);

    // Update state with strategy
    this.setState({ strategy });

    // Report to external services
    this.reportError(error, context, strategy);

    // Announce error to accessibility services
    this.accessibilityManager.announceError(
      strategy.message || 'An error occurred',
      context.componentName || context.screenName
    );
  }

  private reportError(error: Error, context: ErrorContext, strategy: RecoveryStrategy) {
    try {
      // Report to Sentry
      const { captureException } = require('../config/sentry');
      captureException(error, {
        tags: {
          errorBoundary: 'enhanced',
          strategy: strategy.type,
          priority: this.errorRecoveryManager.categorizeError(error)?.priority || 'unknown',
        },
        contexts: {
          errorBoundary: context,
          recovery: {
            strategy: strategy.type,
            attempt: this.state.recoveryAttempt,
          },
        },
      });
    } catch (reportingError) {
      logger.error('Failed to report error', reportingError);
    }

    // Call custom error handler
    if (this.props.onRecoveryAction) {
      this.props.onRecoveryAction('error_occurred', {
        error: error.message,
        context,
        strategy,
      });
    }
  }

  private handleRecovery = async () => {
    if (!this.state.error || !this.state.strategy) return;

    this.setState({ isRecovering: true });

    const success = await this.errorRecoveryManager.executeRecovery(
      this.state.error,
      this.state.strategy,
      this.props.context,
      {
        onRetry: this.handleRetry,
        onFallback: this.handleFallback,
        onRedirect: this.handleRedirect,
        onRefresh: this.handleRefresh,
      }
    );

    if (success && this.state.strategy.type === 'retry') {
      // Reset error state for retry
      this.setState({
        hasError: false,
        error: undefined,
        errorId: undefined,
        strategy: undefined,
        isRecovering: false,
        recoveryAttempt: this.state.recoveryAttempt + 1,
      });
    } else {
      this.setState({ isRecovering: false });
    }

    if (this.props.onRecoveryAction) {
      this.props.onRecoveryAction('recovery_executed', {
        success,
        strategyType: this.state.strategy.type,
      });
    }
  };

  private handleRetry = async () => {
    // This will trigger a re-render of children
    logger.info('Retrying after error recovery');
  };

  private handleFallback = () => {
    // Fallback is handled by showing the fallback UI
    logger.info('Using fallback UI after error');
  };

  private handleRedirect = (target: string) => {
    if (this.props.onNavigate) {
      this.props.onNavigate(target);
    } else {
      logger.info('Redirect requested but no navigation handler provided', { target });
    }
  };

  private handleRefresh = () => {
    if (this.props.onRefresh) {
      this.props.onRefresh();
    } else {
      Alert.alert(
        'App Refresh Required',
        'The app needs to be refreshed to recover from this error.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Refresh', onPress: () => {
            // In a real app, this would trigger app refresh
            logger.info('App refresh requested');
          }},
        ]
      );
    }
  };

  private handleReportError = () => {
    if (!this.state.error || !this.state.errorId) return;

    const category = this.errorRecoveryManager.categorizeError(this.state.error);
    const stats = this.errorRecoveryManager.getErrorStatistics();

    Alert.alert(
      'Report Error',
      `Error ID: ${this.state.errorId}\nCategory: ${category?.name || 'Unknown'}\nPriority: ${category?.priority || 'Unknown'}\n\nWould you like to report this error to help us improve the app?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Report',
          onPress: () => {
            if (this.props.onRecoveryAction) {
              this.props.onRecoveryAction('error_reported', {
                errorId: this.state.errorId,
                category: category?.name,
                stats,
              });
            }

            this.accessibilityManager.announceSuccess(
              'Error report sent. Thank you for helping us improve the app.'
            );
          },
        },
      ]
    );
  };

  private renderCustomFallback() {
    if (!this.props.fallbackComponent || !this.state.error || !this.state.strategy) {
      return null;
    }

    const FallbackComponent = this.props.fallbackComponent;
    return (
      <FallbackComponent
        error={this.state.error}
        strategy={this.state.strategy}
        onRetry={this.handleRecovery}
        onNavigate={this.handleRedirect}
      />
    );
  }

  private renderDefaultErrorUI() {
    if (!this.state.error || !this.state.strategy) return null;

    const category = this.errorRecoveryManager.categorizeError(this.state.error);
    const canRetry = this.state.strategy.type === 'retry' &&
      (!this.state.strategy.maxAttempts ||
       this.state.recoveryAttempt < this.state.strategy.maxAttempts);

    return (
      <View style={styles.container} testID="enhanced-error-boundary">
        {/* Error Icon */}
        <View style={styles.iconContainer}>
          <Ionicons
            name={this.getErrorIcon(category?.priority)}
            size={64}
            color={this.getErrorColor(category?.priority)}
            accessibilityLabel="Error icon"
          />
        </View>

        {/* Error Title */}
        <Text
          style={styles.title}
          accessibilityRole="header"
          accessibilityLevel={1}
        >
          {category?.name || 'Something went wrong'}
        </Text>

        {/* Error Message */}
        <Text style={styles.message} accessibilityHint="Error description">
          {this.state.strategy.message ||
           'We encountered an unexpected error. Our team has been notified.'}
        </Text>

        {/* Recovery Actions */}
        <View style={styles.actionsContainer}>
          {this.state.isRecovering ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={styles.loadingText}>Recovering...</Text>
            </View>
          ) : (
            <>
              {canRetry && (
                <TouchableOpacity
                  style={[styles.button, styles.primaryButton]}
                  onPress={this.handleRecovery}
                  accessibilityRole="button"
                  accessibilityLabel="Try again"
                  accessibilityHint="Attempt to recover from the error"
                >
                  <Ionicons name="refresh" size={20} color={theme.colors.textInverse} />
                  <Text style={styles.primaryButtonText}>
                    {this.state.strategy.type === 'retry' ? 'Try Again' : 'Recover'}
                  </Text>
                </TouchableOpacity>
              )}

              {this.state.strategy.redirectTarget && (
                <TouchableOpacity
                  style={[styles.button, styles.secondaryButton]}
                  onPress={() => this.handleRedirect(this.state.strategy!.redirectTarget!)}
                  accessibilityRole="button"
                  accessibilityLabel="Go to safe area"
                  accessibilityHint="Navigate to a stable part of the app"
                >
                  <Ionicons name="home" size={20} color={theme.colors.primary} />
                  <Text style={styles.secondaryButtonText}>Go to Home</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.button, styles.tertiaryButton]}
                onPress={this.handleReportError}
                accessibilityRole="button"
                accessibilityLabel="Report error"
                accessibilityHint="Send error report to help improve the app"
              >
                <Ionicons name="bug" size={16} color={theme.colors.textSecondary} />
                <Text style={styles.tertiaryButtonText}>Report Issue</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Error Details (for development) */}
        {__DEV__ && this.state.error && (
          <View style={styles.debugContainer}>
            <Text style={styles.debugTitle}>Debug Info:</Text>
            <Text style={styles.debugText} selectable>
              {this.state.error.message}
            </Text>
            <Text style={styles.debugText} selectable>
              ID: {this.state.errorId}
            </Text>
            <Text style={styles.debugText}>
              Attempt: {this.state.recoveryAttempt}
            </Text>
          </View>
        )}
      </View>
    );
  }

  private getErrorIcon(priority?: string): string {
    switch (priority) {
      case 'critical': return 'alert-circle';
      case 'high': return 'warning';
      case 'medium': return 'information-circle';
      default: return 'help-circle';
    }
  }

  private getErrorColor(priority?: string): string {
    switch (priority) {
      case 'critical': return theme.colors.error;
      case 'high': return theme.colors.warning;
      case 'medium': return theme.colors.primary;
      default: return theme.colors.textSecondary;
    }
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    // Use custom fallback if provided
    const customFallback = this.renderCustomFallback();
    if (customFallback) {
      return customFallback;
    }

    // Use default error UI
    return this.renderDefaultErrorUI();
  }
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: theme.colors.background,
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    maxWidth: 280,
  },
  actionsContainer: {
    width: '100%',
    maxWidth: 280,
    gap: 12,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minHeight: 44,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textInverse,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
  },
  secondaryButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.primary,
  },
  tertiaryButton: {
    backgroundColor: 'transparent',
  },
  tertiaryButtonText: {
    marginLeft: 6,
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  debugContainer: {
    marginTop: 32,
    padding: 16,
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: 8,
    width: '100%',
    maxWidth: 320,
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  debugText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontFamily: 'monospace',
    marginBottom: 4,
  },
});

export default EnhancedErrorBoundary;