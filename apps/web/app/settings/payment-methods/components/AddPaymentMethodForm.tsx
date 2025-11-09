'use client';

import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { theme } from '@/lib/theme';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

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

interface AddPaymentMethodFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

function PaymentForm({ onSuccess, onCancel }: AddPaymentMethodFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [setAsDefault, setSetAsDefault] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      setError('Stripe is not loaded. Please refresh the page.');
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setError('Card element not found. Please refresh the page.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Create payment method
      const { paymentMethod, error: pmError } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
      });

      if (pmError) {
        throw new Error(pmError.message || 'Failed to create payment method');
      }

      if (!paymentMethod) {
        throw new Error('Failed to create payment method');
      }

      // Add payment method to user's account
      const response = await fetch('/api/payments/add-method', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentMethodId: paymentMethod.id,
          setAsDefault,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add payment method');
      }

      // Success - reload payment methods
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add payment method');
    } finally {
      setLoading(false);
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: theme.colors.textPrimary,
        fontFamily: 'Inter, system-ui, sans-serif',
        '::placeholder': {
          color: theme.colors.textTertiary,
        },
      },
      invalid: {
        color: theme.colors.error,
        iconColor: theme.colors.error,
      },
    },
    hidePostalCode: false,
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[4] }}>
      {/* Card Element */}
      <div style={{
        padding: theme.spacing[4],
        border: `1px solid ${theme.colors.border}`,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.surface,
      }}>
        <label style={{
          display: 'block',
          marginBottom: theme.spacing[2],
          fontSize: theme.typography.fontSize.sm,
          fontWeight: theme.typography.fontWeight.semibold,
          color: theme.colors.textPrimary,
        }}>
          Card Information
        </label>
        <div style={{ minHeight: '40px' }}>
          <CardElement options={cardElementOptions} />
        </div>
      </div>

      {/* Set as Default Checkbox */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="setAsDefault"
          checked={setAsDefault}
          onCheckedChange={(checked) => setSetAsDefault(checked === true)}
        />
        <Label htmlFor="setAsDefault" className="font-normal cursor-pointer">
          Set as default payment method
        </Label>
      </div>

      {/* Error Message */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Buttons */}
      <div style={{
        display: 'flex',
        gap: theme.spacing[3],
        justifyContent: 'flex-end',
        marginTop: theme.spacing[2],
      }}>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={loading || !stripe}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing[2],
          }}
        >
          {loading ? (
            <>
              <div style={{
                width: '16px',
                height: '16px',
                border: `2px solid ${theme.colors.surface}`,
                borderTop: `2px solid transparent`,
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }} />
              Adding...
            </>
          ) : (
            <>
              <Icon name="check" size={16} />
              Add Payment Method
            </>
          )}
        </Button>
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </form>
  );
}

export function AddPaymentMethodForm({ onSuccess, onCancel }: AddPaymentMethodFormProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div style={{
        padding: theme.spacing[4],
        textAlign: 'center',
        color: theme.colors.textSecondary,
      }}>
        Loading Stripe...
      </div>
    );
  }

  return (
    <Elements stripe={getStripe()}>
      <PaymentForm onSuccess={onSuccess} onCancel={onCancel} />
    </Elements>
  );
}

