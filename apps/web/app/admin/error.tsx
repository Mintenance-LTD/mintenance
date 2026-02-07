'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { AlertTriangle, RefreshCw, Home, Shield, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { logger } from '@/lib/logger';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    // Log the error with CRITICAL priority for admin errors
    logger.error('AdminError', 'CRITICAL: Admin panel error', {
      error: error.message,
      stack: error.stack,
      digest: error.digest,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      severity: 'CRITICAL',
      category: 'admin',
    });

    // Report to Sentry with high priority
    if (typeof window !== 'undefined' && window.Sentry) {
      window.Sentry.captureException(error, {
        tags: {
          page: 'admin',
          errorBoundary: true,
          severity: 'critical',
        },
        level: 'fatal',
        fingerprint: ['admin-error', error.message],
      });
    }
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100">
            <Shield className="h-8 w-8 text-red-600" />
          </div>

          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Admin Panel Error
          </h2>

          <p className="mt-2 text-sm text-gray-600">
            A critical error occurred in the admin panel. This incident has been logged and the security team has been notified.
          </p>

          {error.digest && (
            <p className="mt-2 text-xs text-gray-500">
              Incident ID: {error.digest}
            </p>
          )}

          {/* Security notice */}
          <div className="mt-4 p-4 bg-red-50 rounded-lg text-left">
            <p className="text-sm font-medium text-red-900 mb-2">Security Notice:</p>
            <ul className="list-disc list-inside text-xs text-red-700 space-y-1">
              <li>This error has been logged for security review</li>
              <li>Your session may need to be re-authenticated</li>
              <li>No unauthorized access has occurred</li>
              <li>Admin operations have been temporarily suspended</li>
            </ul>
          </div>

          {/* Possible causes */}
          <div className="mt-4 p-4 bg-yellow-50 rounded-lg text-left">
            <p className="text-sm font-medium text-yellow-900 mb-2">Possible causes:</p>
            <ul className="list-disc list-inside text-xs text-yellow-700 space-y-1">
              <li>Session expired or invalid permissions</li>
              <li>Network security restrictions</li>
              <li>Server maintenance in progress</li>
              <li>Database connection issues</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 space-y-3">
          <Button
            onClick={() => {
              // Clear admin session and re-authenticate
              sessionStorage.clear();
              localStorage.removeItem('admin_token');
              router.push('/admin/login');
            }}
            variant="primary"
            className="w-full flex items-center justify-center"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Re-authenticate
          </Button>

          <Button
            onClick={reset}
            variant="secondary"
            className="w-full flex items-center justify-center"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Try again
          </Button>

          <Button
            onClick={() => router.push('/')}
            variant="outline"
            className="w-full flex items-center justify-center"
          >
            <Home className="mr-2 h-4 w-4" />
            Exit admin panel
          </Button>
        </div>

        <div className="mt-6 border-t pt-6">
          <h3 className="text-sm font-medium text-gray-900">
            Required actions:
          </h3>
          <ol className="mt-2 text-sm text-gray-600 list-decimal list-inside space-y-1">
            <li>Log out and log back in with admin credentials</li>
            <li>Verify your account has admin privileges</li>
            <li>Check system status page for maintenance</li>
            <li>Contact system administrator if issue persists</li>
          </ol>
          <p className="mt-3 text-sm text-gray-600">
            For urgent admin support, contact{' '}
            <a href="mailto:admin@mintenance.com" className="text-blue-600 hover:underline">
              admin@mintenance.com
            </a>
            {' '}with incident ID: <span className="font-mono text-xs">{error.digest}</span>
          </p>
        </div>

        {/* Development error details */}
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-4 p-4 bg-gray-100 rounded-lg">
            <summary className="cursor-pointer text-sm font-medium text-gray-700">
              Error Details (Development Only)
            </summary>
            <div className="mt-2 space-y-2">
              <p className="text-xs font-medium text-gray-600">Error Type:</p>
              <p className="text-xs text-red-600 font-mono">{error.name}</p>
              <p className="text-xs font-medium text-gray-600">Message:</p>
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