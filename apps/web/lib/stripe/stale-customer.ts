/**
 * Stale / wrong-mode Stripe customer recovery.
 *
 * A `profiles.stripe_customer_id` is only valid for the Stripe account AND
 * mode (test vs live) that created it. When the deployment's key changes —
 * most commonly a test→live promotion — every stored id silently becomes
 * unresolvable and Stripe rejects the call:
 *
 *   StripeInvalidRequestError
 *   code: 'resource_missing', param: 'customer'
 *   "No such customer: cus_…; a similar object exists in test mode, but a
 *    live mode key was used to make this request."
 *
 * That 400 dead-ends escrow funding, the saved-cards list, and add-card —
 * for every homeowner whose customer record predates the switch. Rather
 * than require a manual DB sweep, each caller detects this specific error,
 * clears the stale id, and proceeds without it (the customer is
 * re-provisioned on the next save-card flow).
 *
 * Deliberately narrow: ONLY `resource_missing` on the `customer` param is
 * treated as recoverable. Card declines, rate limits, and every other
 * Stripe error must keep propagating.
 */
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';

/**
 * True when Stripe rejected the request because the `customer` we passed
 * doesn't exist under the active key (wrong mode or wrong account).
 */
export function isMissingCustomerError(error: unknown): boolean {
  const e = error as { code?: string; param?: string } | null;
  return e?.code === 'resource_missing' && e?.param === 'customer';
}

/**
 * Null out a stale `stripe_customer_id` so the next flow provisions a fresh
 * customer under the active key.
 *
 * Best-effort by design: the caller's recovery (retry without a customer, or
 * with a newly created one) is more important than this bookkeeping write, so
 * a failure here is logged and swallowed rather than thrown.
 */
export async function clearStaleStripeCustomerId(
  userId: string,
  staleCustomerId: string,
  context: { service: string; operation?: string }
): Promise<void> {
  logger.warn(
    'Stored stripe_customer_id does not exist under the active Stripe key — clearing it',
    {
      ...context,
      userId,
      staleCustomerId,
    }
  );

  const { error } = await serverSupabase
    .from('profiles')
    .update({ stripe_customer_id: null })
    .eq('id', userId);

  if (error) {
    logger.error('Failed to clear stale stripe_customer_id', error, {
      ...context,
      userId,
      staleCustomerId,
    });
  }
}
