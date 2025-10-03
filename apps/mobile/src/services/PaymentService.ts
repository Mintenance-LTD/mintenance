/**
 * PaymentService
 * 
 * Handles Stripe payment processing, escrow, and payment management.
 * Integrates with Stripe API for secure payment processing.
 */

import { logger } from '../utils/logger';
import { supabase } from '../config/supabase';

export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: 'requires_payment_method' | 'requires_confirmation' | 'requires_action' | 'processing' | 'succeeded' | 'canceled';
  clientSecret: string;
  metadata: {
    jobId?: string;
    contractorId?: string;
    clientId?: string;
    description?: string;
  };
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'bank_account' | 'paypal';
  card?: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };
  bankAccount?: {
    bankName: string;
    last4: string;
    routingNumber: string;
  };
  isDefault: boolean;
}

export interface EscrowPayment {
  id: string;
  jobId: string;
  contractorId: string;
  clientId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'held' | 'released' | 'disputed' | 'refunded';
  paymentIntentId: string;
  releaseConditions: string[];
  createdAt: Date;
  releasedAt?: Date;
  disputeReason?: string;
}

export interface PaymentHistory {
  id: string;
  amount: number;
  currency: string;
  status: string;
  description: string;
  type: 'payment' | 'refund' | 'escrow_release' | 'dispute';
  jobId?: string;
  contractorId?: string;
  clientId?: string;
  createdAt: Date;
  metadata?: any;
}

export class PaymentService {
  /**
   * Create a payment intent for a job
   */
  static async createPaymentIntent(
    amount: number,
    currency: string = 'usd',
    metadata: PaymentIntent['metadata']
  ): Promise<PaymentIntent> {
    try {
      const response = await fetch('/api/payments/create-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: Math.round(amount * 100), // Convert to cents
          currency,
          metadata,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create payment intent');
      }

      const data = await response.json();
      logger.info('Payment intent created', { intentId: data.id });
    return data;
    } catch (error) {
      logger.error('Failed to create payment intent', error);
      throw error;
    }
  }

  /**
   * Confirm a payment intent
   */
  static async confirmPaymentIntent(
    paymentIntentId: string,
    paymentMethodId?: string
  ): Promise<PaymentIntent> {
    try {
      const response = await fetch('/api/payments/confirm-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentIntentId,
          paymentMethodId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to confirm payment intent');
      }

      const data = await response.json();
      logger.info('Payment intent confirmed', { intentId: paymentIntentId });
    return data;
    } catch (error) {
      logger.error('Failed to confirm payment intent', error);
      throw error;
    }
  }

  /**
   * Create an escrow payment
   */
  static async createEscrowPayment(
    jobId: string,
    contractorId: string,
    clientId: string,
    amount: number,
    currency: string = 'usd',
    releaseConditions: string[] = []
  ): Promise<EscrowPayment> {
    try {
      // Create payment intent
      const paymentIntent = await this.createPaymentIntent(amount, currency, {
        jobId,
        contractorId,
        clientId,
        description: `Escrow payment for job ${jobId}`,
      });

      // Create escrow record
    const { data, error } = await supabase
        .from('escrow_payments')
        .insert({
          job_id: jobId,
          contractor_id: contractorId,
          client_id: clientId,
          amount,
          currency,
          status: 'pending',
          payment_intent_id: paymentIntent.id,
          release_conditions: releaseConditions,
          created_at: new Date().toISOString(),
        })
      .select()
      .single();

    if (error) throw error;

      logger.info('Escrow payment created', { escrowId: data.id });
      return {
        id: data.id,
        jobId: data.job_id,
        contractorId: data.contractor_id,
        clientId: data.client_id,
        amount: data.amount,
        currency: data.currency,
        status: data.status,
        paymentIntentId: data.payment_intent_id,
        releaseConditions: data.release_conditions,
        createdAt: new Date(data.created_at),
        releasedAt: data.released_at ? new Date(data.released_at) : undefined,
        disputeReason: data.dispute_reason,
      };
    } catch (error) {
      logger.error('Failed to create escrow payment', error);
      throw error;
    }
  }

