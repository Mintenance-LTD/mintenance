import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createHash } from 'crypto';
import { logger } from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { env } from '@/lib/env';

// Lazy-initialize Stripe to avoid errors when STRIPE_SECRET_KEY is not set
const getStripeInstance = () => {
  const apiKey = env.STRIPE_SECRET_KEY;
  if (!apiKey) {
    throw new Error('STRIPE_SECRET_KEY not configured');
  }
  return new Stripe(apiKey);
};

const webhookSecret = env.STRIPE_WEBHOOK_SECRET;

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

        case 'account.updated':
          await handleAccountUpdated(event.data.object as Stripe.Account);
          break;

        case 'checkout.session.completed':
          await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
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
 * Handle subscription created or updated
 * Syncs subscription status with user account
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  logger.info('Subscription updated webhook received', { 
    service: 'stripe-webhook',
    subscriptionId: subscription.id 
  });

  try {
    // Get customer ID from subscription
    const customerId = typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer?.id;

    if (!customerId) {
      logger.warn('Subscription missing customer ID', { 
        service: 'stripe-webhook',
        subscriptionId: subscription.id 
      });
      return;
    }

    // Find user by Stripe customer ID
    const { data: user, error: userError } = await serverSupabase
      .from('users')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .single();

    if (userError || !user) {
      logger.warn('User not found for subscription customer', { 
        service: 'stripe-webhook',
        subscriptionId: subscription.id,
        customerId 
      });
      return;
    }

    // Update subscription status in database if subscription table exists
    // For now, just log the subscription status
    logger.info('Subscription status synced', { 
      service: 'stripe-webhook',
      subscriptionId: subscription.id,
      userId: user.id,
      status: subscription.status 
    });
  } catch (error) {
    logger.error('Error in handleSubscriptionUpdated', error, { service: 'stripe-webhook' });
    throw error;
  }
}

/**
 * Handle subscription deleted/canceled
 * Updates user account when subscription is canceled
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  logger.info('Subscription deleted webhook received', { 
    service: 'stripe-webhook',
    subscriptionId: subscription.id 
  });

  try {
    // Get customer ID from subscription
    const customerId = typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer?.id;

    if (!customerId) {
      logger.warn('Subscription missing customer ID', { 
        service: 'stripe-webhook',
        subscriptionId: subscription.id 
      });
      return;
    }

    // Find user by Stripe customer ID
    const { data: user, error: userError } = await serverSupabase
      .from('users')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .single();

    if (userError || !user) {
      logger.warn('User not found for subscription customer', { 
        service: 'stripe-webhook',
        subscriptionId: subscription.id,
        customerId 
      });
      return;
    }

    // Update subscription status in database if subscription table exists
    // For now, just log the cancellation
    logger.info('Subscription canceled', { 
      service: 'stripe-webhook',
      subscriptionId: subscription.id,
      userId: user.id 
    });
  } catch (error) {
    logger.error('Error in handleSubscriptionDeleted', error, { service: 'stripe-webhook' });
    throw error;
  }
}

/**
 * Handle successful invoice payment
 * Updates subscription payment status
 */
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  logger.info('Invoice payment succeeded webhook received', { 
    service: 'stripe-webhook',
    invoiceId: invoice.id 
  });

  try {
    // Get customer ID from invoice
    const customerId = typeof invoice.customer === 'string'
      ? invoice.customer
      : invoice.customer?.id;

    if (!customerId) {
      logger.warn('Invoice missing customer ID', { 
        service: 'stripe-webhook',
        invoiceId: invoice.id 
      });
      return;
    }

    // Find user by Stripe customer ID
    const { data: user, error: userError } = await serverSupabase
      .from('users')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .single();

    if (userError || !user) {
      logger.warn('User not found for invoice customer', { 
        service: 'stripe-webhook',
        invoiceId: invoice.id,
        customerId 
      });
      return;
    }

    // Log successful payment
    logger.info('Invoice payment processed', { 
      service: 'stripe-webhook',
      invoiceId: invoice.id,
      userId: user.id,
      amount: invoice.amount_paid 
    });
  } catch (error) {
    logger.error('Error in handleInvoicePaymentSucceeded', error, { service: 'stripe-webhook' });
    throw error;
  }
}

