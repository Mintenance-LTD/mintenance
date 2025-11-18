'use client';

import React, { useEffect, useState } from 'react';
import { loadStripe, EmbeddedCheckoutProvider, EmbeddedCheckout } from '@stripe/react-stripe-js';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';

// Initialize Stripe promise
let stripePromise: Promise<any> | null = null;

const getStripe = () => {
  if (!stripePromise) {
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!publishableKey) {
      throw new Error('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set');
    }
    stripePromise = loadStripe(publishableKey);
  }
  return stripePromise;
};

interface EmbeddedCheckoutProps {
  priceId: string;
  jobId?: string;
  contractorId?: string;
  quantity?: number;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

/**
 * Embedded Stripe Checkout Component
 * 
 * Displays Stripe's embedded checkout form directly on your page.
 * Use this for one-time payments with a Price ID.
 */
export function EmbeddedCheckoutComponent({
  priceId,
  jobId,
  contractorId,
  quantity = 1,
  onSuccess,
  onError,
}: EmbeddedCheckoutProps): JSX.Element {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchClientSecret(): Promise<void> {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch('/api/payments/embedded-checkout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            priceId,
            jobId,
            contractorId,
            quantity,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to create checkout session');
        }

        const data = await response.json();
        setClientSecret(data.clientSecret);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
        setError(errorMessage);
        onError?.(errorMessage);
      } finally {
        setIsLoading(false);
      }
    }

    fetchClientSecret();
  }, [priceId, jobId, contractorId, quantity, onError]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-sm text-muted-foreground">Loading checkout...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!clientSecret) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>No checkout session available</AlertDescription>
      </Alert>
    );
  }

  const options = {
    clientSecret,
    onComplete: () => {
      onSuccess?.();
    },
  };

  return (
    <div className="w-full">
      <EmbeddedCheckoutProvider
        stripe={getStripe()}
        options={options}
      >
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}

