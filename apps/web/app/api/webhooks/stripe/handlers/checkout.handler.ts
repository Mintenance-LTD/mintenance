import { Stripe } from 'stripe';
import { logger } from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';
export class CheckoutHandler {
  async handleSessionCompleted(event: Stripe.Event): Promise<void> {
    const session = event.data.object as Stripe.Checkout.Session;
    const supabase = serverSupabase();
    logger.info('Checkout session completed', {
      service: 'stripe-webhook',
      eventId: event.id,
      sessionId: session.id,
      mode: session.mode,
      paymentStatus: session.payment_status,
    });
    try {
      // Handle different checkout modes
      if (session.mode === 'payment') {
        await this.handlePaymentSession(session);
      } else if (session.mode === 'subscription') {
        await this.handleSubscriptionSession(session);
      } else if (session.mode === 'setup') {
        await this.handleSetupSession(session);
      }
      logger.info('Checkout session processed successfully', {
        service: 'stripe-webhook',
        sessionId: session.id,
        mode: session.mode,
      });
    } catch (error) {
      logger.error('Failed to process checkout session completed event', {
        service: 'stripe-webhook',
        error: error instanceof Error ? error.message : 'Unknown error',
        sessionId: session.id,
      });
      throw error;
    }
  }
  private async handlePaymentSession(session: Stripe.Checkout.Session): Promise<void> {
    const supabase = serverSupabase();
    const jobId = session.metadata?.job_id;
    if (!jobId) {
      logger.warn('Checkout session missing job_id in metadata', {
        sessionId: session.id,
      });
      return;
    }
    // Update job payment status
    await supabase
      .from('jobs')
      .update({
        payment_status: 'processing',
        payment_session_id: session.id,
        payment_intent_id: session.payment_intent as string,
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId);
    // Create checkout record
    await supabase.from('checkout_sessions').insert({
      session_id: session.id,
      job_id: jobId,
      customer_email: session.customer_email,
      amount_total: (session.amount_total || 0) / 100,
      currency: session.currency,
      payment_status: session.payment_status,
      status: session.status,
      success_url: session.success_url,
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
        type: 'checkout_completed',
        title: 'Checkout Completed',
        message: `Your checkout for "${job.title}" has been completed. Payment is being processed.`,
        data: {
          job_id: jobId,
          session_id: session.id,
        },
        created_at: new Date().toISOString(),
      });
    }
  }
  private async handleSubscriptionSession(session: Stripe.Checkout.Session): Promise<void> {
    const supabase = serverSupabase();
    const contractorId = session.metadata?.contractor_id;
    if (!contractorId) {
      logger.warn('Subscription checkout session missing contractor_id', {
        sessionId: session.id,
      });
      return;
    }
    // Record subscription checkout
    await supabase.from('checkout_sessions').insert({
      session_id: session.id,
      contractor_id: contractorId,
      customer_email: session.customer_email,
      subscription_id: session.subscription as string,
      status: session.status,
      created_at: new Date().toISOString(),
    });
    // Notify contractor
    await supabase.from('notifications').insert({
      user_id: contractorId,
      type: 'subscription_checkout_completed',
      title: 'Subscription Setup Complete',
      message: 'Your subscription checkout has been completed successfully.',
      data: {
        session_id: session.id,
        subscription_id: session.subscription,
      },
      created_at: new Date().toISOString(),
    });
  }
  private async handleSetupSession(session: Stripe.Checkout.Session): Promise<void> {
    const supabase = serverSupabase();
    const userId = session.metadata?.user_id;
    if (!userId) {
      return;
    }
    // Update user's setup intent
    await supabase
      .from('profiles')
      .update({
        setup_intent_id: session.setup_intent as string,
        default_payment_method: session.payment_method_types?.[0],
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);
    // Notify user
    await supabase.from('notifications').insert({
      user_id: userId,
      type: 'payment_method_added',
      title: 'Payment Method Added',
      message: 'Your payment method has been successfully added to your account.',
      created_at: new Date().toISOString(),
    });
  }
}