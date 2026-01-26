/**
 * Payment Intent Handler - Processes payment intent webhook events
 */
import { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@mintenance/shared';

interface StripeEvent {
  id: string;
  type: string;
  data: {
    object: unknown;
    previous_attributes?: unknown;
  };
}
export interface PaymentIntentHandlerConfig {
  stripe: unknown;
  supabase: SupabaseClient;
  webhookSecret: string;
}
export class PaymentIntentHandler {
  private supabase: SupabaseClient;
  constructor(config: PaymentIntentHandlerConfig) {
    this.supabase = config.supabase;
  }
  /**
   * Handle payment_intent.succeeded event
   */
  async handleSucceeded(event: StripeEvent): Promise<unknown> {
    const paymentIntent = event.data.object;
    logger.info('Payment intent succeeded', {
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount / 100,
      metadata: paymentIntent.metadata
    });
    // Extract metadata
    const { jobId, bidId, userId, type } = paymentIntent.metadata || {};
    // Update payment record
    await this.supabase
      .from('payments')
      .update({
        status: 'completed',
        stripe_payment_intent_id: paymentIntent.id,
        completed_at: new Date().toISOString(),
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
        payment_method: paymentIntent.payment_method,
      })
      .eq('stripe_payment_intent_id', paymentIntent.id);
    // Handle different payment types
    if (type === 'job_payment' && jobId) {
      await this.handleJobPaymentSuccess(jobId, bidId, paymentIntent);
    } else if (type === 'subscription') {
      await this.handleSubscriptionPaymentSuccess(paymentIntent);
    } else if (type === 'escrow' && jobId) {
      await this.handleEscrowPaymentSuccess(jobId, paymentIntent);
    }
    // Send success notification
    if (userId) {
      await this.sendPaymentSuccessNotification(userId, paymentIntent);
    }
    return {
      processed: true,
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount / 100,
      type
    };
  }
  /**
   * Handle payment_intent.payment_failed event
   */
  async handleFailed(event: StripeEvent): Promise<unknown> {
    const paymentIntent = event.data.object;
    logger.error('Payment intent failed', {
      paymentIntentId: paymentIntent.id,
      error: paymentIntent.last_payment_error
    });
    // Update payment record
    await this.supabase
      .from('payments')
      .update({
        status: 'failed',
        failure_reason: paymentIntent.last_payment_error?.message,
        failed_at: new Date().toISOString(),
      })
      .eq('stripe_payment_intent_id', paymentIntent.id);
    // Extract metadata
    const { userId, jobId } = paymentIntent.metadata || {};
    // Send failure notification
    if (userId) {
      await this.sendPaymentFailureNotification(
        userId,
        paymentIntent,
        paymentIntent.last_payment_error
      );
    }
    // Handle job-related failures
    if (jobId) {
      await this.handleJobPaymentFailure(jobId, paymentIntent);
    }
    return {
      processed: true,
      paymentIntentId: paymentIntent.id,
      status: 'failed',
      error: paymentIntent.last_payment_error?.message
    };
  }
  /**
   * Handle payment_intent.canceled event
   */
  async handleCanceled(event: StripeEvent): Promise<unknown> {
    const paymentIntent = event.data.object;
    logger.info('Payment intent canceled', {
      paymentIntentId: paymentIntent.id,
      cancellationReason: paymentIntent.cancellation_reason
    });
    // Update payment record
    await this.supabase
      .from('payments')
      .update({
        status: 'canceled',
        cancellation_reason: paymentIntent.cancellation_reason,
        canceled_at: new Date().toISOString(),
      })
      .eq('stripe_payment_intent_id', paymentIntent.id);
    // Release any held resources
    const { jobId } = paymentIntent.metadata || {};
    if (jobId) {
      await this.releaseJobResources(jobId, paymentIntent.id);
    }
    return {
      processed: true,
      paymentIntentId: paymentIntent.id,
      status: 'canceled',
      reason: paymentIntent.cancellation_reason
    };
  }
  /**
   * Handle payment_intent.processing event
   */
  async handleProcessing(event: StripeEvent): Promise<unknown> {
    const paymentIntent = event.data.object;
    logger.info('Payment intent processing', {
      paymentIntentId: paymentIntent.id
    });
    // Update payment status
    await this.supabase
      .from('payments')
      .update({
        status: 'processing',
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_payment_intent_id', paymentIntent.id);
    return {
      processed: true,
      paymentIntentId: paymentIntent.id,
      status: 'processing'
    };
  }
  /**
   * Handle payment_intent.requires_action event
   */
  async handleRequiresAction(event: StripeEvent): Promise<unknown> {
    const paymentIntent = event.data.object;
    logger.info('Payment intent requires action', {
      paymentIntentId: paymentIntent.id,
      nextAction: paymentIntent.next_action?.type
    });
    // Update payment status
    await this.supabase
      .from('payments')
      .update({
        status: 'requires_action',
        next_action_type: paymentIntent.next_action?.type,
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_payment_intent_id', paymentIntent.id);
    // Send notification to user
    const { userId } = paymentIntent.metadata || {};
    if (userId) {
      await this.sendActionRequiredNotification(userId, paymentIntent);
    }
    return {
      processed: true,
      paymentIntentId: paymentIntent.id,
      status: 'requires_action',
      actionType: paymentIntent.next_action?.type
    };
  }
  // ============= Private Helper Methods =============
  private async handleJobPaymentSuccess(
    jobId: string,
    bidId: string | undefined,
    paymentIntent: unknown
  ): Promise<void> {
    // Update job payment status
    await this.supabase
      .from('jobs')
      .update({
        payment_status: 'paid',
        payment_intent_id: paymentIntent.id,
        paid_at: new Date().toISOString(),
      })
      .eq('id', jobId);
    // If payment is for a bid, accept the bid
    if (bidId) {
      await this.supabase
        .from('bids')
        .update({
          status: 'accepted',
          payment_intent_id: paymentIntent.id,
          accepted_at: new Date().toISOString(),
        })
        .eq('id', bidId);
      // Reject other bids
      await this.supabase
        .from('bids')
        .update({
          status: 'rejected',
          rejected_at: new Date().toISOString(),
        })
        .eq('job_id', jobId)
        .neq('id', bidId)
        .eq('status', 'pending');
    }
    // Create escrow record if capture_method is manual
    if (paymentIntent.capture_method === 'manual') {
      await this.supabase
        .from('escrow_transactions')
        .insert({
          job_id: jobId,
          payment_intent_id: paymentIntent.id,
          amount: paymentIntent.amount / 100,
          status: 'held',
          created_at: new Date().toISOString(),
        });
    }
  }
  private async handleSubscriptionPaymentSuccess(paymentIntent: unknown): Promise<void> {
    const { subscriptionId, userId } = paymentIntent.metadata || {};
    if (subscriptionId) {
      await this.supabase
        .from('subscriptions')
        .update({
          payment_status: 'paid',
          last_payment_at: new Date().toISOString(),
        })
        .eq('stripe_subscription_id', subscriptionId);
    }
  }
  private async handleEscrowPaymentSuccess(jobId: string, paymentIntent: unknown): Promise<void> {
    await this.supabase
      .from('escrow_transactions')
      .insert({
        job_id: jobId,
        payment_intent_id: paymentIntent.id,
        amount: paymentIntent.amount / 100,
        status: 'held',
        created_at: new Date().toISOString(),
      });
  }
  private async handleJobPaymentFailure(jobId: string, paymentIntent: unknown): Promise<void> {
    await this.supabase
      .from('jobs')
      .update({
        payment_status: 'failed',
        payment_failure_reason: paymentIntent.last_payment_error?.message,
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId);
  }
  private async releaseJobResources(jobId: string, paymentIntentId: string): Promise<void> {
    // Release any held resources
    await this.supabase
      .from('escrow_transactions')
      .update({
        status: 'released',
        released_at: new Date().toISOString(),
      })
      .eq('job_id', jobId)
      .eq('payment_intent_id', paymentIntentId);
  }
  private async sendPaymentSuccessNotification(userId: string, paymentIntent: unknown): Promise<void> {
    await this.supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type: 'payment_success',
        data: {
          paymentIntentId: paymentIntent.id,
          amount: paymentIntent.amount / 100,
          currency: paymentIntent.currency,
        },
        created_at: new Date().toISOString(),
      });
  }
  private async sendPaymentFailureNotification(
    userId: string,
    paymentIntent: unknown,
    error: unknown
  ): Promise<void> {
    await this.supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type: 'payment_failed',
        data: {
          paymentIntentId: paymentIntent.id,
          amount: paymentIntent.amount / 100,
          error: error?.message || 'Payment failed',
          declineCode: error?.decline_code,
        },
        created_at: new Date().toISOString(),
      });
  }
  private async sendActionRequiredNotification(userId: string, paymentIntent: unknown): Promise<void> {
    await this.supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type: 'payment_action_required',
        data: {
          paymentIntentId: paymentIntent.id,
          actionType: paymentIntent.next_action?.type,
          amount: paymentIntent.amount / 100,
        },
        created_at: new Date().toISOString(),
      });
  }
}