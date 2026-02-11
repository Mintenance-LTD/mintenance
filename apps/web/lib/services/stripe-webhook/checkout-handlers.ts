import Stripe from 'stripe';
import { logger } from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';
import type { SendNotificationFn } from './webhook-helpers';

/**
 * Stripe Connect account updated — sync onboarding status.
 */
export async function handleAccountUpdated(
  account: Stripe.Account,
  _sendNotification: SendNotificationFn
): Promise<void> {
  logger.info('Stripe Connect account updated webhook received', {
    service: 'stripe-webhook',
    accountId: account.id,
  });

  try {
    const contractorId = account.metadata?.contractor_id;

    if (!contractorId) {
      logger.warn('Account updated webhook missing contractor_id metadata', {
        service: 'stripe-webhook',
        accountId: account.id,
      });
      return;
    }

    const isOnboarded = account.details_submitted && account.charges_enabled && account.payouts_enabled;

    const { error: userUpdateError } = await serverSupabase
      .from('profiles')
      .update({
        stripe_connect_account_id: account.id,
      })
      .eq('id', contractorId);

    if (userUpdateError) {
      logger.error('Failed to update profiles.stripe_connect_account_id', userUpdateError, {
        service: 'stripe-webhook',
        accountId: account.id,
        contractorId,
      });
    }

    const { error: payoutUpdateError } = await serverSupabase
      .from('contractor_payout_accounts')
      .update({
        stripe_account_id: account.id,
        account_complete: isOnboarded,
        updated_at: new Date().toISOString(),
      })
      .eq('contractor_id', contractorId);

    if (payoutUpdateError) {
      logger.error('Failed to update contractor_payout_accounts', payoutUpdateError, {
        service: 'stripe-webhook',
        accountId: account.id,
        contractorId,
      });
    }

    logger.info('Stripe Connect account synced successfully', {
      service: 'stripe-webhook',
      accountId: account.id,
      contractorId,
      isOnboarded,
    });
  } catch (error) {
    logger.error('Error in handleAccountUpdated', error, { service: 'stripe-webhook' });
    throw error;
  }
}

/**
 * Checkout session completed — handle subscription, setup, and payment modes.
 */
export async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
  stripe: Stripe,
  sendNotification: SendNotificationFn
): Promise<void> {
  logger.info('Checkout session completed webhook received', {
    service: 'stripe-webhook',
    sessionId: session.id,
    mode: session.mode,
  });

  try {
    if (session.mode === 'subscription') {
      await handleCheckoutSubscription(session);
      return;
    }

    if (session.mode === 'setup') {
      await handleCheckoutSetup(session, stripe);
      return;
    }

    // Payment mode — check if it's a marketplace payment
    const isMarketplacePayment = session.metadata?.isMarketplacePayment === 'true';
    const jobId = session.metadata?.jobId;

    if (!isMarketplacePayment || !jobId) {
      await recordCheckoutSession(session);
      logger.info('Non-marketplace checkout session recorded', {
        service: 'stripe-webhook',
        sessionId: session.id,
      });
      return;
    }

    // Marketplace payment — update escrow
    await handleCheckoutMarketplacePayment(session, jobId, stripe);
  } catch (error) {
    logger.error('Error in handleCheckoutSessionCompleted', error, { service: 'stripe-webhook' });
    throw error;
  }
}

/** Handle subscription checkout — record session */
async function handleCheckoutSubscription(session: Stripe.Checkout.Session): Promise<void> {
  const subscriptionId = typeof session.subscription === 'string'
    ? session.subscription
    : (session.subscription as Stripe.Subscription | null)?.id;

  await recordCheckoutSession(session);

  logger.info('Subscription checkout session recorded', {
    service: 'stripe-webhook',
    sessionId: session.id,
    subscriptionId,
  });
}

