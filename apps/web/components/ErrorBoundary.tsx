'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { tokens, componentTokens } from '@/lib/design-tokens';
// import { focusRing } from '@/lib/a11y'; // Module not found
// import * as Sentry from '@sentry/nextjs'; // Optional dependency

// Fallback for missing a11y module
const focusRing = 'ring-2 ring-blue-500 ring-offset-2';

// Sentry is optional - will be undefined if not installed
const Sentry: any = null; // Disabled until @sentry/nextjs is installed

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
  componentName?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  eventId: string | null;
}

/**
 * Error Boundary Component
 *
 * Catches JavaScript errors in child components and displays a fallback UI
 * WCAG 2.1 AA compliant with keyboard navigation and ARIA labels
 *
 * Usage:
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      eventId: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log to Sentry in production (if available)
    let eventId: string | null = null;
    if (process.env.NODE_ENV === 'production' && Sentry) {
      eventId = Sentry.captureException(error, {
        contexts: {
          react: {
            componentStack: errorInfo.componentStack,
          },
        },
        tags: {
          errorBoundary: true,
          component: this.props.componentName || 'Unknown',
        },
      });
    }

    this.setState({
      error,
      errorInfo,
      eventId,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      eventId: null,
    });
  };

  handleReportFeedback = () => {
    if (this.state.eventId && Sentry) {
      Sentry.showReportDialog({ eventId: this.state.eventId });
    }
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI (WCAG compliant)
      return (
        <div
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: tokens.colors.background.secondary,
            padding: tokens.spacing[6],
          }}
        >
          <div
            style={{
              maxWidth: '600px',
              width: '100%',
              backgroundColor: tokens.colors.surface.default,
              borderRadius: tokens.borderRadius['2xl'],
              padding: tokens.spacing[8],
              boxShadow: tokens.shadows.lg,
              border: `1px solid ${tokens.colors.border.default}`,
            }}
          >
            {/* Error Icon */}
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: tokens.borderRadius.full,
                backgroundColor: tokens.colors.error[100],
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: `0 auto ${tokens.spacing[6]}`,
              }}
              aria-hidden="true"
            >
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  stroke={tokens.colors.error[600]}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            {/* Error Heading */}
            <h1
              style={{
                fontSize: tokens.typography.fontSize['2xl'],
                fontWeight: tokens.typography.fontWeight.semibold,
                color: tokens.colors.text.primary,
                textAlign: 'center',
                marginBottom: tokens.spacing[3],
              }}
            >
              Something went wrong
            </h1>

            {/* Error Description */}
            <p
              style={{
                fontSize: tokens.typography.fontSize.base,
                color: tokens.colors.text.secondary,
                textAlign: 'center',
                marginBottom: tokens.spacing[6],
                lineHeight: tokens.typography.lineHeight.relaxed,
              }}
            >
              We're sorry for the inconvenience. The application encountered an unexpected error.
              Please try refreshing the page or contact support if the problem persists.
            </p>

            {/* Error Details (Development Only or showDetails) */}
            {(process.env.NODE_ENV === 'development' || this.props.showDetails) && this.state.error && (
              <details
                style={{
                  marginBottom: tokens.spacing[6],
                  padding: tokens.spacing[4],
                  backgroundColor: tokens.colors.background.tertiary,
                  borderRadius: tokens.borderRadius.lg,
                  border: `1px solid ${tokens.colors.border.default}`,
                }}
              >
                <summary
                  style={{
                    fontSize: tokens.typography.fontSize.sm,
                    fontWeight: tokens.typography.fontWeight.medium,
                    color: tokens.colors.text.primary,
                    cursor: 'pointer',
                    marginBottom: tokens.spacing[3],
                  }}
                  className="error-details-summary"
                >
                  Error Details (Development Only)
                </summary>
                <pre
                  style={{
                    fontSize: tokens.typography.fontSize.xs,
                    color: tokens.colors.error[700],
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    fontFamily: tokens.typography.fontFamily.mono,
                    margin: 0,
                  }}
                >
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            {/* Action Buttons */}
            <div
              style={{
                display: 'flex',
                gap: tokens.spacing[3],
                flexDirection: window.innerWidth < 640 ? 'column' : 'row',
              }}
            >
              <button
                onClick={this.handleReset}
                aria-label="Try to recover from error"
                className={`error-boundary-reset-btn ${focusRing.primary}`}
                style={{
                  ...componentTokens.button.secondary,
                  flex: 1,
                  justifyContent: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  gap: tokens.spacing[2],
                }}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Try Again
              </button>

              <button
                onClick={this.handleReload}
                aria-label="Reload the page"
                className={`error-boundary-reload-btn ${focusRing.primary}`}
                style={{
                  ...componentTokens.button.primary,
                  flex: 1,
                  justifyContent: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  gap: tokens.spacing[2],
                }}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Reload Page
              </button>
            </div>

            {/* Report Feedback (Production Only) */}
            {process.env.NODE_ENV === 'production' && this.state.eventId && (
              <button
                onClick={this.handleReportFeedback}
                aria-label="Report feedback about this error"
                className={focusRing.primary}
                style={{
                  ...componentTokens.button.ghost,
                  width: '100%',
                  justifyContent: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  gap: tokens.spacing[2],
                  marginTop: tokens.spacing[4],
                }}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Report Feedback
              </button>
            )}

            {/* Help Text */}
            <p
              style={{
                fontSize: tokens.typography.fontSize.sm,
                color: tokens.colors.text.tertiary,
                textAlign: 'center',
                marginTop: tokens.spacing[6],
              }}
            >
              Need help?{' '}
              <a
                href="/contact"
                style={{
                  color: tokens.colors.text.link,
                  textDecoration: 'underline',
                  fontWeight: tokens.typography.fontWeight.medium,
                }}
                className={focusRing.primary}
              >
                Contact Support
              </a>
            </p>
          </div>

          {/* Styles */}
          <style dangerouslySetInnerHTML={{
            __html: `
              /* Error details summary focus */
              .error-details-summary:focus {
                outline: none;
                box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.1);
                border-radius: ${tokens.borderRadius.base};
              }

              /* Button hover states */
              .error-boundary-reset-btn:hover {
                background-color: ${tokens.colors.background.secondary};
                border-color: ${tokens.colors.border.hover};
                transform: translateY(-1px);
              }

              .error-boundary-reload-btn:hover {
                background-color: ${tokens.colors.primary[600]};
                transform: translateY(-1px);
                box-shadow: ${tokens.shadows.md};
              }

              /* Button active states */
              .error-boundary-reset-btn:active,
              .error-boundary-reload-btn:active {
                transform: translateY(0);
              }

              /* High contrast mode */
              @media (prefers-contrast: high) {
                .error-boundary-reset-btn:focus,
                .error-boundary-reload-btn:focus {
                  outline: 2px solid currentColor;
                  outline-offset: 2px;
                }
              }

              /* Reduced motion */
              @media (prefers-reduced-motion: reduce) {
                .error-boundary-reset-btn,
                .error-boundary-reload-btn {
                  transition: none !important;
                }
              }
            `
          }} />
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook-based wrapper for ErrorBoundary
 * Use this in functional components
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function WithErrorBoundaryComponent(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}
