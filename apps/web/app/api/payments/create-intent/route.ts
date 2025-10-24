import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { validateRequest } from '@/lib/validation/validator';
import { paymentIntentSchema } from '@/lib/validation/schemas';
import { logger } from '@mintenance/shared';
import { requireCSRF } from '@/lib/csrf-validator';

// Initialize Stripe with secret key (server-side only)
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not configured. Payment processing is disabled.');
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-09-30.clover',
});

export async function POST(request: NextRequest) {
  try {
    // Validate CSRF token for state-changing requests
    if (!await requireCSRF(request)) {
      logger.warn('Payment intent creation blocked by CSRF validation', {
        service: 'payments',
        ip: request.headers.get('x-forwarded-for') || 'unknown'
      });
      return NextResponse.json({ error: 'CSRF token validation failed' }, { status: 403 });
    }

    // Authenticate user
    const user = await getCurrentUserFromCookies();
    if (!user) {
      logger.warn('Unauthorized payment intent creation attempt', {
        service: 'payments',
        ip: request.headers.get('x-forwarded-for') || 'unknown'
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate and sanitize input using Zod schema
    const validation = await validateRequest(request, paymentIntentSchema);
    if ('headers' in validation) {
      // Validation failed - return error response
      return validation;
    }

    const { amount, currency, jobId, contractorId, metadata } = validation.data;

    // Verify job exists and user is the homeowner
    const { data: job, error: jobError } = await serverSupabase
      .from('jobs')
      .select('id, homeowner_id, title, contractor_id')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      logger.warn('Payment intent creation for non-existent job', {
        service: 'payments',
        userId: user.id,
        jobId
      });
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (job.homeowner_id !== user.id) {
      logger.warn('Unauthorized payment intent creation attempt', {
        service: 'payments',
        userId: user.id,
        jobId,
        homeownerId: job.homeowner_id
      });
      return NextResponse.json({ error: 'Only the homeowner can create payments' }, { status: 403 });
    }

    if (!job.contractor_id) {
      logger.warn('Payment intent creation for job without contractor', {
        service: 'payments',
        userId: user.id,
        jobId
      });
      return NextResponse.json({ error: 'Job has no assigned contractor' }, { status: 400 });
    }

    // Generate idempotency key to prevent duplicate payments
    const idempotencyKey = `payment_intent_${jobId}_${user.id}_${Date.now()}`;

    // Create Stripe PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: (currency || 'usd').toLowerCase(),
      description: metadata?.description || `Payment for job: ${job.title}`,
      metadata: {
        jobId,
        homeownerId: user.id,
        contractorId: job.contractor_id,
      },
      // Enable automatic payment methods
      automatic_payment_methods: {
        enabled: true,
      },
    }, {
      idempotencyKey,
    });

    // Create escrow transaction record
    const { data: escrowTransaction, error: escrowError } = await serverSupabase
      .from('escrow_transactions')
      .insert({
        job_id: jobId,
        amount,
        status: 'pending',
        payment_intent_id: paymentIntent.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (escrowError) {
      logger.error('Error creating escrow transaction', escrowError, {
        service: 'payments',
        userId: user.id,
        jobId,
        paymentIntentId: paymentIntent.id
      });
      // Try to cancel the payment intent if DB insert fails
      await stripe.paymentIntents.cancel(paymentIntent.id).catch(err => 
        logger.error('Failed to cancel payment intent after escrow error', err, {
          service: 'payments',
          paymentIntentId: paymentIntent.id
        })
      );
      return NextResponse.json(
        { error: 'Failed to create escrow transaction' },
        { status: 500 }
      );
    }

    logger.info('Payment intent created successfully', {
      service: 'payments',
      userId: user.id,
      jobId,
      amount,
      currency,
      escrowTransactionId: escrowTransaction.id
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      escrowTransactionId: escrowTransaction.id,
      amount,
      currency,
    });
  } catch (error) {
    logger.error('Error creating payment intent', error, { service: 'payments' });

    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: error.message, type: error.type },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create payment intent' },
      { status: 500 }
    );
  }
}
