'use client';

import React, { useEffect, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { useRouter } from 'next/navigation';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';

// Initialize Stripe - will be set in component after mount
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

interface SubscriptionCheckoutClientProps {
  clientSecret: string;
  subscriptionId: string;
  planType: string;
}

function CheckoutForm({ subscriptionId, planType }: { subscriptionId: string; planType: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        setError(submitError.message || 'An error occurred');
        setIsProcessing(false);
        return;
      }

      const { error: confirmError } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/contractor/subscription?success=true`,
        },
        redirect: 'if_required',
      });

      if (confirmError) {
        setError(confirmError.message || 'Payment failed. Please try again.');
        setIsProcessing(false);
      } else {
        // Payment succeeded, redirect to subscription page
        router.push('/contractor/subscription?success=true');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: '600px', margin: '0 auto' }}>
      <div style={{
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.xl,
        padding: theme.spacing[6],
        border: `1px solid ${theme.colors.border}`,
        marginBottom: theme.spacing[6],
      }}>
        <h2 style={{
          fontSize: theme.typography.fontSize['2xl'],
          fontWeight: theme.typography.fontWeight.bold,
          color: theme.colors.textPrimary,
          marginBottom: theme.spacing[4],
        }}>
          Complete Your Subscription
        </h2>
        <p style={{
          fontSize: theme.typography.fontSize.base,
          color: theme.colors.textSecondary,
          marginBottom: theme.spacing[6],
        }}>
          Enter your payment details to activate your {planType} plan.
        </p>

        <div style={{ marginBottom: theme.spacing[6] }}>
          <PaymentElement />
        </div>

        {error && (
          <div style={{
            padding: theme.spacing[3],
            backgroundColor: theme.colors.error + '20',
            borderRadius: theme.borderRadius.md,
            marginBottom: theme.spacing[4],
            color: theme.colors.error,
            fontSize: theme.typography.fontSize.sm,
          }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={!stripe || isProcessing}
          style={{
            width: '100%',
            padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
            backgroundColor: isProcessing || !stripe ? theme.colors.border : theme.colors.primary,
            color: theme.colors.white,
            border: 'none',
            borderRadius: theme.borderRadius.md,
            fontSize: theme.typography.fontSize.base,
            fontWeight: theme.typography.fontWeight.semibold,
            cursor: isProcessing || !stripe ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: theme.spacing[2],
            opacity: isProcessing || !stripe ? 0.6 : 1,
          }}
        >
          {isProcessing ? (
            <>
              <Icon name="loader" size={20} color={theme.colors.white} className="animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Icon name="lock" size={20} color={theme.colors.white} />
              Complete Subscription
            </>
          )}
        </button>

        <p style={{
          fontSize: theme.typography.fontSize.xs,
          color: theme.colors.textTertiary,
          marginTop: theme.spacing[4],
          textAlign: 'center',
        }}>
          Your payment is secure and encrypted. You can cancel anytime.
        </p>
      </div>

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </form>
  );
}

export function SubscriptionCheckoutClient({
  clientSecret,
  subscriptionId,
  planType,
}: SubscriptionCheckoutClientProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{
          fontSize: theme.typography.fontSize.base,
          color: theme.colors.textSecondary,
        }}>
          Loading...
        </div>
      </div>
    );
  }

  const options = {
    clientSecret,
    appearance: {
      theme: 'stripe' as const,
    },
  };

  return (
    <div style={{
      minHeight: '100vh',
      padding: theme.spacing[8],
      backgroundColor: theme.colors.backgroundSecondary,
    }}>
      <Elements stripe={getStripe()} options={options}>
        <CheckoutForm subscriptionId={subscriptionId} planType={planType} />
      </Elements>
    </div>
  );
}

