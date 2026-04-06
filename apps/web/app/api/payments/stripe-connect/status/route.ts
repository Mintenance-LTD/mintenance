import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import {
  getCachedAccountStatus,
  syncAccountStatus,
} from '@/lib/stripe/connect/accounts';

/**
 * GET /api/payments/stripe-connect/status
 * Returns current Connect account status.
 *
 * Query params:
 *   ?refresh=true — force a fresh fetch from Stripe (rate-limited)
 *
 * Contractor-only.
 */
export const GET = withApiHandler(
  { roles: ['contractor'], csrf: false, rateLimit: { maxRequests: 30 } },
  async (request, { user }) => {
    const url = new URL(request.url);
    const refresh = url.searchParams.get('refresh') === 'true';

    if (refresh) {
      const status = await syncAccountStatus(user.id);
      return NextResponse.json({ success: true, status });
    }

    const status = await getCachedAccountStatus(user.id);
    return NextResponse.json({ success: true, status });
  },
);
