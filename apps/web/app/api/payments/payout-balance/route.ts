import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { getPayoutBalance } from '@/lib/stripe/connect/payouts';
import { PRIMARY_CURRENCY } from '@/lib/stripe/connect/config';

/**
 * GET /api/payments/payout-balance
 * Returns the contractor's accumulated earnings pending the next payout.
 * Contractor-only.
 */
export const GET = withApiHandler(
  { roles: ['contractor'], csrf: false, rateLimit: { maxRequests: 30 } },
  async (_request, { user }) => {
    const balance = await getPayoutBalance(user.id, PRIMARY_CURRENCY);
    return NextResponse.json({ success: true, balance });
  },
);
