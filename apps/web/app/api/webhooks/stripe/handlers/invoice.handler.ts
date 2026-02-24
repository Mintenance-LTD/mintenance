import { Stripe } from 'stripe';
import { logger } from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { NotificationService } from '@/lib/services/notifications/NotificationService';
export class InvoiceHandler {
  async handlePaymentSucceeded(event: Stripe.Event): Promise<void> {
    const invoice = event.data.object as Stripe.Invoice;
    const supabase = serverSupabase;
    logger.info('Invoice payment succeeded', {
      service: 'stripe-webhook',
      eventId: event.id,
      invoiceId: invoice.id,
      subscriptionId: invoice.subscription,
      amountPaid: invoice.amount_paid,
    });
    try {
      const contractorId = invoice.metadata?.contractor_id;
      if (!contractorId) {
        logger.warn('Invoice missing contractor_id in metadata', {
          invoiceId: invoice.id,
        });
        return;
      }
      // Record invoice payment
      const { error: invoiceError } = await supabase.from('invoice_payments').insert({
        invoice_id: invoice.id,
        contractor_id: contractorId,
        subscription_id: invoice.subscription as string,
        amount_paid: invoice.amount_paid / 100, // Convert from cents
        currency: invoice.currency,
        status: 'paid',
        paid_at: new Date().toISOString(),
        period_start: invoice.period_start
          ? new Date(invoice.period_start * 1000).toISOString()
          : null,
        period_end: invoice.period_end
          ? new Date(invoice.period_end * 1000).toISOString()
          : null,
        invoice_url: invoice.hosted_invoice_url,
        created_at: new Date().toISOString(),
      });
      if (invoiceError) {
        logger.error('Failed to record invoice payment', {
          service: 'stripe-webhook',
          error: invoiceError.message,
          invoiceId: invoice.id,
        });
      }
      // Update subscription status to active if it was past_due
      if (invoice.subscription) {
        await supabase
          .from('contractor_subscriptions')
          .update({
            status: 'active',
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', invoice.subscription)
          .eq('status', 'past_due');
      }
      // Send notification
      await NotificationService.createNotification({
        userId: contractorId,
        type: 'invoice_paid',
        title: 'Payment Received',
        message: `Your subscription payment of ${invoice.amount_paid / 100} ${invoice.currency.toUpperCase()} has been received.`,
        metadata: {
          invoice_id: invoice.id,
          amount: invoice.amount_paid / 100,
          invoice_url: invoice.hosted_invoice_url,
        },
      });
    } catch (error) {
      logger.error('Failed to process invoice payment succeeded event', {
        service: 'stripe-webhook',
        error: error instanceof Error ? error.message : 'Unknown error',
        invoiceId: invoice.id,
      });
      throw error;
    }
  }
  async handlePaymentFailed(event: Stripe.Event): Promise<void> {
    const invoice = event.data.object as Stripe.Invoice;
    const supabase = serverSupabase;
    logger.warn('Invoice payment failed', {
      service: 'stripe-webhook',
      eventId: event.id,
      invoiceId: invoice.id,
      subscriptionId: invoice.subscription,
      attemptCount: invoice.attempt_count,
    });
    try {
      const contractorId = invoice.metadata?.contractor_id;
      if (!contractorId) {
        return;
      }
      // Record failed payment attempt
      await supabase.from('invoice_payments').insert({
        invoice_id: invoice.id,
        contractor_id: contractorId,
        subscription_id: invoice.subscription as string,
        amount_paid: 0,
        currency: invoice.currency,
        status: 'failed',
        attempt_count: invoice.attempt_count,
        created_at: new Date().toISOString(),
      });
      // Update subscription status to past_due
      if (invoice.subscription) {
        await supabase
          .from('contractor_subscriptions')
          .update({
            status: 'past_due',
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', invoice.subscription);
        // Update contractor profile
        await supabase
          .from('contractor_profiles')
          .update({
            subscription_status: 'past_due',
            updated_at: new Date().toISOString(),
          })
          .eq('id', contractorId);
      }
      // Send urgent notification
      const message = invoice.next_payment_attempt
        ? `Your subscription payment failed. We'll retry on ${new Date(invoice.next_payment_attempt * 1000).toLocaleDateString('en-GB')}.`
        : 'Your subscription payment failed. Please update your payment method to avoid service interruption.';
      await NotificationService.createNotification({
        userId: contractorId,
        type: 'invoice_payment_failed',
        title: 'Payment Failed',
        message,
        metadata: {
          invoice_id: invoice.id,
          attempt_count: invoice.attempt_count,
          next_attempt: invoice.next_payment_attempt,
        },
      });
    } catch (error) {
      logger.error('Failed to process invoice payment failed event', {
        service: 'stripe-webhook',
        error: error instanceof Error ? error.message : 'Unknown error',
        invoiceId: invoice.id,
      });
      throw error;
    }
  }
}