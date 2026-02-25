import { NextResponse } from 'next/server';
import { SubscriptionService } from '@/lib/services/subscription/SubscriptionService';
import { HomeownerSubscriptionService } from '@/lib/services/subscription/HomeownerSubscriptionService';
import { logger } from '@mintenance/shared';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { NotFoundError, InternalServerError } from '@/lib/errors/api-error';

const cancelSubscriptionSchema = z.object({
  cancelAtPeriodEnd: z.boolean().optional().default(true),
});

/**
 * POST /api/subscriptions/cancel
 * Cancel a subscription for homeowner or contractor
 */
export const POST = withApiHandler(
  { roles: ['contractor', 'homeowner'], rateLimit: { maxRequests: 30 } },
  async (request, { user }) => {
    const body = await request.json();
    const validation = cancelSubscriptionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { cancelAtPeriodEnd } = validation.data;

    if (user.role === 'homeowner') {
      const result = await HomeownerSubscriptionService.cancelSubscription(user.id, cancelAtPeriodEnd);
      if (!result.success) {
        throw new NotFoundError(result.message);
      }

      logger.info('Homeowner subscription canceled', {
        service: 'subscriptions',
        homeownerId: user.id,
        cancelAtPeriodEnd,
      });

      return NextResponse.json({
        success: true,
        message: result.message,
      });
    }

    // Contractor flow
    const subscription = await SubscriptionService.getContractorSubscription(user.id);
    if (!subscription || !subscription.stripeSubscriptionId) {
      throw new NotFoundError('No active subscription found');
    }

    const success = await SubscriptionService.cancelSubscription(
      subscription.stripeSubscriptionId,
      cancelAtPeriodEnd
    );

    if (!success) {
      throw new InternalServerError('Failed to cancel subscription');
    }

    logger.info('Contractor subscription canceled', {
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
  }
);
