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
import { Button } from '@/components/ui/Button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';

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

interface InvoicePaymentClientProps {
  clientSecret: string;
  invoiceId: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
}

function PaymentForm({ 
  invoiceId, 
  invoiceNumber, 
  amount, 
  currency 
}: { 
  invoiceId: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
}) {
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
          return_url: `${window.location.origin}/payments/invoice/${invoiceId}/success`,
        },
        redirect: 'if_required',
      });

      if (confirmError) {
        setError(confirmError.message || 'Payment failed. Please try again.');
        setIsProcessing(false);
      } else {
        // Payment succeeded, redirect to success page
        router.push(`/payments/invoice/${invoiceId}/success`);
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
          marginBottom: theme.spacing[2],
        }}>
          Pay Invoice {invoiceNumber}
        </h2>
        <p style={{
          fontSize: theme.typography.fontSize.lg,
          fontWeight: theme.typography.fontWeight.semibold,
          color: theme.colors.textPrimary,
          marginBottom: theme.spacing[6],
        }}>
          {new Intl.NumberFormat('en-GB', {
            style: 'currency',
            currency: currency.toUpperCase(),
          }).format(amount)}
        </p>

        <div style={{ marginBottom: theme.spacing[6] }}>
          <PaymentElement 
            options={{
              layout: {
                type: 'tabs',
                defaultCollapsed: false,
              },
            }}
          />
        </div>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button
          type="submit"
          disabled={!stripe || isProcessing}
          variant="primary"
          fullWidth
          leftIcon={isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : undefined}
        >
          {isProcessing ? 'Processing...' : `Pay ${new Intl.NumberFormat('en-GB', {
            style: 'currency',
            currency: currency.toUpperCase(),
          }).format(amount)}`}
        </Button>

        <p style={{
          fontSize: theme.typography.fontSize.xs,
          color: theme.colors.textTertiary,
          marginTop: theme.spacing[4],
          textAlign: 'center',
        }}>
          Your payment is secure and encrypted. Powered by Stripe.
        </p>
      </div>
    </form>
  );
}

export function InvoicePaymentClient({
  clientSecret,
  invoiceId,
  invoiceNumber,
  amount,
  currency,
}: InvoicePaymentClientProps) {
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
        <PaymentForm 
          invoiceId={invoiceId}
          invoiceNumber={invoiceNumber}
          amount={amount}
          currency={currency}
        />
      </Elements>
    </div>
  );
}
