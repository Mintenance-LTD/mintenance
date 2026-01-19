import { Stripe } from 'stripe';
import { logger } from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';
export class PaymentIntentHandler {
  async handleSucceeded(event: Stripe.Event): Promise<void> {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const supabase = serverSupabase();
    logger.info('Payment succeeded', {
      service: 'stripe-webhook',
      eventId: event.id,
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
    });
    // Extract job_id from metadata
    const jobId = paymentIntent.metadata?.job_id;
    if (!jobId) {
      logger.warn('Payment intent missing job_id in metadata', {
        service: 'stripe-webhook',
        paymentIntentId: paymentIntent.id,
      });
      return;
    }
    try {
      // Update job payment status
      const { error: jobError } = await supabase
        .from('jobs')
        .update({
          payment_status: 'paid',
          payment_intent_id: paymentIntent.id,
          paid_amount: paymentIntent.amount / 100, // Convert from cents
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId);
      if (jobError) {
        throw new Error(`Failed to update job payment status: ${jobError.message}`);
      }
      // Create payment record
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          job_id: jobId,
          payment_intent_id: paymentIntent.id,
          amount: paymentIntent.amount / 100,
          currency: paymentIntent.currency,
          status: 'succeeded',
          customer_id: paymentIntent.customer as string,
          metadata: paymentIntent.metadata,
          created_at: new Date().toISOString(),
        });
      if (paymentError) {
        logger.error('Failed to create payment record', {
          service: 'stripe-webhook',
          error: paymentError.message,
          jobId,
          paymentIntentId: paymentIntent.id,
        });
      }
      // Create notification for homeowner
      const { data: job } = await supabase
        .from('jobs')
        .select('homeowner_id, title')
        .eq('id', jobId)
        .single();
      if (job) {
        await supabase.from('notifications').insert({
          user_id: job.homeowner_id,
          type: 'payment_success',
          title: 'Payment Successful',
          message: `Your payment for "${job.title}" has been processed successfully.`,
          data: { job_id: jobId, payment_intent_id: paymentIntent.id },
          created_at: new Date().toISOString(),
        });
      }
      logger.info('Payment intent processed successfully', {
        service: 'stripe-webhook',
        jobId,
        paymentIntentId: paymentIntent.id,
      });
    } catch (error) {
      logger.error('Failed to process payment succeeded event', {
        service: 'stripe-webhook',
        error: error instanceof Error ? error.message : 'Unknown error',
        jobId,
        paymentIntentId: paymentIntent.id,
      });
      throw error;
    }
  }
  async handleFailed(event: Stripe.Event): Promise<void> {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const supabase = serverSupabase();
    logger.warn('Payment failed', {
      service: 'stripe-webhook',
      eventId: event.id,
      paymentIntentId: paymentIntent.id,
      failureCode: paymentIntent.last_payment_error?.code,
      failureMessage: paymentIntent.last_payment_error?.message,
    });
    const jobId = paymentIntent.metadata?.job_id;
    if (!jobId) {
      return;
    }
    try {
      // Update job payment status
      await supabase
        .from('jobs')
        .update({
          payment_status: 'failed',
          payment_error: paymentIntent.last_payment_error?.message,
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId);
      // Create payment record
      await supabase.from('payments').insert({
        job_id: jobId,
        payment_intent_id: paymentIntent.id,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
        status: 'failed',
        failure_code: paymentIntent.last_payment_error?.code,
        failure_message: paymentIntent.last_payment_error?.message,
        metadata: paymentIntent.metadata,
        created_at: new Date().toISOString(),
      });
      // Notify homeowner
      const { data: job } = await supabase
        .from('jobs')
        .select('homeowner_id, title')
        .eq('id', jobId)
        .single();
      if (job) {
        await supabase.from('notifications').insert({
          user_id: job.homeowner_id,
          type: 'payment_failed',
          title: 'Payment Failed',
          message: `Your payment for "${job.title}" could not be processed. Please try again or use a different payment method.`,
          data: {
            job_id: jobId,
            payment_intent_id: paymentIntent.id,
            error: paymentIntent.last_payment_error?.message,
          },
          created_at: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error('Failed to process payment failed event', {
        service: 'stripe-webhook',
        error: error instanceof Error ? error.message : 'Unknown error',
        jobId,
        paymentIntentId: paymentIntent.id,
      });
      throw error;
    }
  }
  async handleCanceled(event: Stripe.Event): Promise<void> {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const supabase = serverSupabase();
    logger.info('Payment canceled', {
      service: 'stripe-webhook',
      eventId: event.id,
      paymentIntentId: paymentIntent.id,
    });
    const jobId = paymentIntent.metadata?.job_id;
    if (!jobId) {
      return;
    }
    try {
      // Update job payment status
      await supabase
        .from('jobs')
        .update({
          payment_status: 'canceled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId);
      // Create payment record
      await supabase.from('payments').insert({
        job_id: jobId,
        payment_intent_id: paymentIntent.id,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
        status: 'canceled',
        metadata: paymentIntent.metadata,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Failed to process payment canceled event', {
        service: 'stripe-webhook',
        error: error instanceof Error ? error.message : 'Unknown error',
        jobId,
        paymentIntentId: paymentIntent.id,
      });
      throw error;
    }
  }
}