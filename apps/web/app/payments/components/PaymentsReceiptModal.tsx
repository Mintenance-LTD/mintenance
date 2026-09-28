'use client';

import React from 'react';
import { Download } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import {
  downloadPaymentRecord,
  type PaymentRecord,
} from '@/lib/payments/payment-record';

interface PaymentsReceiptModalProps {
  isOpen: boolean;
  transaction: PaymentRecord | null;
  onClose: () => void;
}

export function PaymentsReceiptModal({
  isOpen,
  transaction,
  onClose,
}: PaymentsReceiptModalProps) {
  if (!isOpen || !transaction) return null;
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title='Payment record'
      maxWidth={480}
    >
      <div>
        <p className='mt-2'>{transaction.job_title || 'Payment'}</p>
        <dl className='space-y-3 my-6'>
          <div>
            <dt>Recorded amount</dt>
            <dd>£{transaction.amount.toFixed(2)}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{transaction.status.replace(/_/g, ' ')}</dd>
          </div>
          <div>
            <dt>Reference</dt>
            <dd className='break-all'>{transaction.id}</dd>
          </div>
        </dl>
        <p className='text-sm text-gray-600'>
          Pending payments are not proof of payment. This is not a VAT invoice;
          request any tax invoice from the contractor.
        </p>
        <div className='mt-6 flex gap-3'>
          <button
            type='button'
            onClick={onClose}
            className='px-4 py-2 bg-gray-100 rounded-lg'
          >
            Close
          </button>
          <button
            type='button'
            onClick={() => downloadPaymentRecord(transaction)}
            className='px-4 py-2 bg-teal-600 text-white rounded-lg flex items-center gap-2'
          >
            <Download className='w-4 h-4' />
            Download HTML record
          </button>
        </div>
      </div>
    </Modal>
  );
}
