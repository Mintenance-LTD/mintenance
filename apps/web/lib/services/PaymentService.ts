import { supabase } from '@/lib/supabase';
import type {
  PaymentIntent,
  EscrowTransaction,
  PaymentMethod,
  FeeCalculation
} from '@mintenance/types';

// Web-specific Stripe integration (placeholder for actual implementation)

type StripeBillingAddress = {
  line1?: string;
  city?: string;
  state?: string;
  postal_code?: string;
};

type StripeBillingDetails = {
  name?: string;
  address?: StripeBillingAddress;
};

type StripePaymentIntentPayload = {
  id?: string;
  amount?: number;
  currency?: string;
  status?: string;
  client_secret?: string;
  payment_intent_id?: string;
  [key: string]: unknown;
};

type StripeConfirmResult = {
  error?: { message?: string };
  paymentIntent?: StripePaymentIntentPayload;
};

type StripeCreatePaymentMethodParams = {
  type: string;
  card: {
    number: string;
    exp_month: number;
    exp_year: number;
    cvc: string;
  };
  billing_details?: StripeBillingDetails;
};

type StripeApi = {
  confirmPayment: (options: {
    elements: unknown;
    clientSecret: string;
    confirmParams: { return_url: string };
  }) => Promise<StripeConfirmResult>;
  createPaymentMethod: (params: StripeCreatePaymentMethodParams) => Promise<{
    paymentMethod?: PaymentMethod;
    error?: { message?: string };
  }>;
};

type StripeFactory = (publishableKey: string | undefined) => StripeApi;

type SupabaseUserName = {
  first_name?: string | null;
  last_name?: string | null;
};

type EscrowTransactionRow = {
  id: string;
  job_id: string;
  payer_id: string;
  payee_id: string;
  amount: number;
  status: string;
  created_at: string;
  updated_at: string;
  payment_intent_id?: string | null;
  released_at?: string | null;
  refunded_at?: string | null;
  job?: { title?: string | null; description?: string | null } | null;
  payer?: SupabaseUserName | null;
  payee?: SupabaseUserName | null;
};

declare global {
  interface Window {
    Stripe?: StripeFactory;
  }
}


const shouldUsePaymentMocks = () => (process.env.NEXT_PUBLIC_ENABLE_PAYMENT_MOCKS === 'true' || process.env.NODE_ENV !== 'production');

const asError = (error: unknown, fallbackMessage: string): Error => {
  if (error instanceof Error) {
    return error;
  }
  return new Error(fallbackMessage);
};

export class PaymentService {

