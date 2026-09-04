import type Stripe from 'stripe';
import { logger } from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { isValidUUID } from './webhook-helpers';

/**
 * Invoice payments are platform PaymentIntents, not Stripe Billing invoices.
 * Reconcile both local records from the webhook so payment state does not
 * depend on the customer returning to the success page.
 */
export async function reconcileInvoicePayment(
  paymentIntent: Stripe.PaymentIntent
): Promise<void> {
  const invoiceId = paymentIntent.metadata?.invoice_id;
  if (!invoiceId) return;
  if (!isValidUUID(invoiceId)) {
    logger.warn('Ignoring invalid invoice_id in payment metadata', {
      service: 'stripe-webhook',
      paymentIntentId: paymentIntent.id,
      invoiceId,
    });
    return;
  }

  const now = new Date().toISOString();
  const { error: paymentError } = await serverSupabase
    .from('payments')
    .update({ status: 'completed', processed_at: now })
    .eq('stripe_payment_intent_id', paymentIntent.id)
    .in('status', ['pending', 'processing']);
  if (paymentError) {
    logger.error('Failed to mark invoice payment completed', paymentError, {
      service: 'stripe-webhook',
      paymentIntentId: paymentIntent.id,
      invoiceId,
    });
  }

  const { error: invoiceError } = await serverSupabase
    .from('invoices')
    .update({
      status: 'paid',
      paid_amount: paymentIntent.amount / 100,
      paid_date: now,
    })
    .eq('id', invoiceId)
    .neq('status', 'paid');
  if (invoiceError) {
    logger.error('Failed to mark invoice paid', invoiceError, {
      service: 'stripe-webhook',
      paymentIntentId: paymentIntent.id,
      invoiceId,
    });
  }
}
