/**
 * Auxiliary helpers for EscrowAutoReleaseService. Extracted to keep the
 * main orchestrator file under the 500-line pre-commit limit.
 */

import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
// Route through the shared lazy proxy so the API version stays pinned in one
// place (lib/stripe.ts). This is the escrow transfer/payout path — previously
// it ran on a hardcoded 13-month-old apiVersion ('2024-04-10').
import { stripe } from '@/lib/stripe';

interface EligibleEscrowLike {
  id: string;
  amount: number | null;
  contractor_id?: string;
}

interface JobLike {
  id: string;
  contractor_id: string;
  title: string;
}

/**
 * Retrieve the charge ID from a payment intent for fee tracking.
 */
export async function getChargeId(
  paymentIntentId: string | null
): Promise<string | undefined> {
  if (!paymentIntentId) return undefined;

  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    return typeof paymentIntent.latest_charge === 'string'
      ? paymentIntent.latest_charge
      : paymentIntent.latest_charge?.id;
  } catch {
    logger.warn('Failed to retrieve payment intent for fee tracking', {
      service: 'EscrowAutoReleaseService',
      paymentIntentId,
    });
    return undefined;
  }
}

/**
 * Notify contractor about missing Stripe Connect account.
 */
export async function notifyMissingStripeAccount(
  escrow: EligibleEscrowLike,
  job: JobLike
): Promise<void> {
  try {
    const { PaymentSetupNotificationService } =
      await import('@/lib/services/contractor/PaymentSetupNotificationService');
    await PaymentSetupNotificationService.notifyPaymentSetupRequired(
      job.contractor_id,
      escrow.id,
      job.title,
      escrow.amount || 0
    );
  } catch (error) {
    logger.error('Failed to send payment setup notification', error);
  }

  logger.error('Contractor missing Stripe Connect account', {
    service: 'EscrowAutoReleaseService',
    contractorId: job.contractor_id,
    escrowId: escrow.id,
  });
}

/**
 * Mark an escrow as blocked for manual review. Used when the payee lock
 * invariant is violated (see LFC-P1-1). Does NOT touch escrow.status so
 * that an ops engineer can inspect before deciding how to resolve.
 */
export async function blockEscrow(
  escrowId: string,
  reason: string
): Promise<void> {
  const { error } = await serverSupabase
    .from('escrow_transactions')
    .update({
      release_blocked_reason: reason,
      auto_release_enabled: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', escrowId);

  if (error) {
    logger.error('Failed to mark escrow as blocked', {
      service: 'EscrowAutoReleaseService',
      escrowId,
      reason,
      error: error.message,
    });
  } else {
    logger.warn('Escrow auto-release blocked for review', {
      service: 'EscrowAutoReleaseService',
      escrowId,
      reason,
    });
  }
}
