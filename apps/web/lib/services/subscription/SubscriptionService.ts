import Stripe from 'stripe';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not configured');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-09-30.clover',
});

export type SubscriptionPlan = 'basic' | 'professional' | 'enterprise';

export interface SubscriptionFeatures {
  maxJobs: number | null;
  maxActiveJobs: number;
  prioritySupport: boolean;
  advancedAnalytics: boolean;
  customBranding: boolean;
  apiAccess: boolean;
  additionalFeatures: Record<string, any>;
}

export interface Subscription {
  id: string;
  contractorId: string;
  planType: SubscriptionPlan;
  planName: string;
  status: 'trial' | 'active' | 'past_due' | 'canceled' | 'expired' | 'unpaid';
  amount: number;
  currency: string;
  trialStart: Date | null;
  trialEnd: Date | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  canceledAt: Date | null;
  cancelAtPeriodEnd: boolean;
  stripeSubscriptionId: string | null;
  features: SubscriptionFeatures;
}

export interface SubscriptionPlanDetails {
  planType: SubscriptionPlan;
  name: string;
  price: number;
  currency: string;
  features: SubscriptionFeatures;
}

/**
 * Service for managing contractor subscriptions
 */
export class SubscriptionService {
  private static readonly PLAN_PRICING: Record<SubscriptionPlan, { amount: number; name: string }> = {
    basic: { amount: 1999, name: 'Basic' }, // £19.99
    professional: { amount: 4999, name: 'Professional' }, // £49.99
    enterprise: { amount: 9999, name: 'Enterprise' }, // £99.99
  };

  /**
   * Get available subscription plans with features
   */
  static async getAvailablePlans(): Promise<SubscriptionPlanDetails[]> {
    try {
      const { data: features, error } = await serverSupabase
        .from('subscription_features')
        .select('*')
        .order('plan_type');

      if (error) {
        logger.error('Failed to fetch subscription features', {
          service: 'SubscriptionService',
          error: error.message,
        });
        return [];
      }

      return (features || []).map((feature) => {
        const planPricing = this.PLAN_PRICING[feature.plan_type as SubscriptionPlan];
        const amountInPence = planPricing?.amount || 0;
        // Convert from pence to pounds for display
        const priceInPounds = amountInPence / 100;
        
        return {
          planType: feature.plan_type as SubscriptionPlan,
          name: planPricing?.name || feature.plan_type,
          price: priceInPounds,
          currency: 'gbp',
          features: {
            maxJobs: feature.max_jobs,
            maxActiveJobs: feature.max_active_jobs || 0,
            prioritySupport: feature.priority_support || false,
            advancedAnalytics: feature.advanced_analytics || false,
            customBranding: feature.custom_branding || false,
            apiAccess: feature.api_access || false,
            additionalFeatures: feature.additional_features || {},
          },
        };
      });
    } catch (err) {
      logger.error('Error getting available plans', {
        service: 'SubscriptionService',
        error: err instanceof Error ? err.message : String(err),
      });
      return [];
    }
  }

