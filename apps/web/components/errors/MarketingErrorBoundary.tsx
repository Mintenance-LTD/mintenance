'use client';

/**
 * MarketingErrorBoundary — shared error UI for public/marketing pages.
 *
 * 2026-04-30 audit P1 (Web Error And Loading Boundaries Are Uneven):
 * before this, public pages relied on the generic root `error.tsx`,
 * which doesn't match the marketing/landing visual language and has
 * a "go to dashboard" affordance that's wrong for logged-out users.
 * This boundary keeps the user inside the marketing surface and links
 * them at routes that exist regardless of auth state.
 */
import { useEffect } from 'react';
import Link from 'next/link';
import * as Sentry from '@sentry/nextjs';
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';

interface MarketingErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
  /** Page label for the heading, e.g. "Help Centre" or "Blog". */
  page?: string;
  /** Optional href the secondary "back" button points at. Defaults to `/`. */
  backHref?: string;
  /** Label for the secondary button. Defaults to "Back to home". */
  backLabel?: string;
}

export function MarketingErrorBoundary({
  error,
  reset,
  page,
  backHref = '/',
  backLabel = 'Back to home',
}: MarketingErrorBoundaryProps) {
  useEffect(() => {
    Sentry.captureException(error, {
      tags: {
        errorBoundary: 'marketing',
        page: page ?? 'unknown',
        digest: error.digest,
      },
    });
  }, [error, page]);

  const heading = page
    ? `${page} is having trouble`
    : 'This page is having trouble';

  return (
    <div className='min-h-[60vh] flex items-center justify-center px-4 py-12'>
      <div className='max-w-md w-full bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center'>
        <div className='mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-amber-50 mb-5'>
          <AlertTriangle className='h-7 w-7 text-amber-600' />
        </div>

        <h1 className='text-xl font-semibold text-gray-900 mb-2'>{heading}</h1>
        <p className='text-sm text-gray-600 mb-6'>
          We hit an unexpected error loading this page. Our team has been
          notified — please try again, or head back home.
        </p>

        {error.digest ? (
          <p className='text-[11px] font-mono text-gray-400 mb-6'>
            Error reference: {error.digest}
          </p>
        ) : null}

        <div className='flex flex-col sm:flex-row gap-2 justify-center'>
          <button
            type='button'
            onClick={reset}
            className='inline-flex items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 transition-colors'
          >
            <RefreshCw className='h-4 w-4' />
            Try again
          </button>
          <Link
            href={backHref}
            prefetch={false}
            className='inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors'
          >
            <ArrowLeft className='h-4 w-4' />
            {backLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}
