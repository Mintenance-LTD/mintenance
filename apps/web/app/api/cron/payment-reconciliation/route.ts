import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { requireCronAuth } from '@/lib/cron-auth';
import { handleAPIError, InternalServerError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';
import Stripe from 'stripe';
import { env } from '@/lib/env';

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-04-10',
});

/**
 * Cron endpoint for payment reconciliation (Issue 19)
 * Compares local escrow_transactions records against Stripe PaymentIntents
 * to detect and flag discrepancies.
 * Should be called daily.
 */
export async function GET(request: NextRequest) {
  try {
    const rateLimitResult = await rateLimiter.checkRateLimit({
      identifier: `${request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'anonymous'}:${request.url}`,
      windowMs: 60000,
      maxRequests: 1,
    });

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': String(rateLimitResult.retryAfter || 60) } },
      );
    }

    const authError = requireCronAuth(request);
    if (authError) return authError;

    logger.info('Payment reconciliation started', { service: 'reconciliation' });

    const results = {
      checked: 0,
      matched: 0,
      mismatched: 0,
      missingInStripe: 0,
      errors: 0,
    };

    // Fetch escrow transactions from the last 48 hours that have a payment_intent_id
    const { data: escrows, error: fetchError } = await serverSupabase
      .from('escrow_transactions')
      .select('id, payment_intent_id, amount, status, job_id, created_at')
      .neq('payment_intent_id', null)
      .order('created_at', { ascending: false })
      .limit(100);

    if (fetchError) {
      logger.error('Failed to fetch escrow transactions for reconciliation', fetchError, {
        service: 'reconciliation',
      });
      throw new InternalServerError('Failed to fetch escrow transactions');
    }

    if (!escrows || escrows.length === 0) {
      logger.info('No escrow transactions to reconcile', { service: 'reconciliation' });
      return NextResponse.json({ message: 'No transactions to reconcile', results });
    }

    // Reconcile each transaction against Stripe
    for (const escrow of escrows) {
      results.checked++;

      if (!escrow.payment_intent_id) continue;

      try {
        const pi = await stripe.paymentIntents.retrieve(escrow.payment_intent_id);

        // Compare amount (Stripe stores in pence, escrow in pounds)
        const stripeAmountPounds = pi.amount / 100;
        const localAmount = Number(escrow.amount);

        // Check for status mismatches
        const statusMap: Record<string, string[]> = {
          held: ['succeeded'],
          released: ['succeeded'],
          pending: ['requires_payment_method', 'requires_confirmation', 'processing'],
          failed: ['canceled', 'requires_payment_method'],
          refunded: ['succeeded'], // refunded PI still shows succeeded
          canceled: ['canceled'],
        };

        const expectedStripeStatuses = statusMap[escrow.status] || [];
        const statusMatch = expectedStripeStatuses.includes(pi.status);
        const amountMatch = Math.abs(stripeAmountPounds - localAmount) < 0.01;

        if (statusMatch && amountMatch) {
          results.matched++;
        } else {
          results.mismatched++;
          logger.warn('Reconciliation mismatch detected', {
            service: 'reconciliation',
            escrowId: escrow.id,
            paymentIntentId: escrow.payment_intent_id,
            localStatus: escrow.status,
            stripeStatus: pi.status,
            localAmount,
            stripeAmount: stripeAmountPounds,
            statusMatch,
            amountMatch,
          });

          // Flag the transaction for manual review
          await serverSupabase
            .from('escrow_transactions')
            .update({
              metadata: {
                reconciliation_flag: true,
                reconciliation_date: new Date().toISOString(),
                stripe_status: pi.status,
                stripe_amount: stripeAmountPounds,
                mismatch_type: !statusMatch ? 'status' : 'amount',
              },
            })
            .eq('id', escrow.id);
        }
      } catch (stripeError) {
        if (stripeError instanceof Stripe.errors.StripeInvalidRequestError) {
          results.missingInStripe++;
          logger.warn('PaymentIntent not found in Stripe', {
            service: 'reconciliation',
            escrowId: escrow.id,
            paymentIntentId: escrow.payment_intent_id,
          });
        } else {
          results.errors++;
          logger.error('Stripe API error during reconciliation', stripeError instanceof Error ? stripeError : new Error(String(stripeError)), {
            service: 'reconciliation',
            escrowId: escrow.id,
          });
        }
      }
    }

    logger.info('Payment reconciliation completed', {
      service: 'reconciliation',
      ...results,
    });

    return NextResponse.json({
      message: 'Reconciliation complete',
      results,
    });
  } catch (error) {
    return handleAPIError(error);
  }
}
