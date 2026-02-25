import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { checkPortfolioModeAccess } from '@/lib/middleware/subscription-check';

/**
 * Returns whether the current user can access Portfolio Mode.
 * Intended for paywall-aware UI gating before calling protected portfolio APIs.
 */
export const GET = withApiHandler({}, async (_request, { user }) => {
  const access = await checkPortfolioModeAccess(user.id);

  return NextResponse.json({
    feature: 'portfolio_mode',
    allowed: access.allowed,
    requiresSubscription: access.requiresSubscription,
    subscriptionStatus: access.subscriptionStatus,
    earlyAccessEligible: access.earlyAccessEligible || false,
    reasonCode: access.reasonCode || null,
    message: access.message || null,
    upgradeUrl: '/pricing?feature=portfolio_mode',
  });
});
