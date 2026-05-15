'use client';

/**
 * TipJarCard — homeowner-side card on completed jobs. Lets the
 * homeowner send a gratuity directly to the contractor via Stripe
 * Direct Charge (no platform fee, no escrow hold).
 *
 * 2026-05-13 — inline Stripe Elements flow (was: 4s polling fallback)
 * --------------------------------------------------------------------
 *   1. Homeowner picks amount (£5 / £10 / £20 / custom) + optional note
 *   2. Click "Continue" → POST /api/jobs/[id]/tip → { clientSecret }
 *   3. <Elements> mounts a <PaymentElement> right inside the card
 *   4. Homeowner enters card details → click "Confirm £X tip"
 *   5. stripe.confirmPayment({ redirect: 'if_required' }) confirms inline
 *   6. On success we refetch tips so the card flips to "Tip sent" state
 *
 * The Stripe webhook (handleTipPaymentSucceeded) still fires the
 * contractor notification + flips the DB row to status=completed.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { Heart, Loader2, Check, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { getCsrfHeaders } from '@/lib/csrf-client';
import { logger } from '@mintenance/shared';

interface TipJarCardProps {
  jobId: string;
  jobStatus: string | null;
  contractorFirstName?: string | null;
}

interface TipRecord {
  id: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  note: string | null;
  created_at: string;
  paid_at: string | null;
}

const PRESETS = [5, 10, 20] as const;

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''
);

function InlineTipPaymentForm({
  clientSecret,
  amount,
  onSuccess,
  onCancel,
}: {
  clientSecret: string;
  amount: number;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setError(null);
    setProcessing(true);

    const { error: submitErr } = await elements.submit();
    if (submitErr) {
      setError(submitErr.message || 'Payment validation failed');
      setProcessing(false);
      return;
    }

    const { error: confirmErr, paymentIntent } = await stripe.confirmPayment({
      elements,
      clientSecret,
      confirmParams: {
        return_url: `${window.location.origin}${window.location.pathname}`,
      },
      redirect: 'if_required',
    });

    if (confirmErr) {
      logger.error('Tip Stripe confirmPayment error', confirmErr);
      setError(confirmErr.message || 'Payment failed. Please try again.');
      setProcessing(false);
      return;
    }

    if (paymentIntent?.status === 'succeeded') {
      toast.success('Tip sent — thanks for the kindness 💚');
      onSuccess();
    } else {
      setError(
        'Payment did not complete. If your card needs more verification, please try again.'
      );
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleConfirm} className='col' style={{ gap: 12 }}>
      <PaymentElement options={{ layout: 'tabs' }} />

      {error ? (
        <p
          style={{
            margin: 0,
            padding: 10,
            borderRadius: 8,
            background: 'color-mix(in srgb, var(--me-err) 12%, transparent)',
            color: 'var(--me-err)',
            fontSize: 12,
            fontWeight: 500,
          }}
        >
          {error}
        </p>
      ) : null}

      <div className='row' style={{ gap: 8 }}>
        <button
          type='button'
          onClick={onCancel}
          disabled={processing}
          className='btn btn-ghost btn-sm'
          style={{ flex: '0 0 auto' }}
        >
          <ArrowLeft size={13} strokeWidth={1.75} /> Back
        </button>
        <button
          type='submit'
          disabled={!stripe || !elements || processing}
          className='btn btn-primary'
          style={{ flex: 1, justifyContent: 'center' }}
        >
          {processing ? (
            <Loader2 size={14} strokeWidth={1.75} className='animate-spin' />
          ) : (
            <Check size={14} strokeWidth={1.75} />
          )}
          {processing ? 'Confirming…' : `Confirm £${amount.toFixed(2)} tip`}
        </button>
      </div>

      <span
        className='t-meta'
        style={{ fontSize: 11, color: 'var(--me-ink-3)' }}
      >
        Payment goes directly to the contractor. Mintenance takes 0% on tips.
      </span>
    </form>
  );
}

export function TipJarCard({
  jobId,
  jobStatus,
  contractorFirstName,
}: TipJarCardProps) {
  const [tips, setTips] = useState<TipRecord[]>([]);
  const [totalCompleted, setTotalCompleted] = useState(0);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState<number>(10);
  const [customAmount, setCustomAmount] = useState('');
  const [note, setNote] = useState('');
  const [creatingIntent, setCreatingIntent] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [pendingAmount, setPendingAmount] = useState<number>(0);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/jobs/${jobId}/tip`, {
        credentials: 'include',
      });
      if (!res.ok) return;
      const data = await res.json();
      setTips(data.tips || []);
      setTotalCompleted(Number(data.totalCompleted) || 0);
    } catch (err) {
      logger.warn('Failed to fetch tips', { error: err });
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    if (jobStatus === 'completed') load();
    else setLoading(false);
  }, [jobStatus, load]);

  const handleCreateIntent = async () => {
    if (creatingIntent) return;
    const finalAmount = customAmount ? parseFloat(customAmount) : amount;
    if (!Number.isFinite(finalAmount) || finalAmount < 1) {
      toast.error('Enter a tip of at least £1');
      return;
    }
    if (finalAmount > 500) {
      toast.error('Maximum tip is £500');
      return;
    }
    setCreatingIntent(true);
    try {
      const csrf = await getCsrfHeaders();
      const res = await fetch(`/api/jobs/${jobId}/tip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...csrf },
        credentials: 'include',
        body: JSON.stringify({
          amount: finalAmount,
          note: note.trim() || undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok || !body.clientSecret) {
        throw new Error(body.error || 'Failed to start tip');
      }
      setClientSecret(body.clientSecret);
      setPendingAmount(finalAmount);
    } catch (err) {
      logger.error('Error creating tip PaymentIntent', err);
      toast.error(err instanceof Error ? err.message : 'Failed to start tip');
    } finally {
      setCreatingIntent(false);
    }
  };

  const handlePaymentSuccess = useCallback(() => {
    setClientSecret(null);
    setPendingAmount(0);
    setNote('');
    setCustomAmount('');
    // Webhook flips the DB row → completed; refetch to pick up.
    load();
  }, [load]);

  const handlePaymentCancel = useCallback(() => {
    setClientSecret(null);
    setPendingAmount(0);
  }, []);

  const elementsOptions = useMemo(
    () =>
      clientSecret
        ? {
            clientSecret,
            appearance: { theme: 'stripe' as const },
          }
        : undefined,
    [clientSecret]
  );

  if (jobStatus !== 'completed') return null;
  if (loading) return null;

  const firstName = contractorFirstName || 'your contractor';
  const hasTipped = totalCompleted > 0;
  const selectedAmount = customAmount ? parseFloat(customAmount) || 0 : amount;

  return (
    <div className='card card-pad'>
      <div className='col' style={{ gap: 12 }}>
        <div className='row' style={{ gap: 8, alignItems: 'center' }}>
          <Heart
            size={16}
            strokeWidth={1.75}
            style={{
              color: 'var(--me-brand)',
              fill: hasTipped ? 'var(--me-brand)' : 'transparent',
            }}
          />
          <h3 className='t-h3' style={{ margin: 0 }}>
            {clientSecret
              ? `Confirm £${pendingAmount.toFixed(2)} tip`
              : hasTipped
                ? 'Tip sent'
                : `Tip ${firstName}`}
          </h3>
        </div>

        {clientSecret && elementsOptions ? (
          <Elements stripe={stripePromise} options={elementsOptions}>
            <InlineTipPaymentForm
              clientSecret={clientSecret}
              amount={pendingAmount}
              onSuccess={handlePaymentSuccess}
              onCancel={handlePaymentCancel}
            />
          </Elements>
        ) : hasTipped ? (
          <>
            <p className='t-body' style={{ fontSize: 13 }}>
              You&apos;ve sent £{totalCompleted.toFixed(2)} in tips on this job.{' '}
              {firstName === 'your contractor' ? 'They' : firstName} receives
              the full amount — no platform fee on tips.
            </p>
            <div
              className='col'
              style={{
                gap: 6,
                padding: 10,
                borderRadius: 8,
                background: 'var(--me-bg-2)',
                fontSize: 12,
              }}
            >
              {tips
                .filter((t) => t.status === 'completed')
                .map((t) => (
                  <div
                    key={t.id}
                    className='between'
                    style={{ alignItems: 'flex-start' }}
                  >
                    <span style={{ color: 'var(--me-ink-2)' }}>
                      {t.note ? t.note : 'Thank-you tip'}
                    </span>
                    <span style={{ fontWeight: 600 }}>
                      £{Number(t.amount).toFixed(2)}
                    </span>
                  </div>
                ))}
            </div>
            <button
              type='button'
              className='btn btn-ghost btn-sm'
              onClick={() => {
                setAmount(10);
                setCustomAmount('');
                setNote('');
              }}
            >
              Send another tip
            </button>
          </>
        ) : (
          <>
            <p className='t-body' style={{ fontSize: 13 }}>
              {firstName === 'your contractor'
                ? 'Send a thank-you tip directly to the contractor.'
                : `Send a thank-you tip directly to ${firstName}.`}{' '}
              No platform fee — they get the full amount.
            </p>

            <div className='col' style={{ gap: 6 }}>
              <span className='t-meta' style={{ fontWeight: 600 }}>
                Amount
              </span>
              <div className='row' style={{ gap: 6, flexWrap: 'wrap' }}>
                {PRESETS.map((p) => (
                  <button
                    key={p}
                    type='button'
                    onClick={() => {
                      setAmount(p);
                      setCustomAmount('');
                    }}
                    className={`chip ${!customAmount && amount === p ? 'on' : ''}`}
                  >
                    £{p}
                  </button>
                ))}
                <input
                  type='number'
                  step='0.01'
                  min='1'
                  max='500'
                  className='field'
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  placeholder='Custom'
                  style={{
                    width: 90,
                    padding: '4px 8px',
                    fontSize: 13,
                  }}
                />
              </div>
            </div>

            <div className='col' style={{ gap: 4 }}>
              <label
                htmlFor='tip-note'
                className='t-meta'
                style={{ fontWeight: 600 }}
              >
                Note (optional)
              </label>
              <input
                id='tip-note'
                type='text'
                className='field'
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder='Thanks for the great work!'
                maxLength={500}
                style={{ fontSize: 13 }}
              />
            </div>

            <button
              type='button'
              className='btn btn-primary'
              onClick={handleCreateIntent}
              disabled={creatingIntent || selectedAmount < 1}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              {creatingIntent ? (
                <Loader2
                  size={14}
                  strokeWidth={1.75}
                  className='animate-spin'
                />
              ) : (
                <Check size={14} strokeWidth={1.75} />
              )}
              Continue to £{selectedAmount.toFixed(2)} tip
            </button>

            <span
              className='t-meta'
              style={{ fontSize: 11, color: 'var(--me-ink-3)' }}
            >
              You&apos;ll enter card details on the next step. Mintenance takes
              0% on tips.
            </span>
          </>
        )}
      </div>
    </div>
  );
}
