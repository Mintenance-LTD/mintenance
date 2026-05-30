import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { z } from 'zod';
import { logger } from '@mintenance/shared';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { ForbiddenError, NotFoundError } from '@/lib/errors/api-error';
// 2026-05-27 whole-app review Critical #3: was `new Stripe(env.STRIPE_SECRET_KEY)`
// with no apiVersion, defaulting to whatever the installed SDK picked.
// Swap to the shared lazy proxy so the API version stays pinned at
// '2025-01-27.acacia' in one place. Audit P2.1 (2026-05-10) retired
// every other un-pinned Stripe init; this was the last straggler.
import { stripe } from '@/lib/stripe';

const querySchema = z.object({
  session_id: z
    .string()
    .min(1, 'Session ID is required')
    .regex(/^cs_(test|live)_[A-Za-z0-9]+$/, 'Invalid session ID format'),
});

/**
 * Get the status of a Stripe Checkout Session
 * GET /api/payments/session-status?session_id=xxx
 *
 * Audit P1 (2026-05-10): the previous implementation returned the
 * session status + customer email for ANY session_id a signed-in
 * homeowner/contractor passed. Stripe session ids are unguessable
 * but leak via referrer / logs / browser history, so the route is
 * now scoped to sessions the caller actually created. We compare
 * against `metadata.userId`, which is set at creation time in
 * `apps/web/app/api/payments/embedded-checkout/route.ts:127`.
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
        {
          error: 'Invalid query parameters',
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { session_id } = parsed.data;

    // Retrieve the Checkout Session
    let session: Stripe.Checkout.Session;
    try {
      session = await stripe.checkout.sessions.retrieve(session_id);
    } catch (err) {
      if (err instanceof Stripe.errors.StripeError && err.statusCode === 404) {
        throw new NotFoundError('Checkout session not found');
      }
      throw err;
    }

    // Ownership check: only the user who created the session may read it.
    // `metadata.userId` is set in embedded-checkout/route.ts at creation
    // time. Admins can also see any session for support purposes.
    const sessionUserId = session.metadata?.userId;
    if (user.role !== 'admin' && sessionUserId !== user.id) {
      logger.warn('Cross-tenant session-status access blocked', {
        service: 'payments',
        callerId: user.id,
        callerRole: user.role,
        sessionUserId: sessionUserId ?? 'missing',
        sessionId: session.id,
      });
      // 404 (not 403) so the route doesn't confirm whether the
      // session exists for unauthorized callers.
      throw new NotFoundError('Checkout session not found');
    }

    logger.info('Checkout session status retrieved', {
      service: 'payments',
      sessionId: session.id,
      status: session.status,
      callerId: user.id,
    });

    return NextResponse.json({
      status: session.status,
      customer_email: session.customer_details?.email || null,
    });
  }
);
