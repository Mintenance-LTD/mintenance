'use client';

import React, { useEffect, useState } from 'react';
import { CreditCard, CheckCircle, Clock, Settings } from 'lucide-react';

interface BankAccountSectionProps {
  onPayoutSettings: () => void;
}

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
              <span className='badge-ok'>
                <CheckCircle className='w-3.5 h-3.5' /> Bank account verified
              </span>
              <span className='badge-info'>
                <Clock className='w-3.5 h-3.5' /> Next payout in 3 days
              </span>
            </div>
          </div>
          <button
            onClick={onPayoutSettings}
            className='btn-secondary'
            style={{ alignSelf: 'flex-start' }}
          >
            <Settings className='w-4 h-4' />
            Manage
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
            <div className='flex items-center gap-2'>
              <CheckCircle className='w-4 h-4 text-teal-400' />
              Bank account verified
            </div>
            <div className='flex items-center gap-2'>
              <Clock className='w-4 h-4 text-amber-400' />
              Next payout in 3 days
            </div>
          </div>
        </div>
        <button
          onClick={onPayoutSettings}
          className='flex items-center gap-2 px-6 py-3 bg-white text-gray-900 rounded-lg hover:bg-gray-100 transition-colors font-medium'
        >
          <Settings className='w-4 h-4' />
          Manage
        </button>
      </div>
    </div>
  );
}
