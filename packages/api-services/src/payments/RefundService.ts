/**
 * Refund Service - Handles payment refunds and disputes
 */
import { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@mintenance/shared';

interface Stripe {
  refunds: {
    create(params: any): Promise<any>;
  };
  paymentIntents: {
    retrieve(id: string): Promise<any>;
  };
}
export interface RefundServiceConfig {
  stripe: Stripe;
  supabase: SupabaseClient;
  webhookSecret: string;
}
export interface ValidateRefundParams {
  paymentId: string;
  amount?: number;
  fullRefund: boolean;
  userId: string;
}
export interface ProcessRefundParams {
  paymentId: string;
  amount: number;
  reason: string;
  requestedBy: string;
  fullRefund: boolean;
}
export class RefundService {
  private stripe: Stripe;
  private supabase: SupabaseClient;
  constructor(config: RefundServiceConfig) {
    this.stripe = config.stripe;
    this.supabase = config.supabase;
  }
  /**
   * Validate refund request
   */
  async validateRefund(params: ValidateRefundParams): Promise<{
    valid: boolean;
    error?: string;
    originalAmount?: number;
  }> {
    const { paymentId, amount, fullRefund, userId } = params;
    // Get payment record
    const { data: payment } = await this.supabase
      .from('payments')
      .select('*, job:jobs(*)')
      .eq('id', paymentId)
      .single();
    if (!payment) {
      return { valid: false, error: 'Payment not found' };
    }
    // Check authorization
    const isAuthorized =
      payment.user_id === userId ||
      payment.job?.homeowner_id === userId ||
      payment.job?.contractor_id === userId;
    if (!isAuthorized) {
      return { valid: false, error: 'Unauthorized to refund this payment' };
    }
    // Check payment status
    if (payment.status !== 'completed' && payment.status !== 'captured') {
      return { valid: false, error: 'Payment is not in a refundable state' };
    }
    // Check if already refunded
    const { data: existingRefunds } = await this.supabase
      .from('refunds')
      .select('amount')
      .eq('payment_id', paymentId)
      .eq('status', 'completed');
    const totalRefunded = (existingRefunds || []).reduce((sum, r) => sum + r.amount, 0);
    if (totalRefunded >= payment.amount) {
      return { valid: false, error: 'Payment already fully refunded' };
    }
    // Validate refund amount
    if (!fullRefund) {
      if (!amount || amount <= 0) {
        return { valid: false, error: 'Invalid refund amount' };
      }
      if (amount > payment.amount - totalRefunded) {
        return { valid: false, error: 'Refund amount exceeds remaining balance' };
      }
    }
    // Check time limits (30 days for full refund, 90 days for partial)
    const daysSincePayment = Math.floor(
      (Date.now() - new Date(payment.created_at).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (fullRefund && daysSincePayment > 30) {
      return { valid: false, error: 'Full refunds only available within 30 days' };
    }
    if (daysSincePayment > 90) {
      return { valid: false, error: 'Refunds not available after 90 days' };
    }
    return {
      valid: true,
      originalAmount: payment.amount - totalRefunded
    };
  }
  /**
   * Process a refund
   */
  async processRefund(params: ProcessRefundParams): Promise<any> {
    const { paymentId, amount, reason, requestedBy, fullRefund } = params;
    // Get payment details
    const { data: payment } = await this.supabase
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .single();
    if (!payment) {
      throw new Error('Payment not found');
    }
    try {
      // Create Stripe refund
      const refund = await this.stripe.refunds.create({
        payment_intent: payment.stripe_payment_intent_id,
        amount: Math.round(amount * 100), // Convert to cents
        reason: this.mapRefundReason(reason),
        metadata: {
          paymentId,
          requestedBy,
          originalReason: reason,
        },
      });
      // Store refund record
      await this.supabase
        .from('refunds')
        .insert({
          payment_id: paymentId,
          stripe_refund_id: refund.id,
          amount,
          reason,
          status: refund.status,
          requested_by: requestedBy,
          full_refund: fullRefund,
          created_at: new Date().toISOString(),
        });
      // Update payment status if fully refunded
      if (fullRefund) {
        await this.supabase
          .from('payments')
          .update({ status: 'refunded' })
          .eq('id', paymentId);
      } else {
        await this.supabase
          .from('payments')
          .update({ status: 'partially_refunded' })
          .eq('id', paymentId);
      }
      // Create notification
      await this.createRefundNotification(payment, amount, reason);
      logger.info('Refund processed', {
        refundId: refund.id,
        paymentId,
        amount,
        fullRefund,
      });
      return {
        refundId: refund.id,
        amount,
        status: refund.status,
        processedAt: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Refund failed', { error, paymentId, amount });
      throw new Error('Failed to process refund');
    }
  }
  /**
   * Get refund history
   */
  async getRefundHistory(userId: string, limit = 50, offset = 0): Promise<any> {
    const { data, count } = await this.supabase
      .from('refunds')
      .select('*, payment:payments(*, job:jobs(title))', { count: 'exact' })
      .eq('requested_by', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    return {
      refunds: data || [],
      total: count || 0,
      hasMore: (count || 0) > offset + limit,
    };
  }
  /**
   * Handle dispute
   */
  async handleDispute(paymentId: string, disputeReason: string): Promise<void> {
    // Store dispute information
    await this.supabase
      .from('disputes')
      .insert({
        payment_id: paymentId,
        reason: disputeReason,
        status: 'pending',
        created_at: new Date().toISOString(),
      });
    // Notify relevant parties
    logger.warn('Payment dispute created', { paymentId, reason: disputeReason });
  }
  // ============= Private Helper Methods =============
  private mapRefundReason(reason: string): string {
    // Map to Stripe refund reasons
    const reasonMap: Record<string, string> = {
      'duplicate': 'duplicate',
      'fraud': 'fraudulent',
      'requested': 'requested_by_customer',
      'other': 'requested_by_customer',
    };
    return reasonMap[reason.toLowerCase()] || 'requested_by_customer';
  }
  private async createRefundNotification(payment: any, amount: number, reason: string): Promise<void> {
    const { data: job } = await this.supabase
      .from('jobs')
      .select('title, homeowner_id, contractor_id')
      .eq('id', payment.job_id)
      .single();
    if (job) {
      // Notify both parties
      const notifications = [
        {
          user_id: job.homeowner_id,
          type: 'refund_processed',
          data: {
            amount,
            reason,
            jobTitle: job.title,
          },
        },
      ];
      if (job.contractor_id) {
        notifications.push({
          user_id: job.contractor_id,
          type: 'refund_processed',
          data: {
            amount,
            reason,
            jobTitle: job.title,
          },
        });
      }
      await this.supabase
        .from('notifications')
        .insert(notifications);
    }
  }
}