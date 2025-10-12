import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import Stripe from 'stripe';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-09-30.clover',
});

const releaseEscrowSchema = z.object({
  jobId: z.string().uuid(),
  escrowTransactionId: z.string().uuid(),
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
    const parsed = releaseEscrowSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { jobId, escrowTransactionId } = parsed.data;

    // Verify job ownership and completion
    const { data: job, error: jobError } = await serverSupabase
      .from('jobs')
      .select('id, homeowner_id, contractor_id, status')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (job.homeowner_id !== user.id) {
      return NextResponse.json({ error: 'Only the homeowner can release funds' }, { status: 403 });
    }

    if (job.status !== 'completed') {
      return NextResponse.json(
        { error: 'Job must be completed before releasing funds' },
        { status: 400 }
      );
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

    if (escrow.status !== 'held') {
      return NextResponse.json(
        { error: `Cannot release escrow with status: ${escrow.status}` },
        { status: 400 }
      );
    }

    // NOTE: In production, you would use Stripe Connect to transfer funds to the contractor
    // For now, we'll just mark it as released in the database
    //
    // Production implementation would be:
    // const transfer = await stripe.transfers.create({
    //   amount: Math.round(escrow.amount * 100),
    //   currency: 'usd',
    //   destination: contractorStripeAccountId,
    //   metadata: { jobId, escrowTransactionId },
    // });

    // Update escrow status
    const { data: updatedEscrow, error: updateError } = await serverSupabase
      .from('escrow_transactions')
      .update({
        status: 'released',
        updated_at: new Date().toISOString(),
      })
      .eq('id', escrowTransactionId)
      .select()
      .single();

    if (updateError) {
      logger.error('Error releasing escrow', updateError, {
        service: 'payments',
        userId: user.id,
        jobId,
        escrowTransactionId
      });
      return NextResponse.json(
        { error: 'Failed to release escrow' },
        { status: 500 }
      );
    }

    logger.info('Escrow funds released successfully', {
      service: 'payments',
      userId: user.id,
      jobId,
      escrowTransactionId: updatedEscrow.id,
      amount: updatedEscrow.amount
    });

    return NextResponse.json({
      success: true,
      escrowTransactionId: updatedEscrow.id,
      status: updatedEscrow.status,
      amount: updatedEscrow.amount,
      message: 'Funds released successfully',
    });
  } catch (error) {
    logger.error('Error releasing escrow', error, { service: 'payments' });

    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: error.message, type: error.type },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to release escrow' },
      { status: 500 }
    );
  }
}
