import Stripe from 'stripe';
import { logger } from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { handleSetupIntentSucceeded } from '@/lib/stripe/elements/setup-intents';
import type { SendNotificationFn } from './webhook-helpers';

/**
 * setup_intent.succeeded — Elements flow completed successfully.
 * Persist the attached payment method to the payment_methods table.
 */
export async function handleSetupIntentWebhookSucceeded(
  setupIntent: Stripe.SetupIntent,
  _sendNotification: SendNotificationFn,
): Promise<void> {
  const customerId =
    typeof setupIntent.customer === 'string'
      ? setupIntent.customer
      : setupIntent.customer?.id;
  const paymentMethodId =
    typeof setupIntent.payment_method === 'string'
      ? setupIntent.payment_method
      : setupIntent.payment_method?.id;

  if (!customerId || !paymentMethodId) {
    logger.warn('setup_intent.succeeded missing customer or payment_method', {
      service: 'stripe-webhook',
      setupIntentId: setupIntent.id,
    });
    return;
  }

  // Resolve user from customer id
  const { data: profile } = await serverSupabase
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!profile) {
    logger.warn('No profile found for Stripe customer in setup_intent.succeeded', {
      service: 'stripe-webhook',
      customerId,
      setupIntentId: setupIntent.id,
    });
    return;
  }

  await handleSetupIntentSucceeded({
    setupIntentId: setupIntent.id,
    customerId,
    paymentMethodId,
    userId: profile.id,
  });
}

/**
 * setup_intent.setup_failed — Elements confirmation failed.
 * Record the failure reason for debugging/support.
 */
export async function handleSetupIntentWebhookFailed(
  setupIntent: Stripe.SetupIntent,
  _sendNotification: SendNotificationFn,
): Promise<void> {
  logger.warn('SetupIntent failed', {
    service: 'stripe-webhook',
    setupIntentId: setupIntent.id,
    lastError: setupIntent.last_setup_error?.message,
  });

  await serverSupabase
    .from('stripe_setup_intents')
    .update({
      status: 'canceled',
      last_error: setupIntent.last_setup_error?.message ?? 'unknown',
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_setup_intent_id', setupIntent.id);
}

/**
 * payment_method.detached — user removed a payment method from their account.
 * Remove the corresponding row from our local payment_methods table.
 */
export async function handlePaymentMethodDetached(
  paymentMethod: Stripe.PaymentMethod,
  _sendNotification: SendNotificationFn,
): Promise<void> {
  await serverSupabase
    .from('payment_methods')
    .delete()
    .eq('stripe_payment_method_id', paymentMethod.id);

  logger.info('Payment method detached + removed from DB', {
    service: 'stripe-webhook',
    paymentMethodId: paymentMethod.id,
  });
}
