'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';

interface EscrowReviewStatsProps {
  pendingCount: number;
  heldCount: number;
  totalAmount: string;
  reviewCount: number;
  selectedCount: number;
  actionLoading: boolean;
  onBulkApprove: () => void;
  onBulkHold: () => void;
  onClearSelection: () => void;
}

export function EscrowReviewStats({
  pendingCount,
  heldCount,
  totalAmount,
  reviewCount,
  selectedCount,
  actionLoading,
  onBulkApprove,
  onBulkHold,
  onClearSelection,
}: EscrowReviewStatsProps) {
  return (
    <>
      {/* Page Header — matches mockup typography */}
      <div className='mb-10'>
        <h1 className='text-[2.75rem] font-bold tracking-tight text-[#2a3439] leading-tight mb-2'>
          Escrow Review
        </h1>
        <p className='text-[#566166] text-lg'>
          Managing high-value project disbursements and verification holds.
        </p>
      </div>

      {/* Bento Summary Grid — 12 col with 5/3/4 split matching mockup */}
      <div className='grid grid-cols-12 gap-6 mb-10'>
        {/* Main stat — hero card (5 cols) */}
        <div className='col-span-12 md:col-span-5 bg-white rounded-xl p-8 shadow-[0_12px_32px_-4px_rgba(42,52,57,0.08)] border border-[#a9b4b9]/15 flex flex-col justify-between'>
          <div>
            <div className='flex items-center gap-2 mb-4'>
              <Icon name='currencyPound' size={20} color='#565e74' />
              <span className='text-xs font-bold uppercase tracking-widest text-[#717c82]'>
                Total Amount in Escrow
              </span>
            </div>
            <div className='text-5xl font-extrabold tracking-tighter text-[#2a3439]'>
              {totalAmount}
            </div>
          </div>
          <div className='mt-6 text-xs text-[#566166] font-medium'>
            {reviewCount} total reviews
          </div>
        </div>

        {/* Pending reviews — accent card (3 cols) */}
        <div className='col-span-12 md:col-span-3 bg-[#565e74] text-white rounded-xl p-8 flex flex-col justify-between relative overflow-hidden'>
          <div className='absolute -right-4 -top-4 w-32 h-32 bg-white/10 rounded-full blur-3xl' />
          <div className='relative'>
            <span className='text-xs font-bold uppercase tracking-widest opacity-70'>
              Pending Reviews
            </span>
            <div className='text-5xl font-extrabold tracking-tighter mt-2'>
              {pendingCount}
            </div>
          </div>
        </div>

        {/* On hold — tertiary card (4 cols) */}
        <div className='col-span-12 md:col-span-4 bg-[#e3dbfd] rounded-xl p-8 flex flex-col justify-between border border-[#a9b4b9]/15'>
          <div>
            <span className='text-xs font-bold uppercase tracking-widest text-[#5b5672]'>
              On Hold / Flagged
            </span>
            <div className='text-5xl font-extrabold tracking-tighter text-[#3e3a54] mt-2'>
              {String(heldCount).padStart(2, '0')}
            </div>
          </div>
          {heldCount > 0 && (
            <div className='bg-white/50 rounded-lg p-3 flex justify-between items-center mt-4'>
              <span className='text-xs font-semibold text-[#3e3a54]'>
                Needs immediate action
              </span>
              <Icon name='alert' size={18} color='#9f403d' />
            </div>
          )}
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedCount > 0 && (
        <div className='flex items-center gap-3 px-4 py-3 mb-6 bg-[#dae2fd] rounded-xl border border-[#ccd4ee]'>
          <span className='text-sm font-semibold text-[#4a5167]'>
            {selectedCount} selected
          </span>
          <Button size='sm' onClick={onBulkApprove} disabled={actionLoading}>
            Approve Selected
          </Button>
          <Button
            size='sm'
            variant='outline'
            onClick={onBulkHold}
            disabled={actionLoading}
          >
            Hold Selected
          </Button>
          <Button size='sm' variant='ghost' onClick={onClearSelection}>
            Clear
          </Button>
        </div>
      )}
    </>
  );
}
