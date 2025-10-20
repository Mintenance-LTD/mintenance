import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import Stripe from 'stripe';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_fallback', {
  apiVersion: '2025-09-30.clover',
});

const refundSchema = z.object({
  jobId: z.string().uuid(),
  escrowTransactionId: z.string().uuid(),
  amount: z.number().positive().optional(), // Partial refund amount
  reason: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
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

    // Verify job ownership
    const { data: job, error: jobError } = await serverSupabase
      .from('jobs')
      .select('id, homeowner_id, contractor_id, status')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Only homeowner or contractor can request refund
    if (job.homeowner_id !== user.id && job.contractor_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get escrow transaction
    const { data: escrow, error: escrowError } = await serverSupabase
      .from('escrow_transactions')
      .select('*')
      .eq('id', escrowTransactionId)
      .eq('job_id', jobId)
      .single();

    if (escrowError || !escrow) {
      return NextResponse.json({ error: 'Escrow transaction not found' }, { status: 404 });
    }

    // Can only refund held or released payments
    if (!['held', 'released'].includes(escrow.status)) {
      return NextResponse.json(
        { error: `Cannot refund payment with status: ${escrow.status}` },
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

    return NextResponse.json({
      success: true,
      refundId: refund.id,
      amount: refundAmount / 100,
      status: refund.status,
      escrowTransactionId: updatedEscrow?.id || escrowTransactionId,
    });
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
