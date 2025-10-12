'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from './Button';
import { Card } from './Card';
import { theme } from '@/lib/theme';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log to external service in production
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send to error tracking service (Sentry, LogRocket, etc.)
      console.error('Production error:', error);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors.backgroundSecondary,
          padding: theme.spacing[6],
        }}>
          <Card variant="elevated" style={{
            maxWidth: '600px',
            width: '100%',
            padding: theme.spacing[8],
            textAlign: 'center',
          }}>
            <div style={{
              fontSize: theme.typography.fontSize['4xl'],
              marginBottom: theme.spacing[4],
            }}>
              ⚠️
            </div>
            
            <h1 style={{
              fontSize: theme.typography.fontSize['2xl'],
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.textPrimary,
              marginBottom: theme.spacing[4],
            }}>
              Something went wrong
            </h1>
            
            <p style={{
              fontSize: theme.typography.fontSize.lg,
              color: theme.colors.textSecondary,
              marginBottom: theme.spacing[6],
              lineHeight: theme.typography.lineHeight.relaxed,
            }}>
              We're sorry, but something unexpected happened. Our team has been notified and is working to fix this issue.
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details style={{
                backgroundColor: theme.colors.surfaceSecondary,
                padding: theme.spacing[4],
                borderRadius: theme.borderRadius.lg,
                marginBottom: theme.spacing[6],
                textAlign: 'left',
              }}>
                <summary style={{
                  cursor: 'pointer',
                  fontWeight: theme.typography.fontWeight.semibold,
                  marginBottom: theme.spacing[2],
                }}>
                  Error Details (Development Only)
                </summary>
                <pre style={{
                  fontSize: theme.typography.fontSize.sm,
                  color: theme.colors.error,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}>
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            <div style={{
              display: 'flex',
              gap: theme.spacing[3],
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}>
              <Button
                variant="primary"
                onClick={this.handleRetry}
              >
                Try Again
              </Button>
              <Button
                variant="outline"
                onClick={this.handleReload}
              >
                Reload Page
              </Button>
              <Button
                variant="ghost"
                onClick={() => window.location.href = '/'}
              >
                Go Home
              </Button>
            </div>

            <p style={{
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.textTertiary,
              marginTop: theme.spacing[6],
            }}>
              If this problem persists, please contact our support team.
            </p>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
