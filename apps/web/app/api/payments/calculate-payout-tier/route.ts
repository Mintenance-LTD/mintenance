import { NextRequest, NextResponse } from 'next/server';
import { PayoutTierService } from '@/lib/services/payment/PayoutTierService';
import { logger } from '@mintenance/shared';
import { withApiHandler } from '@/lib/api/with-api-handler';

export const GET = withApiHandler(
  { roles: ['contractor'], rateLimit: { maxRequests: 20 } },
  async (request, { user }) => {
    const tier = await PayoutTierService.calculateTier(user.id);
    const payoutHours = await PayoutTierService.getPayoutSpeed(user.id);

    // Update tier in database
    await PayoutTierService.updateTier(user.id);

    return NextResponse.json({
      tier,
      payoutHours,
      payoutDays: Math.round(payoutHours / 24),
    });
  }
);
