import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { TrialService } from '@/lib/services/subscription/TrialService';
import { SubscriptionService } from '@/lib/services/subscription/SubscriptionService';
import { getFeatureLimit } from '@/lib/feature-access-config';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { getEarlyAccessEntitlement } from '@/lib/subscription/early-access';
import type { SubscriptionPlan } from '@/lib/services/subscription/SubscriptionService';
import { logger } from '@mintenance/shared';

export interface SubscriptionCheckResult {
  allowed: boolean;
  requiresSubscription: boolean;
  trialStatus?: {
    daysRemaining: number;
    isTrialActive: boolean;
  };
  subscription?: {
    status: string;
    planType: string;
  };
  message?: string;
}

export interface PortfolioModeCheckResult {
  allowed: boolean;
  requiresSubscription: boolean;
  subscriptionStatus: string;
  earlyAccessEligible?: boolean;
  reasonCode?: 'no_profile' | 'missing_subscription' | 'internal_error';
  message?: string;
}

/**
 * Check if contractor has active subscription or valid trial
 */
export async function checkSubscriptionAccess(
  request: NextRequest,
  contractorId: string
): Promise<SubscriptionCheckResult> {
  try {
    const earlyAccess = await getEarlyAccessEntitlement(contractorId);
    if (earlyAccess.eligible && earlyAccess.role === 'contractor') {
      return {
        allowed: true,
        requiresSubscription: false,
        subscription: {
          status: 'active',
          planType: 'enterprise',
        },
        message: 'Early access unlocked: full contractor subscription features.',
      };
    }

    // Check if subscription is required
    const requiresSubscription = await TrialService.requiresSubscription(contractorId);

    if (!requiresSubscription) {
      // Contractor has active trial or subscription
      const trialStatus = await TrialService.getTrialStatus(contractorId);
      const subscription = await SubscriptionService.getContractorSubscription(contractorId);

      return {
        allowed: true,
        requiresSubscription: false,
        trialStatus: trialStatus
          ? {
              daysRemaining: trialStatus.daysRemaining,
              isTrialActive: trialStatus.isTrialActive,
            }
          : undefined,
        subscription: subscription
          ? {
              status: subscription.status,
              planType: subscription.planType,
            }
          : undefined,
      };
    }

    // Subscription required - check if they have one
    const subscription = await SubscriptionService.getContractorSubscription(contractorId);

    // Free tier is always allowed
    if (subscription && (subscription.status === 'free' || subscription.status === 'active')) {
      return {
        allowed: true,
        requiresSubscription: subscription.status !== 'free',
        subscription: {
          status: subscription.status,
          planType: subscription.planType,
        },
      };
    }

    // No active subscription
    return {
      allowed: false,
      requiresSubscription: true,
      message: 'Your trial has expired. Please subscribe to continue using the platform.',
    };
  } catch (err) {
    logger.error('Error checking subscription access', {
      service: 'subscription-check',
      contractorId,
      error: err instanceof Error ? err.message : String(err),
    });

    // On error, allow access but log it
    return {
      allowed: true,
      requiresSubscription: false,
      message: 'Unable to verify subscription status. Please contact support if issues persist.',
    };
  }
}

/**
 * Middleware helper to block contractor actions if subscription required
 */
export async function requireSubscriptionForAction(
  request: NextRequest,
  action: string
): Promise<NextResponse | null> {
  const user = await getCurrentUserFromCookies();

  if (!user || user.role !== 'contractor') {
    return null; // Not a contractor, let other middleware handle it
  }

  const checkResult = await checkSubscriptionAccess(request, user.id);

  if (!checkResult.allowed) {
    logger.warn('Contractor action blocked due to subscription requirement', {
      service: 'subscription-check',
      contractorId: user.id,
      action,
    });

    return NextResponse.json(
      {
        error: 'Subscription required',
        message: checkResult.message || 'Please subscribe to continue using this feature.',
        requiresSubscription: true,
      },
      { status: 402 } // 402 Payment Required
    );
  }

  return null; // Allow the request to proceed
}

/**
 * Check if a user can access Portfolio Mode (landlord/agent capabilities).
 *
 * Rules:
 * - Admins are always allowed.
 * - If PORTFOLIO_MODE_OPEN_BETA=true, all authenticated users are allowed.
 * - Otherwise requires profiles.subscription_status to be "active" or "trial".
 */
