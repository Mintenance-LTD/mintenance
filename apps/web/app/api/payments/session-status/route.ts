import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { z } from 'zod';
import { logger } from '@mintenance/shared';
import { env } from '@/lib/env';

const stripe = new Stripe(env.STRIPE_SECRET_KEY);

const querySchema = z.object({
  session_id: z.string().min(1, 'Session ID is required'),
});

/**
 * Get the status of a Stripe Checkout Session
 * GET /api/payments/session-status?session_id=xxx
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
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
  } catch (err) {
    logger.error('Failed to retrieve checkout session status', err, {
      service: 'payments',
    });
    return NextResponse.json(
      { error: 'Failed to retrieve session status' },
      { status: 500 }
    );
  }
}

