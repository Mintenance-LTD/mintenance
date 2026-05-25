import Link from 'next/link';
import { AlertTriangle, ArrowRight } from 'lucide-react';

interface Props {
  /** Did the contractor start Stripe Connect onboarding (acct ID exists)? */
  hasAccount: boolean;
  /** Has Stripe enabled charges (i.e. fully onboarded)? */
  chargesEnabled: boolean;
  /** Has Stripe enabled payouts? */
  payoutsEnabled: boolean;
}

/**
 * Persistent banner shown across every contractor page when payout setup
 * is incomplete after an initial Stripe Connect attempt.
 *
 * Production state (2026-05-25 audit-P0-1): a contractor who hits
 * /api/payments/stripe-connect/onboard creates a Stripe Account and the
 * acct ID is written to profiles.stripe_connect_account_id. If they then
 * close the Stripe-hosted page before submitting, no webhook fires and
 * the readiness flags never flip. The contractor has no signal anywhere
 * else in the product that money cannot be released to them — homeowners
 * trying to accept their bids hit a wall, but the contractor never sees
 * it. Two escrow rows are stuck in held with operator reset notes
 * referencing exactly this state. This banner makes the gap loud so the
 * contractor can finish the flow.
 */
export function PayoutSetupBanner({
  hasAccount,
  chargesEnabled,
  payoutsEnabled,
}: Props) {
  // Only surface for the mid-flow-abandoned case. The
  // "no account yet" state is already handled by the bid-acceptance
  // gate + the empty state on /contractor/payouts/onboarding itself.
  if (!hasAccount) return null;
  if (chargesEnabled && payoutsEnabled) return null;

  return (
    <div
      role='alert'
      className='mb-4 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900'
    >
      <AlertTriangle className='mt-0.5 h-5 w-5 flex-shrink-0' aria-hidden />
      <div className='flex-1'>
        <div className='font-medium'>
          Finish your payout setup to receive payments
        </div>
        <div className='text-amber-800/90'>
          Stripe needs a few more details before homeowners can pay you for
          completed work. This takes about 2 minutes.
        </div>
      </div>
      <Link
        href='/contractor/payouts/onboarding'
        className='inline-flex items-center gap-1 whitespace-nowrap rounded-md border border-amber-400 bg-white px-3 py-1.5 text-sm font-medium text-amber-900 transition hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2'
      >
        Resume setup
        <ArrowRight className='h-4 w-4' aria-hidden />
      </Link>
    </div>
  );
}
