import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUserFromCookies } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'Contractor Payout Settings | Mintenance',
  description:
    'Manage your payout accounts, bank details, and payment schedules for receiving contractor earnings.',
};

/**
 * 2026-05-25 audit-46 P1 + audit-47 correction: this page previously
 * queried `contractor_payout_accounts` — a legacy orphan table that
 * still exists on live (re-verified 2026-05-26: 1 stale row from
 * 2026-03-08, no migration in repo creates it). It's written only by
 * the `setup-contractor-payout` edge function and never re-synced with
 * Stripe, so the rows it holds are unrelated to actual payout
 * readiness. The canonical readiness signal lives on
 * profiles.stripe_payouts_enabled + stripe_transfers_active, updated
 * by /api/webhooks/stripe on account.updated events.
 *
 * The canonical payout UI has moved to
 * `/contractor/payouts/onboarding`, which uses
 * /api/payments/stripe-connect/{onboard,status,dashboard-link} and the
 * live profiles.stripe_* columns. Redirect here so contractors who
 * land on the old URL (saved bookmarks, in-app deep links) end up on
 * the working surface instead of a broken empty page.
 *
 * The legacy table itself is not dropped in this commit — that
 * needs a follow-up migration once we've verified nothing else still
 * reads from it (the edge function being the last known writer; see
 * audit-47 #205 for the mobile cleanup).
 */
export default async function PayoutsPage() {
  const user = await getCurrentUserFromCookies();

  if (!user || user.role !== 'contractor') {
    redirect('/login');
  }

  redirect('/contractor/payouts/onboarding');
}
