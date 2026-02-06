'use client';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Payment Successful | Mintenance',
  description: 'Your invoice payment has been processed successfully. View your receipt or return to payments.',
};

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

export default function InvoicePaymentSuccessPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const invoiceId = params.invoiceId as string;
  const paymentIntentId = searchParams.get('payment_intent');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkPaymentStatus = async () => {
      if (!paymentIntentId) {
        setStatus('error');
        setError('Payment intent ID not found');
        return;
      }

      try {
        const response = await fetch(`/api/contractor/invoices/pay?payment_intent=${paymentIntentId}`);
        
        if (!response.ok) {
          throw new Error('Failed to verify payment status');
        }

        const data = await response.json();
        
        if (data.paymentIntent?.status === 'succeeded') {
          setStatus('success');
        } else {
          setStatus('error');
          setError('Payment was not successful');
        }
      } catch (err) {
        setStatus('error');
        setError(err instanceof Error ? err.message : 'Failed to verify payment');
      }
    };

    checkPaymentStatus();
  }, [paymentIntentId]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-teal-600 mx-auto mb-4" />
          <p className="text-gray-600">Verifying payment...</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <p className="font-semibold mb-2">Payment Verification Failed</p>
              <p>{error}</p>
            </AlertDescription>
          </Alert>
          <div className="flex gap-4 justify-center">
            <Button variant="outline" onClick={() => router.back()}>
              Go Back
            </Button>
            <Link href="/payments">
              <Button variant="primary">
                View Payments
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Payment Successful!
          </h1>
          <p className="text-gray-600">
            Your invoice payment has been processed successfully.
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">Invoice ID</span>
            <span className="text-sm font-medium text-gray-900">
              {invoiceId.substring(0, 8)}...
            </span>
          </div>
          {paymentIntentId && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Payment Intent</span>
              <span className="text-sm font-medium text-gray-900">
                {paymentIntentId.substring(0, 8)}...
              </span>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <Link href={`/payments/invoice/${invoiceId}`}>
            <Button variant="primary" fullWidth>
              View Receipt
            </Button>
          </Link>
          <Link href="/payments">
            <Button variant="outline" fullWidth>
              Back to Payments
            </Button>
          </Link>
        </div>

        <p className="text-xs text-gray-500 mt-6">
          A confirmation email has been sent to your registered email address.
        </p>
      </div>
    </div>
  );
}
