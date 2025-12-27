import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { PayoutTierService } from '@/lib/services/payment/PayoutTierService';
import { logger } from '@mintenance/shared';
import { handleAPIError, UnauthorizedError, ForbiddenError, NotFoundError, BadRequestError, InternalServerError } from '@/lib/errors/api-error';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUserFromCookies();
    if (!user) {
      throw new UnauthorizedError('Authentication required');
    }

    if (user.role !== 'contractor') {
      throw new ForbiddenError('Only contractors can check payout tier');
    }

    const tier = await PayoutTierService.calculateTier(user.id);
    const payoutHours = await PayoutTierService.getPayoutSpeed(user.id);

    // Update tier in database
    await PayoutTierService.updateTier(user.id);

    return NextResponse.json({
      tier,
      payoutHours,
      payoutDays: Math.round(payoutHours / 24),
    });
  } catch (error) {
    logger.error('Error calculating payout tier', error, { service: 'payments' });
    throw new InternalServerError('Internal server error');
  }
}

