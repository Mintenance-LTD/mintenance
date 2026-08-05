import React from 'react';
import { ShieldAlert, ShieldCheck } from 'lucide-react';
import { MotionDiv } from '@/components/ui/MotionDiv';
import type { IncompleteTaxDetailsRow } from './types';

interface IncompleteTaxDetailsTableProps {
  rows: IncompleteTaxDetailsRow[];
}

export function IncompleteTaxDetailsTable({
  rows,
}: IncompleteTaxDetailsTableProps) {
  return (
    <MotionDiv
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className='bg-white rounded-xl border border-gray-200 shadow-sm'
    >
      <div className='px-6 py-4 border-b border-gray-200 flex items-center gap-3'>
        <ShieldAlert className='w-5 h-5 text-amber-500' aria-hidden='true' />
        <h2 className='text-xl font-semibold text-gray-900'>
          Incomplete Tax Details
          <span className='ml-2 text-sm font-normal text-gray-500'>
            ({rows.length})
          </span>
        </h2>
      </div>

      {rows.length > 0 ? (
        <div className='overflow-x-auto'>
          <table
            className='w-full'
            role='table'
            aria-label='Contractors with incomplete tax details table'
          >
            <thead>
              <tr className='border-b border-gray-200 bg-gray-50'>
                <th
                  scope='col'
                  className='text-left py-3 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider'
                >
                  Contractor
                </th>
                <th
                  scope='col'
                  className='text-left py-3 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider'
                >
                  Email
                </th>
                <th
                  scope='col'
                  className='text-center py-3 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider'
                >
                  Status
                </th>
                <th
                  scope='col'
                  className='text-right py-3 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider'
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className='divide-y divide-gray-100'>
              {rows.map((row) => (
                <tr
                  key={row.contractorId}
                  className='hover:bg-gray-50 transition-colors'
                >
                  <td className='py-4 px-6 text-sm font-medium text-gray-900'>
                    {row.contractorName}
                  </td>
                  <td className='py-4 px-6 text-sm text-gray-600'>
                    {row.email}
                  </td>
                  <td className='py-4 px-6 text-center'>
                    <span className='inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800'>
                      <ShieldAlert className='w-3 h-3' aria-hidden='true' />
                      Incomplete
                    </span>
                  </td>
                  <td className='py-4 px-6 text-right'>
                    <button
                      onClick={() =>
                        window.open(
                          `/admin/users?search=${encodeURIComponent(row.email)}`,
                          '_self'
                        )
                      }
                      className='px-3 py-1.5 text-xs font-medium bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors'
                      aria-label={`Review tax details for ${row.contractorName}`}
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
        <div className='text-center py-12 px-6'>
          <ShieldCheck
            className='w-12 h-12 text-green-300 mx-auto mb-4'
            aria-hidden='true'
          />
          <h3 className='text-lg font-medium text-gray-900 mb-1'>
            All Tax Details Complete
          </h3>
          <p className='text-sm text-gray-500'>
            Every contractor with earnings has complete tax details on file.
          </p>
        </div>
      )}
    </MotionDiv>
  );
}
