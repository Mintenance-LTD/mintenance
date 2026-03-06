import { supabase } from '../../config/supabase';
import { logger } from '../../utils/logger';
import { apiRequest } from './apiHelper';
import type { CreatePaymentIntentResponse, CreateSetupIntentResponse } from './types';

/** Retry API calls on transient network/server errors with exponential backoff. */
async function withRetry<T>(
  operation: () => Promise<T>,
  maxAttempts = 3,
  delayMs = 1000
): Promise<T> {
  let lastError: Error | undefined;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (!isTransientError(lastError) || attempt === maxAttempts) throw lastError;
      await new Promise((r) => setTimeout(r, delayMs * Math.pow(2, attempt - 1)));
      logger.warn('PaymentIntentService', `Retry attempt ${attempt}: ${lastError.message}`);
    }
  }
  throw lastError!;
}

function isTransientError(error: Error): boolean {
  const msg = error.message.toLowerCase();
  return (
    msg.includes('network') || msg.includes('timeout') ||
    msg.includes('502') || msg.includes('503') || msg.includes('429')
  );
}

export class PaymentIntentService {
  static async initializePayment({
    amount,
    jobId,
    contractorId,
  }: {
    amount: number;
    jobId: string;
    contractorId: string;
  }): Promise<{ client_secret: string }> {
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }
    if (amount > 10000) {
      throw new Error('Amount cannot exceed £10,000');
    }

    try {
      const data = await withRetry(() =>
        apiRequest<{ clientSecret: string }>(
          '/api/payments/create-intent',
          { method: 'POST', body: { amount, jobId, contractorId } }
        )
      );
      return { client_secret: data.clientSecret };
    } catch (error) {
      const errorInstance =
        error instanceof Error ? error : new Error(String(error));
      logger.error('Failed to initialize payment', { error: errorInstance });
      throw errorInstance;
    }
  }

  static async createPaymentIntent(
    jobId: string,
    amount: number,
    paymentMethodId?: string
  ): Promise<CreatePaymentIntentResponse> {
    try {
      const { data: contract, error: contractError } = await supabase
        .from('contracts')
        .select('id, status')
        .eq('job_id', jobId)
        .eq('status', 'accepted')
        .single();

      if (contractError || !contract) {
        throw new Error('Contract must be signed by both parties before payment');
      }

      const data = await apiRequest<{ clientSecret: string }>(
        '/api/payments/create-intent',
        { method: 'POST', body: { jobId, amount, paymentMethodId } }
      );

      return { clientSecret: data.clientSecret };
    } catch (error) {
      logger.error('Failed to create payment intent', { error, jobId, amount });
      return { error: error instanceof Error ? error.message : 'Failed to create payment' };
    }
  }

  static async createSetupIntent(): Promise<CreateSetupIntentResponse> {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error('Not authenticated');
      }

      const data = await apiRequest<{ clientSecret: string }>(
        '/api/payments/create-setup-intent',
        { method: 'POST' }
      );

      return { setupIntentClientSecret: data.clientSecret };
    } catch (error) {
      logger.error('Failed to create setup intent', { error });
      return { error: error instanceof Error ? error.message : 'Failed to setup payment method' };
    }
  }
}
