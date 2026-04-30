/**
 * GET /api/payments/payment-methods — DEPRECATED.
 *
 * 2026-04-30 audit P1: this route used to read from the legacy
 * `payment_methods` audit table. Stripe is the canonical source of
 * truth for payment-method state, exposed at `/api/payments/methods`.
 * Verified there are no UI callers of this endpoint anymore (every
 * payment-methods screen — `/contractor/settings`, `/settings/_components/settings-api`,
 * `/settings/payment-methods` — already calls `/api/payments/methods`).
 *
 * The handler now returns 410 Gone with a `Link` header that points
 * agents/SDKs at the canonical replacement, instead of silently
 * returning stale local-DB rows that disagree with Stripe.
 *
 * The sibling `[id]/route.ts` (DELETE detach + PATCH set-default) is
 * still in use and remains live; only the LIST path is deprecated
 * here.
 */
import { NextResponse } from 'next/server';

const REPLACEMENT_URL = '/api/payments/methods';

export function GET(): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: 'gone',
      message:
        'GET /api/payments/payment-methods has been removed. Use ' +
        REPLACEMENT_URL +
        ' (Stripe-backed canonical source).',
      replacement: REPLACEMENT_URL,
    },
    {
      status: 410,
      headers: {
        Link: `<${REPLACEMENT_URL}>; rel="successor-version"`,
        Deprecation: 'true',
      },
    }
  );
}
