'use client';

import React from 'react';
import { MotionDiv } from '@/components/ui/MotionDiv';
import { PricingBreakdown } from '@/components/ui/PricingBreakdown';
import type { Transaction } from './types';

interface PricingModalProps {
  transaction: Transaction;
  onClose: () => void;
}

export function PricingModal({ transaction, onClose }: PricingModalProps) {
  return (
    <div
      className='fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50'
      onClick={onClose}
    >
      <MotionDiv
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className='bg-white rounded-xl shadow-2xl max-w-md w-full'
      >
        <div className='p-6'>
          <h3 className='t-h2 text-gray-900 mb-6'>Payment Breakdown</h3>
          <PricingBreakdown
            items={[
              {
                id: '1',
                label: 'Job Payment',
                amount: transaction.amount,
              },
              {
                id: '2',
                label: 'Platform Fee (5%)',
                amount: -transaction.platformFee,
                isDiscount: true,
              },
              {
                id: '3',
                label: 'Processing Fee (2%)',
                amount: -transaction.processingFee,
                isDiscount: true,
              },
            ]}
            subtotal={transaction.amount}
            total={transaction.netAmount}
            currency='£'
            showSubtotal={false}
          />
          <div className='mt-6'>
            <button
              onClick={onClose}
              className='w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium'
            >
              Close
            </button>
          </div>
        </div>
      </MotionDiv>
    </div>
  );
}
