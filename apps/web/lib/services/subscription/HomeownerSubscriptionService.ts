import { ConflictError } from '@/lib/errors/api-error';
import { syncHomeownerProviderState } from './homeowner-provider-state';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
// 2026-05-28 audit: was a local proxy pinned to apiVersion '2024-04-10'.
// Route through the single shared lazy proxy so the API version stays
// pinned in one place (lib/stripe.ts → the SDK's own pinned version).
import { stripe as sharedStripe, getInvoiceClientSecret } from '@/lib/stripe';

function getStripe() {
  return sharedStripe;
}

export type HomeownerPlanType = 'landlord' | 'agency';

export class HomeownerSubscriptionService {
  private static readonly PLAN_PRICING: Record<
    HomeownerPlanType,
    { monthly: number; yearly: number; name: string }
  > = {
    landlord: { monthly: 24.99, yearly: 249, name: 'Landlord' },
    agency: { monthly: 49.99, yearly: 499, name: 'Agency' },
  };

  static async getCurrentSubscription(homeownerId: string) {
    const { data, error } = await serverSupabase
      .from('homeowner_subscriptions')
      .select('*')
      .eq('homeowner_id', homeownerId)
      .in('status', ['incomplete', 'active', 'past_due', 'unpaid', 'trial'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      logger.error('Failed to load homeowner subscription', {
        service: 'HomeownerSubscriptionService',
        homeownerId,
        error: error.message,
      });
      throw new Error('Failed to load homeowner subscription');
    }
    return data;
  }

  static async getOrCreateStripeCustomer(homeownerId: string, email: string) {
    const { data: profile, error: profileError } = await serverSupabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', homeownerId)
      .maybeSingle();

    if (profileError || !profile)
      throw new Error('Failed to load subscription customer');

    if (profile?.stripe_customer_id) {
      return profile.stripe_customer_id;
    }

    const stripe = getStripe();
    const customer = await stripe.customers.create(
      {
        email,
        metadata: {
          userId: homeownerId,
          userRole: 'homeowner',
        },
      },
      {
        idempotencyKey: `stripe_customer_${homeownerId}`,
      }
    );

    const { error: customerError } = await serverSupabase
      .from('profiles')
      .update({ stripe_customer_id: customer.id })
      .eq('id', homeownerId);

    if (customerError) throw new Error('Failed to save subscription customer');

    return customer.id;
  }

  static async createSubscription(
    homeownerId: string,
    customerId: string,
    planType: HomeownerPlanType,
    billingCycle: 'monthly' | 'yearly' = 'monthly'
  ) {
    const stripe = getStripe();
    const pricing = this.PLAN_PRICING[planType];
    const amount = pricing[billingCycle];
    let existing = await this.getCurrentSubscription(homeownerId);
    if (!existing) {
      // The partial unique index arbitrates simultaneous first purchases before
      // any Stripe write. The persisted row ID is the provider operation key.
      const { data, error } = await serverSupabase
        .from('homeowner_subscriptions')
        .insert({
          homeowner_id: homeownerId,
          stripe_customer_id: customerId,
          plan_type: planType,
          plan_name: 'Homeowner ' + pricing.name,
          amount,
          currency: 'gbp',
          status: 'incomplete',
          metadata: { billingCycle },
        })
        .select('*')
        .single();
      if (error || !data)
        throw new ConflictError(
          'A subscription request is already in progress. Please retry.'
        );
      existing = data;
    }
    if (existing.stripe_customer_id !== customerId)
      throw new ConflictError('Subscription customer needs reconciliation');

    const listed = await stripe.subscriptions.list({
      customer: customerId,
      status: 'all',
      limit: 100,
    });
    if (listed.has_more)
      throw new ConflictError('Subscription history needs reconciliation');
    const live = listed.data.filter(
      (s) =>
        !['canceled', 'incomplete_expired'].includes(s.status) &&
        (s.metadata?.userRole === 'homeowner' ||
          s.id === existing.stripe_subscription_id)
    );
    if (
      live.length > 1 ||
      live.some(
        (s) =>
          s.id !== existing.stripe_subscription_id &&
          s.metadata?.dbSubscriptionId !== existing.id
      )
    ) {
      throw new ConflictError(
        'An existing Stripe subscription needs reconciliation before another can be created'
      );
    }
    let providerId = existing.stripe_subscription_id as string | null;
    // Recover an acknowledged provider write after an interrupted database save.
    if (!providerId)
      providerId =
        listed.data.find((s) => s.metadata?.dbSubscriptionId === existing.id)
          ?.id ?? null;
    if (
      !providerId &&
      (existing.plan_type !== planType ||
        existing.metadata?.billingCycle !== billingCycle)
    ) {
      throw new ConflictError(
        'Finish the pending subscription request before choosing another plan'
      );
    }
    if (
      !providerId &&
      Date.now() - Date.parse(existing.created_at) > 23 * 60 * 60 * 1000
    ) {
      // Stripe idempotency records can expire after 24h. Never recreate an
      // unresolved operation once its safe retry window has elapsed.
      throw new ConflictError(
        'The previous subscription request needs reconciliation'
      );
    }
    let subscription = providerId
      ? await stripe.subscriptions.retrieve(providerId, {
          expand: ['latest_invoice.confirmation_secret'],
        })
      : null;
    if (subscription && !existing.stripe_subscription_id) {
      const { error } = await serverSupabase
        .from('homeowner_subscriptions')
        .update({ stripe_subscription_id: subscription.id })
        .eq('id', existing.id);
      if (error)
        throw new Error('Failed to recover homeowner subscription link');
    }
    if (subscription) {
      const owner =
        typeof subscription.customer === 'string'
          ? subscription.customer
          : subscription.customer.id;
      if (owner !== customerId || subscription.metadata?.userId !== homeownerId)
        throw new ConflictError('Subscription ownership mismatch');
      if (['canceled', 'incomplete_expired'].includes(subscription.status)) {
        await syncHomeownerProviderState(subscription, homeownerId);
        throw new ConflictError(
          'The previous subscription has ended. Please retry to start a new subscription.'
        );
      }
    }

    const planKey = 'homeowner_' + planType;
    const products = await stripe.products.list({ limit: 100 });
    let product = products.data.find(
      (p) => p.metadata?.mintenance_plan === planKey
    );
    if (!product)
      product = await stripe.products.create(
        {
          name: 'Mintenance Homeowner ' + pricing.name,
          metadata: { mintenance_plan: planKey },
        },
        { idempotencyKey: planKey }
      );
    const prices = await stripe.prices.list({
      product: product.id,
      active: true,
      limit: 100,
    });
    let price = prices.data.find(
      (p) =>
        p.currency === 'gbp' &&
        p.unit_amount === Math.round(amount * 100) &&
        p.recurring?.interval ===
          (billingCycle === 'yearly' ? 'year' : 'month') &&
        p.recurring.interval_count === 1
    );
    if (!price)
      price = await stripe.prices.create(
        {
          product: product.id,
          currency: 'gbp',
          unit_amount: Math.round(amount * 100),
          recurring: { interval: billingCycle === 'yearly' ? 'year' : 'month' },
          metadata: { tier: planType, userRole: 'homeowner', billingCycle },
        },
        {
          idempotencyKey:
            planKey + '_' + billingCycle + '_' + Math.round(amount * 100),
        }
      );

    if (subscription) {
      const item = subscription.items.data[0];
      if (subscription.items.data.length !== 1 || !item)
        throw new ConflictError('Subscription items need reconciliation');
      if (subscription.pending_update) {
        const pending =
          subscription.pending_update.subscription_items?.[0]?.price;
        const pendingId = typeof pending === 'string' ? pending : pending?.id;
        if (pendingId !== price.id)
          throw new ConflictError(
            'Complete the pending payment before changing plans again'
          );
      } else if (item.price.id !== price.id) {
        if (
          !['active', 'trialing'].includes(subscription.status) ||
          subscription.cancel_at_period_end
        ) {
          throw new ConflictError(
            'Resolve or cancel the existing subscription before changing plans'
          );
        }
        const invoiceId =
          typeof subscription.latest_invoice === 'string'
            ? subscription.latest_invoice
            : subscription.latest_invoice?.id;
        subscription = await stripe.subscriptions.update(
          subscription.id,
          {
            items: [
              { id: item.id, price: price.id, quantity: item.quantity ?? 1 },
            ],
            payment_behavior: 'pending_if_incomplete',
            proration_behavior: 'always_invoice',
            expand: ['latest_invoice.confirmation_secret'],
          },
          {
            idempotencyKey: [
              'homeowner_change',
              subscription.id,
              item.price.id,
              price.id,
              invoiceId ?? 'initial',
            ].join('_'),
          }
        );
      }
    } else {
      subscription = await stripe.subscriptions.create(
        {
          customer: customerId,
          items: [{ price: price.id }],
          payment_behavior: 'default_incomplete',
          payment_settings: { save_default_payment_method: 'on_subscription' },
          expand: ['latest_invoice.confirmation_secret'],
          metadata: {
            userRole: 'homeowner',
            userId: homeownerId,
            tier: planType,
            planType,
            billingCycle,
            dbSubscriptionId: existing.id,
          },
        },
        { idempotencyKey: 'homeowner_create_' + existing.id }
      );
    }
    // Link first; if this fails the durable reservation/provider metadata make
    // the next attempt resume the exact same Stripe subscription.
    const { error: linkError } = await serverSupabase
      .from('homeowner_subscriptions')
      .update({ stripe_subscription_id: subscription.id })
      .eq('id', existing.id);
    if (linkError) throw new Error('Failed to link homeowner subscription');
    const saved = await syncHomeownerProviderState(subscription, homeownerId);
    const requiresConfirmation =
      subscription.status === 'incomplete' || !!subscription.pending_update;
    const clientSecret = requiresConfirmation
      ? getInvoiceClientSecret(subscription.latest_invoice)
      : null;
    if (requiresConfirmation && !clientSecret)
      throw new ConflictError(
        'Subscription payment needs recovery. Please retry.'
      );
    return {
      dbSubscriptionId: saved.id,
      stripeSubscriptionId: subscription.id,
      clientSecret,
      status: saved.status,
    };
  }

  /** @deprecated Use createSubscription with planType parameter instead */
  static async createPremiumSubscription(
    homeownerId: string,
    customerId: string,
    billingCycle: 'monthly' | 'yearly' = 'monthly'
  ) {
    return this.createSubscription(
      homeownerId,
      customerId,
      'landlord',
      billingCycle
    );
  }

  static async cancelSubscription(
    homeownerId: string,
    cancelAtPeriodEnd: boolean
  ): Promise<{ success: boolean; message: string }> {
    const existing = await this.getCurrentSubscription(homeownerId);
    if (!existing?.stripe_subscription_id) {
      return {
        success: false,
        message: 'No active homeowner subscription found',
      };
    }

    const stripe = getStripe();
    const provider = await stripe.subscriptions.retrieve(
      existing.stripe_subscription_id
    );
    const customerId =
      typeof provider.customer === 'string'
        ? provider.customer
        : provider.customer.id;
    if (
      customerId !== existing.stripe_customer_id ||
      provider.metadata?.userId !== homeownerId
    ) {
      throw new ConflictError('Subscription ownership mismatch');
    }
    const terminal = ['canceled', 'incomplete_expired'].includes(
      provider.status
    );
    const subscription = terminal
      ? provider
      : cancelAtPeriodEnd
        ? await stripe.subscriptions.update(provider.id, {
            cancel_at_period_end: true,
          })
        : await stripe.subscriptions.cancel(provider.id);
    await syncHomeownerProviderState(subscription, homeownerId);
    return {
      success: true,
      message:
        cancelAtPeriodEnd && !terminal
          ? 'Subscription will be canceled at the end of the billing period'
          : 'Subscription canceled immediately',
    };
  }
}
