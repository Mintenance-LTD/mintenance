'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { AlertTriangle, RefreshCw, Home, Briefcase } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { logger } from '@/lib/logger';

export default function ContractorDashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    logger.error('ContractorDashboardError', 'Contractor dashboard loading error', {
      error: error.message,
      stack: error.stack,
      digest: error.digest,
      url: typeof window !== 'undefined' ? window.location.href : '',
      timestamp: new Date().toISOString(),
      category: 'contractor-dashboard',
    });

    if (typeof window !== 'undefined' && window.Sentry) {
      window.Sentry.captureException(error, {
        tags: {
          page: 'contractor-dashboard-enhanced',
          errorBoundary: true,
        },
        level: 'error',
      });
    }
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>

          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Dashboard Error
          </h2>

          <p className="mt-2 text-sm text-gray-600">
            We could not load your contractor dashboard. Your jobs and earnings data are safe.
          </p>

          {error.digest && (
            <p className="mt-2 text-xs text-gray-500">
              Error ID: {error.digest}
            </p>
          )}

          <div className="mt-4 p-4 bg-blue-50 rounded-lg text-left">
            <p className="text-sm font-medium text-blue-900 mb-2">Possible causes:</p>
            <ul className="list-disc list-inside text-xs text-blue-700 space-y-1">
              <li>Temporary network connectivity issue</li>
              <li>Dashboard data is being updated</li>
              <li>Session expired - you may need to log in again</li>
              <li>Server maintenance in progress</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 space-y-3">
          <Button
            onClick={reset}
            variant="primary"
            className="w-full flex items-center justify-center"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Reload dashboard
          </Button>

          <Button
            onClick={() => router.push('/contractor/jobs-near-you')}
            variant="secondary"
            className="w-full flex items-center justify-center"
          >
            <Briefcase className="mr-2 h-4 w-4" />
            Browse available jobs
          </Button>

          <Button
            onClick={() => router.push('/dashboard')}
            variant="outline"
            className="w-full flex items-center justify-center"
          >
            <Home className="mr-2 h-4 w-4" />
            Return to main dashboard
          </Button>
        </div>

        <div className="mt-6 border-t pt-6">
          <h3 className="text-sm font-medium text-gray-900">
            Troubleshooting:
          </h3>
          <ol className="mt-2 text-sm text-gray-600 list-decimal list-inside space-y-1">
            <li>Refresh the page</li>
            <li>Check your internet connection</li>
            <li>Log out and log back in</li>
            <li>Clear your browser cache</li>
          </ol>
          <p className="mt-3 text-sm text-gray-600">
            Need help? Contact{' '}
            <a href="mailto:support@mintenance.com" className="text-blue-600 hover:underline">
              support@mintenance.com
            </a>
          </p>
        </div>

        {process.env.NODE_ENV === 'development' && (
          <details className="mt-4 p-4 bg-gray-100 rounded-lg">
            <summary className="cursor-pointer text-sm font-medium text-gray-700">
              Error Details (Development Only)
            </summary>
            <div className="mt-2 space-y-2">
              <p className="text-xs font-medium text-gray-600">Error Message:</p>
              <p className="text-xs text-red-600 font-mono">{error.message}</p>
              <p className="text-xs font-medium text-gray-600 mt-2">Stack Trace:</p>
              <pre className="text-xs text-red-600 overflow-auto max-h-40">
                {error.stack}
              </pre>
            </div>
          </details>
        )}
      </div>
    </div>
  );
}
