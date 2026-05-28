'use client';

import React, { useEffect, useState } from 'react';
import {
  CreditCard,
  CheckCircle,
  Clock,
  Settings,
  AlertTriangle,
} from 'lucide-react';

interface BankAccountSectionProps {
  onPayoutSettings: () => void;
}

interface ConnectStatus {
  accountId: string;
  detailsSubmitted: boolean;
  payoutsEnabled: boolean;
  transfersActive: boolean;
  canReceivePayouts: boolean;
  requirementsPending: string[];
}

type PayoutState =
  | { kind: 'loading' }
  | { kind: 'none' } // no Connect account yet
  | { kind: 'pending' } // account exists, verification incomplete
  | { kind: 'ready' }; // verified + can receive payouts

export function BankAccountSection({
  onPayoutSettings,
}: BankAccountSectionProps) {
  // 2026-05-13 polish: hydration-safe theme detection. Under Mint Editorial
  // the dark hero card swaps for the canonical light `.card` + `.t-h3`
  // / `.t-meta` typography + `.btn-secondary` action. The verified-account
  // dot pair becomes a `.row` of canonical `.badge-ok` / `.badge-info` pills.
  const [isMintEditorial, setIsMintEditorial] = useState(false);
  useEffect(() => {
    if (typeof document === 'undefined') return;
    setIsMintEditorial(
      document.documentElement.dataset.theme === 'mint-editorial'
    );
  }, []);

  // 2026-05-28 audit B2: previously hardcoded "Bank account verified" +
  // "Next payout in 3 days" for every contractor. Now reflects the real
  // Stripe Connect capability state mirrored on the profile.
  const [payout, setPayout] = useState<PayoutState>({ kind: 'loading' });
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/payments/stripe-connect/status', {
          credentials: 'include',
        });
        if (!res.ok) throw new Error(`status ${res.status}`);
        const body = await res.json();
        const status = body.status as ConnectStatus | null;
        if (cancelled) return;
        if (!status) {
          setPayout({ kind: 'none' });
        } else if (status.canReceivePayouts) {
          setPayout({ kind: 'ready' });
        } else {
          setPayout({ kind: 'pending' });
        }
      } catch {
        if (!cancelled) setPayout({ kind: 'none' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const actionLabel =
    payout.kind === 'ready'
      ? 'Manage'
      : payout.kind === 'none'
        ? 'Set up payouts'
        : 'Finish setup';

  if (isMintEditorial) {
    return (
      <div className='card card-pad'>
        <div className='between' style={{ alignItems: 'center', gap: 16 }}>
          <div className='col' style={{ gap: 12 }}>
            <div className='row' style={{ gap: 12, alignItems: 'center' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: 'var(--me-brand-soft)',
                  color: 'var(--me-brand)',
                }}
              >
                <CreditCard className='w-5 h-5' />
              </div>
              <div className='col' style={{ gap: 2 }}>
                <h3 className='t-h3'>Payout Settings</h3>
                <p className='t-meta'>
                  Manage your bank account and payout schedule
                </p>
              </div>
            </div>
            <div className='row' style={{ gap: 8, flexWrap: 'wrap' }}>
              {payout.kind === 'loading' && (
                <span className='badge-info'>
                  <Clock className='w-3.5 h-3.5' /> Checking payout status…
                </span>
              )}
              {payout.kind === 'ready' && (
                <span className='badge-ok'>
                  <CheckCircle className='w-3.5 h-3.5' /> Bank account verified
                </span>
              )}
              {payout.kind === 'pending' && (
                <span className='badge-warn'>
                  <AlertTriangle className='w-3.5 h-3.5' /> Verification pending
                </span>
              )}
              {payout.kind === 'none' && (
                <span className='badge-warn'>
                  <AlertTriangle className='w-3.5 h-3.5' /> Payouts not set up
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onPayoutSettings}
            className='btn-secondary'
            style={{ alignSelf: 'flex-start' }}
          >
            <Settings className='w-4 h-4' />
            {actionLabel}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className='bg-gray-900 rounded-xl border border-gray-700 p-6 text-white'>
      <div className='flex items-center justify-between'>
        <div>
          <div className='flex items-center gap-3 mb-4'>
            <div className='p-3 bg-teal-500/20 rounded-lg'>
              <CreditCard className='w-5 h-5 text-teal-400' />
            </div>
            <div>
              <h3 className='text-lg font-semibold'>Payout Settings</h3>
              <p className='text-sm text-gray-400 mt-1'>
                Manage your bank account and payout schedule
              </p>
            </div>
          </div>
          <div className='flex items-center gap-4 text-sm text-gray-300'>
            {payout.kind === 'loading' && (
              <div className='flex items-center gap-2'>
                <Clock className='w-4 h-4 text-gray-400' />
                Checking payout status…
              </div>
            )}
            {payout.kind === 'ready' && (
              <div className='flex items-center gap-2'>
                <CheckCircle className='w-4 h-4 text-teal-400' />
                Bank account verified
              </div>
            )}
            {payout.kind === 'pending' && (
              <div className='flex items-center gap-2'>
                <AlertTriangle className='w-4 h-4 text-amber-400' />
                Verification pending
              </div>
            )}
            {payout.kind === 'none' && (
              <div className='flex items-center gap-2'>
                <AlertTriangle className='w-4 h-4 text-amber-400' />
                Payouts not set up
              </div>
            )}
          </div>
        </div>
        <button
          onClick={onPayoutSettings}
          className='flex items-center gap-2 px-6 py-3 bg-white text-gray-900 rounded-lg hover:bg-gray-100 transition-colors font-medium'
        >
          <Settings className='w-4 h-4' />
          {actionLabel}
        </button>
      </div>
    </div>
  );
}
