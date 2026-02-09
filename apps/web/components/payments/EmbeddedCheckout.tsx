'use client';

import type { JSX } from 'react';
import React, { useEffect, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from '@stripe/react-stripe-js';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';

// Initialize Stripe promise
let stripePromise: ReturnType<typeof loadStripe> | null = null;

const getStripe = () => {
  if (!stripePromise) {
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!publishableKey) {
      // In test/development without Stripe keys, return null to allow graceful degradation
      if (process.env.NODE_ENV === 'test' || process.env.PLAYWRIGHT_TEST) {
        return null;
      }
      throw new Error('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set');
    }
    stripePromise = loadStripe(publishableKey);
  }
  return stripePromise;
};

interface EmbeddedCheckoutProps {
  priceId: string;
  jobId?: string;
  bidId?: string;
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
  bidId,
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
      // Check if Stripe is available in test environment
      const isTestMode = process.env.NODE_ENV === 'test' || process.env.PLAYWRIGHT_TEST;
      const hasStripeKey = !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

      if (isTestMode && !hasStripeKey) {
        // Test mode without Stripe keys - show helpful message
        setError('Stripe Test Mode: Configure NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY and STRIPE_SECRET_KEY to test payment flow');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Fetch fresh CSRF token before payment mutation
        const csrfRes = await fetch('/api/csrf', { method: 'GET', credentials: 'include' });
        const { token: csrfToken } = csrfRes.ok ? await csrfRes.json() : { token: '' };
        if (csrfToken) await new Promise(r => setTimeout(r, 50));

        const response = await fetch('/api/payments/embedded-checkout', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'x-csrf-token': csrfToken,
          },
          body: JSON.stringify({
            priceId,
            jobId,
            bidId,
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
  }, [priceId, jobId, contractorId, quantity, onError, bidId]);

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

