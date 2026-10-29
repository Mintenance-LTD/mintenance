import type Stripe from 'stripe';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { getSubscriptionPeriodBounds } from '@/lib/stripe';
import { PLAN_PRICING } from './plan-pricing';

export type BillingCycle = 'monthly' | 'yearly';

/** Infer benefits from the actual recurring price, never unpaid requested metadata. */
export async function syncContractorProviderState(
  subscription: Stripe.Subscription,
  contractorId: string
) {
  const item = subscription.items.data[0];
  if (
    subscription.items.data.length !== 1 ||
    !item ||
    item.quantity !== 1 ||
    item.price.currency !== 'gbp' ||
    item.price.recurring?.interval_count !== 1 ||
    !['month', 'year'].includes(item.price.recurring.interval)
  ) {
    throw new Error('Unsupported contractor subscription price');
  }
  const billingCycle: BillingCycle =
    item.price.recurring.interval === 'year' ? 'yearly' : 'monthly';
  const multiplier = billingCycle === 'yearly' ? 10 : 1;
  const plan = (['professional', 'enterprise'] as const).find(
    (key) => PLAN_PRICING[key].amount * multiplier === item.price.unit_amount
  );
  if (!plan) throw new Error('Unknown contractor subscription amount');
  const status =
    (
      {
        trialing: 'trial',
        incomplete: 'unpaid',
        incomplete_expired: 'expired',
        paused: 'unpaid',
      } as Record<string, string>
    )[subscription.status] || subscription.status;
  const customer =
    typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer.id;
  const { currentPeriodStart, currentPeriodEnd } =
    getSubscriptionPeriodBounds(subscription);
  const { data, error } = await serverSupabase.rpc(
    'sync_contractor_subscription',
    {
      p_contractor_id: contractorId,
      p_subscription_id: subscription.id,
      p_customer_id: customer,
      p_state: {
        status,
        plan_type: plan,
        plan_name: PLAN_PRICING[plan].name,
        billing_cycle: billingCycle,
        amount: item.price.unit_amount! / 100,
        currency: 'gbp',
        stripe_price_id: item.price.id,
        current_period_start: currentPeriodStart,
        current_period_end: currentPeriodEnd,
        cancel_at_period_end: subscription.cancel_at_period_end,
        canceled_at: subscription.canceled_at
          ? new Date(subscription.canceled_at * 1000).toISOString()
          : null,
      },
    }
  );
  if (error || !data)
    throw new Error('Failed to persist contractor provider state');
  return { id: data.id as string, status, isCurrent: data.current === true };
}
