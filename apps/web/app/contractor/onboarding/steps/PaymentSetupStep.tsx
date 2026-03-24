'use client';

import { useState } from 'react';
import { ArrowLeft, CreditCard, ExternalLink, ShieldCheck } from 'lucide-react';

interface Props {
  onFinish: () => void;
  onBack: () => void;
  userId: string;
  saving: boolean;
}

export function PaymentSetupStep({ onFinish, onBack, userId, saving }: Props) {
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConnectStripe() {
    if (!userId) return;
    setConnecting(true);
    setError(null);
    try {
      const res = await fetch('/api/payments/connect/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ return_url: `${window.location.origin}/contractor/dashboard-enhanced` }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? 'Failed to start Stripe setup.');
      }
      const { url } = (await res.json()) as { url: string };
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setConnecting(false);
    }
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-1">Get Paid</h2>
      <p className="text-sm text-gray-500 mb-6">
        Connect your bank account to receive payments from homeowners. Powered by Stripe.
      </p>

      <div className="space-y-4 mb-6">
        <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
          <ShieldCheck className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-emerald-800">Secure &amp; Instant Payouts</p>
            <p className="text-xs text-emerald-700 mt-0.5">
              Your bank details are handled directly by Stripe — Mintenance never stores your financial information. Payments are transferred within 2 business days.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: 'Bank-level security', icon: ShieldCheck },
            { label: 'Fast bank transfers', icon: CreditCard },
            { label: 'Low platform fee', icon: CreditCard },
          ].map(({ label, icon: Icon }) => (
            <div key={label} className="flex items-center gap-2 p-3 border border-gray-100 rounded-lg bg-gray-50">
              <Icon className="w-4 h-4 text-gray-500 shrink-0" />
              <span className="text-xs text-gray-600 font-medium">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="space-y-3">
        <button
          type="button"
          onClick={handleConnectStripe}
          disabled={connecting || saving}
          className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white px-6 py-3 rounded-lg text-sm font-medium transition-colors"
        >
          <CreditCard className="w-4 h-4" />
          {connecting ? 'Redirecting to Stripe…' : 'Connect Bank Account via Stripe'}
          {!connecting && <ExternalLink className="w-3.5 h-3.5 opacity-70" />}
        </button>

        <button
          type="button"
          onClick={onFinish}
          disabled={saving}
          className="w-full text-center text-sm text-gray-500 hover:text-gray-700 py-2 transition-colors"
        >
          {saving ? 'Finishing…' : 'Skip for now — I\'ll set this up later'}
        </button>
      </div>

      <div className="mt-6 flex justify-start">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 px-4 py-2 rounded-lg border border-gray-200 hover:border-gray-300 text-sm font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      </div>
    </div>
  );
}
