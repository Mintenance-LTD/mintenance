import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { z } from 'zod';
import { logger } from '@mintenance/shared';
import { env } from '@/lib/env';
import { rateLimiter } from '@/lib/rate-limiter';

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
  // Rate limiting check
  const rateLimitResult = await rateLimiter.checkRateLimit({
    identifier: `${request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'anonymous'}:${request.url}`,
    windowMs: 60000,
    maxRequests: 20
  });

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimitResult.retryAfter || 60),
          'X-RateLimit-Limit': String(20),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
        }
      }
    );
  }

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

