import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { SubscriptionService } from '@/lib/services/subscription/SubscriptionService';
import { logger } from '@mintenance/shared';
import { requireCSRF } from '@/lib/csrf-validator';
import { z } from 'zod';

const cancelSubscriptionSchema = z.object({
  cancelAtPeriodEnd: z.boolean().optional().default(true),
});

export async function POST(request: NextRequest) {
  try {
    // Validate CSRF
    if (!(await requireCSRF(request))) {
      return NextResponse.json({ error: 'CSRF token validation failed' }, { status: 403 });
    }

    const user = await getCurrentUserFromCookies();
    if (!user || user.role !== 'contractor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = cancelSubscriptionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { cancelAtPeriodEnd } = validation.data;

    // Get user's subscription
    const subscription = await SubscriptionService.getContractorSubscription(user.id);

    if (!subscription || !subscription.stripeSubscriptionId) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 404 });
    }

    // Cancel subscription
    const success = await SubscriptionService.cancelSubscription(
      subscription.stripeSubscriptionId,
      cancelAtPeriodEnd
    );

    if (!success) {
      return NextResponse.json({ error: 'Failed to cancel subscription' }, { status: 500 });
    }

    logger.info('Subscription canceled', {
      service: 'subscriptions',
      contractorId: user.id,
      subscriptionId: subscription.stripeSubscriptionId,
      cancelAtPeriodEnd,
    });

    return NextResponse.json({
      success: true,
      message: cancelAtPeriodEnd
        ? 'Subscription will be canceled at the end of the billing period'
        : 'Subscription canceled immediately',
    });
  } catch (err) {
    logger.error('Error canceling subscription', {
      service: 'subscriptions',
      error: err instanceof Error ? err.message : String(err),
    });

    return NextResponse.json(
      { error: 'Failed to cancel subscription', details: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

