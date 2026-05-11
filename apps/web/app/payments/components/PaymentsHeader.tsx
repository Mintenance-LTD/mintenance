'use client';

import React, { useEffect, useState } from 'react';
import { Download, Wallet } from 'lucide-react';
import { MotionDiv } from '@/components/ui/MotionDiv';
import { fadeIn } from '@/lib/animations/variants';

interface PaymentsHeaderProps {
  onExport: () => void;
}

/**
 * Payments page hero. Renders the legacy gradient-tile design under
 * the default theme and switches to the canonical Mint Editorial
 * header treatment (Instrument Serif h1 + ghost descriptor) when
 * `data-theme="mint-editorial"` is set on <html>.
 *
 * Reference: redesign-v2/components.css `.t-h1` and the homeowner
 * dashboard greeting pattern.
 */
export function PaymentsHeader({ onExport }: PaymentsHeaderProps) {
  const [isMintEditorial, setIsMintEditorial] = useState(false);
  useEffect(() => {
    if (typeof document === 'undefined') return;
    setIsMintEditorial(
      document.documentElement.dataset.theme === 'mint-editorial'
    );
  }, []);

  if (isMintEditorial) {
    return (
      <div className='between' style={{ marginBottom: 22 }}>
        <div className='col' style={{ gap: 4 }}>
          <h1 className='t-h1'>Payments</h1>
          <p className='t-body'>
            Manage your payments and view transaction history.
          </p>
        </div>
        <button
          type='button'
          onClick={onExport}
          className='btn btn-secondary btn-sm'
        >
          <Download size={14} strokeWidth={1.75} />
          Export CSV
        </button>
      </div>
    );
  }

  return (
    <MotionDiv
      initial='hidden'
      animate='visible'
      variants={fadeIn}
      className='mb-8'
    >
      <div className='flex items-start justify-between'>
        <div className='flex items-start gap-4'>
          <div className='w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center shadow-lg shadow-teal-500/20'>
            <Wallet size={22} className='text-white' />
          </div>
          <div>
            <h1 className='text-2xl font-bold text-gray-900'>Payments</h1>
            <p className='text-gray-500 mt-0.5'>
              Manage your payments and view transaction history
            </p>
          </div>
        </div>
        <button
          onClick={onExport}
          className='inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm'
        >
          <Download size={15} />
          Export CSV
        </button>
      </div>
    </MotionDiv>
  );
}
