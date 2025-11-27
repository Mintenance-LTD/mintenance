import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import Stripe from 'stripe';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { checkApiRateLimit } from '@/lib/rate-limiter';
import { requireCSRF } from '@/lib/csrf';
import { getIdempotencyKeyFromRequest, checkIdempotency, storeIdempotencyResult } from '@/lib/idempotency';

// SECURITY: No fallback for production credentials
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY environment variable is required');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-04-10',
});

const refundSchema = z.object({
  jobId: z.string().uuid(),
  escrowTransactionId: z.string().uuid(),
  amount: z.number().positive().optional(), // Partial refund amount
  reason: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // CSRF protection
    await requireCSRF(request);

    // Rate limiting
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    const rateLimitResult = await checkApiRateLimit(`refund:${ip}`);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // Authenticate user
    const user = await getCurrentUserFromCookies();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate request body
    const body = await request.json();
    const parsed = refundSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { jobId, escrowTransactionId, amount, reason } = parsed.data;

    // Idempotency check - prevent duplicate refunds
    const idempotencyKey = getIdempotencyKeyFromRequest(
      request,
      'refund_payment',
      user.id,
      escrowTransactionId
    );

    const idempotencyCheck = await checkIdempotency(idempotencyKey, 'refund_payment');
    if (idempotencyCheck?.isDuplicate && idempotencyCheck.cachedResult) {
      logger.info('Duplicate refund request detected, returning cached result', {
        service: 'payments',
        idempotencyKey,
        userId: user.id,
        escrowTransactionId,
      });
      return NextResponse.json(idempotencyCheck.cachedResult);
    }

    // Verify job ownership
    const { data: job, error: jobError } = await serverSupabase
      .from('jobs')
      .select('id, homeowner_id, contractor_id, status')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // SECURITY: Enhanced refund authorization logic
    const isHomeowner = job.homeowner_id === user.id;
    const isContractor = job.contractor_id === user.id;

    if (!isHomeowner && !isContractor) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get escrow transaction
    const { data: escrow, error: escrowError } = await serverSupabase
      .from('escrow_transactions')
      .select('id, job_id, amount, status, stripe_payment_intent_id, created_at, released_at, refunded_at')
      .eq('id', escrowTransactionId)
      .eq('job_id', jobId)
      .single();

    if (escrowError || !escrow) {
      return NextResponse.json({ error: 'Escrow transaction not found' }, { status: 404 });
    }

    // SECURITY: Only allow refunds in specific scenarios
    // 1. Only homeowner can request refunds (they paid for the service)
    // 2. Job must not be completed (prevent refunds after work is done)
    // 3. Payment must be held (not released to contractor)

    if (!isHomeowner) {
      logger.warn('Non-homeowner attempted refund', {
        service: 'payments',
        userId: user.id,
        role: user.role,
        jobId
      });
      return NextResponse.json(
        { error: 'Only the homeowner who paid can request a refund' },
        { status: 403 }
      );
    }

    // Only allow refunds for jobs that are cancelled, disputed, or pending
    const refundableStatuses = ['cancelled', 'disputed', 'pending', 'posted'];
    if (!refundableStatuses.includes(job.status)) {
      return NextResponse.json(
        { error: `Cannot refund payment for job with status: ${job.status}` },
        { status: 400 }
      );
    }

    // Can only refund held payments (not released to contractor)
    if (escrow.status !== 'held') {
      return NextResponse.json(
        { error: `Cannot refund payment with status: ${escrow.status}. Only held payments can be refunded.` },
        { status: 400 }
      );
    }

    if (!escrow.payment_intent_id) {
      return NextResponse.json(
        { error: 'No payment intent ID found' },
        { status: 400 }
      );
    }

    // Calculate refund amount (full or partial)
    const refundAmount = amount
      ? Math.min(Math.round(amount * 100), Math.round(escrow.amount * 100))
      : Math.round(escrow.amount * 100);

    // Create Stripe refund
    const refund = await stripe.refunds.create({
      payment_intent: escrow.payment_intent_id,
      amount: refundAmount,
      reason: reason ? 'requested_by_customer' : undefined,
      metadata: {
        jobId,
        escrowTransactionId,
        requestedBy: user.id,
        reason: reason || 'No reason provided',
      },
    });

    // Update escrow transaction
    const { data: updatedEscrow, error: updateError } = await serverSupabase
      .from('escrow_transactions')
      .update({
        status: 'refunded',
        updated_at: new Date().toISOString(),
      })
      .eq('id', escrowTransactionId)
      .select()
      .single();

    if (updateError) {
      logger.error('Error updating escrow after refund - CRITICAL', updateError, {
        service: 'payments',
        userId: user.id,
        jobId,
        escrowTransactionId,
        refundId: refund.id
      });
      // Refund was processed by Stripe but DB update failed
      // This should trigger an alert in production
    }

    // Update job status if needed
    await serverSupabase
      .from('jobs')
      .update({ status: 'cancelled' })
      .eq('id', jobId);

    logger.info('Refund processed successfully', {
      service: 'payments',
      userId: user.id,
      jobId,
      refundId: refund.id,
      amount: refundAmount / 100
    });

    const responseData = {
      success: true,
      refundId: refund.id,
      amount: refundAmount / 100,
      status: refund.status,
      escrowTransactionId: updatedEscrow?.id || escrowTransactionId,
    };

    // Store idempotency result
    await storeIdempotencyResult(
      idempotencyKey,
      'refund_payment',
      responseData,
      user.id,
      { jobId, escrowTransactionId, refundId: refund.id }
    );

    return NextResponse.json(responseData);
  } catch (error) {
    logger.error('Error processing refund', error, { service: 'payments' });

    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: error.message, type: error.type },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to process refund' },
      { status: 500 }
    );
  }
}
