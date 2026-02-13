'use client';

import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { AlertCircle, Check, Loader2 } from 'lucide-react';

// Initialize Stripe promise
let stripePromise: ReturnType<typeof loadStripe> | null = null;

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

      // Fetch fresh CSRF token before mutation
      const csrfResponse = await fetch('/api/csrf', {
        method: 'GET',
        credentials: 'include',
      });
      if (!csrfResponse.ok) {
        throw new Error('Failed to initialise security token. Please refresh the page.');
      }
      const { token: csrfToken } = await csrfResponse.json();
      // Small delay to ensure cookie is processed by browser
      await new Promise(resolve => setTimeout(resolve, 50));

      // Add payment method to user's account
      const response = await fetch('/api/payments/add-method', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
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
        color: '#111827',
        fontFamily: 'Inter, system-ui, sans-serif',
        '::placeholder': {
          color: '#9CA3AF',
        },
      },
      invalid: {
        color: '#DC2626',
        iconColor: '#DC2626',
      },
    },
    hidePostalCode: false,
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Card Element */}
      <div className="p-4 border border-gray-200 rounded-lg bg-white">
        <label className="block mb-2 text-sm font-semibold text-gray-900">
          Card Information
        </label>
        <div className="min-h-[40px]">
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
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-700 font-medium text-sm">Error</p>
            <p className="text-red-600 text-sm mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Buttons */}
      <div className="flex gap-3 justify-end mt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="px-5 py-2.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading || !stripe}
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Adding...
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              Add Payment Method
            </>
          )}
        </button>
      </div>
    </form>
  );
}

export function AddPaymentMethodForm(props: AddPaymentMethodFormProps) {
  // Defensive prop destructuring with defaults to prevent test crashes
  const {
    onSuccess = () => {},
    onCancel = () => {},
  } = props || {};
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="p-4 text-center text-gray-500">
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
