import React from 'react';
import { Users, FileText, CheckCircle, DollarSign } from 'lucide-react';
import { MotionDiv } from '@/components/ui/MotionDiv';
import type { TaxSummary } from './types';

interface SummaryCardsProps {
  summary: TaxSummary;
}

export function SummaryCards({ summary }: SummaryCardsProps) {
  return (
    <section aria-label="Tax summary metrics">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl border border-gray-200 shadow-sm p-6"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center" aria-hidden="true">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900">{summary.totalRequiring1099}</div>
          <div className="text-sm text-gray-600 mt-1">Contractors Requiring 1099</div>
        </MotionDiv>

        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white rounded-xl border border-gray-200 shadow-sm p-6"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center" aria-hidden="true">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900">{summary.totalGenerated}</div>
          <div className="text-sm text-gray-600 mt-1">Forms Generated</div>
        </MotionDiv>

        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl border border-gray-200 shadow-sm p-6"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center" aria-hidden="true">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900">{summary.totalFiled}</div>
          <div className="text-sm text-gray-600 mt-1">Forms Filed with IRS</div>
        </MotionDiv>

        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-white rounded-xl border border-gray-200 shadow-sm p-6"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center" aria-hidden="true">
              <DollarSign className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900">
            ${summary.totalEarnings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-sm text-gray-600 mt-1">Total Contractor Earnings</div>
        </MotionDiv>
      </div>
    </section>
  );
}
