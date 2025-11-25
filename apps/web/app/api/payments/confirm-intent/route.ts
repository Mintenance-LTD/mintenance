import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import Stripe from 'stripe';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { requireCSRF } from '@/lib/csrf';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not configured. Payment processing is disabled.');
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-04-10',
});

const confirmIntentSchema = z.object({
  paymentIntentId: z.string().regex(/^pi_[a-zA-Z0-9]+$/, 'Invalid payment intent ID'),
  jobId: z.string().uuid('Invalid job ID'),
});

export async function POST(request: NextRequest) {
  try {
    
    // CSRF protection
    await requireCSRF(request);
// Authenticate user
    const user = await getCurrentUserFromCookies();
    if (!user) {
      logger.warn('Unauthorized payment confirmation attempt', {
        service: 'payments',
        ip: request.headers.get('x-forwarded-for') || 'unknown'
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate request body
    const body = await request.json();
    const parsed = confirmIntentSchema.safeParse(body);

    if (!parsed.success) {
      logger.warn('Invalid payment confirmation request', {
        service: 'payments',
        userId: user.id,
        errors: parsed.error.flatten().fieldErrors
      });
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { paymentIntentId, jobId } = parsed.data;

    // Retrieve the payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    // Verify payment was successful
    if (paymentIntent.status !== 'succeeded') {
      logger.warn('Payment confirmation attempted for non-successful payment', {
        service: 'payments',
        userId: user.id,
        paymentIntentId,
        status: paymentIntent.status
      });
      return NextResponse.json(
        {
          error: 'Payment not completed',
          status: paymentIntent.status,
          requiresAction: paymentIntent.status === 'requires_action',
        },
        { status: 400 }
      );
    }

    // Verify job and escrow transaction
    const { data: job, error: jobError } = await serverSupabase
      .from('jobs')
      .select('id, homeowner_id, contractor_id')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (job.homeowner_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get current escrow transaction for optimistic locking
    const { data: currentEscrow, error: fetchError } = await serverSupabase
      .from('escrow_transactions')
      .select('*')
      .eq('payment_intent_id', paymentIntentId)
      .eq('job_id', jobId)
      .single();

    if (fetchError || !currentEscrow) {
      logger.error('Escrow transaction not found', fetchError, {
        service: 'payments',
        userId: user.id,
        paymentIntentId,
        jobId
      });
      return NextResponse.json(
        { error: 'Escrow transaction not found' },
        { status: 404 }
      );
    }

    // Update escrow transaction status with optimistic locking
    const originalUpdatedAt = currentEscrow.updated_at;
    const { data: updatedEscrow, error: escrowError } = await serverSupabase
      .from('escrow_transactions')
      .update({
        status: 'held',
        updated_at: new Date().toISOString(),
      })
      .eq('payment_intent_id', paymentIntentId)
      .eq('job_id', jobId)
      .eq('updated_at', originalUpdatedAt) // Optimistic lock
      .select()
      .single();

    if (escrowError) {
      logger.error('Error updating escrow transaction', escrowError, {
        service: 'payments',
        userId: user.id,
        paymentIntentId,
        jobId
      });
      return NextResponse.json(
        { error: 'Failed to update escrow transaction' },
        { status: 500 }
      );
    }

    // Check if update succeeded (optimistic lock check)
    if (!updatedEscrow) {
      logger.warn('Escrow confirmation failed - transaction was modified by another request (race condition)', {
        service: 'payments',
        userId: user.id,
        paymentIntentId,
        jobId
      });
      return NextResponse.json(
        { error: 'This escrow transaction was modified by another request. Please try again.' },
        { status: 409 }
      );
    }

    const escrowTransaction = updatedEscrow;

    logger.info('Payment confirmed and escrow updated', {
      service: 'payments',
      userId: user.id,
      paymentIntentId,
      jobId,
      escrowTransactionId: escrowTransaction.id,
      amount: escrowTransaction.amount
    });

    // Optionally update job status
    await serverSupabase
      .from('jobs')
      .update({ status: 'in_progress' })
      .eq('id', jobId);

    return NextResponse.json({
      success: true,
      escrowTransactionId: escrowTransaction.id,
      status: escrowTransaction.status,
      amount: escrowTransaction.amount,
    });
  } catch (error) {
    logger.error('Error confirming payment intent', error, { service: 'payments' });

    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: error.message, type: error.type },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to confirm payment' },
      { status: 500 }
    );
  }
}
