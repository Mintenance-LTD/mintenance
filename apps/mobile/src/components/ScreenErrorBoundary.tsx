import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { logger } from '../utils/logger';
import { theme } from '../theme';
import { safeNavigate } from '../navigation/navigationRef';

interface Props {
  children: ReactNode;
  screenName: string;
  fallbackComponent?: (error: Error, retry: () => void) => ReactNode;
  // 2026-05-26 audit-58 P2: previously withScreenErrorBoundary passed
  // these props but the boundary didn't declare them — the navigator's
  // intent ("crash on Find Jobs goes back to JobsList") was silently
  // dropped and every crash showed only a generic Retry. Now wired
  // through to a Home button rendered under Retry. If fallbackRoute
  // is set, the button navigates there; otherwise it pops to the
  // Main → JobsTab → JobsList default.
  fallbackRoute?: string;
  showHomeButton?: boolean;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ScreenErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // 2026-05-21 audit (Quote Builder spurious error): the boundary was
    // catching exceptions but logging them as a generic
    // `Screen error in QuoteBuilder` line with no screen tag, so they
    // were impossible to group in Sentry. Add `screen` + `errorName`
    // as first-class tags so dashboard filters and grouping work.
    logger.error(`Screen error in ${this.props.screenName}:`, error, {
      componentStack: errorInfo.componentStack,
      errorBoundary: 'ScreenErrorBoundary',
      screen: this.props.screenName,
      errorName: error.name,
      // Truncate to avoid PII / log bloat. The full message is on the
      // logged Error itself (captureException receives it untouched).
      errorMessage: error.message?.slice(0, 200),
    });

    this.setState({
      error,
      errorInfo,
    });
  }

  retry = () => {
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
    });
  };

  goHome = () => {
    // 2026-05-26 audit-58 P2: prefer the navigator-supplied
    // fallbackRoute (e.g. 'JobsList' for the Find Jobs / Job Details
    // screens) so users land on the surface the navigator wanted
    // them on rather than the global Home tab. Falls back to the
    // Main tab navigator if the route can't be resolved (caller
    // didn't provide one or the container isn't mounted yet —
    // safeNavigate is best-effort).
    const fallback = this.props.fallbackRoute;
    if (fallback) {
      const ok = safeNavigate(fallback);
      if (ok) {
        this.retry();
        return;
      }
    }
    // Generic recovery: pop to root Main stack.
    safeNavigate('Main');
    this.retry();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallbackComponent && this.state.error) {
        return this.props.fallbackComponent(this.state.error, this.retry);
      }

      return (
        <View style={styles.container}>
          <Text style={styles.title}>Screen Error</Text>
          <Text style={styles.subtitle}>
            The {this.props.screenName} screen encountered an error
          </Text>
          <Text style={styles.message}>
            Something went wrong while loading this screen. Please try again.
          </Text>

          {__DEV__ && this.state.error && (
            <View style={styles.debugContainer}>
              <Text style={styles.debugTitle}>Debug Info:</Text>
              <Text style={styles.debugText}>{this.state.error.message}</Text>
              {this.state.errorInfo && (
                <Text style={styles.debugText}>
                  {this.state.errorInfo.componentStack}
                </Text>
              )}
            </View>
          )}

          <TouchableOpacity style={styles.button} onPress={this.retry}>
            <Text style={styles.buttonText}>Retry</Text>
          </TouchableOpacity>

          {/* 2026-05-26 audit-58 P2: secondary fallback nav target.
              Default-on when a fallbackRoute is supplied; explicitly
              opt-in via showHomeButton otherwise. */}
          {(this.props.showHomeButton ||
            (this.props.fallbackRoute &&
              this.props.showHomeButton !== false)) && (
            <TouchableOpacity
              style={[styles.button, styles.buttonSecondary]}
              onPress={this.goHome}
            >
              <Text style={[styles.buttonText, styles.buttonTextSecondary]}>
                {this.props.fallbackRoute ? 'Go back' : 'Go to Home'}
              </Text>
            </TouchableOpacity>
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
    backgroundColor: theme.colors.backgroundSecondary,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.error,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  debugContainer: {
    backgroundColor: theme.colors.backgroundSecondary,
    padding: 16,
    borderRadius: 12,
    marginVertical: 16,
    width: '100%',
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  debugText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontFamily: 'monospace',
    lineHeight: 16,
  },
  button: {
    backgroundColor: theme.colors.textPrimary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 28,
    marginTop: 16,
    minHeight: 48,
    justifyContent: 'center',
  },
  buttonText: {
    color: theme.colors.textInverse,
    fontSize: 16,
    fontWeight: '600',
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.textPrimary,
    marginTop: 12,
  },
  buttonTextSecondary: {
    color: theme.colors.textPrimary,
  },
});
