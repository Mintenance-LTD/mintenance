import { logger } from '@/lib/logger';
import { PaymentValidation } from './PaymentValidation';
import { asError, type StripeBillingDetails } from './types';
import type { PaymentIntent } from '@mintenance/types';

export class PaymentConfirmation {
  /**
   * Confirm payment with Stripe (web-specific implementation)
   */
  static async confirmPayment(params: {
    clientSecret: string;
    paymentElement: unknown;
    returnUrl?: string;
  }): Promise<{ status: PaymentIntent['status']; paymentIntent?: import('./types').StripePaymentIntentPayload }> {
    try {
      const stripeFactory = window.Stripe;
      if (!stripeFactory) {
        throw new Error('Stripe not loaded');
      }

      const stripe = stripeFactory(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements: params.paymentElement,
        clientSecret: params.clientSecret,
        confirmParams: {
          return_url: params.returnUrl ?? `${window.location.origin}/payments/success`,
        },
      });

      if (error?.message) {
        throw new Error(error.message);
      }

      const status = (paymentIntent?.status as PaymentIntent['status'] | undefined) ?? 'succeeded';

      return {
        status,
        paymentIntent: paymentIntent ? { ...paymentIntent, status } : undefined,
      };
    } catch (error) {
      logger.error('Payment confirmation error', error);
      throw asError(error, 'Payment confirmation failed. Please try again or contact support.');
    }
  }

  /**
   * Create payment method (web-specific)
   */
  static async createPaymentMethod(params: {
    type: string;
    card: {
      number: string;
      expMonth: number;
      expYear: number;
      cvc: string;
    };
    billingDetails?: StripeBillingDetails;
  }): Promise<import('@mintenance/types').PaymentMethod> {
    try {
      PaymentValidation.validateCardExpiration(params.card.expMonth, params.card.expYear);

      const stripeFactory = window.Stripe;
      if (!stripeFactory) {
        throw new Error('Stripe not loaded');
      }

      const stripe = stripeFactory(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
      const { paymentMethod, error } = await stripe.createPaymentMethod({
        type: params.type,
        card: {
          number: params.card.number,
          exp_month: params.card.expMonth,
          exp_year: params.card.expYear,
          cvc: params.card.cvc,
        },
        billing_details: params.billingDetails,
      });

      if (error?.message) {
        throw new Error(error.message);
      }

      if (!paymentMethod) {
        throw new Error('Stripe did not return a payment method.');
      }

      return paymentMethod;
    } catch (error) {
      logger.error('Create payment method error', error);
      throw asError(error, 'Failed to create payment method. Ensure Stripe is properly configured.');
    }
  }
}
