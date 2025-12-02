'use client';

import React, { useState } from 'react';
import { fadeIn, slideInFromRight } from '@/lib/animations/variants';
import { MotionButton, MotionDiv } from '@/components/ui/MotionDiv';

interface StripePaymentElement2025Props {
  amount: number;
  jobTitle: string;
  onPaymentSuccess: (paymentIntentId: string) => void;
  onPaymentError: (error: string) => void;
}

export function StripePaymentElement2025({
  amount,
  jobTitle,
  onPaymentSuccess,
  onPaymentError,
}: StripePaymentElement2025Props) {
  const [processing, setProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'link' | 'apple' | 'google'>('card');

  // This is a placeholder for Stripe Elements integration
  // In production, you would use @stripe/stripe-js and @stripe/react-stripe-js

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (processing) return;

    setProcessing(true);

    try {
      // Simulate payment processing
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // In production, this would be the actual Stripe Payment Intent ID
      const mockPaymentIntentId = `pi_${Date.now()}`;

      onPaymentSuccess(mockPaymentIntentId);
    } catch (error) {
      onPaymentError(error instanceof Error ? error.message : 'Payment failed');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <MotionDiv
      className="max-w-2xl mx-auto"
      variants={fadeIn}
      initial="initial"
      animate="animate"
    >
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Complete Payment</h1>
        <p className="text-gray-600">Secure payment powered by Stripe</p>
      </div>

      {/* Order Summary */}
      <MotionDiv
        className="bg-gradient-subtle rounded-2xl border border-gray-200 p-6 mb-8"
        variants={slideInFromRight}
        initial="initial"
        animate="animate"
      >
        <h2 className="text-lg font-bold text-gray-900 mb-4">Order Summary</h2>

        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="font-medium text-gray-900">{jobTitle}</p>
              <p className="text-sm text-gray-600">Escrow payment for job completion</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-gray-900">
                ${amount.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-gray-200">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Platform fee (5%)</span>
              <span className="text-gray-900">${(amount * 0.05).toFixed(2)}</span>
            </div>
          </div>

          <div className="pt-3 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold text-gray-900">Total</span>
              <span className="text-2xl font-bold text-gray-900">
                ${(amount * 1.05).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Security Badge */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <svg className="w-5 h-5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>Secured by Stripe • Funds held safely in escrow</span>
          </div>
        </div>
      </MotionDiv>

      {/* Express Checkout Options */}
      <div className="mb-6">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-white text-gray-500">Express checkout</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-4">
          {/* Apple Pay */}
          <MotionButton
            type="button"
            className="flex items-center justify-center gap-2 px-4 py-3 bg-black text-white rounded-xl font-medium hover:bg-gray-900 transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
            </svg>
            <span className="text-sm">Pay</span>
          </MotionButton>

          {/* Google Pay */}
          <MotionButton
            type="button"
            className="flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-gray-300 text-gray-900 rounded-xl font-medium hover:bg-gray-50 transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/>
            </svg>
            <span className="text-sm">Pay</span>
          </MotionButton>

          {/* Link */}
          <MotionButton
            type="button"
            className="flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            <span className="text-sm">Link</span>
          </MotionButton>
        </div>
      </div>

      {/* OR Divider */}
      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-4 bg-white text-gray-500">Or pay with card</span>
        </div>
      </div>

      {/* Payment Form */}
      <form onSubmit={handleSubmit}>
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
          {/* Stripe Payment Element would go here */}
          <div className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                required
                placeholder="you@example.com"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
              />
            </div>

            {/* Card Information */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Card information
              </label>
              <div className="border border-gray-300 rounded-xl overflow-hidden">
                <input
                  type="text"
                  placeholder="1234 1234 1234 1234"
                  className="w-full px-4 py-2.5 border-b border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <div className="grid grid-cols-2">
                  <input
                    type="text"
                    placeholder="MM / YY"
                    className="px-4 py-2.5 border-r border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <input
                    type="text"
                    placeholder="CVC"
                    className="px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
            </div>

            {/* Cardholder name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cardholder name
              </label>
              <input
                type="text"
                required
                placeholder="Full name on card"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
              />
            </div>

            {/* Country */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Country or region
              </label>
              <select className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all">
                <option>United States</option>
                <option>United Kingdom</option>
                <option>Canada</option>
                <option>Australia</option>
              </select>
            </div>
          </div>

          {/* Save card checkbox */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
              />
              <span className="text-sm text-gray-700">
                Save this card for future payments
              </span>
            </label>
          </div>
        </div>

        {/* Submit Button */}
        <MotionButton
          type="submit"
          disabled={processing}
          className="w-full px-6 py-4 bg-teal-600 text-white rounded-xl font-semibold text-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
          whileHover={{ scale: processing ? 1 : 1.02 }}
          whileTap={{ scale: processing ? 1 : 0.98 }}
        >
          {processing ? (
            <span className="flex items-center justify-center gap-3">
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Processing...
            </span>
          ) : (
            `Pay $${(amount * 1.05).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          )}
        </MotionButton>

        {/* Security Info */}
        <div className="mt-6 text-center">
          <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            <span>Your payment information is encrypted and secure</span>
          </div>
        </div>
      </form>
    </MotionDiv>
  );
}
