'use client';

import React from 'react';
import {
  formatPlatformFeePercent,
  PAYMENT_RELEASE_COPY,
} from '@mintenance/shared';
import { MotionDiv } from '@/components/ui/MotionDiv';
import { formatMoney } from '@/lib/utils/currency';
import type { Transaction } from './types';

interface PricingModalProps {
  transaction: Transaction;
  onClose: () => void;
}

export function PricingModal({ transaction, onClose }: PricingModalProps) {
  const recorded = transaction.feesFinalized;
  return (
    <div
      className='fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50'
      onClick={onClose}
    >
      <MotionDiv
        role='dialog'
        aria-modal='true'
        aria-labelledby='payment-breakdown-title'
        onClick={(e) => e.stopPropagation()}
        className='bg-white rounded-xl shadow-2xl max-w-md w-full p-6'
      >
        <h3 id='payment-breakdown-title' className='t-h2 text-gray-900 mb-6'>
          {recorded
            ? 'Recorded payment breakdown'
            : 'Estimated payment breakdown'}
        </h3>
        <dl className='space-y-3 text-sm'>
          <div className='flex justify-between'>
            <dt>{recorded ? 'Gross payment' : 'Payment amount before fees'}</dt>
            <dd>
              {formatMoney(
                recorded
                  ? transaction.amount
                  : (transaction.remainingAmount ?? transaction.amount)
              )}
            </dd>
          </div>
          <div className='flex justify-between'>
            <dt>
              {recorded
                ? 'Recorded platform fee'
                : `Estimated platform fee${transaction.feeRate == null ? '' : ` (${formatPlatformFeePercent(transaction.feeRate)})`}`}
            </dt>
            <dd>−{formatMoney(transaction.platformFee)}</dd>
          </div>
          <div className='flex justify-between font-semibold'>
            <dt>
              {recorded
                ? 'Recorded contractor entitlement'
                : 'Estimated contractor entitlement'}
            </dt>
            <dd>{formatMoney(transaction.netAmount)}</dd>
          </div>
        </dl>
        <p className='mt-4 text-sm text-gray-600'>
          {recorded
            ? 'These amounts were recorded at release.'
            : 'Estimate only: the platform fee has a 50p minimum, capped at the payment amount. The applicable rate and any refunds are confirmed at release.'}{' '}
          Stripe processing is paid by the platform, not deducted again from
          your entitlement.
        </p>
        <p className='mt-3 text-sm text-gray-600'>
          {PAYMENT_RELEASE_COPY.summary} {PAYMENT_RELEASE_COPY.details}
        </p>
        <button
          onClick={onClose}
          className='mt-6 w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium'
        >
          Close
        </button>
      </MotionDiv>
    </div>
  );
}
