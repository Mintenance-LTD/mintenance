import React from 'react';
import {
  Calendar,
  ChevronDown,
  ChevronRight,
  Download,
  PoundSterling,
  ReceiptPoundSterling,
} from 'lucide-react';
import type { YearSummary } from './tax-helpers';
import { formatGBP } from './tax-helpers';

interface EarningsSummaryTableProps {
  summaries: YearSummary[];
  expandedYear: number | null;
  onToggleYear: (startYear: number) => void;
  onDownload: (startYear: number) => void;
}

export function EarningsSummaryTable({
  summaries,
  expandedYear,
  onToggleYear,
  onDownload,
}: EarningsSummaryTableProps) {
  return (
    <div className='bg-white rounded-xl border border-gray-200'>
      <div className='px-6 py-4 border-b border-gray-200 flex items-center gap-3'>
        <PoundSterling className='w-5 h-5 text-teal-600' aria-hidden='true' />
        <h2 className='text-xl font-semibold text-gray-900'>
          Annual Earnings Summary
        </h2>
      </div>

      {summaries.length > 0 ? (
        <div className='overflow-x-auto'>
          <table
            className='w-full'
            role='table'
            aria-label='Annual earnings summary'
          >
            <thead>
              <tr className='border-b border-gray-200 bg-gray-50'>
                <th
                  scope='col'
                  className='text-left py-3 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider'
                >
                  Tax Year
                </th>
                <th
                  scope='col'
                  className='text-right py-3 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider'
                >
                  Gross Earnings
                </th>
                <th
                  scope='col'
                  className='text-right py-3 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider'
                >
                  Platform Fees
                </th>
                <th
                  scope='col'
                  className='text-right py-3 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider'
                >
                  Net Paid
                </th>
                <th
                  scope='col'
                  className='text-center py-3 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider'
                >
                  Jobs
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
              {summaries.map((summary) => (
                <React.Fragment key={summary.startYear}>
                  <tr className='hover:bg-gray-50 transition-colors'>
                    <td className='py-4 px-6'>
                      <div className='flex items-center gap-2'>
                        <Calendar
                          className='w-4 h-4 text-gray-400'
                          aria-hidden='true'
                        />
                        <span className='text-sm font-semibold text-gray-900'>
                          {summary.taxYear}
                        </span>
                      </div>
                    </td>
                    <td className='py-4 px-6 text-right'>
                      <span className='text-sm font-semibold text-gray-900'>
                        {formatGBP(summary.grossEarnings)}
                      </span>
                    </td>
                    <td className='py-4 px-6 text-right'>
                      <span className='text-sm text-gray-600'>
                        -{formatGBP(summary.platformFees)}
                      </span>
                    </td>
                    <td className='py-4 px-6 text-right'>
                      <span className='text-sm font-semibold text-teal-700'>
                        {formatGBP(summary.netPaid)}
                      </span>
                    </td>
                    <td className='py-4 px-6 text-center'>
                      <span className='text-sm text-gray-700'>
                        {summary.jobCount}
                      </span>
                    </td>
                    <td className='py-4 px-6 text-right'>
                      <div className='flex items-center justify-end gap-2'>
                        <button
                          onClick={() => onToggleYear(summary.startYear)}
                          className='px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-1'
                          aria-expanded={expandedYear === summary.startYear}
                          aria-controls={`payments-${summary.startYear}`}
                          aria-label={`${expandedYear === summary.startYear ? 'Collapse' : 'Expand'} payment records for ${summary.taxYear}`}
                        >
                          {expandedYear === summary.startYear ? (
                            <ChevronDown
                              className='w-3.5 h-3.5'
                              aria-hidden='true'
                            />
                          ) : (
                            <ChevronRight
                              className='w-3.5 h-3.5'
                              aria-hidden='true'
                            />
                          )}
                          Payments
                        </button>
                        <button
                          onClick={() => onDownload(summary.startYear)}
                          className='px-3 py-1.5 text-xs font-medium text-teal-700 bg-teal-50 rounded-lg hover:bg-teal-100 transition-colors flex items-center gap-1'
                          aria-label={`Download earnings statement for ${summary.taxYear}`}
                        >
                          <Download
                            className='w-3.5 h-3.5'
                            aria-hidden='true'
                          />
                          Statement
                        </button>
                      </div>
                    </td>
                  </tr>

                  {expandedYear === summary.startYear && (
                    <tr>
                      <td colSpan={6} className='p-0'>
                        <div
                          id={`payments-${summary.startYear}`}
                          className='bg-gray-50 border-t border-gray-200'
                          role='region'
                          aria-label={`Payment records for ${summary.taxYear}`}
                        >
                          {summary.payments.length > 0 ? (
                            <div className='px-6 py-4'>
                              <h3 className='text-sm font-semibold text-gray-700 mb-3'>
                                Payment Records &mdash; {summary.taxYear}
                              </h3>
                              <div className='space-y-2'>
                                {summary.payments.map((payment) => (
                                  <div
                                    key={`${payment.jobId}-${payment.date}`}
                                    className='bg-white rounded-lg border border-gray-200 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2'
                                  >
                                    <div className='flex-1 min-w-0'>
                                      <p className='text-sm font-medium text-gray-900 truncate'>
                                        {payment.jobTitle}
                                      </p>
                                      <p className='text-xs text-gray-500'>
                                        {new Date(
                                          payment.date
                                        ).toLocaleDateString('en-GB', {
                                          year: 'numeric',
                                          month: 'short',
                                          day: 'numeric',
                                        })}
                                      </p>
                                    </div>
                                    <div className='flex items-center gap-4 text-sm'>
                                      <div className='text-right'>
                                        <span className='text-gray-500'>
                                          Gross:
                                        </span>{' '}
                                        <span className='font-medium text-gray-900'>
                                          {formatGBP(payment.gross)}
                                        </span>
                                      </div>
                                      <div className='text-right'>
                                        <span className='text-gray-500'>
                                          Fee:
                                        </span>{' '}
                                        <span className='text-gray-600'>
                                          -{formatGBP(payment.platformFee)}
                                        </span>
                                      </div>
                                      <div className='text-right'>
                                        <span className='text-gray-500'>
                                          Net:
                                        </span>{' '}
                                        <span className='font-semibold text-teal-700'>
                                          {formatGBP(payment.net)}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className='px-6 py-8 text-center'>
                              <ReceiptPoundSterling
                                className='w-8 h-8 text-gray-300 mx-auto mb-2'
                                aria-hidden='true'
                              />
                              <p className='text-sm text-gray-500'>
                                No payment records for {summary.taxYear}.
                              </p>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className='text-center py-12 px-6'>
          <PoundSterling
            className='w-12 h-12 text-gray-300 mx-auto mb-4'
            aria-hidden='true'
          />
          <h3 className='text-lg font-medium text-gray-900 mb-1'>
            No Earnings Yet
          </h3>
          <p className='text-sm text-gray-500'>
            Your annual earnings summaries will appear here once you start
            receiving payments.
          </p>
        </div>
      )}
    </div>
  );
}
