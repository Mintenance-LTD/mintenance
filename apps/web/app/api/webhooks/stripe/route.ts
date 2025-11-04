import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createHash } from 'crypto';
import { logger } from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';

// Lazy-initialize Stripe to avoid errors when STRIPE_SECRET_KEY is not set
const getStripeInstance = () => {
  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey) {
    throw new Error('STRIPE_SECRET_KEY not configured');
  }
  return new Stripe(apiKey);
};

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Ensure Node.js runtime for Stripe SDK and raw body access
export const runtime = 'nodejs';

import { checkWebhookRateLimit } from '@/lib/rate-limiter';

/**
 * Stripe Webhook Handler
 *
 * Handles Stripe webhook events with signature verification for security.
 *
 * Security features:
 * - Signature verification (prevents replay attacks and tampering)
 * - Rate limiting (prevents DOS attacks)
 * - Idempotency (prevents duplicate processing)
 * - Comprehensive logging and error handling
 *
 * Supported events:
 * - payment_intent.succeeded - Payment completed successfully
 * - payment_intent.payment_failed - Payment failed
 * - payment_intent.canceled - Payment canceled
 * - charge.refunded - Payment refunded
 * - customer.subscription.created - Subscription created
 * - customer.subscription.updated - Subscription updated
 * - customer.subscription.deleted - Subscription canceled
 * - invoice.payment_succeeded - Subscription payment succeeded
 * - invoice.payment_failed - Subscription payment failed
 */
