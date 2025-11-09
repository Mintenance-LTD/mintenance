import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { TrialService } from '@/lib/services/subscription/TrialService';
import { SubscriptionService } from '@/lib/services/subscription/SubscriptionService';
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

/**
 * Check if contractor has active subscription or valid trial
 */
export async function checkSubscriptionAccess(
  request: NextRequest,
  contractorId: string
): Promise<SubscriptionCheckResult> {
  try {
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

    if (subscription && subscription.status === 'active') {
      return {
        allowed: true,
        requiresSubscription: true,
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
 * Check if contractor can perform an action based on subscription limits
 */
export async function checkSubscriptionLimits(
  contractorId: string,
  action: 'post_job' | 'submit_bid' | 'view_analytics' | 'use_api'
): Promise<{ allowed: boolean; reason?: string }> {
  try {
    const features = await SubscriptionService.getSubscriptionFeatures(contractorId);
    const subscription = await SubscriptionService.getContractorSubscription(contractorId);

    if (!features || !subscription) {
      return {
        allowed: false,
        reason: 'No active subscription found',
      };
    }

    switch (action) {
      case 'post_job':
        if (features.maxJobs !== null) {
          // Check current job count
          const { serverSupabase } = await import('@/lib/api/supabaseServer');
          const { count } = await serverSupabase
            .from('jobs')
            .select('*', { count: 'exact', head: true })
            .eq('contractor_id', contractorId);

          if (count && count >= features.maxJobs) {
            return {
              allowed: false,
              reason: `You have reached your plan limit of ${features.maxJobs} jobs. Please upgrade to continue.`,
            };
          }
        }
        break;

      case 'view_analytics':
        if (!features.advancedAnalytics) {
          return {
            allowed: false,
            reason: 'Advanced analytics requires a Professional or Enterprise plan.',
          };
        }
        break;

      case 'use_api':
        if (!features.apiAccess) {
          return {
            allowed: false,
            reason: 'API access requires an Enterprise plan.',
          };
        }
        break;

      case 'submit_bid':
        // Always allowed if subscription is active
        break;
    }

    return { allowed: true };
  } catch (err) {
    logger.error('Error checking subscription limits', {
      service: 'subscription-check',
      contractorId,
      action,
      error: err instanceof Error ? err.message : String(err),
    });

    // On error, allow the action
    return { allowed: true };
  }
}

