import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';

/**
 * 410 Gone — legacy payout setup endpoint.
 *
 * 2026-05-25 audit-46 P1 + audit-47 correction: this route previously
 * invoked the `setup-contractor-payout` edge function, which writes to
 * `contractor_payout_accounts`. That table DOES exist on live (1 stale
 * row from 2026-03-08, re-verified 2026-05-26 via information_schema)
 * but it has no migration in this repo, is never re-synced with
 * Stripe after creation, and is read by NO active code — making it an
 * orphan. The audit-46 commit's claim that the table didn't exist was
 * incorrect; the table exists but is dead state.
 *
 * Canonical flow is `/api/payments/stripe-connect/onboard` (returns a
 * Stripe Connect Account Link URL) + `/api/payments/stripe-connect/status`.
 * The legacy /contractor/payouts page now redirects to
 * /contractor/payouts/onboarding which uses those endpoints + the
 * canonical profiles.stripe_payouts_enabled / stripe_transfers_active
 * readiness flags.
 *
 * Returning 410 so any lingering caller (mobile FeeCalculator,
 * test suite, stale mobile build) sees a clear migration error
 * instead of a working-but-broken setup attempt. The mobile
 * PaymentService binding is repointed in audit-47 #205.
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
