import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { SubscriptionService } from '@/lib/services/subscription/SubscriptionService';
import { TrialService } from '@/lib/services/subscription/TrialService';
import { handleAPIError, UnauthorizedError } from '@/lib/errors/api-error';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUserFromCookies();
    if (!user || user.role !== 'contractor') {
      throw new UnauthorizedError('Contractor authentication required');
    }

    const subscription = await SubscriptionService.getContractorSubscription(user.id);
    const trialStatus = await TrialService.getTrialStatus(user.id);
    const requiresSubscription = await TrialService.requiresSubscription(user.id);

    return NextResponse.json({
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
    });
  } catch (err) {
    return handleAPIError(err);
  }
}

