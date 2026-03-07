'use client';

import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Loader2, Lock } from 'lucide-react';
import { logger } from '@mintenance/shared';
import { getCsrfToken } from '@/lib/csrf-client';

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

    const { error: submitError } = await elements.submit();
    if (submitError) {
      onError(submitError.message || 'Payment validation failed');
      setProcessing(false);
      return;
    }

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

  const fmtGBP = (n: number) =>
    `£${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <PaymentElement
        options={{
          layout: 'tabs',
        }}
      />

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={processing}
            className="px-5 py-3 text-sm font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={processing || !stripe || !elements}
          className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-semibold text-white bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-700 hover:to-teal-600 rounded-xl shadow-lg shadow-teal-500/20 hover:shadow-teal-500/30 transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-none"
        >
          {processing ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Processing payment...
            </>
          ) : (
            <>
              <Lock size={15} />
              Pay {fmtGBP(amount)} securely
            </>
          )}
        </button>
      </div>
    </form>
  );
}

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
            amount: defaultAmount,
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
      colorPrimary: '#0d9488',
      colorBackground: '#ffffff',
      colorText: '#111827',
      colorDanger: '#ef4444',
      fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
      borderRadius: '10px',
      spacingUnit: '4px',
    },
    rules: {
      '.Tab': {
        border: '1px solid #e5e7eb',
        boxShadow: 'none',
      },
      '.Tab--selected': {
        borderColor: '#0d9488',
        boxShadow: '0 0 0 1px #0d9488',
      },
      '.Input': {
        border: '1px solid #e5e7eb',
        boxShadow: 'none',
        padding: '12px',
      },
      '.Input:focus': {
        borderColor: '#0d9488',
        boxShadow: '0 0 0 1px #0d9488',
      },
    },
  };

  if (loadingIntent) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center">
          <Loader2 size={20} className="animate-spin text-teal-600" />
        </div>
        <p className="text-sm text-gray-500">Preparing secure payment form...</p>
      </div>
    );
  }

  if (!clientSecret) return null;

  return (
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
  );
};
