import React from 'react';
import { ShieldAlert, ShieldCheck } from 'lucide-react';
import { MotionDiv } from '@/components/ui/MotionDiv';
import { getW9Badge } from './StatusBadges';
import type { UnverifiedW9Row } from './types';

interface UnverifiedW9TableProps {
  rows: UnverifiedW9Row[];
}

export function UnverifiedW9Table({ rows }: UnverifiedW9TableProps) {
  return (
    <MotionDiv
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="bg-white rounded-xl border border-gray-200 shadow-sm"
    >
      <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-500" aria-hidden="true" />
        <h2 className="text-xl font-semibold text-gray-900">
          Unverified W-9 Forms
          <span className="ml-2 text-sm font-normal text-gray-500">
            ({rows.length})
          </span>
        </h2>
      </div>

      {rows.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full" role="table" aria-label="Unverified W-9 forms table">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th scope="col" className="text-left py-3 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Contractor
                </th>
                <th scope="col" className="text-left py-3 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Email
                </th>
                <th scope="col" className="text-left py-3 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Submitted
                </th>
                <th scope="col" className="text-center py-3 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="text-right py-3 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((w9) => (
                <tr key={w9.contractorId} className="hover:bg-gray-50 transition-colors">
                  <td className="py-4 px-6 text-sm font-medium text-gray-900">
                    {w9.contractorName}
                  </td>
                  <td className="py-4 px-6 text-sm text-gray-600">{w9.email}</td>
                  <td className="py-4 px-6 text-sm text-gray-600">
                    {w9.submittedAt
                      ? new Date(w9.submittedAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })
                      : 'Not submitted'}
                  </td>
                  <td className="py-4 px-6 text-center">
                    {getW9Badge(w9.w9Status)}
                  </td>
                  <td className="py-4 px-6 text-right">
                    <button
                      onClick={() => window.open(`/admin/users?search=${encodeURIComponent(w9.email)}`, '_self')}
                      className="px-3 py-1.5 text-xs font-medium bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors"
                      aria-label={`Review W-9 for ${w9.contractorName}`}
                    >
                      Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12 px-6">
          <ShieldCheck className="w-12 h-12 text-green-300 mx-auto mb-4" aria-hidden="true" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">All W-9s Verified</h3>
          <p className="text-sm text-gray-500">
            All contractors have verified W-9 forms on file.
          </p>
        </div>
      )}
    </MotionDiv>
  );
}
