import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';

/**
 * 410 Gone — legacy payout setup endpoint.
 *
 * 2026-05-25 audit-46 P1: this route previously invoked the
 * setup-contractor-payout edge function which inserts into
 * `contractor_payout_accounts` — a table that does NOT exist on the
 * live database (verified 2026-05-25 via information_schema). Every
 * call from the legacy /contractor/payouts page either errored or
 * silently no-op'd at the edge.
 *
 * Canonical flow is `/api/payments/stripe-connect/onboard` (returns a
 * Stripe Connect Account Link URL) + `/api/payments/stripe-connect/status`.
 * The legacy /contractor/payouts page now redirects to
 * /contractor/payouts/onboarding which uses those endpoints.
 *
 * Returning 410 so any lingering caller (test suite, stale mobile
 * build) sees a clear migration error instead of a working-but-broken
 * setup attempt. Mobile FeeCalculator.setupContractorPayout still
 * references this path but is only invoked from test mocks today.
 */
export const POST = withApiHandler({ roles: ['contractor'] }, async () => {
  return NextResponse.json(
    {
      error: 'Endpoint removed',
      message:
        'Use POST /api/payments/stripe-connect/onboard to start Stripe Connect onboarding. This legacy endpoint targeted a removed table.',
      migration: '/api/payments/stripe-connect/onboard',
    },
    { status: 410 }
  );
});
