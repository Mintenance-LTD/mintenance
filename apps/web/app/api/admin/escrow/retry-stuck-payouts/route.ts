import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { retryStuckPayouts } from '@/lib/services/payment/StuckEscrowRetryService';

/**
 * POST /api/admin/escrow/retry-stuck-payouts
 *
 * Find escrow rows that were reset by an operator because the contractor's
 * Stripe Connect payouts were not enabled, and re-stamp auto_release_date
 * on rows whose contractor has since completed onboarding. Idempotent —
 * subsequent calls only act on newly-eligible rows.
 *
 * Admin-only, MFA step-up required (real-money operation), activity-logged.
 * 2026-05-25 audit-P0-1 — see lib/services/payment/StuckEscrowRetryService.ts
 * for the full rationale.
 */
export const POST = withApiHandler(
  {
    roles: ['admin'],
    rateLimit: { maxRequests: 5 },
    requireMfaVerifiedWithinMinutes: 15,
    logActivity: {
      actionType: 'escrow_retry_stuck_payouts',
      category: 'revenue',
      targetType: 'escrow',
      description:
        'Retried operator-reset escrow rows after contractor onboarded',
    },
  },
  async () => {
    const summary = await retryStuckPayouts();
    return NextResponse.json({ success: true, ...summary });
  }
);
