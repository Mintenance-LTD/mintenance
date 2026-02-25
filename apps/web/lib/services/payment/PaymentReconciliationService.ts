/**
 * Payment Reconciliation Service
 *
 * Extracted from cron/payment-reconciliation route handler.
 * Compares local escrow_transactions records against Stripe PaymentIntents
 * to detect and flag discrepancies for manual review.
 */

import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import Stripe from 'stripe';
import { env } from '@/lib/env';

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-04-10',
});

/** Maps local escrow status → expected Stripe PaymentIntent statuses */
const STATUS_MAP: Record<string, string[]> = {
  held: ['succeeded'],
  released: ['succeeded'],
  pending: ['requires_payment_method', 'requires_confirmation', 'processing'],
  failed: ['canceled', 'requires_payment_method'],
  refunded: ['succeeded'], // refunded PI still shows succeeded
  canceled: ['canceled'],
};

const RECONCILIATION_LIMIT = 100;
const AMOUNT_TOLERANCE = 0.01; // £0.01

interface ReconciliationResults {
  checked: number;
  matched: number;
  mismatched: number;
  missingInStripe: number;
  errors: number;
}

interface EscrowRecord {
  id: string;
  payment_intent_id: string | null;
  amount: number;
  status: string;
  job_id: string;
  created_at: string;
}

export class PaymentReconciliationService {
  /**
   * Reconcile local escrow records against Stripe PaymentIntents.
   * Returns counts of matched, mismatched, missing, and errored records.
   */
  static async reconcile(): Promise<ReconciliationResults> {
    const results: ReconciliationResults = {
      checked: 0,
      matched: 0,
      mismatched: 0,
      missingInStripe: 0,
      errors: 0,
    };

    // Fetch escrow transactions that have a payment_intent_id
    const { data: escrows, error: fetchError } = await serverSupabase
      .from('escrow_transactions')
      .select('id, payment_intent_id, amount, status, job_id, created_at')
      .neq('payment_intent_id', null)
      .order('created_at', { ascending: false })
      .limit(RECONCILIATION_LIMIT);

    if (fetchError) {
      logger.error('Failed to fetch escrow transactions for reconciliation', fetchError, {
        service: 'PaymentReconciliationService',
      });
      throw new Error('Failed to fetch escrow transactions');
    }

    if (!escrows || escrows.length === 0) {
      return results;
    }

    // Reconcile each transaction against Stripe
    for (const escrow of escrows as EscrowRecord[]) {
      results.checked++;

      if (!escrow.payment_intent_id) continue;

      try {
        const pi = await stripe.paymentIntents.retrieve(escrow.payment_intent_id);

        // Compare amount (Stripe stores in pence, escrow in pounds)
        const stripeAmountPounds = pi.amount / 100;
        const localAmount = Number(escrow.amount);

        const expectedStripeStatuses = STATUS_MAP[escrow.status] || [];
        const statusMatch = expectedStripeStatuses.includes(pi.status);
        const amountMatch = Math.abs(stripeAmountPounds - localAmount) < AMOUNT_TOLERANCE;

        if (statusMatch && amountMatch) {
          results.matched++;
        } else {
          results.mismatched++;
          await this.flagMismatch(escrow, pi, statusMatch, amountMatch, stripeAmountPounds);
        }
      } catch (stripeError) {
        if (stripeError instanceof Stripe.errors.StripeInvalidRequestError) {
          results.missingInStripe++;
          logger.warn('PaymentIntent not found in Stripe', {
            service: 'PaymentReconciliationService',
            escrowId: escrow.id,
            paymentIntentId: escrow.payment_intent_id,
          });
        } else {
          results.errors++;
          logger.error(
            'Stripe API error during reconciliation',
            stripeError instanceof Error ? stripeError : new Error(String(stripeError)),
            { service: 'PaymentReconciliationService', escrowId: escrow.id }
          );
        }
      }
    }

    return results;
  }

  /**
   * Flag a mismatched escrow transaction for manual review.
   */
  private static async flagMismatch(
    escrow: EscrowRecord,
    pi: Stripe.PaymentIntent,
    statusMatch: boolean,
    amountMatch: boolean,
    stripeAmountPounds: number
  ): Promise<void> {
    logger.warn('Reconciliation mismatch detected', {
      service: 'PaymentReconciliationService',
      escrowId: escrow.id,
      paymentIntentId: escrow.payment_intent_id,
      localStatus: escrow.status,
      stripeStatus: pi.status,
      localAmount: Number(escrow.amount),
      stripeAmount: stripeAmountPounds,
      statusMatch,
      amountMatch,
    });

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
}
