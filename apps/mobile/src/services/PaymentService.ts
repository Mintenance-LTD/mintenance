import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';
import { config } from '../config/environment';
import {
  confirmPayment as stripeConfirmPayment,
  createPaymentMethod as stripeCreatePaymentMethod,
} from '@stripe/stripe-react-native';
interface EscrowTransactionRow {
  id: string;
  job_id: string;
  homeowner_id: string;
  contractor_id: string;
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'disputed';
  stripe_payment_intent_id: string | null;
  stripe_transfer_id: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  refunded_at: string | null;
  dispute_reason: string | null;
  platform_fee: number | null;
  contractor_payout: number | null;
}

interface PaymentMethod {
  id: string;
  type: string;
  card?: {
    brand: string;
    last4: string;
    expiryMonth: number;
    expiryYear: number;
  };
  isDefault: boolean;
  createdAt: string;
}

interface CreatePaymentIntentResponse {
  clientSecret?: string;
  error?: string;
}

interface CreateSetupIntentResponse {
  setupIntentClientSecret?: string;
  error?: string;
}

export class PaymentService {
  /**
   * Get authenticated session token for API requests
   */
  private static async getAuthToken(): Promise<string> {
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session?.access_token) {
      throw new Error('Not authenticated');
    }
    return session.session.access_token;
  }

  /**
   * Make an authenticated API request
   */
  private static async apiRequest<T>(
    path: string,
    options: { method: string; body?: Record<string, unknown> }
  ): Promise<T> {
    const token = await PaymentService.getAuthToken();
    const response = await fetch(`${config.apiBaseUrl}${path}`, {
      method: options.method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      ...(options.body ? { body: JSON.stringify(options.body) } : {}),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || `API request failed: ${path}`);
    }
    return data as T;
  }

  /**
   * Initialize a payment by creating a Stripe payment intent
   */
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
      const data = await PaymentService.apiRequest<{ clientSecret: string }>(
        '/api/payments/create-intent',
        {
          method: 'POST',
          body: { amount, jobId, contractorId },
        }
      );

      return { client_secret: data.clientSecret };
    } catch (error) {
      const errorInstance =
        error instanceof Error ? error : new Error(String(error));
      logger.error('Failed to initialize payment', { error: errorInstance });
      throw errorInstance;
    }
  }

  /**
   * Create a payment method using Stripe SDK
   */
  static async createPaymentMethod(params: {
    type: 'card';
    card: {
      number: string;
      expMonth: number;
      expYear: number;
      cvc: string;
    };
    billingDetails?: {
      name?: string;
      email?: string;
    };
  }): Promise<{ id: string; card?: { last4?: string } }> {
    const { expMonth, expYear } = params.card;
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    if (expYear < currentYear || (expYear === currentYear && expMonth < currentMonth)) {
      throw new Error('Card has expired');
    }

    const { paymentMethod, error } = await stripeCreatePaymentMethod({
      paymentMethodType: 'Card',
      card: {
        number: params.card.number,
        expMonth: params.card.expMonth,
        expYear: params.card.expYear,
        cvc: params.card.cvc,
      },
      billingDetails: params.billingDetails,
    });

    if (error || !paymentMethod) {
      throw new Error(error?.message || 'Failed to create payment method');
    }

    return paymentMethod as { id: string; card?: { last4?: string } };
  }

  /**
   * Confirm a payment intent using Stripe SDK
   */
  static async confirmPayment(params: {
    clientSecret: string;
    paymentMethodId: string;
  }): Promise<{ id: string; status: string }> {
    const { paymentIntent, error } = await stripeConfirmPayment(
      params.clientSecret,
      {
        paymentMethodType: 'Card',
        paymentMethodData: {
          paymentMethodId: params.paymentMethodId,
        },
      }
    );

    if (error || !paymentIntent) {
      throw new Error(error?.message || 'Failed to confirm payment');
    }

    return paymentIntent as { id: string; status: string };
  }

  /**
   * Create an escrow transaction record after payment intent creation
   */
  static async createEscrowTransaction(
    jobId: string,
    payerId: string,
    payeeId: string,
    amount: number
  ): Promise<{
    id: string;
    status: string;
    amount: number;
  }> {
    const { data, error } = await supabase
      .from('escrow_transactions')
      .insert({
        job_id: jobId,
        payer_id: payerId,
        payee_id: payeeId,
        amount,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message || 'Failed to create escrow transaction');
    }

    return data as { id: string; status: string; amount: number };
  }

  /**
   * Hold payment in escrow after payment confirmation
   */
  static async holdPaymentInEscrow(
    transactionId: string,
    paymentIntentId: string
  ): Promise<void> {
    const { error } = await supabase
      .from('escrow_transactions')
      .update({
        status: 'held',
        payment_intent_id: paymentIntentId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', transactionId);

    if (error) {
      throw new Error(error.message || 'Failed to hold payment in escrow');
    }
  }

  /**
   * Release escrow payment by transaction id
   */
  static async releaseEscrowPayment(transactionId: string): Promise<void> {
    const { data: transaction, error: transactionError } = await supabase
      .from('escrow_transactions')
      .select('id, amount, payment_intent_id, job:job_id ( contractor_id )')
      .eq('id', transactionId)
      .single();

    if (transactionError || !transaction) {
      throw new Error(transactionError?.message || 'Escrow transaction not found');
    }

    const contractorId = (transaction as Record<string, Record<string, string>>).job?.contractor_id;

    await PaymentService.apiRequest('/api/payments/release-escrow', {
      method: 'POST',
      body: {
        transactionId,
        contractorId,
        amount: (transaction as Record<string, unknown>).amount,
      },
    });

    const { error: updateError } = await supabase
      .from('escrow_transactions')
      .update({
        status: 'released',
        released_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', transactionId);

    if (updateError) {
      throw new Error(updateError.message || 'Failed to update escrow status');
    }
  }

  /**
   * Refund escrow payment by transaction id
   */
  static async refundEscrowPayment(transactionId: string): Promise<void> {
    await PaymentService.apiRequest('/api/payments/refund', {
      method: 'POST',
      body: { transactionId },
    });

    const { error: updateError } = await supabase
      .from('escrow_transactions')
      .update({
        status: 'refunded',
        refunded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', transactionId);

    if (updateError) {
      throw new Error(updateError.message || 'Failed to update escrow status');
    }
  }

  /**
   * Set up contractor payout account
   */
  static async setupContractorPayout(
    contractorId: string
  ): Promise<{ accountUrl: string }> {
    return PaymentService.apiRequest<{ accountUrl: string }>(
      '/api/contractor/payout/setup',
      {
        method: 'POST',
        body: { contractorId },
      }
    );
  }

  /**
   * Get contractor payout account status
   */
  static async getContractorPayoutStatus(contractorId: string): Promise<{
    hasAccount: boolean;
    accountComplete: boolean;
    accountId?: string;
  }> {
    const { data, error } = await supabase
      .from('contractor_payout_accounts')
      .select('contractor_id, stripe_account_id, account_complete')
      .eq('contractor_id', contractorId)
      .single();

    if (error) {
      if ((error as { code?: string }).code === 'PGRST116') {
        return { hasAccount: false, accountComplete: false };
      }
      throw new Error(error.message || 'Failed to fetch payout status');
    }

    return {
      hasAccount: true,
      accountComplete: Boolean((data as Record<string, unknown>).account_complete),
      accountId: (data as Record<string, unknown>).stripe_account_id as string | undefined,
    };
  }

  /**
   * Get user payment history (payer or payee)
   */
  static async getUserPaymentHistory(userId: string): Promise<unknown[]> {
    const { data, error } = await supabase
      .from('escrow_transactions')
      .select(
        `
        *,
        job:job_id ( title ),
        payer:payer_id ( first_name, last_name ),
        payee:payee_id ( first_name, last_name )
      `
      )
      .or(`payer_id.eq.${userId},payee_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Failed to fetch user payment history', { error, userId });
      return [];
    }

    return data || [];
  }

  /**
   * Get escrow transactions for a specific job
   */
  static async getJobEscrowTransactions(jobId: string): Promise<
    (EscrowTransactionRow & { jobId: string })[]
  > {
    const { data, error } = await supabase
      .from('escrow_transactions')
      .select('*')
      .eq('job_id', jobId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Failed to fetch job escrow transactions', { error, jobId });
      return [];
    }

    return (data || []).map((transaction: EscrowTransactionRow) => ({
      ...transaction,
      jobId: transaction.job_id,
    }));
  }

  /**
   * Release escrow payment and update job status
   */
  static async releaseEscrow(params: {
    paymentIntentId: string;
    jobId: string;
    contractorId: string;
    amount: number;
  }): Promise<{ success: boolean; transfer_id?: string }> {
    const data = await PaymentService.apiRequest<{ success: boolean; transfer_id?: string }>(
      '/api/payments/release-escrow',
      { method: 'POST', body: params as unknown as Record<string, unknown> }
    );

    const { error: updateError } = await supabase
      .from('jobs')
      .update({
        status: 'completed',
        payment_released: true,
      })
      .eq('id', params.jobId);

    if (updateError) {
      throw new Error(updateError.message || 'Failed to update job status');
    }

    return data as { success: boolean; transfer_id?: string };
  }

  /**
   * Refund a payment intent
   */
  static async refundPayment(params: {
    paymentIntentId: string;
    amount: number;
    reason: string;
  }): Promise<{ success: boolean; refund_id?: string }> {
    if (!Number.isFinite(params.amount) || params.amount <= 0) {
      throw new Error('Refund amount must be greater than 0');
    }

    return PaymentService.apiRequest<{ success: boolean; refund_id?: string }>(
      '/api/payments/refund',
      {
        method: 'POST',
        body: {
          paymentIntentId: params.paymentIntentId,
          amount: params.amount,
          reason: params.reason,
        },
      }
    );
  }

  /**
   * Calculate platform and Stripe fees for a payment amount
   */
  static calculateFees(amount: number): {
    platformFee: number;
    stripeFee: number;
    contractorAmount: number;
    totalFees: number;
  } {
    const platformRate = 0.05;
    const stripeRate = 0.015; // UK Stripe rate
    const stripeFixed = 0.20; // £0.20 UK fixed fee
    const minPlatformFee = 0.5;
    const maxPlatformFee = 50;

    const rawPlatformFee = amount * platformRate;
    const platformFee = Math.min(
      maxPlatformFee,
      Math.max(minPlatformFee, Number(rawPlatformFee.toFixed(2)))
    );

    const stripeFee = Number((amount * stripeRate + stripeFixed).toFixed(2));
    const totalFees = Number((platformFee + stripeFee).toFixed(2));
    const contractorAmount = Number((amount - totalFees).toFixed(2));

    return {
      platformFee,
      stripeFee,
      contractorAmount,
      totalFees,
    };
  }

  /**
   * Create a payment intent for a job payment
   */
  static async createPaymentIntent(
    jobId: string,
    amount: number,
    paymentMethodId?: string
  ): Promise<CreatePaymentIntentResponse> {
    try {
      // Verify contract is signed before allowing payment
      const { data: contract, error: contractError } = await supabase
        .from('contracts')
        .select('id, status')
        .eq('job_id', jobId)
        .eq('status', 'accepted')
        .single();

      if (contractError || !contract) {
        throw new Error('Contract must be signed by both parties before payment');
      }

      const data = await PaymentService.apiRequest<{ clientSecret: string }>(
        '/api/payments/create-intent',
        {
          method: 'POST',
          body: { jobId, amount, paymentMethodId },
        }
      );

      return { clientSecret: data.clientSecret };
    } catch (error) {
      logger.error('Failed to create payment intent', { error, jobId, amount });
      return { error: error instanceof Error ? error.message : 'Failed to create payment' };
    }
  }

  /**
   * Create a setup intent for adding a new payment method
   */
  static async createSetupIntent(): Promise<CreateSetupIntentResponse> {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error('Not authenticated');
      }

      const data = await PaymentService.apiRequest<{ clientSecret: string }>(
        '/api/payments/create-setup-intent',
        { method: 'POST' }
      );

      return { setupIntentClientSecret: data.clientSecret };
    } catch (error) {
      logger.error('Failed to create setup intent', { error });
      return { error: error instanceof Error ? error.message : 'Failed to setup payment method' };
    }
  }

  /**
   * Save a payment method to the user's account
   */
  static async savePaymentMethod(
    paymentMethodId: string,
    setAsDefault: boolean = false
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${config.apiBaseUrl}/api/payments/add-method`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session.access_token}`,
        },
        body: JSON.stringify({
          paymentMethodId,
          setAsDefault,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save payment method');
      }

      logger.info('Payment method saved successfully', { paymentMethodId });
      return { success: true };
    } catch (error) {
      logger.error('Failed to save payment method', { error, paymentMethodId });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save payment method',
      };
    }
  }

  /**
   * Get user's saved payment methods
   */
  static async getPaymentMethods(): Promise<{
    methods?: PaymentMethod[];
    error?: string;
  }> {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${config.apiBaseUrl}/api/payments/methods`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.session.access_token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch payment methods');
      }

      const methods = (data.paymentMethods || data.methods || []).map((method: {
        id: string;
        type: string;
        isDefault?: boolean;
        created?: number;
        card?: {
          brand: string;
          last4: string;
          expMonth: number;
          expYear: number;
        } | null;
      }) => ({
        id: method.id,
        type: method.type,
        isDefault: !!method.isDefault,
        createdAt: method.created
          ? new Date(method.created * 1000).toISOString()
          : new Date().toISOString(),
        card: method.card
          ? {
              brand: method.card.brand,
              last4: method.card.last4,
              expiryMonth: method.card.expMonth,
              expiryYear: method.card.expYear,
            }
          : undefined,
      })) as PaymentMethod[];

      return { methods };
    } catch (error) {
      logger.error('Failed to fetch payment methods', { error });
      return { error: error instanceof Error ? error.message : 'Failed to fetch payment methods' };
    }
  }

  /**
   * Delete a payment method
   */
  static async deletePaymentMethod(
    paymentMethodId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${config.apiBaseUrl}/api/payments/remove-method`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session.access_token}`,
        },
        body: JSON.stringify({ paymentMethodId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete payment method');
      }

      logger.info('Payment method deleted successfully', { paymentMethodId });
      return { success: true };
    } catch (error) {
      logger.error('Failed to delete payment method', { error, paymentMethodId });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete payment method',
      };
    }
  }

  /**
   * Set a payment method as default
   */
  static async setDefaultPaymentMethod(
    paymentMethodId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${config.apiBaseUrl}/api/payments/set-default`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session.access_token}`,
        },
        body: JSON.stringify({ paymentMethodId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to set default payment method');
      }

      logger.info('Default payment method updated', { paymentMethodId });
      return { success: true };
    } catch (error) {
      logger.error('Failed to set default payment method', { error, paymentMethodId });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to set default payment method',
      };
    }
  }

  /**
   * Process a payment for a job (with 3D Secure support)
   */
  static async processJobPayment(
    jobId: string,
    amount: number,
    paymentMethodId: string,
    saveForFuture: boolean = false
  ): Promise<{
    success: boolean;
    paymentIntentId?: string;
    requiresAction?: boolean;
    clientSecret?: string;
    error?: string;
  }> {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${config.apiBaseUrl}/api/payments/process-job-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session.access_token}`,
        },
        body: JSON.stringify({
          jobId,
          amount,
          paymentMethodId,
          saveForFuture,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process payment');
      }

      // Check if 3D Secure is required
      if (data.requiresAction || data.clientSecret) {
        logger.info('Payment requires 3D Secure authentication', { jobId });
        return {
          success: false,
          requiresAction: true,
          clientSecret: data.clientSecret,
          paymentIntentId: data.paymentIntentId,
        };
      }

      logger.info('Payment processed successfully', { jobId, amount });
      return {
        success: true,
        paymentIntentId: data.paymentIntentId,
      };
    } catch (error) {
      logger.error('Failed to process job payment', { error, jobId, amount });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process payment',
      };
    }
  }

  /**
   * Get payment history for a user
   */
  static async getPaymentHistory(
    userIdOrLimit: string | number = 20,
    statusOrOffset?: string | number,
    offset?: number
  ): Promise<unknown> {
    if (typeof userIdOrLimit === 'string') {
      const userId = userIdOrLimit;
      const status = typeof statusOrOffset === 'string' ? statusOrOffset : undefined;

      const query = supabase
        .from('payments')
        .select('*')
        .eq('user_id', userId);

      if (status) {
        query.eq('status', status);
      }

      const { data, error } = await query.order('created_at', {
        ascending: false,
      });

      if (error) {
        logger.error('Failed to fetch payment history', { error, userId });
        return [];
      }

      return data || [];
    }

    const limit = userIdOrLimit;
    const resolvedOffset = typeof statusOrOffset === 'number' ? statusOrOffset : offset || 0;

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${config.apiBaseUrl}/api/payments/history?limit=${limit}&offset=${resolvedOffset}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.session.access_token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch payment history');
      }

      return {
        payments: data.payments,
        total: data.total,
      };
    } catch (error) {
      logger.error('Failed to fetch payment history', { error });
      return { error: error instanceof Error ? error.message : 'Failed to fetch payment history' };
    }
  }

  /**
   * Request a refund for a payment
   */
  static async requestRefund(
    paymentId: string,
    reason: string
  ): Promise<{ success: boolean; refundId?: string; error?: string }> {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error('Not authenticated');
      }

      const history = await PaymentService.getPaymentHistory(50, 0) as {
        payments?: Array<{ id: string; jobId: string }>;
      };

      const payment = history.payments?.find((entry) => entry.id === paymentId);
      if (!payment?.jobId) {
        throw new Error('Payment record not found');
      }

      const response = await fetch(`${config.apiBaseUrl}/api/payments/refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session.access_token}`,
        },
        body: JSON.stringify({
          jobId: payment.jobId,
          escrowTransactionId: paymentId,
          reason,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to request refund');
      }

      logger.info('Refund requested successfully', { paymentId, refundId: data.refundId || data.id });
      return {
        success: true,
        refundId: data.refundId || data.id || paymentId,
      };
    } catch (error) {
      logger.error('Failed to request refund', { error, paymentId });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to request refund',
      };
    }
  }
}
