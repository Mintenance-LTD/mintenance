import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { EscrowReleaseAgent } from '@/lib/services/agents/EscrowReleaseAgent';
import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not configured');
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-09-30.clover',
});

/**
 * Cron endpoint for processing automatic escrow releases
 * Should be called every hour
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    logger.info('Starting escrow auto-release processing cycle', {
      service: 'escrow-auto-release',
    });

    const results = {
      evaluated: 0,
      released: 0,
      errors: 0,
      delayed: 0,
    };

    // Get escrows eligible for auto-release
    const now = new Date();
    const { data: eligibleEscrows, error: fetchError } = await serverSupabase
      .from('escrow_transactions')
      .select(
        `
        id,
        job_id,
        payer_id,
        payee_id,
        amount,
        status,
        auto_release_enabled,
        auto_release_date,
        payment_intent_id,
        jobs (
          id,
          status,
          contractor_id,
          homeowner_id,
          title
        )
      `
      )
      .eq('status', 'held')
      .eq('auto_release_enabled', true)
      .lte('auto_release_date', now.toISOString())
      .limit(50); // Process up to 50 at a time

    if (fetchError) {
      logger.error('Error fetching eligible escrows', {
        service: 'escrow-auto-release',
        error: fetchError.message,
      });
      return NextResponse.json({ error: 'Failed to fetch eligible escrows' }, { status: 500 });
    }

    if (!eligibleEscrows || eligibleEscrows.length === 0) {
      return NextResponse.json({
        success: true,
        results: { evaluated: 0, released: 0, errors: 0, delayed: 0 },
      });
    }

    // Process each escrow
    for (const escrow of eligibleEscrows) {
      try {
        results.evaluated++;

        const job = escrow.jobs as any;
        if (!job || job.status !== 'completed') {
          continue; // Skip if job not completed
        }

        // Evaluate auto-release
        const evaluation = await EscrowReleaseAgent.evaluateAutoRelease(escrow.id);

        if (!evaluation || !evaluation.success) {
          if (evaluation?.message?.includes('delayed')) {
            results.delayed++;
          }
          continue; // Not approved for auto-release
        }

        // Auto-release approved - proceed with release
        // Get contractor's Stripe Connect account
        const { data: contractor, error: contractorError } = await serverSupabase
          .from('users')
          .select('stripe_connect_account_id')
          .eq('id', job.contractor_id)
          .single();

        if (contractorError || !contractor?.stripe_connect_account_id) {
          logger.error('Contractor missing Stripe Connect account', {
            service: 'escrow-auto-release',
            contractorId: job.contractor_id,
            escrowId: escrow.id,
          });
          results.errors++;
          continue;
        }

        // Create transfer to contractor
        const transfer = await stripe.transfers.create({
          amount: Math.round((escrow.amount || 0) * 100), // Convert to cents
          currency: 'usd',
          destination: contractor.stripe_connect_account_id,
          description: `Auto-release: ${job.title}`,
          metadata: {
            jobId: job.id,
            escrowId: escrow.id,
            homeownerId: job.homeowner_id,
            contractorId: job.contractor_id,
            releaseReason: 'auto_release',
          },
        });

        // Update escrow transaction
        const updateData: Record<string, any> = {
          status: 'completed',
          released_at: new Date().toISOString(),
          release_reason: 'auto_release',
          updated_at: new Date().toISOString(),
          transfer_id: transfer.id,
        };

        // Store auto-release metadata
        if (escrow.metadata) {
          updateData.metadata = {
            ...(typeof escrow.metadata === 'object' ? escrow.metadata : {}),
            auto_released: true,
            auto_released_at: new Date().toISOString(),
          };
        } else {
          updateData.metadata = {
            auto_released: true,
            auto_released_at: new Date().toISOString(),
          };
        }

        const { error: updateError } = await serverSupabase
          .from('escrow_transactions')
          .update(updateData)
          .eq('id', escrow.id);

        if (updateError) {
          logger.error('Failed to update escrow after auto-release', {
            service: 'escrow-auto-release',
            escrowId: escrow.id,
            error: updateError.message,
          });

          // Try to reverse transfer
          await stripe.transfers.createReversal(transfer.id).catch((err) => {
            logger.error('Failed to reverse transfer after DB error', err, {
              service: 'escrow-auto-release',
              transferId: transfer.id,
            });
          });

          results.errors++;
          continue;
        }

        results.released++;

        logger.info('Escrow auto-released successfully', {
          service: 'escrow-auto-release',
          escrowId: escrow.id,
          transferId: transfer.id,
          amount: escrow.amount,
        });
      } catch (error) {
        logger.error('Error processing escrow auto-release', error, {
          service: 'escrow-auto-release',
          escrowId: escrow.id,
        });
        results.errors++;
      }
    }

    logger.info('Escrow auto-release processing cycle completed', {
      service: 'escrow-auto-release',
      results,
    });

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    logger.error('Error in escrow auto-release cron', error, {
      service: 'escrow-auto-release',
    });
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

