import Stripe from 'stripe';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';

let _stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-04-10' });
  }
  return _stripe;
}

export type HomeownerPlanType = 'landlord' | 'agency';

export class HomeownerSubscriptionService {
  private static readonly PLAN_PRICING: Record<HomeownerPlanType, { monthly: number; yearly: number; name: string }> = {
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
      return null;
    }
    return data;
  }

  static async getOrCreateStripeCustomer(homeownerId: string, email: string) {
    const { data: profile } = await serverSupabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', homeownerId)
      .maybeSingle();

    if (profile?.stripe_customer_id) {
      return profile.stripe_customer_id;
    }

    const stripe = getStripe();
    const customer = await stripe.customers.create({
      email,
      metadata: {
        userId: homeownerId,
        userRole: 'homeowner',
      },
    });

    await serverSupabase
      .from('profiles')
      .update({ stripe_customer_id: customer.id })
      .eq('id', homeownerId);

    return customer.id;
  }

  static async createSubscription(
    homeownerId: string,
    customerId: string,
    planType: HomeownerPlanType,
    billingCycle: 'monthly' | 'yearly' = 'monthly'
  ) {
    const stripe = getStripe();
    const planPricing = this.PLAN_PRICING[planType];
    const isYearly = billingCycle === 'yearly';
    const price_gbp = isYearly ? planPricing.yearly : planPricing.monthly;

    const stripePlanKey = `homeowner_${planType}`;
    const products = await stripe.products.list({ limit: 100 });
    let product = products.data.find((p) => p.metadata?.mintenance_plan === stripePlanKey);
    if (!product) {
      product = await stripe.products.create({
        name: `Mintenance Homeowner ${planPricing.name}`,
        metadata: { mintenance_plan: stripePlanKey },
      });
    }

    const prices = await stripe.prices.list({ product: product.id, active: true, limit: 20 });
    let stripePrice = prices.data.find((p) =>
      p.currency === 'gbp' &&
      p.unit_amount === Math.round(price_gbp * 100) &&
      p.recurring?.interval === (isYearly ? 'year' : 'month')
    );

    if (!stripePrice) {
      stripePrice = await stripe.prices.create({
        product: product.id,
        currency: 'gbp',
        unit_amount: Math.round(price_gbp * 100),
        recurring: { interval: isYearly ? 'year' : 'month' },
        metadata: {
          tier: planType,
          userRole: 'homeowner',
          billingCycle,
        },
      });
    }

    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: stripePrice.id }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        userRole: 'homeowner',
        userId: homeownerId,
        tier: planType,
        planType,
        billingCycle,
      },
    });

    const invoice = subscription.latest_invoice as Stripe.Invoice;
    const paymentIntent = (invoice as Stripe.Invoice & { payment_intent?: Stripe.PaymentIntent }).payment_intent;

    const existing = await this.getCurrentSubscription(homeownerId);
    if (existing) {
      await serverSupabase
        .from('homeowner_subscriptions')
        .update({
          status: 'canceled',
          canceled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
    }

    const { data: saved, error } = await serverSupabase
      .from('homeowner_subscriptions')
      .insert({
        homeowner_id: homeownerId,
        stripe_subscription_id: subscription.id,
        stripe_customer_id: customerId,
        stripe_price_id: stripePrice.id,
        plan_type: planType,
        plan_name: `Homeowner ${planPricing.name}`,
        status: subscription.status === 'active' ? 'active' : 'incomplete',
        amount: price_gbp,
        currency: 'gbp',
        current_period_start: subscription.current_period_start
          ? new Date(subscription.current_period_start * 1000).toISOString()
          : null,
        current_period_end: subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000).toISOString()
          : null,
        cancel_at_period_end: subscription.cancel_at_period_end || false,
        metadata: subscription.metadata || {},
      })
      .select('id')
      .single();

    if (error) {
      logger.error('Failed to save homeowner subscription', {
        service: 'HomeownerSubscriptionService',
        homeownerId,
        error: error.message,
      });
      throw new Error(`Failed to save homeowner subscription: ${error.message}`);
    }

    return {
      dbSubscriptionId: saved.id,
      stripeSubscriptionId: subscription.id,
      clientSecret: paymentIntent?.client_secret || null,
    };
  }

  /** @deprecated Use createSubscription with planType parameter instead */
  static async createPremiumSubscription(
    homeownerId: string,
    customerId: string,
    billingCycle: 'monthly' | 'yearly' = 'monthly'
  ) {
    return this.createSubscription(homeownerId, customerId, 'landlord', billingCycle);
  }

  static async cancelSubscription(
    homeownerId: string,
    cancelAtPeriodEnd: boolean
  ): Promise<{ success: boolean; message: string }> {
    const existing = await this.getCurrentSubscription(homeownerId);
    if (!existing?.stripe_subscription_id) {
      return { success: false, message: 'No active homeowner subscription found' };
    }

    const stripe = getStripe();
    const planName = existing.plan_name || 'subscription';

    if (cancelAtPeriodEnd) {
      await stripe.subscriptions.update(existing.stripe_subscription_id, {
        cancel_at_period_end: true,
      });

      await serverSupabase
        .from('homeowner_subscriptions')
        .update({
          cancel_at_period_end: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      return {
        success: true,
        message: `${planName} will be canceled at the end of the billing period`,
      };
    }

    await stripe.subscriptions.cancel(existing.stripe_subscription_id);
    await serverSupabase
      .from('homeowner_subscriptions')
      .update({
        status: 'canceled',
        canceled_at: new Date().toISOString(),
        cancel_at_period_end: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);

    return {
      success: true,
      message: `${planName} canceled immediately`,
    };
  }
}
