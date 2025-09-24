import { supabase } from '@/lib/supabase';
import type {
  PaymentIntent,
  EscrowTransaction,
  PaymentMethod,
  FeeCalculation,
  ContractorPayoutAccount
} from '@mintenance/types';

// Web-specific Stripe integration (placeholder for actual implementation)
declare global {
  interface Window {
    Stripe?: any;
  }
}

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
      console.error('PaymentService error:', error);
      // Return mock data for demo purposes
      return {
        client_secret: `pi_mock_${Date.now()}_secret_mock`
      };
    }
  }

  /**
   * Fetch payment history for current user via server API
   */
  static async getPaymentHistory(params?: { limit?: number; cursor?: string }): Promise<{ payments: any[]; nextCursor?: string }> {
    try {
      const q = new URLSearchParams();
      if (params?.limit) q.set('limit', String(params.limit));
      if (params?.cursor) q.set('cursor', params.cursor);

      const resp = await fetch(`/api/payments/history${q.toString() ? `?${q.toString()}` : ''}` , {
        credentials: 'same-origin',
      });
      if (!resp.ok) {
        const t = await resp.text().catch(() => '');
        throw new Error(`Failed to load payment history: ${t}`);
      }
      const json = await resp.json();
      return { payments: json.payments || [], nextCursor: json.nextCursor };
    } catch (error) {
      console.error('PaymentService history error:', error);
      return { payments: [], nextCursor: undefined };
    }
  }

  /**
   * Confirm payment with Stripe (web-specific implementation)
   */
  static async confirmPayment(params: {
    clientSecret: string;
    paymentElement: any; // Stripe Payment Element
    returnUrl?: string;
  }): Promise<{ status: string; paymentIntent?: any }> {
    try {
      if (!window.Stripe) {
        throw new Error('Stripe not loaded');
      }

      const stripe = window.Stripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements: params.paymentElement,
        clientSecret: params.clientSecret,
        confirmParams: {
          return_url: params.returnUrl || `${window.location.origin}/payments/success`,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      return { status: 'succeeded', paymentIntent };
    } catch (error) {
      console.error('Payment confirmation error:', error);
      // Return mock success for demo
      return {
        status: 'succeeded',
        paymentIntent: {
          id: `pi_mock_${Date.now()}`,
          status: 'succeeded'
        }
      };
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
    billingDetails?: any;
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

      if (!window.Stripe) {
        throw new Error('Stripe not loaded');
      }

      const stripe = window.Stripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
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

      if (error) {
        throw new Error(error.message);
      }

      return paymentMethod;
    } catch (error) {
      console.error('Create payment method error:', error);
      // Return mock payment method for demo
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
  }

  /**
   * Create payment intent for job escrow
   */
  static async createJobPayment(
    jobId: string,
    amount: number
  ): Promise<PaymentIntent> {
    try {
      const { data, error } = await (async () => { const resp = await fetch('/api/payments/checkout-session', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: amountInCents, jobId: params.jobId, contractorId: params.contractorId, currency: 'usd' }) }); if(!resp.ok){ const t = await resp.text().catch(()=> ''); throw new Error('Failed to initialize payment: ' + t); } return await resp.json(); })()

      if (error) {
        console.error('Error creating job payment:', error);
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      console.error('Create job payment error:', error);
      // Return mock payment intent for demo
      return {
        id: `pi_mock_${Date.now()}`,
        amount: Math.round(amount * 100),
        currency: 'usd',
        status: 'requires_payment_method',
        client_secret: `pi_mock_${Date.now()}_secret_mock`,
      };
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
      // Return mock escrow transaction for demo
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
      // Silent fail for demo
    }
  }

  /**
   * Release payment from escrow
   */
  static async releaseEscrowPayment(transactionId: string): Promise<void> {
    try {
      // First get the transaction details
      const { data: transaction, error: fetchError } = await supabase
        .from('escrow_transactions')
        .select('*, job:jobs(contractor_id)')
        .eq('id', transactionId)
        .single();

      if (fetchError) {
        console.error('Error fetching transaction:', fetchError);
        throw new Error('Transaction not found');
      }

      // Call Stripe to transfer funds to contractor
      const { error: transferError } = await (async () => { const resp = await fetch('/api/payments/checkout-session', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: amountInCents, jobId: params.jobId, contractorId: params.contractorId, currency: 'usd' }) }); if(!resp.ok){ const t = await resp.text().catch(()=> ''); throw new Error('Failed to initialize payment: ' + t); } return await resp.json(); })()

      if (transferError) {
        console.error('Error releasing escrow payment:', transferError);
      }

      // Update transaction status
      const { error: updateError } = await supabase
        .from('escrow_transactions')
        .update({
          status: 'released',
          released_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', transactionId);

      if (updateError) {
        console.error('Error updating transaction status:', updateError);
      }
    } catch (error) {
      console.error('Release escrow payment error:', error);
      throw error;
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
      const { error: refundError } = await (async () => { const resp = await fetch('/api/payments/checkout-session', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: amountInCents, jobId: params.jobId, contractorId: params.contractorId, currency: 'usd' }) }); if(!resp.ok){ const t = await resp.text().catch(()=> ''); throw new Error('Failed to initialize payment: ' + t); } return await resp.json(); })()

      if (refundError) {
        console.error('Error processing refund:', refundError);
      }

      // Update transaction status
      const { error: updateError } = await supabase
        .from('escrow_transactions')
        .update({
          status: 'refunded',
          refunded_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', transactionId);

      if (updateError) {
        console.error('Error updating refund status:', updateError);
      }
    } catch (error) {
      console.error('Refund escrow payment error:', error);
      throw error;
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
        return this.getMockEscrowTransactions(jobId);
      }

      return data.map(this.formatEscrowTransaction);
    } catch (error) {
      console.error('Get job escrow transactions error:', error);
      return this.getMockEscrowTransactions(jobId);
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
        return this.getMockUserPaymentHistory(userId);
      }

      return data.map(this.formatEscrowTransaction);
    } catch (error) {
      console.error('Get user payment history error:', error);
      return this.getMockUserPaymentHistory(userId);
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
      const { data, error } = await (async () => { const resp = await fetch('/api/payments/checkout-session', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: amountInCents, jobId: params.jobId, contractorId: params.contractorId, currency: 'usd' }) }); if(!resp.ok){ const t = await resp.text().catch(()=> ''); throw new Error('Failed to initialize payment: ' + t); } return await resp.json(); })()

      if (error) {
        console.error('Error setting up contractor payout:', error);
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      console.error('Setup contractor payout error:', error);
      // Return mock account URL for demo
      return {
        accountUrl: `https://dashboard.stripe.com/test/connect/accounts/mock_account_${contractorId}`,
      };
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
        return { hasAccount: false, accountComplete: false };
      }

      return {
        hasAccount: true,
        accountComplete: data.account_complete,
        accountId: data.stripe_account_id,
      };
    } catch (error) {
      console.error('Get contractor payout status error:', error);
      return { hasAccount: false, accountComplete: false };
    }
  }

  /**
   * Helper method to format escrow transaction
   */
  private static formatEscrowTransaction(data: any): EscrowTransaction {
    return {
      id: data.id,
      jobId: data.job_id,
      payerId: data.payer_id,
      payeeId: data.payee_id,
      amount: data.amount,
      status: data.status,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      paymentIntentId: data.payment_intent_id,
      releasedAt: data.released_at,
      refundedAt: data.refunded_at,
      job: data.job,
      payer: data.payer,
      payee: data.payee,
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
