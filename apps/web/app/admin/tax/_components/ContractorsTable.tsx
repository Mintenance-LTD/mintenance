import React from 'react';
import { FileText, CheckCircle, Download, Loader2 } from 'lucide-react';
import { MotionDiv } from '@/components/ui/MotionDiv';
import { getStatusBadge, getTaxDetailsBadge } from './StatusBadges';
import type { ContractorTaxRow, StatementStatus } from './types';
import { statementStatus } from './types';

interface ContractorsTableProps {
  contractors: ContractorTaxRow[];
  selectedYear: number;
  searchQuery: string;
  statusFilter: 'all' | StatementStatus;
  generatingId: string | null;
  filingId: string | null;
  onGenerate: (contractorId: string) => void;
  onMarkFiled: (contractorId: string) => void;
  onDownloadStatement: (contractorId: string) => void;
}

const gbp = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
});

export function ContractorsTable({
  contractors,
  selectedYear,
  searchQuery,
  statusFilter,
  generatingId,
  filingId,
  onGenerate,
  onMarkFiled,
  onDownloadStatement,
}: ContractorsTableProps) {
  return (
    <MotionDiv
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
      className='bg-white rounded-xl border border-gray-200 shadow-sm mb-8'
    >
      <div className='px-6 py-4 border-b border-gray-200'>
        <h2 className='text-xl font-semibold text-gray-900'>
          Contractor Earnings Statements
          <span className='ml-2 text-sm font-normal text-gray-500'>
            ({contractors.length} contractor
            {contractors.length !== 1 ? 's' : ''})
          </span>
        </h2>
      </div>

      <div className='overflow-x-auto'>
        <table
          className='w-full'
          role='table'
          aria-label='Contractor earnings statement status table'
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
                className='text-right py-3 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider'
              >
                Total Earnings
              </th>
              <th
                scope='col'
                className='text-center py-3 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider'
              >
                Tax Details
              </th>
              <th
                scope='col'
                className='text-center py-3 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider'
              >
                Statement Status
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
            {contractors.map((contractor) => {
              const status = statementStatus(contractor);
              return (
                <tr
                  key={contractor.contractorId}
                  className='hover:bg-gray-50 transition-colors'
                >
                  <td className='py-4 px-6'>
                    <div>
                      <p className='text-sm font-medium text-gray-900'>
                        {contractor.contractorName}
                      </p>
                      <p className='text-xs text-gray-500'>
                        {contractor.email}
                      </p>
                    </div>
                  </td>
                  <td className='py-4 px-6 text-right'>
                    <span className='text-sm font-semibold text-gray-900'>
                      {gbp.format(contractor.grossEarnings)}
                    </span>
                  </td>
                  <td className='py-4 px-6 text-center'>
                    {getTaxDetailsBadge(contractor.taxDetailsComplete)}
                  </td>
                  <td className='py-4 px-6 text-center'>
                    {getStatusBadge(status)}
                  </td>
                  <td className='py-4 px-6'>
                    <div className='flex items-center justify-end gap-2'>
                      {status === 'pending' && (
                        <button
                          onClick={() => onGenerate(contractor.contractorId)}
                          disabled={generatingId === contractor.contractorId}
                          className='px-3 py-1.5 text-xs font-medium bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors disabled:opacity-50 flex items-center gap-1'
                          aria-label={`Generate earnings statement for ${contractor.contractorName}`}
                        >
                          {generatingId === contractor.contractorId ? (
                            <Loader2
                              className='w-3 h-3 animate-spin'
                              aria-hidden='true'
                            />
                          ) : (
                            <FileText className='w-3 h-3' aria-hidden='true' />
                          )}
                          Generate
                        </button>
                      )}
                      {status === 'generated' && (
                        <>
                          <button
                            onClick={() =>
                              onDownloadStatement(contractor.contractorId)
                            }
                            className='px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1'
                            aria-label={`Download earnings statement for ${contractor.contractorName}`}
                          >
                            <Download className='w-3 h-3' aria-hidden='true' />
                            Download
                          </button>
                          <button
                            onClick={() => onMarkFiled(contractor.contractorId)}
                            disabled={filingId === contractor.contractorId}
                            className='px-3 py-1.5 text-xs font-medium bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50 flex items-center gap-1'
                            aria-label={`Mark earnings statement as filed for ${contractor.contractorName}`}
                          >
                            {filingId === contractor.contractorId ? (
                              <Loader2
                                className='w-3 h-3 animate-spin'
                                aria-hidden='true'
                              />
                            ) : (
                              <CheckCircle
                                className='w-3 h-3'
                                aria-hidden='true'
                              />
                            )}
                            Mark Filed
                          </button>
                        </>
                      )}
                      {status === 'filed' && (
                        <button
                          onClick={() =>
                            onDownloadStatement(contractor.contractorId)
                          }
                          className='px-3 py-1.5 text-xs font-medium bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-1'
                          aria-label={`Download filed earnings statement for ${contractor.contractorName}`}
                        >
                          <Download className='w-3 h-3' aria-hidden='true' />
                          Download
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {contractors.length === 0 && (
        <div className='text-center py-16 px-6'>
          <FileText
            className='w-12 h-12 text-gray-300 mx-auto mb-4'
            aria-hidden='true'
          />
          <h3 className='text-lg font-medium text-gray-900 mb-1'>
            No contractors found
          </h3>
          <p className='text-sm text-gray-500'>
            {searchQuery || statusFilter !== 'all'
              ? 'Try adjusting your search or filters.'
              : `No contractors have earnings for the ${selectedYear}-${String((selectedYear + 1) % 100).padStart(2, '0')} tax year.`}
          </p>
        </div>
      )}
    </MotionDiv>
  );
}