/**
 * Handle failed invoice payment
 * Notifies user of payment failure
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  logger.info('Invoice payment failed webhook received', { 
    service: 'stripe-webhook',
    invoiceId: invoice.id 
  });

  try {
    // Get customer ID from invoice
    const customerId = typeof invoice.customer === 'string'
      ? invoice.customer
      : invoice.customer?.id;

    if (!customerId) {
      logger.warn('Invoice missing customer ID', { 
        service: 'stripe-webhook',
        invoiceId: invoice.id 
      });
      return;
    }

    // Find user by Stripe customer ID
    const { data: user, error: userError } = await serverSupabase
      .from('users')
      .select('id, email')
      .eq('stripe_customer_id', customerId)
      .single();

    if (userError || !user) {
      logger.warn('User not found for invoice customer', { 
        service: 'stripe-webhook',
        invoiceId: invoice.id,
        customerId 
      });
      return;
    }

    // Log payment failure
    logger.warn('Invoice payment failed', { 
      service: 'stripe-webhook',
      invoiceId: invoice.id,
      userId: user.id,
      amount: invoice.amount_due 
    });

    // Send email notification to user about payment failure
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
            <p><strong>Amount:</strong> ${(invoice.amount_due / 100).toFixed(2)} ${invoice.currency.toUpperCase()}</p>
            <p>Please update your payment method to continue your subscription.</p>
            <a href="${baseUrl}/account/billing" style="display: inline-block; margin-top: 20px; padding: 12px 24px; background-color: #3B82F6; color: white; text-decoration: none; border-radius: 6px;">
              Update Payment Method
            </a>
          </div>
        `,
        text: `Payment Failed\n\nWe were unable to process your payment for invoice ${invoice.id}.\nAmount: ${(invoice.amount_due / 100).toFixed(2)} ${invoice.currency.toUpperCase()}\n\nPlease update your payment method at ${baseUrl}/account/billing`,
      });
    } catch (emailError) {
      // Log email error but don't fail the webhook
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

/**
 * Handle Stripe Connect account updated
 * Syncs account status when contractor completes onboarding
 */
async function handleAccountUpdated(account: Stripe.Account) {
  logger.info('Stripe Connect account updated webhook received', { 
    service: 'stripe-webhook',
    accountId: account.id 
  });

  try {
    // Get contractor ID from account metadata
    const contractorId = account.metadata?.contractor_id;
    
    if (!contractorId) {
      logger.warn('Account updated webhook missing contractor_id metadata', { 
        service: 'stripe-webhook',
        accountId: account.id 
      });
      return;
    }

    // Check if account is fully onboarded
    const isOnboarded = account.details_submitted && account.charges_enabled && account.payouts_enabled;

    // Update users table with stripe_connect_account_id
    const { error: userUpdateError } = await serverSupabase
      .from('users')
      .update({
        stripe_connect_account_id: account.id,
      })
      .eq('id', contractorId);

    if (userUpdateError) {
      logger.error('Failed to update users.stripe_connect_account_id', userUpdateError, { 
        service: 'stripe-webhook',
        accountId: account.id,
        contractorId 
      });
    }

    // Update contractor_payout_accounts table
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
        contractorId 
      });
    }

    logger.info('Stripe Connect account synced successfully', { 
      service: 'stripe-webhook',
      accountId: account.id,
      contractorId,
      isOnboarded 
    });
  } catch (error) {
    logger.error('Error in handleAccountUpdated', error, { service: 'stripe-webhook' });
    throw error;
  }
}

/**
 * Handle completed checkout session
 * Updates escrow transaction status when Embedded Checkout payment succeeds
 */
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  logger.info('Checkout session completed webhook received', { 
    service: 'stripe-webhook',
    sessionId: session.id 
  });

  try {
    // Check if this is a marketplace payment (has jobId in metadata)
    const isMarketplacePayment = session.metadata?.isMarketplacePayment === 'true';
    const jobId = session.metadata?.jobId;

    if (!isMarketplacePayment || !jobId) {
      // Not a marketplace payment, nothing to do
      logger.info('Checkout session is not a marketplace payment, skipping escrow update', {
        service: 'stripe-webhook',
        sessionId: session.id,
      });
      return;
    }

    // Get payment intent ID from session
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

    // Retrieve payment intent to get charge details
    const stripe = getStripeInstance();
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    const chargeId = typeof paymentIntent.latest_charge === 'string'
      ? paymentIntent.latest_charge
      : paymentIntent.latest_charge?.id;

    // Update escrow transaction with payment intent ID and status
    const { data: escrowTransaction, error: escrowError } = await serverSupabase
      .from('escrow_transactions')
      .update({
        status: 'held',
        stripe_payment_intent_id: paymentIntentId,
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

    // Calculate and store platform fee if not already set
    if (session.metadata?.platformFeeAmount) {
      const platformFee = parseFloat(session.metadata.platformFeeAmount);
      const totalAmount = parseFloat(session.metadata.totalAmount || escrowTransaction.amount.toString());

      // Calculate contractor payout amount
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
  } catch (error) {
    logger.error('Error in handleCheckoutSessionCompleted', error, { service: 'stripe-webhook' });
    throw error;
  }
}
