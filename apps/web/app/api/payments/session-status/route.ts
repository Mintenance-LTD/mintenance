import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { z } from 'zod';
import { logger } from '@mintenance/shared';
import { env } from '@/lib/env';
import { withApiHandler } from '@/lib/api/with-api-handler';

const stripe = new Stripe(env.STRIPE_SECRET_KEY);

const querySchema = z.object({
  session_id: z.string().min(1, 'Session ID is required'),
});

/**
 * Get the status of a Stripe Checkout Session
 * GET /api/payments/session-status?session_id=xxx
 */
export const GET = withApiHandler(
  { roles: ['homeowner', 'contractor'], rateLimit: { maxRequests: 20 } },
  async (request, { user }) => {
    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse({
      session_id: searchParams.get('session_id'),
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { session_id } = parsed.data;

    // Retrieve the Checkout Session
    const session = await stripe.checkout.sessions.retrieve(session_id);

    logger.info('Checkout session status retrieved', {
      service: 'payments',
      sessionId: session.id,
      status: session.status,
    });

    return NextResponse.json({
      status: session.status,
      customer_email: session.customer_details?.email || null,
    });
  }
);
