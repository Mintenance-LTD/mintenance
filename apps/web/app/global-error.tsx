'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import { theme } from '@/lib/theme';

/**
 * Global error boundary — last line of defence when even the root
 * `error.tsx` fails (e.g. a syntax error in the root layout, or the
 * Sentry SDK itself crashed during a normal error). Must declare
 * its own <html>/<body> because it replaces the root layout entirely.
 *
 * 2026-04-30 audit P1 (Web Error And Loading Boundaries Are Uneven):
 * we previously relied on Next.js's built-in default global error,
 * which is a stark white page with no branding. This matches the
 * visual style of `error.tsx` (the in-layout boundary) so users who
 * hit a top-level crash still see a Mintenance-shaped page.
 *
 * Colors come from `@/lib/theme` (same source the in-layout boundary
 * uses). Inline styles only — no global CSS available because this
 * surface replaces the root layout.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error, {
      tags: { errorBoundary: 'global', digest: error.digest },
    });
  }, [error]);

  // theme.colors is typed loosely upstream so we coerce here for
  // optional-property reads. The hex literals all live in
  // packages/design-tokens/src/colors.ts (single source of truth).
  const colors = theme.colors as unknown as Record<string, string>;
  const bg = colors.backgroundSecondary;
  const surface = colors.surface;
  const border = colors.border;
  const textPrimary = colors.textPrimary;
  const textSecondary = colors.textSecondary;
  const textTertiary = colors.textTertiary;
  const errorBg = colors.errorLight ?? colors.errorBackground ?? bg;
  const errorFg = colors.error;
  const primary = colors.primary;
  const inverseText = colors.textInverse ?? colors.surface;

  return (
    <html lang='en'>
      <body
        style={{
          margin: 0,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          backgroundColor: bg,
          color: textPrimary,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}
      >
        <div
          style={{
            maxWidth: 480,
            width: '100%',
            backgroundColor: surface,
            border: `1px solid ${border}`,
            borderRadius: 16,
            padding: 32,
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: errorBg,
              color: errorFg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
              margin: '0 auto 16px',
              fontWeight: 700,
            }}
            aria-hidden='true'
          >
            !
          </div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              marginTop: 0,
              marginBottom: 8,
            }}
          >
            Something went seriously wrong
          </h1>
          <p
            style={{
              color: textSecondary,
              marginBottom: 24,
              lineHeight: 1.5,
            }}
          >
            We hit a fatal error loading Mintenance. Our team has been notified.
            Please try again, or go back to the homepage.
          </p>
          {error.digest ? (
            <p
              style={{
                fontSize: 12,
                color: textTertiary,
                fontFamily: 'monospace',
                marginBottom: 24,
              }}
            >
              Error reference: {error.digest}
            </p>
          ) : null}
          <div
            style={{
              display: 'flex',
              gap: 12,
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            <button
              type='button'
              onClick={reset}
              style={{
                padding: '10px 20px',
                fontSize: 14,
                fontWeight: 600,
                color: inverseText,
                backgroundColor: primary,
                border: 'none',
                borderRadius: 10,
                cursor: 'pointer',
              }}
            >
              Try again
            </button>
            <a
              href='/'
              style={{
                padding: '10px 20px',
                fontSize: 14,
                fontWeight: 600,
                color: textPrimary,
                backgroundColor: surface,
                border: `1px solid ${border}`,
                borderRadius: 10,
                textDecoration: 'none',
              }}
            >
              Go home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
