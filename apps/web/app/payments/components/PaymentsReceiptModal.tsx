'use client';

import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { Download } from 'lucide-react';
import { MotionDiv } from '@/components/ui/MotionDiv';
import { PricingBreakdown } from '@/components/ui/PricingBreakdown';
import toast from 'react-hot-toast';

interface Transaction {
  id: string;
  amount: number;
  job_title?: string;
  subtotal?: number;
  platformFee?: number;
  processingFee?: number;
}

interface PaymentsReceiptModalProps {
  isOpen: boolean;
  transaction: Transaction | null;
  onClose: () => void;
}

export function PaymentsReceiptModal({
  isOpen,
  transaction,
  onClose,
}: PaymentsReceiptModalProps) {
  if (!transaction) return null;

  const subtotal = transaction.subtotal || transaction.amount / 1.2;

  return (
    <AnimatePresence>
      {isOpen && (
        <MotionDiv
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <MotionDiv
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full"
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Payment Receipt</h2>
              <p className="text-sm text-gray-600 mt-1">{transaction.job_title || 'Payment'}</p>
            </div>

            <div className="p-6">
              <PricingBreakdown
                items={[
                  {
                    id: '1',
                    label: 'Service Cost',
                    amount: subtotal,
                  },
                  {
                    id: '2',
                    label: 'VAT (20%)',
                    amount: subtotal * 0.2,
                  },
                  {
                    id: '3',
                    label: 'Platform Fee (5%)',
                    amount: transaction.platformFee || transaction.amount * 0.05,
                  },
                  {
                    id: '4',
                    label: 'Processing Fee (2%)',
                    amount: transaction.processingFee || transaction.amount * 0.02,
                  },
                ]}
                subtotal={subtotal}
                total={transaction.amount}
                currency="\u00A3"
              />

              <div className="mt-6 flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => toast.success('Downloading invoice...')}
                  className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
              </div>
            </div>
          </MotionDiv>
        </MotionDiv>
      )}
    </AnimatePresence>
  );
}
