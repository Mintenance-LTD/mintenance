'use client';

import { useEffect, useState } from 'react';
import { StandardCard } from '@/components/ui/StandardCard';
import { Button } from '@/components/ui/Button';
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Banknote,
} from 'lucide-react';
import { logger } from '@mintenance/shared';
import type {
  ConnectAccountStatus,
  PayoutBalance,
} from '@/lib/stripe/connect/types';

/**
 * Contractor Stripe Connect onboarding + payout status page.
 *
 * States:
 *   - No Connect account   → "Set up payouts" CTA (redirects to Stripe)
 *   - Onboarding submitted → Show "Under review" + requirements
 *   - Onboarding complete  → Show payout balance, threshold progress,
 *                            last payout, "Open Stripe Dashboard" link
 */
export default function ContractorPayoutOnboardingPage() {
  const [status, setStatus] = useState<ConnectAccountStatus | null>(null);
  const [balance, setBalance] = useState<PayoutBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [onboarding, setOnboarding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadStatus(refresh = false) {
    setLoading(true);
    setError(null);
    try {
      const statusRes = await fetch(
        `/api/payments/stripe-connect/status${refresh ? '?refresh=true' : ''}`,
      );
      const statusJson = await statusRes.json();
      setStatus(statusJson.status ?? null);

      if (statusJson.status?.accountId) {
        const balRes = await fetch('/api/payments/payout-balance');
        const balJson = await balRes.json();
        setBalance(balJson.balance ?? null);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function startOnboarding() {
    setOnboarding(true);
    setError(null);
    try {
      const res = await fetch('/api/payments/stripe-connect/onboard', {
        method: 'POST',
        headers: { 'x-csrf-token': getCsrfToken() },
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.message ?? 'Failed to start onboarding');
      }
      window.location.href = data.url;
    } catch (e) {
      setError((e as Error).message);
      setOnboarding(false);
    }
  }

  async function openDashboard() {
    try {
      const res = await fetch('/api/payments/stripe-connect/dashboard-link', {
        method: 'POST',
        headers: { 'x-csrf-token': getCsrfToken() },
      });
      const data = await res.json();
      if (data.url) window.open(data.url, '_blank', 'noopener');
    } catch (e) {
      logger.warn('Failed to open dashboard link', { service: 'ui', error: e });
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <StandardCard>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
          </div>
        </StandardCard>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Banknote className="h-7 w-7 text-teal-600" />
        <h1 className="text-2xl font-semibold">Payouts</h1>
      </div>

      {error && (
        <div
          className="flex items-start gap-3 rounded border border-red-300 bg-red-50 p-4 text-sm text-red-900"
          role="alert"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <div>{error}</div>
        </div>
      )}

      {(!status || !status.detailsSubmitted) && (
        <NoAccountState onStart={startOnboarding} busy={onboarding} />
      )}

      {status && status.detailsSubmitted && !status.canReceivePayouts && (
        <ReviewState
          status={status}
          onRefresh={() => loadStatus(true)}
          onStart={startOnboarding}
          busy={onboarding}
        />
      )}

      {status?.canReceivePayouts && (
        <ReadyState
          status={status}
          balance={balance}
          onOpenDashboard={openDashboard}
          onRefresh={() => loadStatus(true)}
        />
      )}
    </div>
  );
}

function NoAccountState({
  onStart,
  busy,
}: {
  onStart: () => void;
  busy: boolean;
}) {
  return (
    <StandardCard>
      <div className="space-y-4 p-4">
        <h2 className="text-lg font-semibold">Set up payouts</h2>
        <p className="text-sm text-gray-600">
          To receive payment for completed jobs, set up a Stripe account.
          Stripe will ask for your bank details, ID, and business information
          (about 5 minutes). Mintenance never sees or stores these details
          directly.
        </p>
        <ul className="ml-4 list-disc space-y-1 text-sm text-gray-600">
          <li>Payouts are sent weekly on Fridays</li>
          <li>Minimum balance of £50 before a payout is sent</li>
          <li>Stripe handles tax documents (viewable in your dashboard)</li>
        </ul>
        <Button onClick={onStart} disabled={busy} className="mt-2">
          {busy ? 'Redirecting…' : 'Set up payouts with Stripe'}
        </Button>
      </div>
    </StandardCard>
  );
}

function ReviewState({
  status,
  onRefresh,
  onStart,
  busy,
}: {
  status: ConnectAccountStatus;
  onRefresh: () => void;
  onStart: () => void;
  busy: boolean;
}) {
  return (
    <StandardCard>
      <div className="space-y-4 p-4">
        <div className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-amber-600" />
          <h2 className="text-lg font-semibold">Account under review</h2>
        </div>
        <p className="text-sm text-gray-600">
          Stripe is verifying your details. This usually takes a few minutes,
          but can take up to 2 business days for some documents.
        </p>
        {status.requirementsPending.length > 0 && (
          <div className="rounded border border-amber-300 bg-amber-50 p-3">
            <div className="mb-2 text-sm font-medium text-amber-900">
              Additional information needed:
            </div>
            <ul className="ml-4 list-disc space-y-1 text-sm text-amber-900">
              {status.requirementsPending.slice(0, 5).map((req) => (
                <li key={req}>{formatRequirement(req)}</li>
              ))}
            </ul>
            <Button
              onClick={onStart}
              disabled={busy}
              variant="outline"
              className="mt-3"
            >
              {busy ? 'Redirecting…' : 'Complete information'}
            </Button>
          </div>
        )}
        <Button variant="outline" onClick={onRefresh}>
          Check status
        </Button>
      </div>
    </StandardCard>
  );
}

function ReadyState({
  status,
  balance,
  onOpenDashboard,
  onRefresh,
}: {
  status: ConnectAccountStatus;
  balance: PayoutBalance | null;
  onOpenDashboard: () => void;
  onRefresh: () => void;
}) {
  const pending = balance?.pendingAmountMinor ?? 0;
  const threshold = balance?.threshold ?? 5000;
  const progress = Math.min(100, Math.round((pending / threshold) * 100));

  return (
    <>
      <StandardCard>
        <div className="space-y-3 p-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <h2 className="text-lg font-semibold">Ready to receive payouts</h2>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-gray-500">Pending balance</div>
              <div className="text-xl font-semibold">
                {formatMoney(pending, balance?.currency ?? 'GBP')}
              </div>
            </div>
            <div>
              <div className="text-gray-500">Lifetime paid out</div>
              <div className="text-xl font-semibold">
                {formatMoney(
                  balance?.lifetimePaidOutMinor ?? 0,
                  balance?.currency ?? 'GBP',
                )}
              </div>
            </div>
          </div>
          {pending < threshold && (
            <div>
              <div className="mb-1 flex items-center justify-between text-xs text-gray-600">
                <span>Progress to next payout</span>
                <span>
                  {formatMoney(pending, balance?.currency ?? 'GBP')} of{' '}
                  {formatMoney(threshold, balance?.currency ?? 'GBP')}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full bg-teal-500 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
          {pending >= threshold && (
            <div className="rounded border border-green-300 bg-green-50 p-3 text-sm text-green-900">
              You&apos;re eligible for a payout. The next weekly transfer runs
              on Friday.
            </div>
          )}
          {balance?.lastPayoutAt && (
            <div className="text-xs text-gray-500">
              Last payout:{' '}
              {new Date(balance.lastPayoutAt).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <Button onClick={onOpenDashboard} className="gap-2">
              Open Stripe Dashboard
              <ExternalLink className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={onRefresh}>
              Refresh
            </Button>
          </div>
        </div>
      </StandardCard>

      {status.requirementsPending.length > 0 && (
        <StandardCard>
          <div className="space-y-2 p-4">
            <div className="flex items-center gap-2 text-amber-900">
              <AlertCircle className="h-4 w-4" />
              <div className="text-sm font-medium">Action required soon</div>
            </div>
            <p className="text-xs text-gray-600">
              Stripe needs additional information to keep your payouts
              enabled. Visit the dashboard to update.
            </p>
          </div>
        </StandardCard>
      )}
    </>
  );
}

function formatMoney(minor: number, currency: string): string {
  const major = minor / 100;
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
  }).format(major);
}

function formatRequirement(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\./g, ' → ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function getCsrfToken(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(
    /(?:^|; )(?:__Host-)?csrf-token=([^;]*)/,
  );
  return match ? decodeURIComponent(match[1]) : '';
}
