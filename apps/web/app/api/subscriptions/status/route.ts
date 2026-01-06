import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { SubscriptionService } from '@/lib/services/subscription/SubscriptionService';
import { TrialService } from '@/lib/services/subscription/TrialService';
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

