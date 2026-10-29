import type Stripe from 'stripe';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { getSubscriptionPeriodBounds } from '@/lib/stripe';

/** Persist provider state, never the requested (possibly unpaid) replacement tier. */
export async function syncHomeownerProviderState(
  subscription: Stripe.Subscription,
  homeownerId: string
) {
  const item = subscription.items.data[0];
  if (subscription.items.data.length !== 1 || !item)
    throw new Error('Unsupported homeowner subscription items');
  const knownTier =
    item.price.currency === 'gbp'
      ? (
          {
            2499: 'landlord',
            24900: 'landlord',
            4999: 'agency',
            49900: 'agency',
          } as Record<number, string>
        )[item.price.unit_amount ?? 0]
      : undefined;
  const tier = item.price.metadata?.tier || knownTier;
  if (tier !== 'landlord' && tier !== 'agency')
    throw new Error('Unknown homeowner subscription tier');
  const status =
    (
      {
        trialing: 'trial',
        incomplete_expired: 'expired',
        paused: 'unpaid',
      } as Record<string, string>
    )[subscription.status] || subscription.status;
  const { currentPeriodStart, currentPeriodEnd } =
    getSubscriptionPeriodBounds(subscription);
  const customer =
    typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer.id;
  const { data, error } = await serverSupabase.rpc(
    'sync_homeowner_subscription',
    {
      p_homeowner_id: homeownerId,
      p_subscription_id: subscription.id,
      p_customer_id: customer,
      p_state: {
        status,
        stripe_price_id: item.price.id,
        plan_type: tier,
        plan_name: `Homeowner ${tier === 'agency' ? 'Agency' : 'Landlord'}`,
        amount: (item.price.unit_amount ?? 0) / 100,
        currency: item.price.currency,
        current_period_start: currentPeriodStart,
        current_period_end: currentPeriodEnd,
        cancel_at_period_end: subscription.cancel_at_period_end,
        canceled_at: subscription.canceled_at
          ? new Date(subscription.canceled_at * 1000).toISOString()
          : null,
        metadata: {
          ...subscription.metadata,
          tier,
          planType: tier,
          billingCycle:
            item.price.recurring?.interval === 'year' ? 'yearly' : 'monthly',
        },
      },
    }
  );
  if (error || !data)
    throw new Error('Failed to persist homeowner provider state');
  return { id: data.id as string, status, isCurrent: data.current === true };
}
