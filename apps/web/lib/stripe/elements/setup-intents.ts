/**
 * SetupIntent service — drives the Stripe Elements "add payment method" flow.
 *
 * Flow:
 *   1. Client mounts <PaymentElement /> and calls POST /api/payments/setup-intent
 *   2. Server creates/returns a customer, then creates a SetupIntent
 *   3. Client calls stripe.confirmSetup({ elements }) with the client_secret
 *   4. Stripe redirects to return_url on success; webhook fires setup_intent.succeeded
 *   5. Webhook attaches the payment_method to the customer + saves in payment_methods table
 */
import { stripe } from '@/lib/stripe';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { HOMEOWNER_PAYMENT_METHOD_TYPES } from '../connect/config';
import type { SetupIntentCreateResponse } from '../connect/types';

/**
 * Get or create a Stripe customer for a user. Idempotent.
 */
export async function ensureStripeCustomer(
  userId: string,
  email: string,
  name?: string,
): Promise<string> {
  const { data: profile, error } = await serverSupabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', userId)
    .single();

  if (error || !profile) {
    throw new Error(`User profile not found: ${userId}`);
  }

  if (profile.stripe_customer_id) return profile.stripe_customer_id;

  const customer = await stripe.customers.create({
    email,
    name,
    metadata: { mintenance_user_id: userId },
  });

  const { error: updateError } = await serverSupabase
    .from('profiles')
    .update({ stripe_customer_id: customer.id })
    .eq('id', userId);

  if (updateError) {
    logger.error(
      'Failed to persist stripe_customer_id after customer creation',
      updateError,
      { service: 'stripe-elements', userId, stripeCustomerId: customer.id },
    );
    throw new Error('Failed to link Stripe customer to profile');
  }

  return customer.id;
}

/**
 * Create a SetupIntent for off-session use (saving a payment method for future use).
 * Returns the client_secret for the frontend to call stripe.confirmSetup() with.
 */
export async function createSetupIntentForUser(
  userId: string,
  email: string,
  name?: string,
): Promise<SetupIntentCreateResponse> {
  const customerId = await ensureStripeCustomer(userId, email, name);

  const setupIntent = await stripe.setupIntents.create({
    customer: customerId,
    payment_method_types: [...HOMEOWNER_PAYMENT_METHOD_TYPES],
    usage: 'off_session',
    metadata: { mintenance_user_id: userId },
  });

  // Track for debugging/idempotency
  await serverSupabase.from('stripe_setup_intents').insert({
    user_id: userId,
    stripe_setup_intent_id: setupIntent.id,
    stripe_customer_id: customerId,
    status: setupIntent.status,
  });

  if (!setupIntent.client_secret) {
    throw new Error('SetupIntent created without client_secret');
  }

  return {
    clientSecret: setupIntent.client_secret,
    setupIntentId: setupIntent.id,
    customerId,
  };
}

/**
 * Called from the setup_intent.succeeded webhook.
 * Attaches the payment method to our local payment_methods table.
 */
export async function handleSetupIntentSucceeded(params: {
  setupIntentId: string;
  customerId: string;
  paymentMethodId: string;
  userId: string;
}): Promise<void> {
  // Update intent tracking row
  await serverSupabase
    .from('stripe_setup_intents')
    .update({
      status: 'succeeded',
      payment_method_id: params.paymentMethodId,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_setup_intent_id', params.setupIntentId);

  // Fetch payment method details from Stripe
  const pm = await stripe.paymentMethods.retrieve(params.paymentMethodId);

  const row: Record<string, unknown> = {
    user_id: params.userId,
    stripe_payment_method_id: pm.id,
    type: pm.type,
    is_default: false,
  };

  if (pm.type === 'card' && pm.card) {
    row.last4 = pm.card.last4;
    row.brand = pm.card.brand;
    row.exp_month = pm.card.exp_month;
    row.exp_year = pm.card.exp_year;
  } else if (pm.type === 'bacs_debit' && pm.bacs_debit) {
    row.last4 = pm.bacs_debit.last4;
    row.brand = 'bacs_debit';
  }

  await serverSupabase.from('payment_methods').insert(row);

  logger.info('Payment method attached', {
    service: 'stripe-elements',
    userId: params.userId,
    paymentMethodId: pm.id,
    type: pm.type,
  });
}
