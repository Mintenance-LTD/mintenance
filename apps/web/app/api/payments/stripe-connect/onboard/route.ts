import { NextResponse } from 'next/server';
import { logger } from '@mintenance/shared';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { ensureConnectAccount } from '@/lib/stripe/connect/accounts';
import { createOnboardingLink } from '@/lib/stripe/connect/onboarding';
import { BadRequestError } from '@/lib/errors/api-error';

/**
 * POST /api/payments/stripe-connect/onboard
 * Create (or fetch) the contractor's Connect Express account and return
 * a short-lived onboarding link. Contractor-only.
 */
export const POST = withApiHandler(
  { roles: ['contractor'], rateLimit: { maxRequests: 20 } },
  async (_request, { user }) => {
    if (!user.email) {
      throw new BadRequestError('User has no email on record');
    }

    const accountId = await ensureConnectAccount(user.id, user.email);
    const link = await createOnboardingLink(accountId);

    logger.info('Connect onboarding link minted', {
      service: 'stripe-connect',
      contractorId: user.id,
      accountId,
    });

    return NextResponse.json({ success: true, url: link.url, expiresAt: link.expiresAt });
  },
);
