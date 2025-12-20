'use client';

import React from 'react';
import { Button, Card } from '../components/ui';
import { theme } from '@/lib/theme';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Error Handler for Next.js App Router
 * This component catches errors in nested routes
 * Note: This is rendered INSIDE the root layout, so it should NOT include <html> or <body> tags
 */
export default function Error({ error, reset }: ErrorPageProps) {
  const isDevelopment = process.env.NODE_ENV === 'development';

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f9fafb',
      padding: '1rem',
    }}>
      <Card variant="elevated" style={{
        maxWidth: '600px',
        width: '100%',
        padding: '2rem',
        textAlign: 'center',
      }}>
        {/* Error Icon */}
        <div style={{
          fontSize: '64px',
          marginBottom: '1rem',
          color: theme.colors.error || '#ef4444',
        }}>
          ⚠️
        </div>
        
        {/* Error Title */}
        <h1 style={{
          fontSize: '1.875rem',
          fontWeight: 700,
          color: theme.colors.textPrimary || '#111827',
          marginBottom: '1rem',
        }}>
          Something went wrong
        </h1>
        
        {/* Error Message */}
        <p style={{
          fontSize: '1rem',
          color: theme.colors.textSecondary || '#6b7280',
          marginBottom: '2rem',
          lineHeight: 1.6,
        }}>
          We encountered an unexpected error while loading this page. 
          Our team has been notified and is working to fix this issue.
        </p>

        {/* Error Details (Development Only) */}
        {isDevelopment && error && (
          <details style={{
            backgroundColor: '#f3f4f6',
            padding: '1rem',
            borderRadius: '0.5rem',
            marginBottom: '2rem',
            textAlign: 'left',
            border: '1px solid #e5e7eb',
          }}>
            <summary style={{
              cursor: 'pointer',
              fontWeight: 600,
              marginBottom: '0.5rem',
              color: theme.colors.textPrimary || '#111827',
            }}>
              Error Details (Development Only)
            </summary>
            <div style={{
              marginTop: '0.5rem',
            }}>
              <p style={{
                fontSize: '0.875rem',
                color: theme.colors.error || '#ef4444',
                marginBottom: '0.5rem',
                fontWeight: 600,
              }}>
                {error.name}: {error.message}
              </p>
              {error.digest && (
                <p style={{
                  fontSize: '0.75rem',
                  color: theme.colors.textTertiary || '#9ca3af',
                  fontFamily: 'monospace',
                  marginBottom: '0.5rem',
                }}>
                  Digest: {error.digest}
                </p>
              )}
              {error.stack && (
                <pre style={{
                  fontSize: '0.75rem',
                  color: theme.colors.error || '#ef4444',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  backgroundColor: '#ffffff',
                  padding: '0.75rem',
                  borderRadius: '0.25rem',
                  border: '1px solid #e5e7eb',
                  overflow: 'auto',
                  maxHeight: '300px',
                }}>
                  {error.stack}
                </pre>
              )}
            </div>
          </details>
        )}

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          gap: '0.75rem',
          justifyContent: 'center',
          flexWrap: 'wrap',
        }}>
          <Button
            variant="primary"
            onClick={reset}
          >
            Try Again
          </Button>
          <Button
            variant="outline"
            onClick={() => window.location.href = '/'}
          >
            Go Home
          </Button>
          <Button
            variant="ghost"
            onClick={() => window.location.reload()}
          >
            Reload Page
          </Button>
        </div>

        {/* Help Text */}
        <p style={{
          fontSize: '0.875rem',
          color: theme.colors.textTertiary || '#9ca3af',
          marginTop: '2rem',
          lineHeight: 1.5,
        }}>
          If this problem persists, please{' '}
          <a 
            href="/contact" 
            style={{ 
              color: theme.colors.primary || '#3b82f6',
              textDecoration: 'underline',
            }}
          >
            contact our support team
          </a>
          {' '}for assistance.
        </p>
      </Card>
    </div>
  );
}