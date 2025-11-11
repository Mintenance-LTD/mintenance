'use client';

import Link from 'next/link';
import { AlertCircle, CreditCard, X } from 'lucide-react';

interface PaymentSetupBannerProps {
  contractorId: string;
  pendingAmount?: number;
  pendingEscrows?: number;
}

export function PaymentSetupBanner({ contractorId, pendingAmount = 0, pendingEscrows = 0 }: PaymentSetupBannerProps) {
  return (
    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-l-4 border-amber-500 rounded-lg p-4 mb-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          <div className="flex-shrink-0 mt-0.5">
            <AlertCircle className="h-5 w-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-gray-900 mb-1">
              Payment Account Setup Required
            </h3>
            <p className="text-sm text-gray-700 mb-3">
              {pendingEscrows > 0 && pendingAmount > 0 ? (
                <>
                  You have <strong>{pendingEscrows} payment{pendingEscrows > 1 ? 's' : ''}</strong> totaling{' '}
                  <strong>£{pendingAmount.toFixed(2)}</strong> waiting in escrow. Complete your payment setup to receive funds.
                </>
              ) : (
                'Set up your payment account to receive payments from completed jobs. This only takes a few minutes.'
              )}
            </p>
            <Link
              href="/contractor/payouts"
              className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-md transition-colors"
            >
              <CreditCard className="h-4 w-4" />
              Set Up Payment Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

