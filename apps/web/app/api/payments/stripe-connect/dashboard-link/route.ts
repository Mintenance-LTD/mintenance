import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { createDashboardLoginLink } from '@/lib/stripe/connect/onboarding';
import { getCachedAccountStatus } from '@/lib/stripe/connect/accounts';
import { BadRequestError } from '@/lib/errors/api-error';

/**
 * POST /api/payments/stripe-connect/dashboard-link
 * Mint a short-lived login link to the contractor's Express Dashboard
 * (where they can see tax documents, update bank details, view balance, etc.).
 * Contractor-only; requires completed onboarding.
 */
export const POST = withApiHandler(
  { roles: ['contractor'], rateLimit: { maxRequests: 10 } },
  async (_request, { user }) => {
    const status = await getCachedAccountStatus(user.id);
    if (!status) {
      throw new BadRequestError('No Connect account — complete onboarding first');
    }
    if (!status.detailsSubmitted) {
      throw new BadRequestError('Onboarding not yet completed');
    }

    const link = await createDashboardLoginLink(status.accountId);
    return NextResponse.json({ success: true, url: link.url });
  },
);
