import { supabase } from '../config/supabase';

export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: 'requires_payment_method' | 'requires_confirmation' | 'succeeded' | 'canceled';
  client_secret: string;
}

export interface EscrowTransaction {
  id: string;
  jobId: string;
  payerId: string;
  payeeId: string;
  amount: number;
  status: 'pending' | 'held' | 'released' | 'refunded';
  createdAt: string;
  updatedAt: string;
}

export class PaymentService {
  // Initialize payment with validation
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

    const { data, error } = await supabase.functions.invoke('create-payment-intent', {
      body: params
    });

    if (error) throw new Error(error.message);
    return data;
  }

  // Confirm payment with Stripe
  static async confirmPayment(params: {
    clientSecret: string;
    paymentMethodId: string;
  }): Promise<{ status: string }> {
    const stripe = require('@stripe/stripe-react-native');
    const { paymentIntent, error } = await stripe.confirmPayment(params.clientSecret, {
      paymentMethodType: 'Card',
      paymentMethodData: {
        paymentMethodId: params.paymentMethodId
      }
    });

    if (error) throw new Error(error.message);
    return paymentIntent;
  }

  // Create payment method
  static async createPaymentMethod(params: {
    type: string;
    card: {
      number: string;
      expMonth: number;
      expYear: number;
      cvc: string;
    };
    billingDetails?: any;
  }): Promise<{ id: string; card?: { last4: string } }> {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    
    if (params.card.expYear < currentYear || 
        (params.card.expYear === currentYear && params.card.expMonth < currentMonth)) {
      throw new Error('Card has expired');
    }

    const stripe = require('@stripe/stripe-react-native');
    const { paymentMethod, error } = await stripe.createPaymentMethod(params);

    if (error) throw new Error(error.message);
    return paymentMethod;
  }

  // Release escrow payment
  static async releaseEscrow(params: {
    paymentIntentId: string;
    jobId: string;
    contractorId: string;
    amount: number;
  }): Promise<{ success: boolean; transfer_id?: string }> {
    const { data, error } = await supabase.functions.invoke('release-escrow', {
      body: params
    });

    if (error) throw new Error(error.message);

    // Update job status
    await supabase
      .from('jobs')
      .update({ 
        status: 'completed',
        payment_released: true 
      })
      .eq('id', params.jobId);

    return data;
  }

  // Get payment history
  static async getPaymentHistory(userId: string, status?: string): Promise<any[]> {
    let query = supabase
      .from('payments')
      .select('*')
      .eq('user_id', userId);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  }

  // Process refund
  static async refundPayment(params: {
    paymentIntentId: string;
    amount: number;
    reason: string;
  }): Promise<{ success: boolean; refund_id?: string }> {
    if (params.amount <= 0) {
      throw new Error('Refund amount must be greater than 0');
    }

    const { data, error } = await supabase.functions.invoke('process-refund', {
      body: params
    });

    if (error) throw new Error(error.message);
    return data;
  }

  // Calculate fees
  static calculateFees(amount: number): {
    platformFee: number;
    stripeFee: number;
    contractorAmount: number;
    totalFees: number;
  } {
    let platformFee = Math.max(amount * 0.05, 0.50); // 5% with minimum $0.50
    platformFee = Math.min(platformFee, 50); // Cap at $50

    const stripeFee = Math.round((amount * 0.029 + 0.30) * 100) / 100; // 2.9% + $0.30
    const totalFees = platformFee + stripeFee;
    const contractorAmount = Math.round((amount - totalFees) * 100) / 100;

    return {
      platformFee: Math.round(platformFee * 100) / 100,
      stripeFee,
      contractorAmount,
      totalFees: Math.round(totalFees * 100) / 100
    };
  }

  // Create payment intent for job escrow
  static async createJobPayment(jobId: string, amount: number): Promise<PaymentIntent> {
    const { data, error } = await supabase.functions.invoke('create-payment-intent', {
      body: {
        amount: Math.round(amount * 100), // Convert to cents
        currency: 'usd',
        metadata: {
          jobId,
          type: 'job_payment'
        }
      }
    });

    if (error) throw error;
    return data;
  }

  // Create escrow transaction
  static async createEscrowTransaction(
    jobId: string,
    payerId: string,
    payeeId: string,
    amount: number
  ): Promise<EscrowTransaction> {
    const { data, error } = await supabase
      .from('escrow_transactions')
      .insert([{
        job_id: jobId,
        payer_id: payerId,
        payee_id: payeeId,
        amount,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }])
      .select()
      .single();

    if (error) throw error;
    return this.formatEscrowTransaction(data);
  }

  // Hold payment in escrow
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

    if (error) throw error;
  }

  // Release payment from escrow
  static async releaseEscrowPayment(transactionId: string): Promise<void> {
    // First get the transaction details
    const { data: transaction, error: fetchError } = await supabase
      .from('escrow_transactions')
      .select('*, job:jobs(contractor_id)')
      .eq('id', transactionId)
      .single();

    if (fetchError) throw fetchError;

    // Call Stripe to transfer funds to contractor
    const { error: transferError } = await supabase.functions.invoke('release-escrow-payment', {
      body: {
        transactionId,
        contractorId: transaction.job.contractor_id,
        amount: transaction.amount
      }
    });

    if (transferError) throw transferError;

    // Update transaction status
    const { error: updateError } = await supabase
      .from('escrow_transactions')
      .update({
        status: 'released',
        released_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', transactionId);

    if (updateError) throw updateError;
  }

  // Refund escrow payment
  static async refundEscrowPayment(transactionId: string): Promise<void> {
    const { error: refundError } = await supabase.functions.invoke('refund-escrow-payment', {
      body: { transactionId }
    });

    if (refundError) throw refundError;

    // Update transaction status
    const { error: updateError } = await supabase
      .from('escrow_transactions')
      .update({
        status: 'refunded',
        refunded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', transactionId);

    if (updateError) throw updateError;
  }

  // Get escrow transactions for a job
  static async getJobEscrowTransactions(jobId: string): Promise<EscrowTransaction[]> {
    const { data, error } = await supabase
      .from('escrow_transactions')
      .select('*')
      .eq('job_id', jobId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data.map(this.formatEscrowTransaction);
  }

  // Get user's payment history
  static async getUserPaymentHistory(userId: string): Promise<EscrowTransaction[]> {
    const { data, error } = await supabase
      .from('escrow_transactions')
      .select(`
        *,
        job:jobs(title, description),
        payer:users!escrow_transactions_payer_id_fkey(first_name, last_name),
        payee:users!escrow_transactions_payee_id_fkey(first_name, last_name)
      `)
      .or(`payer_id.eq.${userId},payee_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data.map(this.formatEscrowTransaction);
  }

  // Setup contractor payout account (Stripe Connect)
  static async setupContractorPayout(contractorId: string): Promise<{ accountUrl: string }> {
    const { data, error } = await supabase.functions.invoke('setup-contractor-payout', {
      body: { contractorId }
    });

    if (error) throw error;
    return data;
  }

  // Get contractor payout status
  static async getContractorPayoutStatus(contractorId: string): Promise<{
    hasAccount: boolean;
    accountComplete: boolean;
    accountId?: string;
  }> {
    const { data, error } = await supabase
      .from('contractor_payout_accounts')
      .select('*')
      .eq('contractor_id', contractorId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { hasAccount: false, accountComplete: false };
      }
      throw error;
    }

    return {
      hasAccount: true,
      accountComplete: data.account_complete,
      accountId: data.stripe_account_id,
    };
  }

  // Helper method to format escrow transaction
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
    };
  }
}