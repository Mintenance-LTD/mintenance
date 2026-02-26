import { NextResponse } from 'next/server';
import { SubscriptionService } from '@/lib/services/subscription/SubscriptionService';
import { withApiHandler } from '@/lib/api/with-api-handler';

/**
 * GET /api/subscriptions/plans - public endpoint to list available plans.
 */
export const GET = withApiHandler({ auth: false }, async () => {
  const plans = await SubscriptionService.getAvailablePlans();
  return NextResponse.json({ plans });
});
