import { logger } from '@/lib/logger';
import { supabase } from '@/lib/supabase';
import { PaymentValidation } from './PaymentValidation';
import { asError } from './types';

export class PaymentInitialization {
  /**
   * Initialize payment with validation
   */
  static async initializePayment(params: {
    amount: number;
    jobId: string;
    contractorId: string;
  }): Promise<{ client_secret: string }> {
    PaymentValidation.validateAmount(params.amount);
    const amountInCents = PaymentValidation.amountToCents(params.amount);

    try {
      const resp = await fetch('/api/payments/checkout-session', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amountInCents,
          jobId: params.jobId,
          contractorId: params.contractorId,
          currency: 'usd',
        }),
      });

      if (!resp.ok) {
        const message = await resp.text().catch(() => '');
        throw new Error(`Failed to initialize payment: ${message}`);
      }

      return await resp.json();
    } catch (error) {
      logger.error('PaymentService initializePayment error', error);
      throw asError(error, 'Failed to initialize payment session. Ensure Stripe is properly configured.');
    }
  }

  /**
   * Create payment intent for job escrow
   */
  static async createJobPayment(
    jobId: string,
    amount: number
  ): Promise<import('@mintenance/types').PaymentIntent> {
    PaymentValidation.validateAmount(amount);
    const amountInCents = PaymentValidation.amountToCents(amount);

    try {
      const { data, error } = await supabase.functions.invoke('create-payment-intent', {
        body: {
          amount: amountInCents,
          currency: 'usd',
          metadata: {
            jobId,
            type: 'job_payment',
          },
        },
      });

      if (error) {
        throw error;
      }

      const intentData = (data ?? {}) as Record<string, unknown>;
      const paymentIntent: import('@mintenance/types').PaymentIntent = {
        id: typeof intentData['id'] === 'string'
          ? (intentData['id'] as string)
          : typeof intentData['payment_intent_id'] === 'string'
            ? String(intentData['payment_intent_id'])
            : `pi_temp_${Date.now()}`,
        amount: typeof intentData['amount'] === 'number'
          ? (intentData['amount'] as number)
          : amountInCents,
        currency: typeof intentData['currency'] === 'string'
          ? (intentData['currency'] as string)
          : 'usd',
        status: (typeof intentData['status'] === 'string'
          ? intentData['status']
          : 'requires_payment_method') as import('@mintenance/types').PaymentIntent['status'],
        client_secret: typeof intentData['client_secret'] === 'string'
          ? (intentData['client_secret'] as string)
          : '',
      };

      return paymentIntent;
    } catch (error) {
      logger.error('Create job payment error', error);
      throw asError(error, 'Failed to create payment intent for this job. Please ensure payment service is properly configured.');
    }
  }
}