  /**
   * Get contractor's current subscription
   */
  static async getContractorSubscription(contractorId: string): Promise<Subscription | null> {
    try {
      const { data: subscription, error } = await serverSupabase
        .from('contractor_subscriptions')
        .select('*')
        .eq('contractor_id', contractorId)
        .in('status', ['trial', 'active', 'incomplete', 'unpaid', 'past_due'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        logger.error('Failed to get contractor subscription', {
          service: 'SubscriptionService',
          contractorId,
          error: error.message,
          errorCode: error.code,
          errorDetails: error,
        });
        return null;
      }

      if (!subscription) {
        // No subscription found - this is normal for new contractors
        return null;
      }

      // Get features separately if relation didn't work
      const features = await this.getSubscriptionFeatures(contractorId);

      return {
        id: subscription.id,
        contractorId: subscription.contractor_id,
        planType: subscription.plan_type as SubscriptionPlan,
        planName: subscription.plan_name,
        status: subscription.status as Subscription['status'],
        amount: parseFloat(subscription.amount.toString()),
        currency: subscription.currency,
        trialStart: subscription.trial_start ? new Date(subscription.trial_start) : null,
        trialEnd: subscription.trial_end ? new Date(subscription.trial_end) : null,
        currentPeriodStart: subscription.current_period_start
          ? new Date(subscription.current_period_start)
          : null,
        currentPeriodEnd: subscription.current_period_end
          ? new Date(subscription.current_period_end)
          : null,
        canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at) : null,
        cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
        stripeSubscriptionId: subscription.stripe_subscription_id,
        features: features || {
          maxJobs: null,
          maxActiveJobs: 0,
          prioritySupport: false,
          advancedAnalytics: false,
          customBranding: false,
          apiAccess: false,
          additionalFeatures: {},
        },
      };
    } catch (err) {
      logger.error('Error getting contractor subscription', {
        service: 'SubscriptionService',
        contractorId,
        error: err instanceof Error ? err.message : String(err),
      });
      return null;
    }
  }

  /**
   * Get subscription features for a contractor
   */
  static async getSubscriptionFeatures(contractorId: string): Promise<SubscriptionFeatures | null> {
    try {
      const { data, error } = await serverSupabase.rpc('get_subscription_features', {
        p_contractor_id: contractorId,
      });

      if (error || !data || data.length === 0) {
        return null;
      }

      const result = data[0];
      return {
        maxJobs: result.max_jobs,
        maxActiveJobs: result.max_active_jobs || 0,
        prioritySupport: result.priority_support || false,
        advancedAnalytics: result.advanced_analytics || false,
        customBranding: result.custom_branding || false,
        apiAccess: result.api_access || false,
        additionalFeatures: result.additional_features || {},
      };
    } catch (err) {
      logger.error('Error getting subscription features', {
        service: 'SubscriptionService',
        contractorId,
        error: err instanceof Error ? err.message : String(err),
      });
      return null;
    }
  }