  /**
   * Initialize payment with validation
   */
  static async initializePayment(params: {
    amount: number;
    jobId: string;
    contractorId: string;
  }): Promise<{ client_secret: string }> {
    if (params.amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }
    if (params.amount > 10000) {
      throw new Error('Amount cannot exceed $10,000');
    }

    // Stripe expects amounts in the smallest currency unit (cents)
    const amountInCents = Math.round(params.amount * 100);

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
      console.error('PaymentService initializePayment error:', error);
      if (shouldUsePaymentMocks()) {
        return {
          client_secret: `pi_mock_${Date.now()}_secret_mock`,
        };
      }
      throw asError(error, 'Failed to initialize payment session.');
    }
  }

  /**
   * Fetch payment history for current user via server API
   */
  static async getPaymentHistory(params?: { limit?: number; cursor?: string }): Promise<{ payments: EscrowTransaction[]; nextCursor?: string }> {
    try {
      const searchParams = new URLSearchParams();
      if (params?.limit) searchParams.set('limit', String(params.limit));
      if (params?.cursor) searchParams.set('cursor', params.cursor);

      const queryString = searchParams.toString();
      const resp = await fetch(`/api/payments/history${queryString ? `?${queryString}` : ''}`, {
        credentials: 'same-origin',
      });
      if (!resp.ok) {
        const body = await resp.text().catch(() => '');
        throw new Error(`Failed to load payment history: ${body}`);
      }
      const json = (await resp.json()) as { payments?: EscrowTransaction[]; nextCursor?: string };
      return { payments: json.payments ?? [], nextCursor: json.nextCursor };
    } catch (error) {
      console.error('PaymentService history error:', error);
      if (shouldUsePaymentMocks()) {
        return { payments: [], nextCursor: undefined };
      }
      throw asError(error, 'Failed to load payment history.');
    }
  }

  /**
   * Confirm payment with Stripe (web-specific implementation)
   */
  static async confirmPayment(params: {
    clientSecret: string;
    paymentElement: unknown;
    returnUrl?: string;
  }): Promise<{ status: PaymentIntent['status']; paymentIntent?: StripePaymentIntentPayload }> {
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
      console.error('Payment confirmation error:', error);
      if (shouldUsePaymentMocks()) {
        return {
          status: 'succeeded',
          paymentIntent: {
            id: `pi_mock_${Date.now()}`,
            status: 'succeeded',
          },
        };
      }
      throw asError(error, 'Failed to confirm payment with Stripe.');
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
  }): Promise<PaymentMethod> {
    try {
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1;

      if (
        params.card.expYear < currentYear ||
        (params.card.expYear === currentYear &&
          params.card.expMonth < currentMonth)
      ) {
        throw new Error('Card has expired');
      }

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
      console.error('Create payment method error:', error);
      if (shouldUsePaymentMocks()) {
        return {
          id: `pm_mock_${Date.now()}`,
          type: 'card',
          card: {
            brand: 'visa',
            last4: params.card.number.slice(-4),
            exp_month: params.card.expMonth,
            exp_year: params.card.expYear,
          },
          billing_details: params.billingDetails,
        };
      }
      throw asError(error, 'Failed to create payment method.');
    }
  }

  /**
   * Create payment intent for job escrow
   */
  static async createJobPayment(
    jobId: string,
    amount: number
  ): Promise<PaymentIntent> {
    if (amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }

    const amountInCents = Math.round(amount * 100);

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
      const paymentIntent: PaymentIntent = {
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
          : 'requires_payment_method') as PaymentIntent['status'],
        client_secret: typeof intentData['client_secret'] === 'string'
          ? (intentData['client_secret'] as string)
          : '',
      };

      return paymentIntent;
    } catch (error) {
      console.error('Create job payment error:', error);
      if (shouldUsePaymentMocks()) {
        return {
          id: `pi_mock_${Date.now()}`,
          amount: amountInCents,
          currency: 'usd',
          status: 'requires_payment_method',
          client_secret: `pi_mock_${Date.now()}_secret_mock`,
        };
      }
      throw asError(error, 'Failed to create payment intent for this job.');
    }
  }

  /**
   * Create escrow transaction
   */
  static async createEscrowTransaction(
    jobId: string,
    payerId: string,
    payeeId: string,
    amount: number
  ): Promise<EscrowTransaction> {
    try {
      const { data, error } = await supabase
        .from('escrow_transactions')
        .insert([
          {
            job_id: jobId,
            payer_id: payerId,
            payee_id: payeeId,
            amount,
            status: 'pending',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) {
        console.error('Error creating escrow transaction:', error);
        throw new Error('Failed to create escrow transaction');
      }

      return this.formatEscrowTransaction(data);
    } catch (error) {
      console.error('Create escrow transaction error:', error);
      if (shouldUsePaymentMocks()) {
        return {
          id: `escrow_mock_${Date.now()}`,
          jobId,
          payerId,
          payeeId,
          amount,
          status: 'pending',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }
      throw asError(error, 'Failed to create escrow transaction.');
    }
  }

  /**
   * Hold payment in escrow
   */
  static async holdPaymentInEscrow(
    transactionId: string,
    paymentIntentId: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('escrow_transactions')
        .update({
          status: 'held',
          payment_intent_id: paymentIntentId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', transactionId);

      if (error) {
        console.error('Error holding payment in escrow:', error);
        throw new Error('Failed to hold payment in escrow');
      }
    } catch (error) {
      console.error('Hold payment in escrow error:', error);
      if (shouldUsePaymentMocks()) {
        return;
      }
      throw asError(error, 'Failed to hold payment in escrow.');
    }
  }

  /**
   * Release payment from escrow
   */
  static async releaseEscrowPayment(transactionId: string): Promise<void> {
    try {
      const { data: transaction, error: fetchError } = await supabase
        .from('escrow_transactions')
        .select('id, amount, payment_intent_id, job:jobs(contractor_id)')
        .eq('id', transactionId)
        .single()
        .returns<{
          id: string;
          amount: number;
          payment_intent_id: string;
          job: { contractor_id: string } | null;
        }>();

      if (fetchError || !transaction) {
        throw fetchError ?? new Error('Transaction not found');
      }

      if (!transaction.payment_intent_id) {
        throw new Error('No payment intent associated with this transaction');
      }

      const { error: transferError } = await supabase.functions.invoke('release-escrow-payment', {
        body: {
          transactionId,
          paymentIntentId: transaction.payment_intent_id,
          contractorId: transaction.job?.contractor_id ?? null,
          amount: transaction.amount,
        },
      });

      if (transferError) {
        throw transferError;
      }

      const { error: updateError } = await supabase
        .from('escrow_transactions')
        .update({
          status: 'released',
          released_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', transactionId);

      if (updateError) {
        throw updateError;
      }
    } catch (error) {
      console.error('Release escrow payment error:', error);
      throw asError(error, 'Failed to release escrow payment.');
    }
  }

  /**
   * Refund escrow payment
   */
  static async refundEscrowPayment(
    transactionId: string,
    reason: string = 'Refund requested'
  ): Promise<void> {
    try {
      const { error: refundError } = await supabase.functions.invoke('refund-escrow-payment', {
        body: { transactionId, reason },
      });

      if (refundError) {
        throw refundError;
      }

      const { error: updateError } = await supabase
        .from('escrow_transactions')
        .update({
          status: 'refunded',
          refunded_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', transactionId);

      if (updateError) {
        throw updateError;
      }
    } catch (error) {
      console.error('Refund escrow payment error:', error);
      throw asError(error, 'Failed to refund escrow payment.');
    }
  }

  /**
   * Get escrow transactions for a job
   */
  static async getJobEscrowTransactions(
    jobId: string
  ): Promise<EscrowTransaction[]> {
    try {
      const { data, error } = await supabase
        .from('escrow_transactions')
        .select('*')
        .eq('job_id', jobId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching job escrow transactions:', error);
        if (shouldUsePaymentMocks()) {
          return this.getMockEscrowTransactions(jobId);
        }
        throw new Error('Failed to load escrow transactions for this job.');
      }

      return data.map(this.formatEscrowTransaction);
    } catch (error) {
      console.error('Get job escrow transactions error:', error);
      if (shouldUsePaymentMocks()) {
        return this.getMockEscrowTransactions(jobId);
      }
      throw asError(error, 'Failed to load escrow transactions for this job.');
    }
  }

  /**
   * Get user's payment history
   */
  static async getUserPaymentHistory(
    userId: string
  ): Promise<EscrowTransaction[]> {
    try {
      const { data, error } = await supabase
        .from('escrow_transactions')
        .select(
          `
          *,
          job:jobs(title, description),
          payer:users!escrow_transactions_payer_id_fkey(first_name, last_name),
          payee:users!escrow_transactions_payee_id_fkey(first_name, last_name)
        `
        )
        .or(`payer_id.eq.${userId},payee_id.eq.${userId}`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user payment history:', error);
        if (shouldUsePaymentMocks()) {
          return this.getMockUserPaymentHistory(userId);
        }
        throw new Error('Failed to load your payment history.');
      }

      return data.map(this.formatEscrowTransaction);
    } catch (error) {
      console.error('Get user payment history error:', error);
      if (shouldUsePaymentMocks()) {
        return this.getMockUserPaymentHistory(userId);
      }
      throw asError(error, 'Failed to load your payment history.');
    }
  }

  /**
   * Calculate fees
   */
  static calculateFees(amount: number): FeeCalculation {
    let platformFee = Math.max(amount * 0.05, 0.5); // 5% with minimum $0.50
    platformFee = Math.min(platformFee, 50); // Cap at $50

    const stripeFee = Math.round((amount * 0.029 + 0.3) * 100) / 100; // 2.9% + $0.30
    const totalFees = platformFee + stripeFee;
    const contractorAmount = Math.round((amount - totalFees) * 100) / 100;

    return {
      platformFee: Math.round(platformFee * 100) / 100,
      stripeFee,
      contractorAmount,
      totalFees: Math.round(totalFees * 100) / 100,
    };
  }

  /**
   * Setup contractor payout account (Stripe Connect)
   */
  static async setupContractorPayout(
    contractorId: string
  ): Promise<{ accountUrl: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('setup-contractor-payout', {
        body: { contractorId },
      });

      if (error) {
        throw error;
      }

      const payload = (data ?? {}) as Record<string, unknown>;
      const accountUrl = (payload['accountUrl'] ?? payload['url']) as string | undefined;

      if (!accountUrl) {
        throw new Error('Stripe onboarding link was not returned.');
      }

      return { accountUrl };
    } catch (error) {
      console.error('Setup contractor payout error:', error);
      if (shouldUsePaymentMocks()) {
        return {
          accountUrl: `https://dashboard.stripe.com/test/connect/accounts/mock_account_${contractorId}`,
        };
      }
      throw asError(error, 'Failed to create Stripe onboarding link.');
    }
  }

  /**
   * Get contractor payout status
   */
  static async getContractorPayoutStatus(contractorId: string): Promise<{
    hasAccount: boolean;
    accountComplete: boolean;
    accountId?: string;
  }> {
    try {
      const { data, error } = await supabase
        .from('contractor_payout_accounts')
        .select('*')
        .eq('contractor_id', contractorId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return { hasAccount: false, accountComplete: false };
        }
        console.error('Error fetching contractor payout status:', error);
        if (shouldUsePaymentMocks()) {
          return { hasAccount: false, accountComplete: false };
        }
        throw new Error('Failed to load contractor payout status.');
      }

      return {
        hasAccount: true,
        accountComplete: data.account_complete,
        accountId: data.stripe_account_id,
      };
    } catch (error) {
      console.error('Get contractor payout status error:', error);
      if (shouldUsePaymentMocks()) {
        return { hasAccount: false, accountComplete: false };
      }
      throw asError(error, 'Failed to load contractor payout status.');
    }
  }

  /**
   * Helper method to format escrow transaction
   */
  private static formatEscrowTransaction(row: EscrowTransactionRow): EscrowTransaction {
    const toName = (value?: SupabaseUserName | null) => ({
      first_name: value?.first_name ?? '',
      last_name: value?.last_name ?? '',
    });

    return {
      id: row.id,
      jobId: row.job_id,
      payerId: row.payer_id,
      payeeId: row.payee_id,
      amount: row.amount,
      status: (row.status as EscrowTransaction['status']) ?? 'pending',
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      paymentIntentId: row.payment_intent_id ?? undefined,
      releasedAt: row.released_at ?? undefined,
      refundedAt: row.refunded_at ?? undefined,
      job: row.job
        ? {
            title: row.job.title ?? '',
            description: row.job.description ?? '',
          }
        : undefined,
      payer: row.payer ? toName(row.payer) : undefined,
      payee: row.payee ? toName(row.payee) : undefined,
    };
  }

  /**
   * Mock escrow transactions for demo
   */
  private static getMockEscrowTransactions(jobId: string): EscrowTransaction[] {
    return [
      {
        id: 'escrow_1',
        jobId,
        payerId: 'homeowner_1',
        payeeId: 'contractor_1',
        amount: 250.00,
        status: 'held',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 86400000).toISOString(),
        paymentIntentId: 'pi_mock_12345',
      },
    ];
  }

  /**
   * Mock user payment history for demo
   */
  private static getMockUserPaymentHistory(userId: string): EscrowTransaction[] {
    return [
      {
        id: 'escrow_history_1',
        jobId: 'job_1',
        payerId: userId,
        payeeId: 'contractor_1',
        amount: 250.00,
        status: 'released',
        createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 86400000).toISOString(),
        releasedAt: new Date(Date.now() - 86400000).toISOString(),
        job: {
          title: 'Kitchen Sink Repair',
          description: 'Fix leaking kitchen sink',
        },
        payer: {
          first_name: 'John',
          last_name: 'Doe',
        },
        payee: {
          first_name: 'Jane',
          last_name: 'Smith',
        },
      },
      {
        id: 'escrow_history_2',
        jobId: 'job_2',
        payerId: userId,
        payeeId: 'contractor_2',
        amount: 500.00,
        status: 'held',
        createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
        job: {
          title: 'Electrical Panel Upgrade',
          description: 'Upgrade main electrical panel',
        },
        payer: {
          first_name: 'John',
          last_name: 'Doe',
        },
        payee: {
          first_name: 'Mike',
          last_name: 'Johnson',
        },
      },
    ];
  }
}
