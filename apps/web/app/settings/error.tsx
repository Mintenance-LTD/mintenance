'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { AlertTriangle, RefreshCw, Home, Settings, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { logger } from '@/lib/logger';

export default function SettingsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    // Log the error
    logger.error('SettingsError', 'Settings page error', {
      error: error.message,
      stack: error.stack,
      digest: error.digest,
      url: window.location.href,
      timestamp: new Date().toISOString(),
    });

    // Report to Sentry
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(error, {
        tags: {
          page: 'settings',
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
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-yellow-100">
            <Settings className="h-8 w-8 text-yellow-600" />
          </div>

          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Settings Error
          </h2>

          <p className="mt-2 text-sm text-gray-600">
            We couldn't load your settings. Your preferences are safe and haven't been changed.
          </p>

          {error.digest && (
            <p className="mt-2 text-xs text-gray-500">
              Error ID: {error.digest}
            </p>
          )}

          {/* Settings error info */}
          <div className="mt-4 p-4 bg-blue-50 rounded-lg text-left">
            <p className="text-sm font-medium text-blue-900 mb-2">What this means:</p>
            <ul className="list-disc list-inside text-xs text-blue-700 space-y-1">
              <li>Your current settings remain unchanged</li>
              <li>This is likely a temporary loading issue</li>
              <li>No data has been lost or modified</li>
              <li>You can try again safely</li>
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
            Reload settings
          </Button>

          <Button
            onClick={() => router.push('/profile')}
            variant="secondary"
            className="w-full flex items-center justify-center"
          >
            <User className="mr-2 h-4 w-4" />
            Go to profile
          </Button>

          <Button
            onClick={() => router.push('/dashboard')}
            variant="outline"
            className="w-full flex items-center justify-center"
          >
            <Home className="mr-2 h-4 w-4" />
            Return to dashboard
          </Button>
        </div>

        <div className="mt-6 border-t pt-6">
          <h3 className="text-sm font-medium text-gray-900">
            Troubleshooting:
          </h3>
          <ol className="mt-2 text-sm text-gray-600 list-decimal list-inside space-y-1">
            <li>Check if you're logged in</li>
            <li>Refresh your browser</li>
            <li>Clear cookies for this site</li>
            <li>Try using a different browser</li>
          </ol>
          <p className="mt-3 text-sm text-gray-600">
            Need assistance? Email{' '}
            <a href="mailto:support@mintenance.com" className="text-blue-600 hover:underline">
              support@mintenance.com
            </a>
          </p>
        </div>

        {/* Development error details */}
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-4 p-4 bg-gray-100 rounded-lg">
            <summary className="cursor-pointer text-sm font-medium text-gray-700">
              Error Details (Development Only)
            </summary>
            <pre className="mt-2 text-xs text-red-600 overflow-auto max-h-40">
              {error.stack}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}