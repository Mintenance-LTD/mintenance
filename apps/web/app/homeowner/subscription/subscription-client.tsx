'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCSRF } from '@/lib/hooks/useCSRF';

interface HomeownerSubscriptionClientProps {
  user: {
    id: string;
    name: string;
    email: string;
  };
}

interface HomeownerStatusResponse {
  role: 'homeowner';
  subscription: {
    id: string;
    planType: 'premium';
    planName: string;
    status: string;
    amount: number;
    currency: string;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
    metadata?: Record<string, unknown>;
  } | null;
  requiresSubscription: boolean;
  earlyAccess?: {
    eligible: boolean;
  };
}

function formatAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: currency?.toUpperCase?.() || 'GBP',
  }).format(amount);
}

export function HomeownerSubscriptionClient({ user }: HomeownerSubscriptionClientProps) {
  const searchParams = useSearchParams();
  const { csrfToken } = useCSRF();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [data, setData] = useState<HomeownerStatusResponse | null>(null);

  const success = searchParams.get('success');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/subscriptions/status', { cache: 'no-store' });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json?.error || 'Failed to load subscription status');
      }
      setData(json as HomeownerStatusResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load subscription status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (success === 'true') {
      setMessage('Subscription payment completed successfully.');
    }
  }, [success]);

  const billingCycle = useMemo(() => {
    const raw = data?.subscription?.metadata?.billingCycle;
    if (raw === 'yearly') return 'year';
    if (raw === 'monthly') return 'month';
    if (data?.subscription?.amount === 99) return 'year';
    return 'month';
  }, [data]);

  const handleCancel = async (cancelAtPeriodEnd: boolean) => {
    if (!csrfToken) {
      setError('Security token missing. Refresh and try again.');
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch('/api/subscriptions/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify({ cancelAtPeriodEnd }),
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json?.error || 'Failed to cancel subscription');
      }
      setMessage(json?.message || 'Subscription updated.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel subscription');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6 rounded-xl border border-gray-200 bg-white p-5">
        <h1 className="text-2xl font-semibold text-gray-900">Homeowner Subscription</h1>
        <p className="mt-1 text-sm text-gray-600">
          Manage your premium plan and billing preferences.
        </p>
        <p className="mt-2 text-xs text-gray-500">
          Signed in as <span className="font-medium">{user.name}</span>
        </p>
      </header>

      {loading && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-600">
          Loading subscription details...
        </div>
      )}

      {!loading && error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && message && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          {message}
        </div>
      )}

      {!loading && data && (
        <section className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
          {data.earlyAccess?.eligible && (
            <div className="mb-4 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-700">
              Early-access entitlement is active on your account.
            </div>
          )}

          {data.subscription ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{data.subscription.planName}</h2>
                  <p className="text-sm text-gray-600">
                    {formatAmount(data.subscription.amount, data.subscription.currency)} / {billingCycle}
                  </p>
                </div>
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                  {data.subscription.status}
                </span>
              </div>

              {data.subscription.currentPeriodEnd && (
                <p className="mt-3 text-sm text-gray-600">
                  Next billing date: {new Date(data.subscription.currentPeriodEnd).toLocaleDateString('en-GB')}
                </p>
              )}

              {data.subscription.cancelAtPeriodEnd && (
                <p className="mt-2 text-sm text-amber-700">
                  Cancellation is already scheduled for period end.
                </p>
              )}

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => void handleCancel(true)}
                  disabled={saving || data.subscription.cancelAtPeriodEnd}
                  className="inline-flex items-center rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? 'Saving...' : 'Cancel At Period End'}
                </button>
                <button
                  type="button"
                  onClick={() => void handleCancel(false)}
                  disabled={saving}
                  className="inline-flex items-center rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? 'Saving...' : 'Cancel Immediately'}
                </button>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-gray-900">Current plan: Free</h2>
              <p className="mt-2 text-sm text-gray-600">
                You do not have an active premium subscription.
              </p>
              <div className="mt-4">
                <Link
                  href="/pricing?type=homeowner"
                  className="inline-flex items-center rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
                >
                  Upgrade to Premium
                </Link>
              </div>
            </>
          )}
        </section>
      )}
    </main>
  );
}

