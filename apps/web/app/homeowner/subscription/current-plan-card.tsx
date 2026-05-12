'use client';

/**
 * Current Plan section extracted from subscription-client.tsx so the
 * parent stays under the 500-line MDC cap. Pure presentation — the
 * parent owns subscription state, cancel handler, and amount formatter.
 */

import { AlertCircle } from 'lucide-react';

interface SubscriptionShape {
  id: string;
  planType: string;
  planName: string;
  status: string;
  amount: number;
  currency: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

interface Props {
  subscription: SubscriptionShape | null;
  earlyAccessEligible: boolean;
  billingCycle: string;
  saving: boolean;
  formatAmount: (amount: number, currency: string) => string;
  onCancel: (atPeriodEnd: boolean) => void;
}

export function CurrentPlanCard({
  subscription,
  earlyAccessEligible,
  billingCycle,
  saving,
  formatAmount,
  onCancel,
}: Props) {
  return (
    <section className='rounded-xl border border-gray-200 bg-white p-6'>
      <h2 className='text-sm font-semibold uppercase tracking-wider text-gray-400 mb-4'>
        Current Plan
      </h2>

      {subscription ? (
        <CurrentPlanBody
          subscription={subscription}
          earlyAccessEligible={earlyAccessEligible}
          billingCycle={billingCycle}
          saving={saving}
          formatAmount={formatAmount}
          onCancel={onCancel}
        />
      ) : (
        <div className='flex items-center justify-between'>
          <div>
            <h3 className='text-xl font-bold text-gray-900'>Free Plan</h3>
            <p className='text-sm text-gray-500 mt-1'>
              Core features for managing your home
            </p>
          </div>
          <span className='rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600'>
            Free
          </span>
        </div>
      )}
    </section>
  );
}

function CurrentPlanBody({
  subscription,
  earlyAccessEligible,
  billingCycle,
  saving,
  formatAmount,
  onCancel,
}: {
  subscription: SubscriptionShape;
  earlyAccessEligible: boolean;
  billingCycle: string;
  saving: boolean;
  formatAmount: (amount: number, currency: string) => string;
  onCancel: (atPeriodEnd: boolean) => void;
}) {
  // An `incomplete` subscription means Stripe created the row but the
  // checkout was never finished — no money has moved. Pairing that
  // with the early-access eligibility banner and loud
  // "£24.99 / month Incomplete" + Cancel buttons was confusing: the
  // user thought they were being billed for a plan they couldn't
  // access. Treat incomplete + early access as effectively Free, and
  // hide the cancel buttons (there's nothing to cancel).
  const isIncomplete = ['incomplete', 'incomplete_expired'].includes(
    subscription.status
  );
  if (isIncomplete && earlyAccessEligible) {
    return (
      <div className='flex items-center justify-between'>
        <div>
          <h3 className='text-xl font-bold text-gray-900'>Early Access</h3>
          <p className='text-sm text-gray-500 mt-1'>
            Premium features are unlocked free during the beta — no paid
            subscription required.
          </p>
        </div>
        <span className='rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-700'>
          Free during beta
        </span>
      </div>
    );
  }

  return (
    <div className='space-y-4'>
      <div className='flex flex-wrap items-start justify-between gap-4'>
        <div>
          <h3 className='text-xl font-bold text-gray-900'>
            {subscription.planName}
          </h3>
          <p className='text-sm text-gray-600 mt-1'>
            {formatAmount(subscription.amount, subscription.currency)} /{' '}
            {billingCycle}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            subscription.status === 'active'
              ? 'bg-emerald-100 text-emerald-700'
              : subscription.status === 'past_due'
                ? 'bg-amber-100 text-amber-700'
                : 'bg-gray-100 text-gray-700'
          }`}
        >
          {subscription.status.charAt(0).toUpperCase() +
            subscription.status.slice(1).replace('_', ' ')}
        </span>
      </div>

      {subscription.currentPeriodEnd && (
        <p className='text-sm text-gray-500'>
          Next billing date:{' '}
          <span className='font-medium text-gray-700'>
            {new Date(subscription.currentPeriodEnd).toLocaleDateString(
              'en-GB',
              { day: 'numeric', month: 'long', year: 'numeric' }
            )}
          </span>
        </p>
      )}

      {subscription.cancelAtPeriodEnd && (
        <div className='flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700'>
          <AlertCircle className='h-4 w-4 flex-shrink-0' />
          Cancellation scheduled for end of current billing period.
        </div>
      )}

      {!isIncomplete && (
        <div className='flex flex-wrap gap-3 pt-2 border-t border-gray-100'>
          <button
            type='button'
            onClick={() => onCancel(true)}
            disabled={saving || subscription.cancelAtPeriodEnd}
            className='inline-flex items-center rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60'
          >
            {saving ? 'Saving...' : 'Cancel At Period End'}
          </button>
          <button
            type='button'
            onClick={() => onCancel(false)}
            disabled={saving}
            className='inline-flex items-center rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60'
          >
            {saving ? 'Saving...' : 'Cancel Immediately'}
          </button>
        </div>
      )}
    </div>
  );
}
