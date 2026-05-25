import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUserFromCookies } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'Contractor Payout Settings | Mintenance',
  description:
    'Manage your payout accounts, bank details, and payment schedules for receiving contractor earnings.',
};

/**
 * 2026-05-25 audit-46 P1: this page previously queried
 * `contractor_payout_accounts` — a table that does NOT exist on the
 * live database (verified 2026-05-25 via information_schema; no
 * migration creates it). Every load returned an empty list and the
 * legacy POST /api/contractor/payout/setup also targets the same
 * missing table, so anything a contractor entered here was discarded.
 *
 * The canonical payout flow has moved to
 * `/contractor/payouts/onboarding`, which uses
 * /api/payments/stripe-connect/{onboard,status,dashboard-link} and
 * the live profiles.stripe_* columns. Redirect here so contractors
 * who land on the old URL (saved bookmarks, in-app deep links) end
 * up on the working surface instead of a broken empty page.
 *
 * Keeping the path as a redirect (not deleting the directory) so
 * any external link or in-app reference to /contractor/payouts
 * silently routes correctly.
 */
export default async function PayoutsPage() {
  const user = await getCurrentUserFromCookies();

  if (!user || user.role !== 'contractor') {
    redirect('/login');
  }

  redirect('/contractor/payouts/onboarding');
}
