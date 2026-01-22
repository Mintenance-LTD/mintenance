/**
 * Payment Service - Core payment business logic
 */
import { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@mintenance/shared';

// Mock Stripe types
interface Stripe {
  paymentIntents: {
    create(params: any): Promise<any>;
    retrieve(id: string): Promise<any>;
    confirm(id: string, params: any): Promise<any>;
    update(id: string, params: any): Promise<any>;
  };
  customers: {
    create(params: any): Promise<any>;
    retrieve(id: string): Promise<any>;
  };
  checkout: {
    sessions: {
      create(params: any): Promise<any>;
      retrieve(id: string): Promise<any>;
    };
  };
}
export interface PaymentServiceConfig {
  stripe: Stripe;
  supabase: SupabaseClient;
  webhookSecret: string;
}
export interface CreatePaymentIntentParams {
  jobId: string;
  bidId?: string;
  amount: number;
  paymentMethodId?: string;
  userId: string;
  customerEmail: string;
  metadata?: Record<string, string>;
}
export interface PaymentIntent {
  paymentIntentId: string;
  clientSecret: string;
  amount: number;
  status: string;
  metadata: Record<string, string>;
}
export interface ConfirmPaymentParams {
  paymentIntentId: string;
  paymentMethodId?: string;
  userId: string;
}
export interface PaymentHistoryParams {
  userId: string;
  jobId?: string | null;
  limit: number;
  offset: number;
}
export class PaymentService {
  private stripe: Stripe;
  private supabase: SupabaseClient;
  private config: PaymentServiceConfig;
  constructor(config: PaymentServiceConfig) {
    this.config = config;
    this.stripe = config.stripe;
    this.supabase = config.supabase;
  }
  /**
   * Create a payment intent for a job/bid
   */
  async createPaymentIntent(params: CreatePaymentIntentParams): Promise<PaymentIntent> {
    const {
      jobId,
      bidId,
      amount,
      paymentMethodId,
      userId,
      customerEmail,
      metadata = {}
    } = params;
    // Validate job exists and user has permission
    const job = await this.validateJobPayment(jobId, userId);
    // Get or create Stripe customer
    const customer = await this.getOrCreateCustomer(userId, customerEmail);
    // Calculate platform fee (10%)
    const platformFee = Math.round(amount * 0.1);
    const applicationFeeAmount = Math.max(platformFee, 50); // Minimum 50 cents
    // Create payment intent with escrow metadata
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      customer: customer.id,
      payment_method: paymentMethodId,
      confirmation_method: 'manual',
      capture_method: 'manual', // Hold funds in escrow
      application_fee_amount: applicationFeeAmount,
      metadata: {
        jobId,
        bidId: bidId || '',
        userId,
        type: 'job_payment',
        ...metadata
      },
      description: `Payment for job: ${job.title}`,
      statement_descriptor: 'MINTENANCE',
    });
    // Store payment intent in database
    await this.storePaymentIntent({
      id: paymentIntent.id,
      job_id: jobId,
      bid_id: bidId,
      user_id: userId,
      amount: amount,
      status: paymentIntent.status,
      metadata: paymentIntent.metadata,
      created_at: new Date().toISOString(),
    });
    logger.info('Payment intent created', {
      paymentIntentId: paymentIntent.id,
      jobId,
      amount,
      userId
    });
    return {
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      amount: amount,
      status: paymentIntent.status,
      metadata: paymentIntent.metadata,
    };
  }
  /**
   * Confirm a payment intent
   */
  async confirmPayment(params: ConfirmPaymentParams): Promise<any> {
    const { paymentIntentId, paymentMethodId, userId } = params;
    // Retrieve payment intent
    const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
    // Verify ownership
    if (paymentIntent.metadata.userId !== userId) {
      throw new Error('Unauthorized to confirm this payment');
    }
    // Confirm the payment
    const confirmed = await this.stripe.paymentIntents.confirm(paymentIntentId, {
      payment_method: paymentMethodId || paymentIntent.payment_method,
    });
    // Update database
    await this.updatePaymentStatus(paymentIntentId, confirmed.status);
    // If payment requires capture (escrow), don't capture yet
    if (confirmed.status === 'requires_capture') {
      await this.createEscrowRecord({
        payment_intent_id: paymentIntentId,
        job_id: paymentIntent.metadata.jobId,
        amount: paymentIntent.amount / 100,
        status: 'held',
        created_at: new Date().toISOString(),
      });
    }
    logger.info('Payment confirmed', {
      paymentIntentId,
      status: confirmed.status,
      userId
    });
    return {
      status: confirmed.status,
      paymentId: confirmed.id,
      requiresCapture: confirmed.status === 'requires_capture',
    };
  }
  /**
   * Get payment history for a user
   */
  async getPaymentHistory(params: PaymentHistoryParams): Promise<any> {
    const { userId, jobId, limit, offset } = params;
    // Build query
    let query = this.supabase
      .from('payments')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (jobId) {
      query = query.eq('job_id', jobId);
    }
    const { data, count, error } = await query;
    if (error) {
      logger.error('Failed to fetch payment history', { error });
      throw new Error('Failed to fetch payment history');
    }
    return {
      payments: data || [],
      total: count || 0,
      hasMore: (count || 0) > offset + limit,
    };
  }
  /**
   * Create a Stripe Checkout session
   */
  async createCheckoutSession(params: any): Promise<any> {
    const {
      jobId,
      amount,
      userId,
      customerEmail,
      successUrl,
      cancelUrl,
    } = params;
    // Validate job
    const job = await this.validateJobPayment(jobId, userId);
    // Get or create customer
    const customer = await this.getOrCreateCustomer(userId, customerEmail);
    // Create checkout session
    const session = await this.stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Job Payment: ${job.title}`,
              description: job.description || 'Property maintenance job',
            },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl || `${process.env.NEXT_PUBLIC_APP_URL}/payments/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${process.env.NEXT_PUBLIC_APP_URL}/payments/cancel`,
      payment_intent_data: {
        capture_method: 'manual', // For escrow
        metadata: {
          jobId,
          userId,
          type: 'job_payment',
        },
      },
      expires_at: Math.floor(Date.now() / 1000) + (30 * 60), // 30 minutes
    });
    logger.info('Checkout session created', {
      sessionId: session.id,
      jobId,
      amount,
      userId
    });
    return {
      id: session.id,
      url: session.url,
      expiresAt: new Date(session.expires_at * 1000).toISOString(),
    };
  }
  /**
   * Calculate and validate payment amount
   */
  async calculatePaymentAmount(jobId: string, bidId?: string): Promise<number> {
    // Get job details
    const { data: job } = await this.supabase
      .from('jobs')
      .select('budget, budget_min, budget_max')
      .eq('id', jobId)
      .single();
    if (!job) {
      throw new Error('Job not found');
    }
    // If bid specified, use bid amount
    if (bidId) {
      const { data: bid } = await this.supabase
        .from('bids')
        .select('amount')
        .eq('id', bidId)
        .single();
      if (!bid) {
        throw new Error('Bid not found');
      }
      return bid.amount;
    }
    // Otherwise use job budget
    return job.budget || ((job.budget_min + job.budget_max) / 2);
  }
  // ============= Private Helper Methods =============
  private async validateJobPayment(jobId: string, userId: string): Promise<any> {
    const { data: job } = await this.supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single();
    if (!job) {
      throw new Error('Job not found');
    }
    if (job.homeowner_id !== userId && job.contractor_id !== userId) {
      throw new Error('Unauthorized to make payment for this job');
    }
    if (job.status === 'cancelled' || job.status === 'completed') {
      throw new Error('Cannot process payment for ' + job.status + ' job');
    }
    return job;
  }
  private async getOrCreateCustomer(userId: string, email: string): Promise<any> {
    // Check if user has Stripe customer ID
    const { data: user } = await this.supabase
      .from('users')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single();
    if (user?.stripe_customer_id) {
      return await this.stripe.customers.retrieve(user.stripe_customer_id);
    }
    // Create new Stripe customer
    const customer = await this.stripe.customers.create({
      email,
      metadata: {
        userId,
      },
    });
    // Save customer ID to user profile
    await this.supabase
      .from('users')
      .update({ stripe_customer_id: customer.id })
      .eq('id', userId);
    return customer;
  }
  private async storePaymentIntent(data: any): Promise<void> {
    const { error } = await this.supabase
      .from('payment_intents')
      .insert(data);
    if (error) {
      logger.error('Failed to store payment intent', { error });
    }
  }
  private async updatePaymentStatus(paymentIntentId: string, status: string): Promise<void> {
    const { error } = await this.supabase
      .from('payment_intents')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', paymentIntentId);
    if (error) {
      logger.error('Failed to update payment status', { error });
    }
  }
  private async createEscrowRecord(data: any): Promise<void> {
    const { error } = await this.supabase
      .from('escrow_transactions')
      .insert(data);
    if (error) {
      logger.error('Failed to create escrow record', { error });
    }
  }
}