export async function POST(request: NextRequest) {
  // Rate limiting
  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0] ||
                   request.headers.get('x-real-ip') ||
                   'unknown';

  const rateLimitResult = await checkWebhookRateLimit(clientIp);
  if (!rateLimitResult.allowed) {
    logger.warn('Webhook rate limit exceeded', {
      service: 'stripe-webhook',
      clientIp
    });
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      {
        status: 429,
        headers: {
          'Retry-After': '60'
        }
      }
    );
  }
  try {
    // Get the raw body for signature verification
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      try {
        logger.error('Webhook missing Stripe signature', null, { service: 'stripe-webhook' });
      } catch {
        // Logger might fail, ignore it
      }
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }

    if (!webhookSecret) {
      // SECURITY: Reject all webhook requests without proper configuration
      // This prevents bypassing signature verification
      logger.error('STRIPE_WEBHOOK_SECRET not configured - rejecting webhook', null, {
        service: 'stripe-webhook',
        eventType: 'unknown'
      });
      return NextResponse.json(
        {
          error: 'Webhook endpoint not properly configured',
          message: 'STRIPE_WEBHOOK_SECRET environment variable is required for webhook signature verification'
        },
        { status: 503 } // Service Unavailable - indicates server misconfiguration
      );
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      const stripe = getStripeInstance();
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logger.error('Webhook signature verification failed', err, { service: 'stripe-webhook' });
      return NextResponse.json(
        { error: `Webhook signature verification failed: ${errorMessage}` },
        { status: 400 }
      );
    }

    // Validate timestamp to prevent replay attacks (60 second tolerance)
    // SECURITY: Reduced from 5 minutes to 60 seconds for better replay attack protection
    const eventTimestamp = event.created;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const timestampTolerance = 60; // 60 seconds

    if (Math.abs(currentTimestamp - eventTimestamp) > timestampTolerance) {
      logger.warn('Webhook event timestamp outside tolerance window', {
        service: 'stripe-webhook',
        eventId: event.id,
        eventTimestamp,
        currentTimestamp,
        timeDifference: Math.abs(currentTimestamp - eventTimestamp)
      });
      return NextResponse.json(
        { error: 'Event timestamp outside acceptable range' },
        { status: 400 }
      );
    }

    // Generate idempotency key from event ID and type
    const idempotencyKey = createHash('sha256')
      .update(`${event.id}-${event.type}`)
      .digest('hex');

    // Check for duplicate events
    const { data: idempotencyResult, error: idempotencyError } = await serverSupabase
      .rpc('check_webhook_idempotency', {
        p_idempotency_key: idempotencyKey,
        p_event_type: event.type,
        p_event_id: event.id,
        p_source: 'stripe',
        p_payload: event
      });

    if (idempotencyError) {
      logger.error('Webhook idempotency check failed', idempotencyError, { service: 'stripe-webhook' });
      return NextResponse.json(
        { error: 'Idempotency check failed' },
        { status: 500 }
      );
    }

    if (idempotencyResult && idempotencyResult[0]?.is_duplicate) {
      logger.info('Duplicate webhook event detected', { 
        service: 'stripe-webhook', 
        eventType: event.type, 
        eventId: event.id 
      });
      return NextResponse.json({ received: true, duplicate: true }, { status: 200 });
    }

    const eventRecordId = idempotencyResult[0]?.event_id;
    logger.info('Processing webhook event', { 
      service: 'stripe-webhook', 
      eventType: event.type, 
      eventId: event.id 
    });

    try {
      // Handle the event
      switch (event.type) {
        case 'payment_intent.succeeded':
          await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
          break;

        case 'payment_intent.payment_failed':
          await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
          break;

        case 'payment_intent.canceled':
          await handlePaymentIntentCanceled(event.data.object as Stripe.PaymentIntent);
          break;

        case 'charge.refunded':
          await handleChargeRefunded(event.data.object as Stripe.Charge);
          break;

        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
          break;

        case 'customer.subscription.deleted':
          await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;

        case 'invoice.payment_succeeded':
          await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
          break;

        case 'invoice.payment_failed':
          await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
          break;

        default:
          logger.info('Unhandled webhook event type', { 
            service: 'stripe-webhook', 
            eventType: event.type 
          });
      }

      // Mark event as processed
      await serverSupabase.rpc('mark_webhook_processed', {
        p_event_id: eventRecordId,
        p_status: 'processed'
      });

      return NextResponse.json({ received: true }, { status: 200 });

    } catch (processingError: unknown) {
      const errorMessage = processingError instanceof Error ? processingError.message : String(processingError);
      logger.error('Webhook event processing failed', processingError, { 
        service: 'stripe-webhook',
        eventId: eventRecordId 
      });
      
      // Mark event as failed
      await serverSupabase.rpc('mark_webhook_processed', {
        p_event_id: eventRecordId,
        p_status: 'failed',
        p_error_message: errorMessage
      });

      return NextResponse.json(
        { error: 'Event processing failed', details: errorMessage },
        { status: 500 }
      );
    }

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Webhook handler failed', error, { service: 'stripe-webhook' });
    return NextResponse.json(
      { error: 'Webhook handler failed', details: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * Handle successful payment
 */
async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  logger.info('Payment succeeded webhook received', { 
    service: 'stripe-webhook',
    paymentIntentId: paymentIntent.id 
  });

  try {
    // Update escrow transaction status
    const { data: escrowTransaction, error: escrowError } = await serverSupabase
      .from('escrow_transactions')
      .update({
        status: 'held',
        stripe_payment_intent_id: paymentIntent.id,
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_payment_intent_id', paymentIntent.id)
      .select()
      .single();

    if (escrowError) {
      logger.error('Failed to update escrow transaction', escrowError, { 
        service: 'stripe-webhook',
        paymentIntentId: paymentIntent.id 
      });
      return;
    }

    if (!escrowTransaction) {
      logger.warn('No escrow transaction found for payment intent', { 
        service: 'stripe-webhook',
        paymentIntentId: paymentIntent.id 
      });
      return;
    }

    logger.info('Escrow transaction updated to held', { 
      service: 'stripe-webhook',
      escrowId: escrowTransaction.id 
    });

    // Optionally update job status
    const { error: jobError } = await serverSupabase
      .from('jobs')
      .update({
        payment_status: 'paid',
        updated_at: new Date().toISOString(),
      })
      .eq('id', escrowTransaction.job_id);

    if (jobError) {
      logger.error('Failed to update job payment status', jobError, { 
        service: 'stripe-webhook',
        jobId: escrowTransaction.job_id 
      });
    }
  } catch (error) {
    logger.error('Error in handlePaymentIntentSucceeded', error, { service: 'stripe-webhook' });
    throw error;
  }
}

/**
 * Handle failed payment
 */
async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  logger.info('Payment failed webhook received', { 
    service: 'stripe-webhook',
    paymentIntentId: paymentIntent.id 
  });

  try {
    // Update escrow transaction status
    const { error: escrowError } = await serverSupabase
      .from('escrow_transactions')
      .update({
        status: 'failed',
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_payment_intent_id', paymentIntent.id);

    if (escrowError) {
      logger.error('Failed to update escrow transaction status', escrowError, { 
        service: 'stripe-webhook',
        paymentIntentId: paymentIntent.id 
      });
    }

    logger.info('Payment marked as failed', { 
      service: 'stripe-webhook',
      paymentIntentId: paymentIntent.id 
    });
  } catch (error) {
    logger.error('Error in handlePaymentIntentFailed', error, { service: 'stripe-webhook' });
    throw error;
  }
}

/**
 * Handle canceled payment
 */
async function handlePaymentIntentCanceled(paymentIntent: Stripe.PaymentIntent) {
  logger.info('Payment canceled webhook received', { 
    service: 'stripe-webhook',
    paymentIntentId: paymentIntent.id 
  });

  try {
    // Update escrow transaction status
    const { error: escrowError } = await serverSupabase
      .from('escrow_transactions')
      .update({
        status: 'canceled',
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_payment_intent_id', paymentIntent.id);

    if (escrowError) {
      logger.error('Failed to update canceled payment status', escrowError, { 
        service: 'stripe-webhook',
        paymentIntentId: paymentIntent.id 
      });
    }

    logger.info('Payment marked as canceled', { 
      service: 'stripe-webhook',
      paymentIntentId: paymentIntent.id 
    });
  } catch (error) {
    logger.error('Error in handlePaymentIntentCanceled', error, { service: 'stripe-webhook' });
    throw error;
  }
}

/**
 * Handle refunded charge
 */
async function handleChargeRefunded(charge: Stripe.Charge) {
  logger.info('Charge refunded webhook received', { 
    service: 'stripe-webhook',
    chargeId: charge.id 
  });

  try {
    const paymentIntentId = charge.payment_intent as string;

    if (!paymentIntentId) {
      logger.warn('Charge has no payment intent', { 
        service: 'stripe-webhook',
        chargeId: charge.id 
      });
      return;
    }

    // Update escrow transaction status
    const { error: escrowError } = await serverSupabase
      .from('escrow_transactions')
      .update({
        status: 'refunded',
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_payment_intent_id', paymentIntentId);

    if (escrowError) {
      logger.error('Failed to update refunded payment status', escrowError, { 
        service: 'stripe-webhook',
        paymentIntentId 
      });
    }

    logger.info('Payment marked as refunded', { 
      service: 'stripe-webhook',
      paymentIntentId 
    });
  } catch (error) {
    logger.error('Error in handleChargeRefunded', error, { service: 'stripe-webhook' });
    throw error;
  }
}

/**
 * Handle subscription created/updated
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  logger.info('Subscription updated webhook received', { 
    service: 'stripe-webhook',
    subscriptionId: subscription.id 
  });

  try {
    const contractorId = subscription.metadata?.contractorId;
    if (!contractorId) {
      logger.warn('Subscription missing contractorId metadata', { 
        service: 'stripe-webhook',
        subscriptionId: subscription.id 
      });
      return;
    }

    const planType = subscription.metadata?.planType || 'basic';
    const currentPeriodStart = new Date(subscription.current_period_start * 1000);
    const currentPeriodEnd = new Date(subscription.current_period_end * 1000);
    const trialEnd = subscription.trial_end ? new Date(subscription.trial_end * 1000) : null;

    // Determine status
    let status: string = 'active';
    if (subscription.status === 'trialing') {
      status = 'trial';
    } else if (subscription.status === 'past_due') {
      status = 'past_due';
    } else if (subscription.status === 'canceled' || subscription.cancel_at_period_end) {
      status = subscription.cancel_at_period_end ? 'active' : 'canceled';
    } else if (subscription.status === 'unpaid') {
      status = 'unpaid';
    }

    // Update subscription in database
    const { error: updateError } = await serverSupabase
      .from('contractor_subscriptions')
      .upsert({
        stripe_subscription_id: subscription.id,
        contractor_id: contractorId,
        stripe_customer_id: subscription.customer as string,
        stripe_price_id: subscription.items.data[0]?.price.id || '',
        plan_type: planType,
        plan_name: planType.charAt(0).toUpperCase() + planType.slice(1),
        status,
        amount: subscription.items.data[0]?.price.unit_amount ? subscription.items.data[0].price.unit_amount / 100 : 0,
        currency: subscription.currency,
        trial_start: subscription.trial_start ? new Date(subscription.trial_start * 1000).toISOString() : null,
        trial_end: trialEnd ? trialEnd.toISOString() : null,
        current_period_start: currentPeriodStart.toISOString(),
        current_period_end: currentPeriodEnd.toISOString(),
        cancel_at_period_end: subscription.cancel_at_period_end || false,
        canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'stripe_subscription_id',
      });

    if (updateError) {
      logger.error('Failed to update subscription', updateError, { 
        service: 'stripe-webhook',
        subscriptionId: subscription.id 
      });
      return;
    }

    // Update user subscription status
    await serverSupabase
      .from('users')
      .update({ subscription_status: status })
      .eq('id', contractorId);

    logger.info('Subscription updated successfully', { 
      service: 'stripe-webhook',
      subscriptionId: subscription.id,
      contractorId 
    });
  } catch (error) {
    logger.error('Error in handleSubscriptionUpdated', error, { service: 'stripe-webhook' });
    throw error;
  }
}

/**
 * Handle subscription deleted
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  logger.info('Subscription deleted webhook received', { 
    service: 'stripe-webhook',
    subscriptionId: subscription.id 
  });

  try {
    const { error: updateError } = await serverSupabase
      .from('contractor_subscriptions')
      .update({
        status: 'canceled',
        canceled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_subscription_id', subscription.id);

    if (updateError) {
      logger.error('Failed to update canceled subscription', updateError, { 
        service: 'stripe-webhook',
        subscriptionId: subscription.id 
      });
      return;
    }

    const contractorId = subscription.metadata?.contractorId;
    if (contractorId) {
      await serverSupabase
        .from('users')
        .update({ subscription_status: 'expired' })
        .eq('id', contractorId);
    }

    logger.info('Subscription marked as canceled', { 
      service: 'stripe-webhook',
      subscriptionId: subscription.id 
    });
  } catch (error) {
    logger.error('Error in handleSubscriptionDeleted', error, { service: 'stripe-webhook' });
    throw error;
  }
}

/**
 * Handle successful subscription invoice payment
 */
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  logger.info('Invoice payment succeeded webhook received', { 
    service: 'stripe-webhook',
    invoiceId: invoice.id 
  });

  try {
    const subscriptionId = invoice.subscription as string;
    if (!subscriptionId) {
      return; // Not a subscription invoice
    }

    // Get subscription to find contractor
    const { data: subscription } = await serverSupabase
      .from('contractor_subscriptions')
      .select('id, contractor_id')
      .eq('stripe_subscription_id', subscriptionId)
      .single();

    if (!subscription) {
      logger.warn('Subscription not found for invoice', { 
        service: 'stripe-webhook',
        subscriptionId 
      });
      return;
    }

    // Record payment in payment_tracking
    const amount = invoice.amount_paid / 100; // Convert from cents
    const stripeFee = (invoice.amount_paid * 0.029 + 30) / 100; // 2.9% + £0.30
    const netRevenue = amount - stripeFee;

    await serverSupabase
      .from('payment_tracking')
      .insert({
        payment_type: 'subscription',
        contractor_id: subscription.contractor_id,
        subscription_id: subscription.id,
        amount,
        currency: invoice.currency || 'gbp',
        stripe_fee: stripeFee,
        net_revenue: netRevenue,
        status: 'completed',
        stripe_invoice_id: invoice.id,
        stripe_payment_intent_id: invoice.payment_intent as string,
        completed_at: new Date().toISOString(),
      });

    logger.info('Subscription payment recorded', { 
      service: 'stripe-webhook',
      invoiceId: invoice.id,
      contractorId: subscription.contractor_id 
    });
  } catch (error) {
    logger.error('Error in handleInvoicePaymentSucceeded', error, { service: 'stripe-webhook' });
    throw error;
  }
}

/**
 * Handle failed subscription invoice payment
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  logger.info('Invoice payment failed webhook received', { 
    service: 'stripe-webhook',
    invoiceId: invoice.id 
  });

  try {
    const subscriptionId = invoice.subscription as string;
    if (!subscriptionId) {
      return;
    }

    // Update subscription status to past_due
    await serverSupabase
      .from('contractor_subscriptions')
      .update({
        status: 'past_due',
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_subscription_id', subscriptionId);

    logger.info('Subscription marked as past_due', { 
      service: 'stripe-webhook',
      subscriptionId 
    });
  } catch (error) {
    logger.error('Error in handleInvoicePaymentFailed', error, { service: 'stripe-webhook' });
    throw error;
  }
}

// Disable body parsing to allow raw body for signature verification
export const config = {
  api: {
    bodyParser: false,
  },
};
// Note: Next.js App Router route handlers do not use pages API config. Raw
// body is accessed via request.text() above, so this config export is not
// required and can be safely removed.
