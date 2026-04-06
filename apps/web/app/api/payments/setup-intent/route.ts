import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { createSetupIntentForUser } from '@/lib/stripe/elements/setup-intents';
import { BadRequestError } from '@/lib/errors/api-error';

/**
 * POST /api/payments/setup-intent
 * Creates a Stripe SetupIntent for saving a payment method via Elements.
 * Returns the client_secret for the frontend to call stripe.confirmSetup().
 *
 * Homeowners only (contractors don't save payment methods; they receive payouts).
 */
export const POST = withApiHandler(
  { roles: ['homeowner'], rateLimit: { maxRequests: 10 } },
  async (_request, { user }) => {
    if (!user.email) {
      throw new BadRequestError('User has no email on record');
    }

    const intent = await createSetupIntentForUser(
      user.id,
      user.email,
      (user as { name?: string }).name,
    );

    return NextResponse.json({
      success: true,
      clientSecret: intent.clientSecret,
      setupIntentId: intent.setupIntentId,
    });
  },
);
