/**
 * Read-only subscription queries.
 *
 * Extracted from `SubscriptionService.ts` (2026-04-26). All three
 * functions in this module:
 *   - take a contractor id (or no args)
 *   - perform a SELECT against contractor_subscriptions /
 *     subscription_features / a Postgres function
 *   - return a structured object or null on failure
 *
 * No Stripe calls, no DB writes — pure reads. Keeping them in their
 * own module means routes that only need the read path don't pull in
 * the Stripe SDK chunk (which is large).
 */
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { PLAN_PRICING } from './plan-pricing';
import type {
  Subscription,
  SubscriptionFeatures,
  SubscriptionPlan,
  SubscriptionPlanDetails,
} from './types';

/**
 * Get available subscription plans with features.
 *
 * Filters out the 'free' plan because the 'basic' plan serves as the
 * free tier in the UI — exposing both confuses customers.
 */
export async function getAvailablePlans(): Promise<SubscriptionPlanDetails[]> {
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

    return (features || [])
      .filter((feature) => feature.plan_type !== 'free')
      .map((feature) => {
        const planPricing = PLAN_PRICING[feature.plan_type as SubscriptionPlan];
        const amountInPence = planPricing?.amount || 0;
        // Convert from pence to pounds for display (free tier is 0)
        const priceInPounds = amountInPence / 100;

        return {
          planType: feature.plan_type as SubscriptionPlan,
          name: planPricing?.name || feature.plan_type,
          price: priceInPounds,
          currency: 'gbp',
          features: {
            maxJobs: feature.max_jobs,
            // Preserve null for unlimited (null || 0 was incorrectly
            // converting unlimited to 0)
            maxActiveJobs: feature.max_active_jobs ?? null,
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
 * Get subscription features for a contractor via the
 * `get_subscription_features` Postgres function.
 *
 * Returns null when the contractor has no subscription, when the RPC
 * fails, or when the function returns an empty result. Callers should
 * substitute a sane default (typically the free-tier feature set).
 */
export async function getSubscriptionFeatures(
  contractorId: string
): Promise<SubscriptionFeatures | null> {
  try {
    const { data, error } = await serverSupabase.rpc(
      'get_subscription_features',
      {
        p_contractor_id: contractorId,
      }
    );

    if (error || !data || data.length === 0) {
      return null;
    }

    const result = data[0];
    return {
      maxJobs: result.max_jobs,
      maxActiveJobs: result.max_active_jobs ?? null,
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
 * Get a contractor's current subscription.
 *
 * Returns the most recent subscription that's in any of the active /
 * trialing / billing-issue states. Returns null when the contractor
 * has never subscribed (normal for new contractors) or only has
 * canceled / expired records.
 */
export async function getContractorSubscription(
  contractorId: string
): Promise<Subscription | null> {
  try {
    const { data: subscription, error } = await serverSupabase
      .from('contractor_subscriptions')
      .select('*')
      .eq('contractor_id', contractorId)
      .in('status', [
        'free',
        'trial',
        'active',
        'incomplete',
        'unpaid',
        'past_due',
      ])
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
    const features = await getSubscriptionFeatures(contractorId);

    return {
      id: subscription.id,
      contractorId: subscription.contractor_id,
      planType: subscription.plan_type as SubscriptionPlan,
      planName: subscription.plan_name,
      status: subscription.status as Subscription['status'],
      amount: parseFloat(subscription.amount.toString()),
      currency: subscription.currency,
      trialStart: subscription.trial_start
        ? new Date(subscription.trial_start)
        : null,
      trialEnd: subscription.trial_end
        ? new Date(subscription.trial_end)
        : null,
      currentPeriodStart: subscription.current_period_start
        ? new Date(subscription.current_period_start)
        : null,
      currentPeriodEnd: subscription.current_period_end
        ? new Date(subscription.current_period_end)
        : null,
      canceledAt: subscription.canceled_at
        ? new Date(subscription.canceled_at)
        : null,
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
