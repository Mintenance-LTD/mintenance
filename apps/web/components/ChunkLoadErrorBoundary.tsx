'use client';

import React, { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  isChunkError: boolean;
  retryCount: number;
}

const MAX_AUTO_RETRIES = 2;

/**
 * ChunkLoadErrorBoundary - React Error Boundary specifically for chunk loading errors
 *
 * This boundary:
 * 1. Catches ChunkLoadError exceptions
 * 2. Automatically retries up to MAX_AUTO_RETRIES times
 * 3. Clears cache before retrying
 * 4. Provides user-friendly error UI
 * 5. Allows manual retry with cache clear
 *
 * Usage:
 * ```tsx
 * <ChunkLoadErrorBoundary>
 *   <YourApp />
 * </ChunkLoadErrorBoundary>
 * ```
 */
export class ChunkLoadErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      isChunkError: false,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    const errorMessage = error.message?.toLowerCase() || error.toString().toLowerCase();
    const isChunkError =
      errorMessage.includes('loading chunk') ||
      errorMessage.includes('chunkloaderror') ||
      (errorMessage.includes('chunk') && errorMessage.includes('failed'));

    return {
      hasError: true,
      error,
      isChunkError,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const isChunkError = this.state.isChunkError;

    console.error('[ChunkLoadErrorBoundary] Error caught:', {
      error,
      errorInfo,
      isChunkError,
      retryCount: this.state.retryCount,
    });

    // If it's a chunk error and we haven't exceeded retry limit
    if (isChunkError && this.state.retryCount < MAX_AUTO_RETRIES) {
      console.warn(
        `[ChunkLoadErrorBoundary] Auto-retry ${this.state.retryCount + 1}/${MAX_AUTO_RETRIES}`
      );

      // Clear cache and retry
      this.clearCacheAndRetry();
    }
  }

  clearCacheAndRetry = async () => {
    console.info('[ChunkLoadErrorBoundary] Clearing cache and retrying...');

    // Notify service worker to clear cache
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'CHUNK_LOAD_ERROR',
      });
    }

    // Clear any stale build IDs
    try {
      sessionStorage.removeItem('next-build-id');
    } catch (e) {
      console.warn('[ChunkLoadErrorBoundary] Failed to clear session storage:', e);
    }

    // Increment retry count
    this.setState((prev) => ({ retryCount: prev.retryCount + 1 }));

    // Wait a bit for cache clearing
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Hard reload
    window.location.reload();
  };

  handleManualRetry = () => {
    console.info('[ChunkLoadErrorBoundary] Manual retry requested');
    this.clearCacheAndRetry();
  };

  handleReset = () => {
    console.info('[ChunkLoadErrorBoundary] Resetting error boundary');
    this.setState({
      hasError: false,
      error: null,
      isChunkError: false,
      retryCount: 0,
    });
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: '2rem',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            backgroundColor: '#f9fafb',
          }}
        >
          <div
            style={{
              maxWidth: '600px',
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '2rem',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                backgroundColor: this.state.isChunkError ? '#fef3c7' : '#fee2e2',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.5rem',
                fontSize: '2rem',
              }}
            >
              {this.state.isChunkError ? '⚠️' : '❌'}
            </div>

            <h1
              style={{
                fontSize: '1.5rem',
                fontWeight: 'bold',
                marginBottom: '1rem',
                textAlign: 'center',
                color: '#1f2937',
              }}
            >
              {this.state.isChunkError
                ? 'Application Update Required'
                : 'Something Went Wrong'}
            </h1>

            <p
              style={{
                fontSize: '1rem',
                color: '#6b7280',
                marginBottom: '1.5rem',
                textAlign: 'center',
                lineHeight: '1.6',
              }}
            >
              {this.state.isChunkError
                ? 'We\'ve updated the application. Please refresh the page to continue.'
                : 'An unexpected error occurred. Please try refreshing the page.'}
            </p>

            {this.state.error && (
              <details
                style={{
                  marginBottom: '1.5rem',
                  padding: '1rem',
                  backgroundColor: '#f3f4f6',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                }}
              >
                <summary
                  style={{
                    cursor: 'pointer',
                    fontWeight: '600',
                    color: '#4b5563',
                    marginBottom: '0.5rem',
                  }}
                >
                  Error Details
                </summary>
                <pre
                  style={{
                    marginTop: '0.5rem',
                    fontSize: '0.75rem',
                    color: '#6b7280',
                    overflow: 'auto',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {this.state.error.message}
                </pre>
              </details>
            )}

            <div
              style={{
                display: 'flex',
                gap: '1rem',
                justifyContent: 'center',
                flexWrap: 'wrap',
              }}
            >
              <button
                onClick={this.handleManualRetry}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#2563eb';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#3b82f6';
                }}
              >
                Refresh Page
              </button>

              {!this.state.isChunkError && (
                <button
                  onClick={this.handleReset}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: 'white',
                    color: '#3b82f6',
                    border: '2px solid #3b82f6',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = '#eff6ff';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = 'white';
                  }}
                >
                  Try Again
                </button>
              )}
            </div>

            {this.state.retryCount > 0 && (
              <p
                style={{
                  marginTop: '1rem',
                  fontSize: '0.875rem',
                  color: '#9ca3af',
                  textAlign: 'center',
                }}
              >
                Retry attempt: {this.state.retryCount}/{MAX_AUTO_RETRIES}
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