  /**
   * Create Stripe subscription for contractor
   */
  static async createStripeSubscription(
    contractorId: string,
    planType: SubscriptionPlan,
    stripeCustomerId: string
  ): Promise<{ subscriptionId: string; clientSecret: string | null }> {
    try {
      const planPricing = this.PLAN_PRICING[planType];
      if (!planPricing) {
        throw new Error(`Invalid plan type: ${planType}`);
      }

      // Create or get Stripe Price ID
      const priceId = await this.getOrCreateStripePrice(planType, planPricing.amount);

      // Create Stripe subscription
      const subscription = await stripe.subscriptions.create({
        customer: stripeCustomerId,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
        metadata: {
          contractorId,
          planType,
          platform: 'mintenance',
        },
      });

      const invoice = subscription.latest_invoice as Stripe.Invoice;
      const paymentIntent = (invoice as any)?.payment_intent as Stripe.PaymentIntent;

      return {
        subscriptionId: subscription.id,
        clientSecret: paymentIntent?.client_secret || null,
      };
    } catch (err) {
      logger.error('Error creating Stripe subscription', {
        service: 'SubscriptionService',
        contractorId,
        planType,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  /**
   * Save subscription to database
   */
  static async saveSubscription(
    contractorId: string,
    planType: SubscriptionPlan,
    stripeSubscriptionId: string,
    stripeCustomerId: string,
    stripePriceId: string,
    trialEnd?: Date
  ): Promise<string> {
    try {
      const planPricing = this.PLAN_PRICING[planType];
      const planName = planPricing.name;

      // Get trial info from user
      const { data: user } = await serverSupabase
        .from('users')
        .select('trial_started_at, trial_ends_at')
        .eq('id', contractorId)
        .single();

      // First, ensure any existing subscriptions for this contractor are marked as canceled
      // This releases the unique constraint that only allows one 'trial' or 'active' subscription
      await serverSupabase
        .from('contractor_subscriptions')
        .update({
          status: 'canceled',
          canceled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('contractor_id', contractorId)
        .in('status', ['trial', 'active']);

      const { data: subscription, error } = await serverSupabase
        .from('contractor_subscriptions')
        .insert({
          contractor_id: contractorId,
          stripe_subscription_id: stripeSubscriptionId,
          stripe_customer_id: stripeCustomerId,
          stripe_price_id: stripePriceId,
          plan_type: planType,
          plan_name: planName,
          status: trialEnd && trialEnd > new Date() ? 'trial' : 'active',
          amount: planPricing.amount / 100, // Convert from pence to pounds
          currency: 'gbp',
          trial_start: user?.trial_started_at ? new Date(user.trial_started_at) : null,
          trial_end: trialEnd || (user?.trial_ends_at ? new Date(user.trial_ends_at) : null),
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
        .from('users')
        .update({
          subscription_status: trialEnd && trialEnd > new Date() ? 'trial' : 'active',
        })
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
   * Update existing subscription plan (upgrade/downgrade)
   */
  static async updateSubscriptionPlan(
    contractorId: string,
    newPlanType: SubscriptionPlan,
    existingStripeSubscriptionId: string
  ): Promise<{ subscriptionId: string; clientSecret: string | null; requiresPayment: boolean }> {
    try {
      const planPricing = this.PLAN_PRICING[newPlanType];
      if (!planPricing) {
        throw new Error(`Invalid plan type: ${newPlanType}`);
      }

      // Retrieve current subscription
      let currentSubscription: Stripe.Subscription;
      try {
        currentSubscription = await stripe.subscriptions.retrieve(existingStripeSubscriptionId);
      } catch (stripeError: any) {
        logger.error('Failed to retrieve Stripe subscription', {
          service: 'SubscriptionService',
          contractorId,
          subscriptionId: existingStripeSubscriptionId,
          error: stripeError.message,
          stripeErrorCode: stripeError.code,
        });
        throw new Error(`Failed to retrieve subscription: ${stripeError.message || 'Subscription not found'}`);
      }

      // Check if subscription is in a state that allows updates
      const allowedStatuses = ['active', 'trialing', 'past_due'];
      if (!allowedStatuses.includes(currentSubscription.status)) {
        logger.warn('Attempting to update subscription with non-standard status', {
          service: 'SubscriptionService',
          contractorId,
          subscriptionId: existingStripeSubscriptionId,
          status: currentSubscription.status,
          allowedStatuses,
        });
        // For incomplete subscriptions, we should handle differently
        if (currentSubscription.status === 'incomplete' || currentSubscription.status === 'incomplete_expired') {
          throw new Error(`Cannot update incomplete subscription. Please cancel and create a new subscription. Current status: ${currentSubscription.status}`);
        }
        // For other statuses, log but try to proceed
        logger.warn('Proceeding with update despite non-standard status', {
          service: 'SubscriptionService',
          status: currentSubscription.status,
        });
      }

      const currentItemId = currentSubscription.items.data[0]?.id;
      if (!currentItemId) {
        throw new Error('Current subscription item not found');
      }

      // Get or create new Stripe Price ID
      const newPriceId = await this.getOrCreateStripePrice(newPlanType, planPricing.amount);

      // Update subscription with new plan
      let updatedSubscription: Stripe.Subscription;
      try {
        updatedSubscription = await stripe.subscriptions.update(existingStripeSubscriptionId, {
          items: [
            {
              id: currentItemId,
              price: newPriceId,
            },
          ],
          metadata: {
            ...currentSubscription.metadata,
            planType: newPlanType,
          },
          proration_behavior: 'always_invoice', // Charge/credit for prorated amount
          expand: ['latest_invoice.payment_intent'],
        });
      } catch (updateError: any) {
        logger.error('Failed to update Stripe subscription', {
          service: 'SubscriptionService',
          contractorId,
          subscriptionId: existingStripeSubscriptionId,
          error: updateError.message,
          stripeErrorCode: updateError.code,
          stripeErrorType: updateError.type,
        });
        throw new Error(`Failed to update subscription: ${updateError.message || 'Unknown error'}`);
      }

      // Get payment intent if invoice requires payment
      // When subscription is updated, Stripe may create a new invoice
      // We need to check if payment is required
      const invoice = updatedSubscription.latest_invoice;
      let clientSecret: string | null = null;
      let requiresPayment = false;

      if (invoice && typeof invoice !== 'string') {
        // Invoice is expanded - access payment_intent through type assertion
        const expandedInvoice = invoice as Stripe.Invoice & { payment_intent?: Stripe.PaymentIntent | string | null };
        const paymentIntentValue = expandedInvoice.payment_intent;
        
        if (paymentIntentValue) {
          if (typeof paymentIntentValue === 'string') {
            // Payment intent is just an ID - we'd need to retrieve it
            // For subscription updates with proration, payment is usually handled automatically
            // But we should check the invoice status
            requiresPayment = expandedInvoice.status === 'open' || expandedInvoice.status === 'draft';
          } else if (paymentIntentValue && typeof paymentIntentValue === 'object') {
            // Payment intent is expanded
            const paymentIntent = paymentIntentValue as Stripe.PaymentIntent;
            clientSecret = paymentIntent.client_secret || null;
            requiresPayment = paymentIntent.status !== 'succeeded' && 
                            paymentIntent.status !== 'processing';
          }
        } else {
          // No payment intent - check invoice status
          requiresPayment = expandedInvoice.status === 'open' || expandedInvoice.status === 'draft';
        }
      }

      // Update database
      const { error: updateError } = await serverSupabase
        .from('contractor_subscriptions')
        .update({
          plan_type: newPlanType,
          plan_name: planPricing.name,
          stripe_price_id: newPriceId,
          amount: planPricing.amount / 100,
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_subscription_id', existingStripeSubscriptionId);

      if (updateError) {
        logger.error('Failed to update subscription in database', {
          service: 'SubscriptionService',
          contractorId,
          error: updateError.message,
        });
        // Don't throw here - Stripe update succeeded, DB update is secondary
      }

      return {
        subscriptionId: existingStripeSubscriptionId,
        clientSecret,
        requiresPayment: !!requiresPayment,
      };
    } catch (err) {
      logger.error('Error updating subscription plan', {
        service: 'SubscriptionService',
        contractorId,
        newPlanType,
        subscriptionId: existingStripeSubscriptionId,
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });
      throw err;
    }
  }

  /**
   * Cancel subscription
   */
  static async cancelSubscription(
    subscriptionId: string,
    cancelAtPeriodEnd: boolean = true
  ): Promise<boolean> {
    try {
      // Cancel in Stripe
      const subscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: cancelAtPeriodEnd,
      });

      // Update in database
      const { error } = await serverSupabase
        .from('contractor_subscriptions')
        .update({
          cancel_at_period_end: cancelAtPeriodEnd,
          canceled_at: cancelAtPeriodEnd ? null : new Date().toISOString(),
          status: cancelAtPeriodEnd ? 'active' : 'canceled',
        })
        .eq('stripe_subscription_id', subscriptionId);

      if (error) {
        logger.error('Failed to update canceled subscription', {
          service: 'SubscriptionService',
          subscriptionId,
          error: error.message,
        });
        return false;
      }

      return true;
    } catch (err) {
      logger.error('Error canceling subscription', {
        service: 'SubscriptionService',
        subscriptionId,
        error: err instanceof Error ? err.message : String(err),
      });
      return false;
    }
  }

  /**
   * Get or create Stripe Price ID for a plan
   */
  private static async getOrCreateStripePrice(
    planType: SubscriptionPlan,
    amountInPence: number
  ): Promise<string> {
    // Check if price exists in database metadata or create new one
    // For now, we'll create a new price each time (Stripe handles deduplication)
    const price = await stripe.prices.create({
      currency: 'gbp',
      unit_amount: amountInPence,
      recurring: {
        interval: 'month',
      },
      product_data: {
        name: `${this.PLAN_PRICING[planType].name} Plan`,
      } as any,
    });

    return price.id;
  }
}

