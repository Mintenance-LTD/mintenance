import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { SubscriptionService } from '@/lib/services/subscription/SubscriptionService';
import { HomeownerSubscriptionService } from '@/lib/services/subscription/HomeownerSubscriptionService';
import { TrialService } from '@/lib/services/subscription/TrialService';
import { getEarlyAccessEntitlement } from '@/lib/subscription/early-access';
import { handleAPIError, UnauthorizedError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';

export async function GET(request: NextRequest) {
  try {
  // Rate limiting check
  const rateLimitResult = await rateLimiter.checkRateLimit({
    identifier: `${request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'anonymous'}:${request.url}`,
    windowMs: 60000,
    maxRequests: 30
  });

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimitResult.retryAfter || 60),
          'X-RateLimit-Limit': String(30),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
        }
      }
    );
  }

    const user = await getCurrentUserFromCookies();
    if (!user || (user.role !== 'contractor' && user.role !== 'homeowner')) {
      throw new UnauthorizedError('Authentication required');
    }

    const earlyAccess = await getEarlyAccessEntitlement(user.id);

    if (user.role === 'homeowner') {
      const subscription = await HomeownerSubscriptionService.getCurrentSubscription(user.id);
      const earlyAccessEligible = earlyAccess.eligible && earlyAccess.role === 'homeowner';
      const hasActivePremium = Boolean(subscription && ['active', 'trial'].includes(String(subscription.status)));

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

    const subscription = await SubscriptionService.getContractorSubscription(user.id);
    const trialStatus = await TrialService.getTrialStatus(user.id);
    const requiresSubscription = await TrialService.requiresSubscription(user.id);
    const earlyAccessEligible = earlyAccess.eligible && earlyAccess.role === 'contractor';

    return NextResponse.json({
      role: 'contractor',
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
  } catch (err) {
    return handleAPIError(err);
  }
}

