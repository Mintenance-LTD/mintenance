import { NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '@mintenance/shared';
import { validateRequest } from '@/lib/validation/validator';
import { withApiHandler } from '@/lib/api/with-api-handler';

const bankAccountSchema = z.object({
  accountNumber: z.string().trim().min(6, 'Account number is required'),
  sortCode: z.string().trim().min(6, 'Sort code is required'),
  accountHolderName: z
    .string()
    .trim()
    .min(1, 'Account holder name is required'),
});

/**
 * POST /api/payments/bank-account
 * Register bank account details for contractor payouts.
 *
 * IMPLEMENTATION STATUS: Not yet wired to Stripe Connect. Full onboarding
 * requires Stripe Connect Express account creation + KYC verification +
 * external_account (bank) linking, which is a multi-step flow that must be
 * driven from the Stripe Dashboard or Connect onboarding URL.
 *
 * Contractor-facing payout setup should use POST /api/payments/stripe-connect
 * (Connect Express onboarding link) instead of this endpoint.
 */
export const POST = withApiHandler(
  { rateLimit: { maxRequests: 10 } },
  async (request, { user }) => {
    const validation = await validateRequest(request, bankAccountSchema);
    if ('headers' in validation) {
      return validation;
    }

    const { sortCode, accountHolderName } = validation.data;

    // Log the attempt (masked) for visibility, but do NOT silently accept.
    logger.warn('Bank account endpoint called — Stripe Connect not wired up', {
      service: 'payments',
      userId: user.id,
      sortCodePrefix: sortCode.substring(0, 2) + '****',
      accountHolderName,
    });

    return NextResponse.json(
      {
        success: false,
        error: 'NOT_IMPLEMENTED',
        message:
          'Direct bank-account submission is not yet enabled. Please complete payout setup via the Stripe Connect onboarding flow.',
        code: 'stripe_connect_pending',
      },
      { status: 501 },
    );
  }
);
