'use client';

import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { Download } from 'lucide-react';
import { MotionDiv } from '@/components/ui/MotionDiv';
import { PricingBreakdown } from '@/components/ui/PricingBreakdown';

interface Transaction {
  id: string;
  amount: number;
  created_at: string;
  job_title?: string;
  contractor_name?: string;
  subtotal?: number;
  platformFee?: number;
  processingFee?: number;
}

interface PaymentsReceiptModalProps {
  isOpen: boolean;
  transaction: Transaction | null;
  onClose: () => void;
}

function downloadReceipt(transaction: Transaction, subtotal: number) {
  const platformFee = transaction.platformFee || transaction.amount * 0.05;
  const processingFee = transaction.processingFee || transaction.amount * 0.02;
  const date = new Date(transaction.created_at).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Receipt - ${transaction.id.slice(0, 8)}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 40px auto; padding: 20px; color: #1a1a1a; }
  .header { border-bottom: 2px solid #0d9488; padding-bottom: 20px; margin-bottom: 24px; }
  .header h1 { color: #0d9488; font-size: 24px; margin: 0 0 4px; }
  .header p { color: #6b7280; font-size: 14px; margin: 0; }
  .meta { display: flex; justify-content: space-between; margin-bottom: 24px; font-size: 14px; }
  .meta div { color: #6b7280; }
  .meta strong { color: #1a1a1a; display: block; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  th { text-align: left; padding: 10px 0; border-bottom: 1px solid #e5e7eb; font-size: 13px; color: #6b7280; text-transform: uppercase; }
  td { padding: 12px 0; border-bottom: 1px solid #f3f4f6; font-size: 14px; }
  td:last-child, th:last-child { text-align: right; }
  .total-row td { border-bottom: 2px solid #0d9488; font-weight: 700; font-size: 16px; }
  .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; text-align: center; }
</style></head><body>
  <div class="header">
    <h1>Mintenance</h1>
    <p>Payment Receipt</p>
  </div>
  <div class="meta">
    <div>Receipt ID<strong>${transaction.id.slice(0, 8).toUpperCase()}</strong></div>
    <div>Date<strong>${date}</strong></div>
  </div>
  ${transaction.job_title ? `<p style="margin-bottom:16px"><strong>Job:</strong> ${transaction.job_title}</p>` : ''}
  ${transaction.contractor_name ? `<p style="margin-bottom:16px"><strong>Contractor:</strong> ${transaction.contractor_name}</p>` : ''}
  <table>
    <thead><tr><th>Description</th><th>Amount</th></tr></thead>
    <tbody>
      <tr><td>Service Cost</td><td>&pound;${subtotal.toFixed(2)}</td></tr>
      <tr><td>VAT (20%)</td><td>&pound;${(subtotal * 0.2).toFixed(2)}</td></tr>
      <tr><td>Platform Fee (5%)</td><td>&pound;${platformFee.toFixed(2)}</td></tr>
      <tr><td>Processing Fee (2%)</td><td>&pound;${processingFee.toFixed(2)}</td></tr>
      <tr class="total-row"><td>Total</td><td>&pound;${transaction.amount.toFixed(2)}</td></tr>
    </tbody>
  </table>
  <div class="footer">
    <p>Mintenance Ltd &middot; All prices include applicable taxes</p>
    <p>This receipt was generated automatically. For queries, contact support@mintenance.com</p>
  </div>
</body></html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `mintenance-receipt-${transaction.id.slice(0, 8)}.html`;
  link.click();
  URL.revokeObjectURL(url);
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
              {transaction.contractor_name && (
                <p className="text-xs text-gray-500 mt-0.5">Contractor: {transaction.contractor_name}</p>
              )}
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
                currency={"\u00A3"}
              />

              <div className="mt-6 flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => downloadReceipt(transaction, subtotal)}
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