export async function checkPortfolioModeAccess(userId: string): Promise<PortfolioModeCheckResult> {
  try {
    const { data: profile, error } = await serverSupabase
      .from('profiles')
      .select('id, role, subscription_status')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      logger.error('Error checking portfolio mode access', {
        service: 'subscription-check',
        userId,
        error: error.message,
      });

      return {
        allowed: false,
        requiresSubscription: true,
        subscriptionStatus: 'unknown',
        reasonCode: 'internal_error',
        message: 'Unable to verify subscription status for portfolio access.',
      };
    }

    if (!profile) {
      return {
        allowed: false,
        requiresSubscription: true,
        subscriptionStatus: 'none',
        reasonCode: 'no_profile',
        message: 'Profile not found.',
      };
    }

    if (profile.role === 'admin') {
      return {
        allowed: true,
        requiresSubscription: false,
        subscriptionStatus: String(profile.subscription_status || 'active'),
        earlyAccessEligible: false,
      };
    }

    const earlyAccess = await getEarlyAccessEntitlement(userId);
    if (earlyAccess.eligible) {
      return {
        allowed: true,
        requiresSubscription: false,
        subscriptionStatus: 'early_access',
        earlyAccessEligible: true,
        message: 'Early access unlocked: full premium features.',
      };
    }

    if (process.env.PORTFOLIO_MODE_OPEN_BETA === 'true') {
      return {
        allowed: true,
        requiresSubscription: false,
        subscriptionStatus: String(profile.subscription_status || 'beta'),
        earlyAccessEligible: false,
      };
    }

    const subscriptionStatus = String(profile.subscription_status || 'none').toLowerCase();
    const hasPortfolioEntitlement = subscriptionStatus === 'active' || subscriptionStatus === 'trial';

    if (hasPortfolioEntitlement) {
      return {
        allowed: true,
        requiresSubscription: subscriptionStatus !== 'active',
        subscriptionStatus,
        earlyAccessEligible: false,
      };
    }

    return {
      allowed: false,
      requiresSubscription: true,
      subscriptionStatus,
      earlyAccessEligible: false,
      reasonCode: 'missing_subscription',
      message: 'Portfolio mode requires an active plan or trial.',
    };
  } catch (err) {
    logger.error('Unexpected error checking portfolio mode access', {
      service: 'subscription-check',
      userId,
      error: err instanceof Error ? err.message : String(err),
    });

    return {
      allowed: false,
      requiresSubscription: true,
      subscriptionStatus: 'unknown',
      earlyAccessEligible: false,
      reasonCode: 'internal_error',
      message: 'Unable to verify portfolio mode access.',
    };
  }
}

/**
 * Middleware helper to block Portfolio Mode actions when the user lacks entitlement.
 */
export async function requirePortfolioModeSubscription(
  _request: NextRequest
): Promise<NextResponse | null> {
  const user = await getCurrentUserFromCookies();

  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  const access = await checkPortfolioModeAccess(user.id);
  if (access.allowed) {
    return null;
  }

  logger.warn('Portfolio mode action blocked due to subscription requirement', {
    service: 'subscription-check',
    userId: user.id,
    reasonCode: access.reasonCode,
    subscriptionStatus: access.subscriptionStatus,
  });

  return NextResponse.json(
    {
      error: 'Portfolio subscription required',
      message: access.message || 'Upgrade required to access portfolio mode.',
      requiresSubscription: true,
      feature: 'portfolio_mode',
      subscriptionStatus: access.subscriptionStatus,
    },
    { status: 402 }
  );
}

/**
 * Check if contractor can perform an action based on subscription limits
 */
export async function checkSubscriptionLimits(
  contractorId: string,
  action: 'post_job' | 'submit_bid' | 'view_analytics' | 'use_api'
): Promise<{ allowed: boolean; reason?: string }> {
  try {
    const earlyAccess = await getEarlyAccessEntitlement(contractorId);
    if (earlyAccess.eligible && earlyAccess.role === 'contractor') {
      return { allowed: true };
    }

    const features = await SubscriptionService.getSubscriptionFeatures(contractorId);
    const subscription = await SubscriptionService.getContractorSubscription(contractorId);

    const planType: SubscriptionPlan = subscription?.planType ?? 'free';

    switch (action) {
      case 'post_job':
        if (!features || !subscription) {
          return { allowed: false, reason: 'No active subscription found' };
        }
        if (features.maxJobs !== null) {
          const { serverSupabase } = await import('@/lib/api/supabaseServer');
          const { count } = await serverSupabase
            .from('jobs')
            .select('*', { count: 'exact', head: true })
            .eq('contractor_id', contractorId);

          if (count !== null && count >= features.maxJobs) {
            return {
              allowed: false,
              reason: `You have reached your plan limit of ${features.maxJobs} jobs. Please upgrade to continue.`,
            };
          }
        }
        break;

      case 'view_analytics':
        if (!features || !subscription) {
          return { allowed: false, reason: 'No active subscription found' };
        }
        if (!features.advancedAnalytics) {
          return {
            allowed: false,
            reason: 'Advanced analytics requires a Professional or Enterprise plan.',
          };
        }
        break;

      case 'use_api':
        if (!features || !subscription) {
          return { allowed: false, reason: 'No active subscription found' };
        }
        if (!features.apiAccess) {
          return {
            allowed: false,
            reason: 'API access requires an Enterprise plan.',
          };
        }
        break;

      case 'submit_bid': {
        const limit = getFeatureLimit('CONTRACTOR_BID_LIMIT', 'contractor', planType);
        if (limit === 'unlimited') {
          break;
        }
        const numericLimit = typeof limit === 'number' ? limit : 0;
        const { serverSupabase } = await import('@/lib/api/supabaseServer');
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();
        const { count, error } = await serverSupabase
          .from('bids')
          .select('*', { count: 'exact', head: true })
          .eq('contractor_id', contractorId)
          .gte('created_at', startOfMonth)
          .lte('created_at', endOfMonth);

        if (error) {
          logger.warn('Failed to count bids for limit check', {
            service: 'subscription-check',
            contractorId,
            error: error.message,
          });
          break;
        }
        if (count !== null && count >= numericLimit) {
          return {
            allowed: false,
            reason: `You have reached your plan limit of ${numericLimit} bids per month. Upgrade to submit more bids.`,
          };
        }
        break;
      }
    }

    return { allowed: true };
  } catch (err) {
    logger.error('Error checking subscription limits', {
      service: 'subscription-check',
      contractorId,
      action,
      error: err instanceof Error ? err.message : String(err),
    });

    return { allowed: true };
  }
}
