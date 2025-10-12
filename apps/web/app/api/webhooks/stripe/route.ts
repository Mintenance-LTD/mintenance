import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createHash } from 'crypto';

// Safe imports that won't fail if not available
let serverSupabase: any;
let logger: any;

try {
  serverSupabase = require('@/lib/api/supabaseServer').serverSupabase;
} catch {
  serverSupabase = null;
}

try {
  logger = require('@mintenance/shared').logger;
} catch {
  // Fallback logger
  logger = {
    info: (...args: any[]) => console.log('[INFO]', ...args),
    warn: (...args: any[]) => console.warn('[WARN]', ...args),
    error: (...args: any[]) => console.error('[ERROR]', ...args),
  };
}

// Lazy-initialize Stripe to avoid errors when STRIPE_SECRET_KEY is not set
const getStripeInstance = () => {
  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey) {
    throw new Error('STRIPE_SECRET_KEY not configured');
  }
  return new Stripe(apiKey);
};

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

// Ensure Node.js runtime for Stripe SDK and raw body access
export const runtime = 'nodejs';

/**
 * Stripe Webhook Handler
 *
 * Handles Stripe webhook events with signature verification for security.
 *
 * Supported events:
 * - payment_intent.succeeded - Payment completed successfully
 * - payment_intent.payment_failed - Payment failed
 * - payment_intent.canceled - Payment canceled
 * - charge.refunded - Payment refunded
 */
export async function POST(request: NextRequest) {
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
      // In development/test, treat missing webhook secret as a client error
      // since we can't verify the signature without it
      logger.warn('STRIPE_WEBHOOK_SECRET not configured', { service: 'stripe-webhook' });
      return NextResponse.json(
        { error: 'Webhook signature verification failed: Webhook secret not configured' },
        { status: 400 }
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

// Disable body parsing to allow raw body for signature verification
export const config = {
  api: {
    bodyParser: false,
  },
};
// Note: Next.js App Router route handlers do not use pages API config. Raw
// body is accessed via request.text() above, so this config export is not
// required and can be safely removed.
