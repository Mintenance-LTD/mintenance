import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { PayoutTierService } from '@/lib/services/payment/PayoutTierService';
import { logger } from '@mintenance/shared';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUserFromCookies();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'contractor') {
      return NextResponse.json({ error: 'Only contractors can check payout tier' }, { status: 403 });
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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

