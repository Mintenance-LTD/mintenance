'use client';

import React, { useEffect, useState } from 'react';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import type { StripeElementsOptions } from '@stripe/stripe-js';
import { StandardCard } from '@/components/ui/StandardCard';
import { Button } from '@/components/ui/Button';
import { Loader2, AlertCircle } from 'lucide-react';
import { getStripeClient } from '@/lib/stripe/elements/client';
import { logger } from '@mintenance/shared';

/**
 * PaymentMethodForm — adds a homeowner's saved payment method using
 * Stripe Elements. Supports cards + BACS Direct Debit.
 *
 * Flow:
 *   1. Mount → POST /api/payments/setup-intent → receive clientSecret
 *   2. Render <Elements> with clientSecret + <PaymentElement>
 *   3. On submit: stripe.confirmSetup() redirects to return_url
 *   4. Stripe webhook (setup_intent.succeeded) persists the payment method
 */
export function PaymentMethodForm() {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/payments/setup-intent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-csrf-token': getCsrfToken(),
          },
        });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok || !data.clientSecret) {
          throw new Error(data.message ?? 'Failed to initialise payment form');
        }
        setClientSecret(data.clientSecret);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <StandardCard>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
        </div>
      </StandardCard>
    );
  }

  if (error || !clientSecret) {
    return (
      <StandardCard>
        <div
          className="flex items-start gap-3 rounded border border-red-300 bg-red-50 p-4 text-sm text-red-900"
          role="alert"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <div>
            <div className="font-medium">Unable to load payment form</div>
            <div className="mt-1">
              {error ?? 'Please try again in a moment.'}
            </div>
          </div>
        </div>
      </StandardCard>
    );
  }

  const options: StripeElementsOptions = {
    clientSecret,
    appearance: {
      theme: 'stripe',
      variables: { colorPrimary: '#0d9488' },
    },
  };

  return (
    <StandardCard>
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-gray-900">
          Add Payment Method
        </h2>
        <Elements stripe={getStripeClient()} options={options}>
          <AddPaymentMethodInner />
        </Elements>
      </div>
    </StandardCard>
  );
}

/** The actual form, rendered inside <Elements> so it can access useStripe/useElements. */
function AddPaymentMethodInner() {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setSubmitError(null);

    const { error: submitErr } = await stripe.confirmSetup({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/account/payment-methods/return`,
      },
    });

    // confirmSetup only returns here on non-redirecting errors
    if (submitErr) {
      logger.warn('Stripe confirmSetup failed', {
        service: 'ui',
        type: submitErr.type,
        code: submitErr.code,
      });
      setSubmitError(submitErr.message ?? 'Could not save payment method');
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement
        options={{
          layout: 'tabs',
        }}
      />
      {submitError && (
        <div
          className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-900"
          role="alert"
        >
          {submitError}
        </div>
      )}
      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => window.history.back()}
          disabled={submitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={!stripe || submitting}>
          {submitting ? 'Saving…' : 'Save payment method'}
        </Button>
      </div>
    </form>
  );
}

function getCsrfToken(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(
    /(?:^|; )(?:__Host-)?csrf-token=([^;]*)/,
  );
  return match ? decodeURIComponent(match[1]) : '';
}
