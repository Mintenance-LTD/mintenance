'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { AlertTriangle, RefreshCw, Home, CreditCard, Shield } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { logger } from '@/lib/logger';

export default function PaymentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    // Log the error with HIGH priority for payment issues
    logger.error('PaymentError', 'CRITICAL: Payment processing error', {
      error: error.message,
      stack: error.stack,
      digest: error.digest,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      severity: 'CRITICAL',
      category: 'payment',
    });

    // Report to Sentry with high priority
    if (typeof window !== 'undefined' && window.Sentry) {
      window.Sentry.captureException(error, {
        tags: {
          page: 'payment',
          errorBoundary: true,
          severity: 'critical',
        },
        level: 'error',
        fingerprint: ['payment-error', error.message],
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
            Payment Error
          </h2>

          <p className="mt-2 text-sm text-gray-600">
            We encountered an error while processing your payment. Your card has not been charged.
          </p>

          {error.digest && (
            <p className="mt-2 text-xs text-gray-500">
              Reference ID: {error.digest}
            </p>
          )}

          {/* Security assurance */}
          <div className="mt-4 p-4 bg-green-50 rounded-lg">
            <div className="flex items-center justify-center text-green-700 mb-2">
              <Shield className="h-5 w-5 mr-2" />
              <span className="text-sm font-medium">Your payment information is secure</span>
            </div>
            <p className="text-xs text-green-600">
              No charges have been made to your account. Your payment information remains encrypted and protected.
            </p>
          </div>

          {/* Common payment error explanations */}
          <div className="mt-4 p-4 bg-blue-50 rounded-lg text-left">
            <p className="text-sm font-medium text-blue-900 mb-2">Common payment issues:</p>
            <ul className="list-disc list-inside text-xs text-blue-700 space-y-1">
              <li>Insufficient funds or credit limit reached</li>
              <li>Card expired or invalid card details</li>
              <li>Payment blocked by your bank</li>
              <li>Network timeout during processing</li>
              <li>Payment gateway temporarily unavailable</li>
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
            Try payment again
          </Button>

          <Button
            onClick={() => router.push('/settings/payment-methods')}
            variant="secondary"
            className="w-full flex items-center justify-center"
          >
            <CreditCard className="mr-2 h-4 w-4" />
            Use different payment method
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
            Payment troubleshooting:
          </h3>
          <ol className="mt-2 text-sm text-gray-600 list-decimal list-inside space-y-1">
            <li>Verify your card details are correct</li>
            <li>Ensure sufficient funds are available</li>
            <li>Contact your bank if the issue persists</li>
            <li>Try an alternative payment method</li>
          </ol>
          <p className="mt-3 text-sm text-gray-600">
            For payment support, contact{' '}
            <a href="mailto:billing@mintenance.com" className="text-blue-600 hover:underline">
              billing@mintenance.com
            </a>
            {' '}with reference ID: <span className="font-mono text-xs">{error.digest}</span>
          </p>
        </div>

        {/* Development error details */}
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