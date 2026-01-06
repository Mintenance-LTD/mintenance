'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { InvoicePaymentClient } from '@/app/contractor/invoices/components/InvoicePaymentClient';
import { Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PaymentIntentData {
  paymentIntent: {
    id: string;
    clientSecret: string;
    amount: number;
    currency: string;
  };
  invoice: {
    id: string;
    number: string;
    amount: number;
  };
}

export default function InvoicePaymentPage() {
  const params = useParams();
  const router = useRouter();
  const invoiceId = params.invoiceId as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentData, setPaymentData] = useState<PaymentIntentData | null>(null);

  useEffect(() => {
    const initiatePayment = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/contractor/invoices/pay', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            invoiceId,
            returnUrl: `${window.location.origin}/payments/invoice/${invoiceId}/success`,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to initiate payment');
        }

        const data = await response.json();
        setPaymentData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load payment form');
      } finally {
        setLoading(false);
      }
    };

    if (invoiceId) {
      initiatePayment();
    }
  }, [invoiceId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-teal-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading payment form...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <p className="font-semibold mb-2">Payment Error</p>
              <p>{error}</p>
              <button
                onClick={() => router.back()}
                className="mt-4 text-sm underline"
              >
                Go back
              </button>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  if (!paymentData?.paymentIntent?.clientSecret) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Payment intent not found. Please try again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <InvoicePaymentClient
      clientSecret={paymentData.paymentIntent.clientSecret}
      invoiceId={paymentData.invoice.id}
      invoiceNumber={paymentData.invoice.number}
      amount={paymentData.invoice.amount}
      currency={paymentData.paymentIntent.currency}
    />
  );
}
