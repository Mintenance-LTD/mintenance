'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { StandardCard } from '@/components/ui/StandardCard';
import { Button } from '@/components/ui/Button';
import { Loader2, CheckCircle2, Clock } from 'lucide-react';
import type { ConnectAccountStatus } from '@/lib/stripe/connect/types';

/**
 * Landing page after contractor returns from Stripe Connect onboarding.
 *
 * Stripe redirects here when the contractor finishes (or abandons) the
 * hosted onboarding flow. We force a refresh from Stripe to get latest
 * status, then show one of:
 *   - Complete → auto-redirect to the payouts onboarding page
 *   - Still in review → explainer + link back to payouts page
 *   - Error → show message
 */
export default function OnboardingCompletePage() {
  const router = useRouter();
  const [status, setStatus] = useState<ConnectAccountStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(
          '/api/payments/stripe-connect/status?refresh=true',
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.message ?? 'Could not fetch status');
        setStatus(data.status ?? null);

        // Auto-redirect when fully onboarded
        if (data.status?.canReceivePayouts) {
          setTimeout(() => {
            router.push('/contractor/payouts/onboarding');
          }, 2500);
        }
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  if (loading) {
    return (
      <div className="mx-auto max-w-md p-6">
        <StandardCard>
          <div className="flex flex-col items-center gap-3 py-12">
            <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
            <div className="text-sm text-gray-600">
              Confirming your account with Stripe…
            </div>
          </div>
        </StandardCard>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-md p-6">
        <StandardCard>
          <div className="space-y-3 py-8 text-center">
            <div className="text-lg font-semibold text-red-900">
              Couldn&apos;t fetch your status
            </div>
            <p className="text-sm text-gray-600">{error}</p>
            <Button
              onClick={() => router.push('/contractor/payouts/onboarding')}
            >
              Back to payouts
            </Button>
          </div>
        </StandardCard>
      </div>
    );
  }

  const canReceive = status?.canReceivePayouts;
  const submitted = status?.detailsSubmitted;

  return (
    <div className="mx-auto max-w-md p-6">
      <StandardCard>
        <div className="flex flex-col items-center gap-4 py-8 text-center">
          {canReceive ? (
            <>
              <CheckCircle2 className="h-12 w-12 text-green-600" />
              <h1 className="text-xl font-semibold text-gray-900">
                You&apos;re all set!
              </h1>
              <p className="text-sm text-gray-600">
                Your account is fully verified and ready to receive payouts.
              </p>
              <p className="text-xs text-gray-500">
                Redirecting to payouts overview…
              </p>
            </>
          ) : submitted ? (
            <>
              <Clock className="h-12 w-12 text-amber-600" />
              <h1 className="text-xl font-semibold text-gray-900">
                Under review
              </h1>
              <p className="text-sm text-gray-600">
                Stripe is verifying your details. We&apos;ll email you when
                it&apos;s done — usually within a few hours, sometimes up to 2
                business days.
              </p>
              <Button
                onClick={() => router.push('/contractor/payouts/onboarding')}
                className="mt-2"
              >
                View status
              </Button>
            </>
          ) : (
            <>
              <Clock className="h-12 w-12 text-gray-400" />
              <h1 className="text-xl font-semibold text-gray-900">
                Setup incomplete
              </h1>
              <p className="text-sm text-gray-600">
                It looks like you didn&apos;t finish the onboarding steps. You
                can resume at any time.
              </p>
              <Button
                onClick={() => router.push('/contractor/payouts/onboarding')}
                className="mt-2"
              >
                Resume setup
              </Button>
            </>
          )}
        </div>
      </StandardCard>
    </div>
  );
}
