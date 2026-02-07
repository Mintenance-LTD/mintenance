'use client';

import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { MotionDiv } from '@/components/ui/MotionDiv';
import { formatMoney } from '@/lib/utils/currency';

interface PaymentsRefundModalProps {
  isOpen: boolean;
  amount: number;
  refundReason: string;
  onReasonChange: (reason: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}

export function PaymentsRefundModal({
  isOpen,
  amount,
  refundReason,
  onReasonChange,
  onClose,
  onConfirm,
}: PaymentsRefundModalProps) {
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
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Request Refund</h2>
            <p className="text-gray-600 mb-4">
              Refund amount: <span className="font-bold">{formatMoney(amount, 'GBP')}</span>
            </p>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Reason for refund <span className="text-rose-600">*</span>
              </label>
              <textarea
                rows={4}
                placeholder="Please explain why you're requesting a refund..."
                value={refundReason}
                onChange={(e) => onReasonChange(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-none"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                disabled={!refundReason.trim()}
                className="px-6 py-3 bg-rose-600 text-white rounded-xl font-medium hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Request Refund
              </button>
            </div>
          </MotionDiv>
        </MotionDiv>
      )}
    </AnimatePresence>
  );
}
