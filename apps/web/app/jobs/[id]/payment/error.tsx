'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { AlertTriangle, RefreshCw, Home, CreditCard } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';

export default function JobPaymentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  const params = useParams();

  useEffect(() => {
    console.error('Job payment error:', error);

    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(error);
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
            Payment error
          </h2>

          <p className="mt-2 text-sm text-gray-600">
            We encountered an error processing your payment. Your card has not been charged. Please try again or contact support.
          </p>

          {error.digest && (
            <p className="mt-2 text-xs text-gray-500">
              Error ID: {error.digest}
            </p>
          )}
        </div>

        <div className="mt-8 space-y-3">
          <Button
            onClick={reset}
            variant="primary"
            className="w-full flex items-center justify-center"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Try again
          </Button>

          <Button
            onClick={() => router.push(`/jobs/${params.id}`)}
            variant="secondary"
            className="w-full flex items-center justify-center"
          >
            <Home className="mr-2 h-4 w-4" />
            Back to job details
          </Button>

          <Button
            onClick={() => router.push('/settings/payment-methods')}
            variant="ghost"
            className="w-full flex items-center justify-center"
          >
            <CreditCard className="mr-2 h-4 w-4" />
            Update payment method
          </Button>
        </div>

        <div className="mt-6 border-t pt-6">
          <h3 className="text-sm font-medium text-gray-900">
            Need help with payment?
          </h3>
          <p className="mt-1 text-sm text-gray-600">
            Contact our support team at{' '}
            <a href="mailto:support@mintenance.com" className="text-blue-600 hover:underline">
              support@mintenance.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
