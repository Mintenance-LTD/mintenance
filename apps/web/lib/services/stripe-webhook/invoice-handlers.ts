import Stripe from 'stripe';
import { logger } from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';
import type { SendNotificationFn } from './webhook-helpers';

/**
 * Invoice payment succeeded — record payment, reactivate past_due subscriptions.
 */
export async function handleInvoicePaymentSucceeded(
  invoice: Stripe.Invoice,
  sendNotification: SendNotificationFn
): Promise<void> {
  logger.info('Invoice payment succeeded webhook received', {
    service: 'stripe-webhook',
    invoiceId: invoice.id,
  });

  try {
    const customerId = typeof invoice.customer === 'string'
      ? invoice.customer
      : invoice.customer?.id;

    if (!customerId) {
      logger.warn('Invoice missing customer ID', {
        service: 'stripe-webhook',
        invoiceId: invoice.id,
      });
      return;
    }

    const { data: user, error: userError } = await serverSupabase
      .from('profiles')
      .select('id, subscription_status')
      .eq('stripe_customer_id', customerId)
      .single();

    if (userError || !user) {
      logger.warn('User not found for invoice customer', {
        service: 'stripe-webhook',
        invoiceId: invoice.id,
        customerId,
      });
      return;
    }

    const subscriptionId = typeof invoice.subscription === 'string'
      ? invoice.subscription
      : invoice.subscription?.id;

    // Record in invoice_payments table
    try {
      await serverSupabase
        .from('invoice_payments')
        .upsert({
          invoice_id: invoice.id,
          user_id: user.id,
          subscription_id: subscriptionId || null,
          amount_paid: invoice.amount_paid,
          amount_due: invoice.amount_due,
          currency: invoice.currency,
          status: 'paid',
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'invoice_id' });
    } catch (recordError) {
      logger.error('Failed to record invoice payment', recordError, {
        service: 'stripe-webhook',
        invoiceId: invoice.id,
      });
    }

    // Reactivate subscription if it was past_due
    if (user.subscription_status === 'past_due') {
      await serverSupabase
        .from('profiles')
        .update({
          subscription_status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      await sendNotification(
        user.id,
        'Subscription Reactivated',
        'Your subscription payment has been processed successfully. Your account is now fully active.',
        'subscription_reactivated'
      );
    }

    logger.info('Invoice payment processed', {
      service: 'stripe-webhook',
      invoiceId: invoice.id,
      userId: user.id,
      amount: invoice.amount_paid,
    });
  } catch (error) {
    logger.error('Error in handleInvoicePaymentSucceeded', error, { service: 'stripe-webhook' });
    throw error;
  }
}

/**
 * Invoice payment failed — record failure, update subscription status, notify user.
 */
export async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice,
  sendNotification: SendNotificationFn
): Promise<void> {
  logger.info('Invoice payment failed webhook received', {
    service: 'stripe-webhook',
    invoiceId: invoice.id,
  });

  try {
    const customerId = typeof invoice.customer === 'string'
      ? invoice.customer
      : invoice.customer?.id;

    if (!customerId) {
      logger.warn('Invoice missing customer ID', {
        service: 'stripe-webhook',
        invoiceId: invoice.id,
      });
      return;
    }

    const { data: user, error: userError } = await serverSupabase
      .from('profiles')
      .select('id, email, role')
      .eq('stripe_customer_id', customerId)
      .single();

    if (userError || !user) {
      logger.warn('User not found for invoice customer', {
        service: 'stripe-webhook',
        invoiceId: invoice.id,
        customerId,
      });
      return;
    }

    const subscriptionId = typeof invoice.subscription === 'string'
      ? invoice.subscription
      : invoice.subscription?.id;

    // Record failed payment in invoice_payments
    try {
      await serverSupabase
        .from('invoice_payments')
        .upsert({
          invoice_id: invoice.id,
          user_id: user.id,
          subscription_id: subscriptionId || null,
          amount_paid: 0,
          amount_due: invoice.amount_due,
          currency: invoice.currency,
          status: 'failed',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'invoice_id' });
    } catch (recordError) {
      logger.error('Failed to record invoice payment failure', recordError, {
        service: 'stripe-webhook',
        invoiceId: invoice.id,
      });
    }

    // Update subscription status to past_due
    if (subscriptionId) {
      await serverSupabase
        .from('profiles')
        .update({
          subscription_status: 'past_due',
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (user.role === 'contractor') {
        await serverSupabase
          .from('contractor_profiles')
          .update({
            subscription_status: 'past_due',
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);
      }
    }

    // Send in-app notification
    await sendNotification(
      user.id,
      'Payment Failed',
      'We were unable to process your subscription payment. Please update your payment method to continue your subscription.',
      'invoice_payment_failed'
    );

    logger.warn('Invoice payment failed', {
      service: 'stripe-webhook',
      invoiceId: invoice.id,
      userId: user.id,
      amount: invoice.amount_due,
    });

    // Send email notification
    try {
      const { EmailService } = await import('@/lib/email-service');
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://mintenance.com';

      await EmailService.sendEmail({
        to: user.email,
        subject: 'Payment Failed - Action Required',
        html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #EF4444;">Payment Failed</h2>
          <p>We were unable to process your payment for invoice ${invoice.id}.</p>
          <p><strong>Amount:</strong> £${(invoice.amount_due / 100).toFixed(2)}</p>
          <p>Please update your payment method to continue your subscription.</p>
          <a href="${baseUrl}/settings/payment-methods" style="display: inline-block; margin-top: 20px; padding: 12px 24px; background-color: #3B82F6; color: white; text-decoration: none; border-radius: 6px;">
            Update Payment Method
          </a>
        </div>
      `,
        text: `Payment Failed\n\nWe were unable to process your payment for invoice ${invoice.id}.\nAmount: £${(invoice.amount_due / 100).toFixed(2)}\n\nPlease update your payment method at ${baseUrl}/settings/payment-methods`,
      });
    } catch (emailError) {
      logger.error('Failed to send payment failure email', emailError, {
        service: 'stripe-webhook',
        invoiceId: invoice.id,
        userId: user.id,
      });
    }
  } catch (error) {
    logger.error('Error in handleInvoicePaymentFailed', error, { service: 'stripe-webhook' });
    throw error;
  }
}
