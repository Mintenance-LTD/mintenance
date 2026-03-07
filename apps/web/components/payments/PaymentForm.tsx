'use client';

import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { ShieldCheck, Loader2, Lock } from 'lucide-react';
import { theme } from '@/lib/theme';
import { logger } from '@mintenance/shared';
import { getCsrfToken } from '@/lib/csrf-client';

// Load Stripe once outside component to avoid recreating on every render
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

interface PaymentFormProps {
  jobId: string;
  contractorId: string;
  jobTitle: string;
  defaultAmount?: number;
  onSuccess: (paymentIntentId: string) => void;
  onError: (error: string) => void;
  onCancel?: () => void;
}

// Inner form rendered inside the Elements provider
function StripeCheckoutForm({
  clientSecret,
  amount,
  onSuccess,
  onError,
  onCancel,
}: {
  clientSecret: string;
  amount: number;
  onSuccess: (paymentIntentId: string) => void;
  onError: (error: string) => void;
  onCancel?: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    setProcessing(true);

    // Trigger Stripe form validation and wallet collection
    const { error: submitError } = await elements.submit();
    if (submitError) {
      onError(submitError.message || 'Payment validation failed');
      setProcessing(false);
      return;
    }

    // Confirm the payment — redirect: 'if_required' avoids full-page redirects for most methods
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      clientSecret,
      confirmParams: {
        return_url: `${window.location.origin}/payments`,
      },
      redirect: 'if_required',
    });

    if (error) {
      logger.error('Stripe confirmPayment error', { error: error.message, code: error.code });
      onError(error.message || 'Payment failed. Please try again.');
      setProcessing(false);
      return;
    }

    if (paymentIntent?.status === 'succeeded') {
      onSuccess(paymentIntent.id);
    } else {
      onError('Payment was not completed. Please try again.');
    }

    setProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div
        style={{
          backgroundColor: theme.colors.background,
          border: `1px solid ${theme.colors.border}`,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.lg,
          marginBottom: theme.spacing.lg,
        }}
      >
        {/* Stripe's PaymentElement renders card, Apple Pay, Google Pay, Link, etc. */}
        <PaymentElement
          options={{
            layout: 'tabs',
          }}
        />
      </div>

      {/* Actions */}
      <div
        style={{
          display: 'flex',
          gap: theme.spacing.md,
          justifyContent: 'space-between',
        }}
      >
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={processing}
            style={{
              padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
              border: `1px solid ${theme.colors.border}`,
              borderRadius: theme.borderRadius.md,
              background: 'transparent',
              color: theme.colors.textSecondary,
              cursor: processing ? 'not-allowed' : 'pointer',
              fontSize: theme.typography.fontSize.base,
            }}
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={processing || !stripe || !elements}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
            backgroundColor: theme.colors.primary,
            color: '#fff',
            border: 'none',
            borderRadius: theme.borderRadius.md,
            cursor: processing || !stripe ? 'not-allowed' : 'pointer',
            fontSize: theme.typography.fontSize.base,
            fontWeight: theme.typography.fontWeight.semibold,
            opacity: processing || !stripe ? 0.7 : 1,
          }}
        >
          {processing ? (
            <>
              <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
              Processing...
            </>
          ) : (
            <>
              <Lock size={16} />
              Pay £{amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </>
          )}
        </button>
      </div>
    </form>
  );
}

// Outer component: fetches PaymentIntent clientSecret, then mounts Elements
export const PaymentForm: React.FC<PaymentFormProps> = ({
  jobId,
  contractorId,
  jobTitle,
  defaultAmount = 0,
  onSuccess,
  onError,
  onCancel,
}) => {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loadingIntent, setLoadingIntent] = useState(true);

  // Amount in pence (Stripe uses smallest currency unit)
  const amountInPence = Math.round(defaultAmount * 100);

  useEffect(() => {
    if (!jobId || defaultAmount <= 0) return;

    setLoadingIntent(true);

    getCsrfToken()
      .then((csrfToken) =>
        fetch('/api/payments/create-intent', {
          method: 'POST',
          credentials: 'same-origin',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken,
          },
          body: JSON.stringify({
            amount: amountInPence,
            currency: 'gbp',
            jobId,
            contractorId,
          }),
        })
      )
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || 'Failed to initialise payment');
        }
        return res.json();
      })
      .then((data) => {
        if (!data.clientSecret) throw new Error('No client secret returned from server');
        setClientSecret(data.clientSecret);
      })
      .catch((err) => {
        logger.error('Failed to create PaymentIntent', { error: err.message, jobId });
        onError(err.message || 'Failed to initialise payment. Please refresh and try again.');
      })
      .finally(() => setLoadingIntent(false));
  }, [jobId, contractorId, amountInPence]);

  const appearance = {
    theme: 'stripe' as const,
    variables: {
      colorPrimary: '#0d9488', // Mintenance teal
      colorBackground: '#ffffff',
      colorText: '#111827',
      colorDanger: '#ef4444',
      fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
      borderRadius: '12px',
    },
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      {/* Job info header */}
      <div
        style={{
          padding: theme.spacing.md,
          backgroundColor: `${theme.colors.primary}10`,
          border: `1px solid ${theme.colors.primary}30`,
          borderRadius: theme.borderRadius.md,
          marginBottom: theme.spacing.lg,
          fontSize: theme.typography.fontSize.sm,
          color: theme.colors.text,
          fontWeight: theme.typography.fontWeight.medium,
        }}
      >
        Paying for: <strong>{jobTitle}</strong> · £{defaultAmount.toLocaleString()}
      </div>

      {loadingIntent ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            padding: theme.spacing.xl,
            color: theme.colors.textSecondary,
          }}
        >
          <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
          Preparing secure payment form...
        </div>
      ) : clientSecret ? (
        <Elements
          stripe={stripePromise}
          options={{ clientSecret, appearance }}
        >
          <StripeCheckoutForm
            clientSecret={clientSecret}
            amount={defaultAmount}
            onSuccess={onSuccess}
            onError={onError}
            onCancel={onCancel}
          />
        </Elements>
      ) : null}

      {/* Security notice */}
      <div
        style={{
          marginTop: theme.spacing.lg,
          padding: theme.spacing.md,
          backgroundColor: `${theme.colors.success}10`,
          border: `1px solid ${theme.colors.success}`,
          borderRadius: theme.borderRadius.md,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontSize: theme.typography.fontSize.sm,
            color: theme.colors.success,
            fontWeight: theme.typography.fontWeight.medium,
            marginBottom: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
        >
          <ShieldCheck size={16} /> Secure Escrow Payment · Powered by Stripe
        </div>
        <div
          style={{
            fontSize: theme.typography.fontSize.xs,
            color: theme.colors.textSecondary,
          }}
        >
          Your payment is held safely in escrow and released only when the job is completed to your satisfaction.
        </div>
      </div>
    </div>
  );
};
