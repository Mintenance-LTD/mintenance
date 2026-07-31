import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { SubscriptionService } from '@/lib/services/subscription/SubscriptionService';
import { HomeownerSubscriptionService } from '@/lib/services/subscription/HomeownerSubscriptionService';
import { TrialService } from '@/lib/services/subscription/TrialService';
import { getEarlyAccessEntitlement } from '@/lib/subscription/early-access';
import { FeeCalculationService } from '@/lib/services/payment/FeeCalculationService';
import {
  platformFeeRateForTier,
  formatPlatformFeePercent,
} from '@mintenance/shared';

/**
 * GET /api/subscriptions/status
 * Get subscription status for current user (homeowner or contractor)
 */
export const GET = withApiHandler(
  { roles: ['homeowner', 'contractor'] },
  async (_request, { user }) => {
    const earlyAccess = await getEarlyAccessEntitlement(user.id);

    if (user.role === 'homeowner') {
      const subscription =
        await HomeownerSubscriptionService.getCurrentSubscription(user.id);
      const earlyAccessEligible =
        earlyAccess.eligible && earlyAccess.role === 'homeowner';
      const hasActivePremium = Boolean(
        subscription &&
        ['active', 'trial'].includes(String(subscription.status))
      );

      return NextResponse.json({
        role: 'homeowner',
        subscription: subscription
          ? {
              id: subscription.id,
              planType: subscription.plan_type,
              planName: subscription.plan_name,
              status: subscription.status,
              amount: subscription.amount,
              currency: subscription.currency,
              currentPeriodEnd: subscription.current_period_end,
              cancelAtPeriodEnd: subscription.cancel_at_period_end,
              metadata: subscription.metadata,
            }
          : null,
        trial: null,
        requiresSubscription: !(hasActivePremium || earlyAccessEligible),
        earlyAccess: {
          eligible: earlyAccessEligible,
          cohortLimit: earlyAccessEligible ? earlyAccess.cohortLimit : null,
        },
      });
    }

    const subscription = await SubscriptionService.getContractorSubscription(
      user.id
    );
    const trialStatus = await TrialService.getTrialStatus(user.id);
    const requiresSubscription = await TrialService.requiresSubscription(
      user.id
    );
    const earlyAccessEligible =
      earlyAccess.eligible && earlyAccess.role === 'contractor';

    // Effective platform fee for THIS contractor, resolved with the exact
    // same logic the escrow release uses to charge them — so every "You'll
    // be paid" / "Platform fee (x%)" surface on web and mobile can display
    // the real rate instead of a hardcoded guess. (2026-07-22 fee fix.)
    const effectiveTier = await FeeCalculationService.resolveContractorTier(
      user.id
    );
    const platformFeeRate = platformFeeRateForTier(effectiveTier);

    return NextResponse.json({
      role: 'contractor',
      effectiveTier,
      platformFeeRate,
      platformFeePercent: formatPlatformFeePercent(platformFeeRate),
      subscription: subscription
        ? {
            id: subscription.id,
            planType: subscription.planType,
            planName: subscription.planName,
            status: subscription.status,
            amount: subscription.amount,
            currency: subscription.currency,
            currentPeriodEnd: subscription.currentPeriodEnd?.toISOString(),
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
            features: subscription.features,
          }
        : null,
      trial: trialStatus
        ? {
            daysRemaining: trialStatus.daysRemaining,
            isTrialActive: trialStatus.isTrialActive,
            trialEndsAt: trialStatus.trialEndsAt?.toISOString(),
          }
        : null,
      requiresSubscription,
      earlyAccess: {
        eligible: earlyAccessEligible,
        cohortLimit: earlyAccessEligible ? earlyAccess.cohortLimit : null,
      },
    });
  }
);
