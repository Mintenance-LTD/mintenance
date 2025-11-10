/**
 * PaymentService
 * 
 * Handles Stripe payment processing, escrow, and payment management.
 * Uses unified API client for API calls, Supabase for direct database operations.
 */

import { logger } from '../utils/logger';
import { supabase } from '../config/supabase';
import { mobileApiClient } from '../utils/mobileApiClient';
import { parseError, getUserFriendlyMessage } from '@mintenance/api-client';

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
      const data = await mobileApiClient.post<PaymentIntent>('/api/payments/create-intent', {
        amount: Math.round(amount * 100), // Convert to cents
        currency,
        metadata,
      });
      logger.info('Payment intent created', { intentId: data.id });
      return data;
    } catch (error) {
      const apiError = parseError(error);
      logger.error('Failed to create payment intent', { error: apiError });
      throw new Error(getUserFriendlyMessage(apiError));
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
      const data = await mobileApiClient.post<PaymentIntent>('/api/payments/confirm-intent', {
        paymentIntentId,
        paymentMethodId,
      });
      logger.info('Payment intent confirmed', { intentId: paymentIntentId });
      return data;
    } catch (error) {
      const apiError = parseError(error);
      logger.error('Failed to confirm payment intent', { error: apiError });
      throw new Error(getUserFriendlyMessage(apiError));
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
      // Get escrow payment (Supabase direct call - appropriate)
      const { data: escrowData, error: fetchError } = await supabase
        .from('escrow_payments')
        .select('*')
        .eq('id', escrowId)
        .single();

      if (fetchError) throw fetchError;

      // Release payment via Stripe API (use unified client)
      await mobileApiClient.post('/api/payments/release-escrow', {
        escrowId,
        reason,
      });

      // Update escrow status (Supabase direct call - appropriate)
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
      const apiError = parseError(error);
      logger.error('Failed to release escrow payment', { error: apiError, escrowId });
      throw new Error(getUserFriendlyMessage(apiError));
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
      await mobileApiClient.post('/api/payments/refund', {
        paymentIntentId,
        amount: amount ? Math.round(amount * 100) : undefined,
        reason,
      });
      logger.info('Payment refunded', { paymentIntentId, amount, reason });
    } catch (error) {
      const apiError = parseError(error);
      logger.error('Failed to refund payment', { error: apiError, paymentIntentId });
      throw new Error(getUserFriendlyMessage(apiError));
    }
  }

  /**
   * Get user's payment methods
   */
  static async getPaymentMethods(userId: string): Promise<PaymentMethod[]> {
    try {
      const data = await mobileApiClient.get<{ paymentMethods: PaymentMethod[] }>(`/api/payments/methods?userId=${userId}`);
      return data.paymentMethods;
    } catch (error) {
      const apiError = parseError(error);
      logger.error('Failed to get payment methods', { error: apiError, userId });
      throw new Error(getUserFriendlyMessage(apiError));
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
      const data = await mobileApiClient.post<{ paymentMethod: PaymentMethod }>('/api/payments/add-method', {
        userId,
        paymentMethodId,
        isDefault,
      });
      logger.info('Payment method added', { userId, paymentMethodId });
      return data.paymentMethod;
    } catch (error) {
      const apiError = parseError(error);
      logger.error('Failed to add payment method', { error: apiError, userId });
      throw new Error(getUserFriendlyMessage(apiError));
    }
  }

  /**
   * Remove payment method
   */
  static async removePaymentMethod(paymentMethodId: string): Promise<void> {
    try {
      await mobileApiClient.post('/api/payments/remove-method', {
        paymentMethodId,
      });
      logger.info('Payment method removed', { paymentMethodId });
    } catch (error) {
      const apiError = parseError(error);
      logger.error('Failed to remove payment method', { error: apiError, paymentMethodId });
      throw new Error(getUserFriendlyMessage(apiError));
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

      return data.map((item: any) => ({
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

      return data.map((item: any) => ({
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