/** Handle setup checkout — store payment method on user profile */
async function handleCheckoutSetup(session: Stripe.Checkout.Session, stripe: Stripe): Promise<void> {
  const setupIntentId = typeof session.setup_intent === 'string'
    ? session.setup_intent
    : (session.setup_intent as Stripe.SetupIntent | null)?.id;

  if (!setupIntentId) {
    logger.warn('Setup checkout session has no setup intent', {
      service: 'stripe-webhook',
      sessionId: session.id,
    });
    return;
  }

  try {
    const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);
    const paymentMethodId = typeof setupIntent.payment_method === 'string'
      ? setupIntent.payment_method
      : setupIntent.payment_method?.id;

    if (paymentMethodId && session.customer) {
      const customerId = typeof session.customer === 'string'
        ? session.customer
        : session.customer?.id;

      if (customerId) {
        await serverSupabase
          .from('profiles')
          .update({
            stripe_default_payment_method: paymentMethodId,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_customer_id', customerId);
      }
    }

    await recordCheckoutSession(session);

    logger.info('Setup checkout session processed', {
      service: 'stripe-webhook',
      sessionId: session.id,
      paymentMethodId,
    });
  } catch (setupError) {
    logger.error('Failed to process setup checkout session', setupError, {
      service: 'stripe-webhook',
      sessionId: session.id,
    });
  }
}

/** Handle marketplace payment checkout — update escrow transaction */
async function handleCheckoutMarketplacePayment(
  session: Stripe.Checkout.Session,
  jobId: string,
  stripe: Stripe
): Promise<void> {
  const paymentIntentId = typeof session.payment_intent === 'string'
    ? session.payment_intent
    : session.payment_intent?.id;

  if (!paymentIntentId) {
    logger.warn('Checkout session has no payment intent', {
      service: 'stripe-webhook',
      sessionId: session.id,
    });
    return;
  }

  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
  const chargeId = typeof paymentIntent.latest_charge === 'string'
    ? paymentIntent.latest_charge
    : paymentIntent.latest_charge?.id;

  const { data: escrowTransaction, error: escrowError } = await serverSupabase
    .from('escrow_transactions')
    .update({
      status: 'held',
      payment_intent_id: paymentIntentId,
      stripe_checkout_session_id: session.id,
      stripe_charge_id: chargeId || null,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_checkout_session_id', session.id)
    .select()
    .single();

  if (escrowError) {
    logger.error('Failed to update escrow transaction from checkout session', escrowError, {
      service: 'stripe-webhook',
      sessionId: session.id,
      paymentIntentId,
    });
    return;
  }

  if (!escrowTransaction) {
    logger.warn('No escrow transaction found for checkout session', {
      service: 'stripe-webhook',
      sessionId: session.id,
    });
    return;
  }

  // Backfill payer/payee IDs if missing
  if (!escrowTransaction.payer_id || !escrowTransaction.payee_id) {
    const { data: job } = await serverSupabase
      .from('jobs')
      .select('homeowner_id, contractor_id')
      .eq('id', escrowTransaction.job_id)
      .single();

    if (job) {
      await serverSupabase
        .from('escrow_transactions')
        .update({
          payer_id: job.homeowner_id,
          payee_id: job.contractor_id,
        })
        .eq('id', escrowTransaction.id);

      logger.info('Backfilled payer_id and payee_id for escrow from checkout', {
        service: 'stripe-webhook',
        escrowId: escrowTransaction.id,
        homeownerId: job.homeowner_id,
        contractorId: job.contractor_id,
      });
    }
  }

  // Update platform fee and contractor payout if present
  if (session.metadata?.platformFeeAmount) {
    const platformFee = Math.round(Number(session.metadata.platformFeeAmount));
    const totalAmount = Math.round(Number(session.metadata.totalAmount || escrowTransaction.amount));
    const contractorAmount = totalAmount - platformFee;

    await serverSupabase
      .from('escrow_transactions')
      .update({
        platform_fee: platformFee,
        contractor_payout: contractorAmount,
      })
      .eq('id', escrowTransaction.id);
  }

  // Update job payment status
  await serverSupabase
    .from('jobs')
    .update({
      payment_status: 'paid',
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId);

  logger.info('Escrow transaction updated from checkout session', {
    service: 'stripe-webhook',
    escrowId: escrowTransaction.id,
    sessionId: session.id,
    paymentIntentId,
  });
}

/** Record checkout session for audit trail */
async function recordCheckoutSession(session: Stripe.Checkout.Session): Promise<void> {
  try {
    const customerId = typeof session.customer === 'string'
      ? session.customer
      : session.customer?.id;

    let userId: string | null = null;
    if (customerId) {
      const { data: user } = await serverSupabase
        .from('profiles')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .single();
      userId = user?.id || null;
    }

    const paymentIntentId = typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id;

    const subscriptionId = typeof session.subscription === 'string'
      ? session.subscription
      : (session.subscription as Stripe.Subscription | null)?.id;

    await serverSupabase
      .from('checkout_sessions')
      .upsert({
        session_id: session.id,
        user_id: userId,
        mode: session.mode || 'payment',
        status: 'complete',
        payment_intent_id: paymentIntentId || null,
        subscription_id: subscriptionId || null,
        amount_total: session.amount_total,
        currency: session.currency || 'gbp',
        metadata: session.metadata || {},
        updated_at: new Date().toISOString(),
      }, { onConflict: 'session_id' });
  } catch (recordError) {
    logger.error('Failed to record checkout session', recordError, {
      service: 'stripe-webhook',
      sessionId: session.id,
    });
  }
}
