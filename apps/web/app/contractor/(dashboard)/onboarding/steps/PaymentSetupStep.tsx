'use client';
import { fetchWithCsrf } from '@/lib/csrf-client';

import { useState } from 'react';
import { ArrowLeft, CreditCard, ExternalLink, ShieldCheck } from 'lucide-react';

interface Props {
  onFinish: () => void;
  onBack: () => void;
  userId: string;
  saving: boolean;
  isMintEditorial?: boolean;
}

export function PaymentSetupStep({
  onFinish,
  onBack,
  userId,
  saving,
  isMintEditorial = false,
}: Props) {
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConnectStripe() {
    if (!userId) return;
    setConnecting(true);
    setError(null);
    try {
      const res = await fetchWithCsrf('/api/payments/stripe-connect/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client: 'web',
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          (body as { error?: string }).error ?? 'Failed to start Stripe setup.'
        );
      }
      const { url } = (await res.json()) as { url: string };
      window.location.href = url;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Something went wrong. Please try again.'
      );
      setConnecting(false);
    }
  }

  return (
    <div>
      <h2
        className={
          isMintEditorial
            ? 't-h3'
            : 'text-xl font-semibold text-[var(--me-ink)] mb-1'
        }
      >
        Get Paid
      </h2>
      <p
        className={
          isMintEditorial ? 't-meta' : 'text-sm text-[var(--me-ink-2)] mb-6'
        }
        style={isMintEditorial ? { marginBottom: 20 } : undefined}
      >
        Connect your bank account to receive payments from homeowners. Powered
        by Stripe.
      </p>

      <div className='space-y-4 mb-6'>
        <div className='flex items-start gap-3 p-4 bg-[var(--me-brand-soft)] border border-[var(--me-line)] rounded-xl'>
          <ShieldCheck className='w-5 h-5 text-[var(--me-ink)] mt-0.5 shrink-0' />
          <div>
            <p className='text-sm font-medium text-[var(--me-ink)]'>
              Secure payout setup
            </p>
            <p className='text-xs text-[var(--me-ink)] mt-0.5'>
              Stripe handles your bank details and verification. Confirm that
              payouts are enabled after returning. Transfer timing depends on
              your account and bank.
            </p>
          </div>
        </div>

        <div className='grid grid-cols-1 sm:grid-cols-3 gap-3'>
          {[
            { label: 'Bank-level security', icon: ShieldCheck },
            { label: 'Fast bank transfers', icon: CreditCard },
            { label: 'View fees in your plan', icon: CreditCard },
          ].map(({ label, icon: Icon }) => (
            <div
              key={label}
              className='flex items-center gap-2 p-3 border border-[var(--me-line)] rounded-lg bg-[var(--me-surface)]'
            >
              <Icon className='w-4 h-4 text-[var(--me-ink-2)] shrink-0' />
              <span className='text-xs text-[var(--me-ink-2)] font-medium'>
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className='mb-4 p-3 bg-[var(--me-err-bg)] border border-[var(--me-err-fg)] rounded-lg'>
          <p className='text-sm text-[var(--me-err-fg)]'>{error}</p>
        </div>
      )}

      <div className='space-y-3'>
        <button
          type='button'
          onClick={handleConnectStripe}
          disabled={connecting || saving}
          className={
            isMintEditorial
              ? 'btn-primary'
              : 'w-full flex items-center justify-center gap-2 bg-[var(--me-brand)] hover:bg-[var(--me-brand)] disabled:bg-[var(--me-brand)] text-white px-6 py-3 rounded-lg text-sm font-medium transition-colors'
          }
          style={isMintEditorial ? { width: '100%' } : undefined}
        >
          <CreditCard className='w-4 h-4' />
          {connecting
            ? 'Redirecting to Stripe…'
            : 'Connect Bank Account via Stripe'}
          {!connecting && <ExternalLink className='w-3.5 h-3.5 opacity-70' />}
        </button>

        <button
          type='button'
          onClick={onFinish}
          disabled={saving}
          className='w-full text-center text-sm text-[var(--me-ink-2)] hover:text-[var(--me-ink-2)] py-2 transition-colors'
        >
          {saving ? 'Finishing…' : "Skip for now — I'll set this up later"}
        </button>
      </div>

      <div className='mt-6 flex justify-start'>
        <button
          type='button'
          onClick={onBack}
          className={
            isMintEditorial
              ? 'btn-secondary'
              : 'flex items-center gap-2 text-[var(--me-ink-2)] hover:text-[var(--me-ink-2)] px-4 py-2 rounded-lg border border-[var(--me-line)] hover:border-[var(--me-line)] text-sm font-medium transition-colors'
          }
        >
          <ArrowLeft className='w-4 h-4' />
          Back
        </button>
      </div>
    </div>
  );
}
