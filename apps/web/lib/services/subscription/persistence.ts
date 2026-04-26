/**
 * Subscription persistence — pure DB writes.
 *
 * Extracted from `SubscriptionService.ts` (2026-04-26). Lives in its
 * own module so:
 *
 *   - Routes that only need to persist (e.g. the webhook handler that
 *     records a Stripe-side state change) don't pull in the Stripe
 *     SDK chunk.
 *   - The DB-side mutex pattern (cancel previous active row before
 *     inserting the new one — required by the unique constraint on
 *     `(contractor_id, status IN ('free', 'trial', 'active'))`) lives
 *     in one place where it's easy to audit.
 */
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { PLAN_PRICING } from './plan-pricing';
import type { SubscriptionPlan } from './types';

/**
 * Insert a contractor_subscriptions row + flip
 * `profiles.subscription_status`.
 *
 * Before insert, this cancels any pre-existing active /
 * free / trial subscription for the same contractor — the table has a
 * unique partial index that only allows one row per contractor in any
 * of those statuses, so without this step the insert would fail with
 * a 23505 duplicate-key error.
 *
 * For free-tier subscriptions we skip the Stripe metadata columns —
 * they're not meaningful when there's no Stripe subscription backing
 * the row.
 */
export async function saveSubscription(
  contractorId: string,
  planType: SubscriptionPlan,
  stripeSubscriptionId: string,
  stripeCustomerId: string,
  stripePriceId: string,
  trialEnd?: Date
): Promise<string> {
  try {
    const planPricing = PLAN_PRICING[planType];
    const planName = planPricing.name;

    // Get trial info from user profile
    const { data: user } = await serverSupabase
      .from('profiles')
      .select('trial_started_at, trial_ends_at')
      .eq('id', contractorId)
      .single();

    // Cancel any existing active subscription for this contractor.
    // Required because contractor_subscriptions has a unique partial
    // index on (contractor_id) WHERE status IN ('free','trial','active').
    await serverSupabase
      .from('contractor_subscriptions')
      .update({
        status: 'canceled',
        canceled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('contractor_id', contractorId)
      .in('status', ['free', 'trial', 'active']);

    // Determine status based on plan type
    const status =
      planType === 'free'
        ? 'free'
        : trialEnd && trialEnd > new Date()
          ? 'trial'
          : 'active';

    const { data: subscription, error } = await serverSupabase
      .from('contractor_subscriptions')
      .insert({
        contractor_id: contractorId,
        stripe_subscription_id:
          planType === 'free' ? null : stripeSubscriptionId,
        stripe_customer_id: planType === 'free' ? null : stripeCustomerId,
        stripe_price_id: planType === 'free' ? null : stripePriceId,
        plan_type: planType,
        plan_name: planName,
        status: status,
        amount: planPricing.amount / 100, // Convert from pence to pounds
        currency: 'gbp',
        trial_start:
          planType === 'free'
            ? null
            : user?.trial_started_at
              ? new Date(user.trial_started_at)
              : null,
        trial_end:
          planType === 'free'
            ? null
            : trialEnd ||
              (user?.trial_ends_at ? new Date(user.trial_ends_at) : null),
      })
      .select('id')
      .single();

    if (error) {
      logger.error('Failed to save subscription', {
        service: 'SubscriptionService',
        contractorId,
        error: error.message,
      });
      throw new Error(`Failed to save subscription: ${error.message}`);
    }

    // Update user subscription status
    await serverSupabase
      .from('profiles')
      .update({ subscription_status: status })
      .eq('id', contractorId);

    return subscription.id;
  } catch (err) {
    logger.error('Error saving subscription', {
      service: 'SubscriptionService',
      contractorId,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

/**
 * Convenience wrapper around `saveSubscription` for the free-tier
 * path. Skips the Stripe metadata args by passing the
 * `'free-tier'` sentinel — the saveSubscription implementation
 * recognizes the sentinel and stores nulls for the Stripe columns.
 */
export async function createFreeTierSubscription(
  contractorId: string
): Promise<string> {
  return saveSubscription(contractorId, 'free', 'free-tier', '', 'free-tier');
}
