'use client';

import React, { useEffect, useState } from 'react';
import * as Sentry from '@sentry/nextjs';
import { Button, Card } from '../components/ui';
import { theme } from '@/lib/theme';
import { AlertTriangle } from 'lucide-react';
import { MintEditorialErrorView } from '@/components/mint-editorial/MintEditorialErrorView';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Error Handler for Next.js App Router (root-level).
 *
 * Two branches:
 *   - Mint Editorial — canonical 500-style screen (huge serif `500`
 *     code + .t-h2 + .t-body + primary "Try again" + ghost "Get help")
 *     from design-system states-and-edges.html.
 *   - Legacy — the existing AlertTriangle + Card layout, untouched.
 *
 * Note: rendered INSIDE the root layout, so it should NOT include
 * <html> or <body> tags. Hydration-safe theme detection same as
 * everywhere else.
 */
export default function Error({ error, reset }: ErrorPageProps) {
  const isDevelopment = process.env.NODE_ENV === 'development';

  useEffect(() => {
    Sentry.captureException(error, {
      tags: { errorBoundary: 'app-router', digest: error.digest },
    });
  }, [error]);

  const [isMintEditorial, setIsMintEditorial] = useState(false);
  useEffect(() => {
    if (typeof document === 'undefined') return;
    setIsMintEditorial(
      document.documentElement.dataset.theme === 'mint-editorial'
    );
  }, []);

  if (isMintEditorial) {
    return (
      <div className='me-root' style={{ minHeight: '100vh' }}>
        <MintEditorialErrorView
          code='500'
          title="Something's off."
          body="Our end. We've logged it and someone's looking. Try again in a minute."
          primary={{ label: 'Try again', onClick: reset }}
          secondary={{ label: 'Get help', href: '/help' }}
        />
        {isDevelopment && error ? (
          <details
            style={{
              maxWidth: 700,
              margin: '0 auto 60px',
              padding: '0 24px',
            }}
          >
            <summary
              style={{
                cursor: 'pointer',
                fontWeight: 600,
                color: 'var(--me-ink-2)',
                fontSize: 13,
              }}
            >
              Error details (dev only)
            </summary>
            <pre
              style={{
                marginTop: 8,
                fontSize: 11,
                color: 'var(--me-err-fg)',
                background: 'var(--me-surface)',
                border: '1px solid var(--me-line)',
                padding: 12,
                borderRadius: 8,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                overflow: 'auto',
                maxHeight: 240,
              }}
            >
              {error.name}: {error.message}
              {error.digest ? `\nDigest: ${error.digest}` : ''}
              {error.stack ? `\n\n${error.stack}` : ''}
            </pre>
          </details>
        ) : null}
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--color-gray-50)',
        padding: '1rem',
      }}
    >
      <Card
        variant='elevated'
        style={{
          maxWidth: '600px',
          width: '100%',
          padding: '2rem',
          textAlign: 'center',
        }}
      >
        <div
          className='flex justify-center'
          style={{
            marginBottom: '1rem',
            color: theme.colors.error,
          }}
        >
          <AlertTriangle className='w-16 h-16' />
        </div>

        <h1
          style={{
            fontSize: '1.875rem',
            fontWeight: 700,
            color: theme.colors.textPrimary,
            marginBottom: '1rem',
          }}
        >
          Something went wrong
        </h1>

        <p
          style={{
            fontSize: '1rem',
            color: theme.colors.textSecondary,
            marginBottom: '2rem',
            lineHeight: 1.6,
          }}
        >
          We encountered an unexpected error while loading this page. Our team
          has been notified and is working to fix this issue.
        </p>

        {isDevelopment && error && (
          <details
            style={{
              backgroundColor: 'var(--color-gray-100)',
              padding: '1rem',
              borderRadius: '0.5rem',
              marginBottom: '2rem',
              textAlign: 'left',
              border: '1px solid var(--color-gray-200)',
            }}
          >
            <summary
              style={{
                cursor: 'pointer',
                fontWeight: 600,
                marginBottom: '0.5rem',
                color: theme.colors.textPrimary,
              }}
            >
              Error Details (Development Only)
            </summary>
            <div style={{ marginTop: '0.5rem' }}>
              <p
                style={{
                  fontSize: '0.875rem',
                  color: theme.colors.error,
                  marginBottom: '0.5rem',
                  fontWeight: 600,
                }}
              >
                {error.name}: {error.message}
              </p>
              {error.digest && (
                <p
                  style={{
                    fontSize: '0.75rem',
                    color: theme.colors.textTertiary,
                    fontFamily: 'monospace',
                    marginBottom: '0.5rem',
                  }}
                >
                  Digest: {error.digest}
                </p>
              )}
              {error.stack && (
                <pre
                  style={{
                    fontSize: '0.75rem',
                    color: theme.colors.error,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    backgroundColor: 'white',
                    padding: '0.75rem',
                    borderRadius: '0.25rem',
                    border: '1px solid var(--color-gray-200, transparent)',
                    overflow: 'auto',
                    maxHeight: '300px',
                  }}
                >
                  {error.stack}
                </pre>
              )}
            </div>
          </details>
        )}

        <div
          style={{
            display: 'flex',
            gap: '0.75rem',
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}
        >
          <Button variant='primary' onClick={reset}>
            Try Again
          </Button>
          <Button
            variant='outline'
            onClick={() => (window.location.href = '/')}
          >
            Go Home
          </Button>
          <Button variant='ghost' onClick={() => window.location.reload()}>
            Reload Page
          </Button>
        </div>

        <p
          style={{
            fontSize: '0.875rem',
            color: theme.colors.textTertiary,
            marginTop: '2rem',
            lineHeight: 1.5,
          }}
        >
          If this problem persists, please{' '}
          <a
            href='/contact'
            style={{
              color: theme.colors.primary,
              textDecoration: 'underline',
            }}
          >
            contact our support team
          </a>{' '}
          for assistance.
        </p>
      </Card>
    </div>
  );
}
