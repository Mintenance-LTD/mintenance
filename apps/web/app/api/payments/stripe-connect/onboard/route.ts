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
  async (request, { user }) => {
    if (!user.email) {
      throw new BadRequestError('User has no email on record');
    }

    // 2026-05-23 audit-23 P1: mobile sends `{ client: 'mobile' }` in the
    // body so the onboarding return URL appends `?client=mobile`, which
    // the /onboarding-complete page reads to fire a deep link back to
    // `mintenance://payouts/return`. Without this, contractors finished
    // onboarding inside the WebBrowser session and the mobile auth
    // session never resolved.
    let client: 'mobile' | 'web' | undefined;
    try {
      const body = await request.json();
      if (body?.client === 'mobile') client = 'mobile';
    } catch {
      // Body is optional — fall through with client = undefined.
    }

    const accountId = await ensureConnectAccount(user.id, user.email);
    const link = await createOnboardingLink(accountId, { client });

    logger.info('Connect onboarding link minted', {
      service: 'stripe-connect',
      contractorId: user.id,
      accountId,
      client,
    });

    return NextResponse.json({
      success: true,
      url: link.url,
      expiresAt: link.expiresAt,
    });
  }
);
