import type Stripe from 'stripe';
import { stripe, getInvoiceClientSecret } from '@/lib/stripe';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { ConflictError } from '@/lib/errors/api-error';
import { PLAN_PRICING } from './plan-pricing';
import {
  syncContractorProviderState,
  type BillingCycle,
} from './contractor-provider-state';
import type { SubscriptionPlan } from './types';

/** Stable provider product and lookup key keep retries on exactly the same price. */
export async function contractorPrice(
  plan: SubscriptionPlan,
  cycle: BillingCycle = 'monthly'
) {
  if (plan !== 'professional' && plan !== 'enterprise')
    throw new Error('A paid contractor plan is required');
  const amount = PLAN_PRICING[plan].amount * (cycle === 'yearly' ? 10 : 1);
  const lookup = `mintenance_contractor_${plan}_${cycle}_gbp_${amount}_v1`;
  const find = async () =>
    (
      await stripe.prices.list({
        lookup_keys: [lookup],
        active: true,
        limit: 2,
      })
    ).data[0];
  const existing = await find();
  const valid = (p: Stripe.Price) =>
    p.currency === 'gbp' &&
    p.unit_amount === amount &&
    p.recurring?.interval === (cycle === 'yearly' ? 'year' : 'month') &&
    p.recurring.interval_count === 1;
  if (existing) {
    if (!valid(existing))
      throw new Error('Contractor price configuration mismatch');
    return existing.id;
  }
  const productId = `mintenance_contractor_${plan}_v1`;
  try {
    await stripe.products.retrieve(productId);
  } catch (error) {
    if ((error as { code?: string }).code !== 'resource_missing') throw error;
    await stripe.products.create(
      { id: productId, name: `Mintenance ${PLAN_PRICING[plan].name}` },
      { idempotencyKey: productId }
    );
  }
  try {
    return (
      await stripe.prices.create(
        {
          product: productId,
          lookup_key: lookup,
          currency: 'gbp',
          unit_amount: amount,
          recurring: { interval: cycle === 'yearly' ? 'year' : 'month' },
          metadata: { planType: plan, billingCycle: cycle },
        },
        { idempotencyKey: lookup }
      )
    ).id;
  } catch (error) {
    // A competing request may have created the unique lookup key.
    const raced = await find();
    if (raced && valid(raced)) return raced.id;
    throw error;
  }
}

export async function createContractorCheckout(
  contractorId: string,
  plan: SubscriptionPlan,
  customerId: string,
  cycle: BillingCycle = 'monthly'
) {
  const { data: reservation, error } = await serverSupabase.rpc(
    'reserve_contractor_subscription',
    {
      p_contractor_id: contractorId,
      p_customer_id: customerId,
      p_plan: plan,
      p_cycle: cycle,
    }
  );
  if (error || !reservation?.id)
    throw new ConflictError(
      'The existing subscription needs reconciliation. Please retry or contact support.'
    );
  const listed = await stripe.subscriptions.list({
    customer: customerId,
    status: 'all',
    limit: 100,
  });
  if (listed.has_more)
    throw new ConflictError('Subscription history needs reconciliation');
  const live = listed.data.filter(
    (s) => !['canceled', 'incomplete_expired'].includes(s.status)
  );
  if (
    live.some(
      (s) =>
        s.id !== reservation.stripe_subscription_id &&
        s.metadata?.dbSubscriptionId !== reservation.id
    )
  ) {
    throw new ConflictError(
      'An existing Stripe subscription must be reconciled first'
    );
  }
  const recovered = listed.data.find(
    (s) => s.metadata?.dbSubscriptionId === reservation.id
  );
  const providerId = reservation.stripe_subscription_id || recovered?.id;
  if (
    !providerId &&
    (!Number.isFinite(Date.parse(reservation.created_at)) ||
      Date.now() - Date.parse(reservation.created_at) > 23 * 60 * 60 * 1000)
  ) {
    throw new ConflictError(
      'The previous checkout needs reconciliation before another payment'
    );
  }
  const subscription = providerId
    ? await stripe.subscriptions.retrieve(providerId, {
        expand: ['latest_invoice.confirmation_secret'],
      })
    : await stripe.subscriptions.create(
        {
          customer: customerId,
          items: [{ price: await contractorPrice(plan, cycle) }],
          payment_behavior: 'default_incomplete',
          payment_settings: { save_default_payment_method: 'on_subscription' },
          expand: ['latest_invoice.confirmation_secret'],
          metadata: {
            contractorId,
            planType: plan,
            billingCycle: cycle,
            platform: 'mintenance',
            dbSubscriptionId: reservation.id,
          },
        },
        { idempotencyKey: `contractor_checkout_${reservation.id}` }
      );
  const owner =
    typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer.id;
  if (
    owner !== customerId ||
    subscription.metadata?.contractorId !== contractorId
  )
    throw new ConflictError('Subscription ownership mismatch');
  const { data: linked, error: linkError } = await serverSupabase
    .from('contractor_subscriptions')
    .update({ stripe_subscription_id: subscription.id })
    .eq('id', reservation.id)
    .eq('contractor_id', contractorId)
    .select('id')
    .single();
  if (linkError || !linked)
    throw new Error(
      'Failed to link contractor subscription; retry this checkout'
    );
  await syncContractorProviderState(subscription, contractorId);
  if (['canceled', 'incomplete_expired'].includes(subscription.status)) {
    throw new ConflictError(
      'The previous checkout expired. Retry to start a new checkout.'
    );
  }
  const invoice = subscription.latest_invoice;
  return {
    subscriptionId: subscription.id,
    clientSecret:
      invoice && typeof invoice !== 'string' && invoice.status === 'paid'
        ? null
        : getInvoiceClientSecret(invoice),
  };
}
