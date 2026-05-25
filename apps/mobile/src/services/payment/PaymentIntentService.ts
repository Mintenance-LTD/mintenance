import { supabase } from '../../config/supabase';
import { logger } from '../../utils/logger';
import { apiRequest } from './apiHelper';
import type {
  CreatePaymentIntentResponse,
  CreateSetupIntentResponse,
} from './types';

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
      if (!isTransientError(lastError) || attempt === maxAttempts)
        throw lastError;
      await new Promise((r) =>
        setTimeout(r, delayMs * Math.pow(2, attempt - 1))
      );
      logger.warn(
        'PaymentIntentService',
        `Retry attempt ${attempt}: ${lastError.message}`
      );
    }
  }
  throw lastError!;
}

function isTransientError(error: Error): boolean {
  const msg = error.message.toLowerCase();
  return (
    msg.includes('network') ||
    msg.includes('timeout') ||
    msg.includes('502') ||
    msg.includes('503') ||
    msg.includes('429')
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
    if (amount > 100000) {
      throw new Error('Amount cannot exceed £100,000');
    }

    try {
      const data = await withRetry(() =>
        apiRequest<{ clientSecret: string }>('/api/payments/create-intent', {
          method: 'POST',
          body: { amount, jobId, contractorId },
        })
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
    paymentMethodId?: string,
    contractorId?: string
  ): Promise<CreatePaymentIntentResponse> {
    try {
      const { data: contract, error: contractError } = await supabase
        .from('contracts')
        .select('id, status')
        .eq('job_id', jobId)
        .eq('status', 'accepted')
        .single();

      if (contractError || !contract) {
        throw new Error(
          'Contract must be signed by both parties before payment'
        );
      }

      // 2026-05-23 audit-19 P1: paymentIntentSchema marks contractorId
      // as required. The previous body (jobId/amount/paymentMethodId only)
      // hit the validator 400 before any Stripe call, so the escrow funding
      // step silently failed at the API boundary. The caller already has
      // contractorId in scope (usePayment options) — thread it through so
      // the server can resolve payee_id without re-querying jobs.
      if (!contractorId) {
        throw new Error('Contractor ID is required to fund this job');
      }

      // 2026-05-26 audit-53 P1: the server response includes
      // paymentIntentId + escrowTransactionId in addition to
      // clientSecret. usePayment.handlePayment needs paymentIntentId
      // to POST /api/payments/confirm-intent — the route that flips
      // escrow from 'pending' to 'held' (route requires a strict body
      // shape { paymentIntentId, jobId }). Surfacing it from the
      // service is cheaper than re-parsing pi_xxx out of the
      // clientSecret string at the call site.
      const data = await apiRequest<{
        clientSecret: string;
        paymentIntentId?: string;
        escrowTransactionId?: string;
      }>('/api/payments/create-intent', {
        method: 'POST',
        body: { jobId, amount, paymentMethodId, contractorId },
      });

      return {
        clientSecret: data.clientSecret,
        paymentIntentId: data.paymentIntentId,
        escrowTransactionId: data.escrowTransactionId,
      };
    } catch (error) {
      logger.error('Failed to create payment intent', { error, jobId, amount });
      return {
        error:
          error instanceof Error ? error.message : 'Failed to create payment',
      };
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
      return {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to setup payment method',
      };
    }
  }
}