  /**
   * Release escrow payment
   */
  static async releaseEscrowPayment(
    escrowId: string,
    reason: string = 'Job completed successfully'
  ): Promise<void> {
    try {
      // Get escrow payment
      const { data: escrowData, error: fetchError } = await supabase
        .from('escrow_payments')
        .select('*')
        .eq('id', escrowId)
      .single();

    if (fetchError) throw fetchError;

      // Release payment via Stripe
      const response = await fetch('/api/payments/release-escrow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          escrowId,
          reason,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to release escrow payment');
      }

      // Update escrow status
    const { error: updateError } = await supabase
        .from('escrow_payments')
      .update({
        status: 'released',
        released_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
        .eq('id', escrowId);

    if (updateError) throw updateError;

      logger.info('Escrow payment released', { escrowId });
    } catch (error) {
      logger.error('Failed to release escrow payment', error);
      throw error;
    }
  }

  /**
   * Dispute escrow payment
   */
  static async disputeEscrowPayment(
    escrowId: string,
    reason: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('escrow_payments')
      .update({
          status: 'disputed',
          dispute_reason: reason,
        updated_at: new Date().toISOString(),
      })
        .eq('id', escrowId);

      if (error) throw error;

      logger.info('Escrow payment disputed', { escrowId, reason });
    } catch (error) {
      logger.error('Failed to dispute escrow payment', error);
      throw error;
    }
  }

  /**
   * Refund payment
   */
  static async refundPayment(
    paymentIntentId: string,
    amount?: number,
    reason?: string
  ): Promise<void> {
    try {
      const response = await fetch('/api/payments/refund', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentIntentId,
          amount: amount ? Math.round(amount * 100) : undefined,
          reason,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to process refund');
      }

      logger.info('Payment refunded', { paymentIntentId, amount, reason });
    } catch (error) {
      logger.error('Failed to refund payment', error);
      throw error;
    }
  }

  /**
   * Get user's payment methods
   */
  static async getPaymentMethods(userId: string): Promise<PaymentMethod[]> {
    try {
      const response = await fetch(`/api/payments/methods?userId=${userId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch payment methods');
      }

      const data = await response.json();
      return data.paymentMethods;
    } catch (error) {
      logger.error('Failed to get payment methods', error);
      throw error;
    }
  }

  /**
   * Add payment method
   */
  static async addPaymentMethod(
    userId: string,
    paymentMethodId: string,
    isDefault: boolean = false
  ): Promise<PaymentMethod> {
    try {
      const response = await fetch('/api/payments/add-method', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          paymentMethodId,
          isDefault,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add payment method');
      }

      const data = await response.json();
      logger.info('Payment method added', { userId, paymentMethodId });
      return data.paymentMethod;
    } catch (error) {
      logger.error('Failed to add payment method', error);
      throw error;
    }
  }

  /**
   * Remove payment method
   */
  static async removePaymentMethod(paymentMethodId: string): Promise<void> {
    try {
      const response = await fetch('/api/payments/remove-method', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ paymentMethodId }),
      });

      if (!response.ok) {
        throw new Error('Failed to remove payment method');
      }

      logger.info('Payment method removed', { paymentMethodId });
    } catch (error) {
      logger.error('Failed to remove payment method', error);
      throw error;
    }
  }

  /**
   * Get payment history
   */
  static async getPaymentHistory(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<PaymentHistory[]> {
    try {
      const { data, error } = await supabase
        .from('payment_history')
        .select('*')
        .or(`contractor_id.eq.${userId},client_id.eq.${userId}`)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

    if (error) throw error;

      return data.map(item => ({
        id: item.id,
        amount: item.amount,
        currency: item.currency,
        status: item.status,
        description: item.description,
        type: item.type,
        jobId: item.job_id,
        contractorId: item.contractor_id,
        clientId: item.client_id,
        createdAt: new Date(item.created_at),
        metadata: item.metadata,
      }));
    } catch (error) {
      logger.error('Failed to get payment history', error);
      throw error;
    }
  }

  /**
   * Get escrow payments for a job
   */
  static async getJobEscrowPayments(jobId: string): Promise<EscrowPayment[]> {
    try {
    const { data, error } = await supabase
        .from('escrow_payments')
      .select('*')
        .eq('job_id', jobId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map(item => ({
        id: item.id,
        jobId: item.job_id,
        contractorId: item.contractor_id,
        clientId: item.client_id,
        amount: item.amount,
        currency: item.currency,
        status: item.status,
        paymentIntentId: item.payment_intent_id,
        releaseConditions: item.release_conditions,
        createdAt: new Date(item.created_at),
        releasedAt: item.released_at ? new Date(item.released_at) : undefined,
        disputeReason: item.dispute_reason,
      }));
    } catch (error) {
      logger.error('Failed to get job escrow payments', error);
      throw error;
    }
  }

  /**
   * Calculate platform fee
   */
  static calculatePlatformFee(amount: number): number {
    const platformFeeRate = 0.029; // 2.9%
    const fixedFee = 0.30; // $0.30
    return Math.round((amount * platformFeeRate + fixedFee) * 100) / 100;
  }

  /**
   * Calculate contractor payout
   */
  static calculateContractorPayout(amount: number): number {
    const platformFee = this.calculatePlatformFee(amount);
    return Math.round((amount - platformFee) * 100) / 100;
  }
}