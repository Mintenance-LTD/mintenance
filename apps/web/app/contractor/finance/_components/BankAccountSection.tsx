'use client';

import React from 'react';
import { CreditCard, CheckCircle, Clock, Settings } from 'lucide-react';

interface BankAccountSectionProps {
  onPayoutSettings: () => void;
}

export function BankAccountSection({
  onPayoutSettings,
}: BankAccountSectionProps) {
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
