'use client';

import React, { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  FileText,
  CheckCircle,
  AlertTriangle,
  Download,
  Loader2,
  PoundSterling,
  ShieldCheck,
  ShieldAlert,
  Clock,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Receipt,
  Calendar,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { ContractorPageWrapper } from '@/app/contractor/components/ContractorPageWrapper';

// -- Types -------------------------------------------------------------------

import type { TaxDashboardData, YearSummary } from './tax-helpers';
import {
  fetchTaxProfile,
  fetchTaxSummaries,
  getW9StatusDisplay,
  get1099StatusBadge,
} from './tax-helpers';

// -- Component ---------------------------------------------------------------

export default function ContractorTaxDashboardPage() {
  const [expandedYear, setExpandedYear] = useState<number | null>(null);

  // Fetch tax profile
  const {
    data: profile,
    isLoading: profileLoading,
    error: profileError,
  } = useQuery({
    queryKey: ['contractor', 'tax-profile'],
    queryFn: fetchTaxProfile,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Fetch year summaries and payments
  const {
    data: summaryData,
    isLoading: summariesLoading,
    error: summariesError,
  } = useQuery({
    queryKey: ['contractor', 'tax-summaries'],
    queryFn: fetchTaxSummaries,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const summaries = summaryData?.summaries ?? [];
  const payments = summaryData?.payments ?? {};
  const isLoading = profileLoading || summariesLoading;
  const error = profileError || summariesError;

  // -- Handlers --------------------------------------------------------------

  const toggleYear = useCallback((year: number) => {
    setExpandedYear((prev) => (prev === year ? null : year));
  }, []);

  const handleDownload1099 = useCallback((year: number) => {
    window.open(
      `/api/contractor/tax-info/download-1099?year=${year}`,
      '_blank'
    );
  }, []);

  // -- W-9 Status helpers ----------------------------------------------------

  // -- Render: Loading -------------------------------------------------------

  if (isLoading) {
    return (
      <ContractorPageWrapper>
        {/* Header skeleton */}
        <div className='bg-white border-b border-gray-200'>
          <div className='max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
            <div className='animate-pulse flex items-center gap-4'>
              <div className='w-14 h-14 bg-gray-200 rounded-2xl' />
              <div>
                <div className='h-8 w-56 bg-gray-200 rounded mb-2' />
                <div className='h-4 w-80 bg-gray-200 rounded' />
              </div>
            </div>
          </div>
        </div>
        {/* Content skeleton */}
        <div className='max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6'>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className='bg-white rounded-xl border border-gray-200 p-6 animate-pulse'
            >
              <div className='h-6 w-40 bg-gray-200 rounded mb-4' />
              <div className='space-y-3'>
                <div className='h-4 w-full bg-gray-100 rounded' />
                <div className='h-4 w-3/4 bg-gray-100 rounded' />
              </div>
            </div>
          ))}
        </div>
      </ContractorPageWrapper>
    );
  }

  // -- Render: Error ---------------------------------------------------------

  if (error) {
    return (
      <ContractorPageWrapper>
        <div className='max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center'>
          <AlertTriangle
            className='w-12 h-12 text-red-500 mx-auto mb-4'
            aria-hidden='true'
          />
          <h2 className='text-xl font-semibold text-gray-900 mb-2'>
            Failed to Load Tax Information
          </h2>
          <p className='text-gray-600 mb-6'>
            {error instanceof Error
              ? error.message
              : 'An unexpected error occurred.'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className='px-6 py-2.5 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors'
          >
            Retry
          </button>
        </div>
      </ContractorPageWrapper>
    );
  }

  const w9Display = getW9StatusDisplay(profile?.w9Status);

  // -- Render: Main ----------------------------------------------------------

  return (
    <ContractorPageWrapper>
      {/* Header */}
      <div className='bg-white border-b border-gray-200'>
        <div className='max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
          <div className='flex items-center gap-4'>
            <div
              className='w-14 h-14 bg-teal-50 rounded-2xl flex items-center justify-center flex-shrink-0'
              aria-hidden='true'
            >
              <Receipt className='w-7 h-7 text-teal-600' />
            </div>
            <div>
              <h1 className='text-3xl font-bold text-gray-900'>
                Tax Dashboard
              </h1>
              <p className='text-gray-600 mt-1'>
                View your tax information, earnings summaries, and 1099-NEC
                forms
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className='max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6'>
        {/* W-9 Status Card */}
        <div className='bg-white rounded-xl border border-gray-200 p-6'>
          <div className='flex items-start justify-between'>
            <div className='flex items-start gap-4'>
              <div className='mt-0.5'>{w9Display.icon}</div>
              <div>
                <h2 className='text-xl font-semibold text-gray-900 mb-1'>
                  W-9 Tax Information
                </h2>
                <div className='flex items-center gap-3 mb-2'>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${w9Display.badgeClass}`}
                  >
                    {w9Display.label}
                  </span>
                </div>
                <p className='text-sm text-gray-600'>{w9Display.description}</p>

                {profile && (
                  <div className='mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm'>
                    <div>
                      <span className='text-gray-500'>Legal Name:</span>{' '}
                      <span className='font-medium text-gray-900'>
                        {profile.legalName}
                      </span>
                    </div>
                    {profile.businessName && (
                      <div>
                        <span className='text-gray-500'>Business:</span>{' '}
                        <span className='font-medium text-gray-900'>
                          {profile.businessName}
                        </span>
                      </div>
                    )}
                    <div>
                      <span className='text-gray-500'>TIN:</span>{' '}
                      <span className='font-mono font-medium text-gray-900'>
                        ***-**-{profile.tinLast4}
                      </span>
                    </div>
                    <div>
                      <span className='text-gray-500'>Classification:</span>{' '}
                      <span className='font-medium text-gray-900 capitalize'>
                        {profile.taxClassification.replace(/_/g, ' ')}
                      </span>
                    </div>
                    {profile.w9SubmittedAt && (
                      <div>
                        <span className='text-gray-500'>Submitted:</span>{' '}
                        <span className='font-medium text-gray-900'>
                          {new Date(profile.w9SubmittedAt).toLocaleDateString(
                            'en-US',
                            {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            }
                          )}
                        </span>
                      </div>
                    )}
                    {profile.w9VerifiedAt && (
                      <div>
                        <span className='text-gray-500'>Verified:</span>{' '}
                        <span className='font-medium text-gray-900'>
                          {new Date(profile.w9VerifiedAt).toLocaleDateString(
                            'en-US',
                            {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            }
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <Link
              href='/contractor/tax-info'
              className='flex-shrink-0 px-4 py-2 text-sm font-medium text-teal-700 bg-teal-50 rounded-lg hover:bg-teal-100 transition-colors flex items-center gap-1.5'
              aria-label='Update W-9 tax information'
            >
              {profile ? 'Update' : 'Submit W-9'}
              <ExternalLink className='w-3.5 h-3.5' aria-hidden='true' />
            </Link>
          </div>
        </div>

        {/* Annual Earnings Summary */}
        <div className='bg-white rounded-xl border border-gray-200'>
          <div className='px-6 py-4 border-b border-gray-200 flex items-center gap-3'>
            <PoundSterling
              className='w-5 h-5 text-teal-600'
              aria-hidden='true'
            />
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
                      Total Earnings
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
                      Net Payments
                    </th>
                    <th
                      scope='col'
                      className='text-center py-3 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider'
                    >
                      1099 Status
                    </th>
                    <th
                      scope='col'
                      className='text-right py-3 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider'
                    >
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-gray-100'>
                  {summaries.map((summary) => (
                    <React.Fragment key={summary.year}>
                      <tr className='hover:bg-gray-50 transition-colors'>
                        <td className='py-4 px-6'>
                          <div className='flex items-center gap-2'>
                            <Calendar
                              className='w-4 h-4 text-gray-400'
                              aria-hidden='true'
                            />
                            <span className='text-sm font-semibold text-gray-900'>
                              {summary.year}
                            </span>
                          </div>
                        </td>
                        <td className='py-4 px-6 text-right'>
                          <span className='text-sm font-semibold text-gray-900'>
                            $
                            {summary.totalEarnings.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </td>
                        <td className='py-4 px-6 text-right'>
                          <span className='text-sm text-gray-600'>
                            -$
                            {summary.platformFees.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </td>
                        <td className='py-4 px-6 text-right'>
                          <span className='text-sm font-semibold text-teal-700'>
                            $
                            {summary.netPayments.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </td>
                        <td className='py-4 px-6 text-center'>
                          {get1099StatusBadge(summary.form1099Status)}
                        </td>
                        <td className='py-4 px-6 text-right'>
                          <button
                            onClick={() => toggleYear(summary.year)}
                            className='px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-1 ml-auto'
                            aria-expanded={expandedYear === summary.year}
                            aria-controls={`payments-${summary.year}`}
                            aria-label={`${expandedYear === summary.year ? 'Collapse' : 'Expand'} payment records for ${summary.year}`}
                          >
                            {expandedYear === summary.year ? (
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
                        </td>
                      </tr>

                      {/* Expanded Payment Records */}
                      {expandedYear === summary.year && (
                        <tr>
                          <td colSpan={6} className='p-0'>
                            <div
                              id={`payments-${summary.year}`}
                              className='bg-gray-50 border-t border-gray-200'
                              role='region'
                              aria-label={`Payment records for ${summary.year}`}
                            >
                              {(payments[summary.year] ?? []).length > 0 ? (
                                <div className='px-6 py-4'>
                                  <h3 className='text-sm font-semibold text-gray-700 mb-3'>
                                    Payment Records - {summary.year}
                                  </h3>
                                  <div className='space-y-2'>
                                    {(payments[summary.year] ?? []).map(
                                      (payment) => (
                                        <div
                                          key={payment.id}
                                          className='bg-white rounded-lg border border-gray-200 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2'
                                        >
                                          <div className='flex-1 min-w-0'>
                                            <p className='text-sm font-medium text-gray-900 truncate'>
                                              {payment.jobTitle}
                                            </p>
                                            <p className='text-xs text-gray-500'>
                                              {new Date(
                                                payment.date
                                              ).toLocaleDateString('en-US', {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric',
                                              })}{' '}
                                              -- {payment.homeownerName}
                                            </p>
                                          </div>
                                          <div className='flex items-center gap-4 text-sm'>
                                            <div className='text-right'>
                                              <span className='text-gray-500'>
                                                Gross:
                                              </span>{' '}
                                              <span className='font-medium text-gray-900'>
                                                $
                                                {payment.grossAmount.toFixed(2)}
                                              </span>
                                            </div>
                                            <div className='text-right'>
                                              <span className='text-gray-500'>
                                                Fee:
                                              </span>{' '}
                                              <span className='text-gray-600'>
                                                -$
                                                {payment.platformFee.toFixed(2)}
                                              </span>
                                            </div>
                                            <div className='text-right'>
                                              <span className='text-gray-500'>
                                                Net:
                                              </span>{' '}
                                              <span className='font-semibold text-teal-700'>
                                                ${payment.netAmount.toFixed(2)}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      )
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div className='px-6 py-8 text-center'>
                                  <Receipt
                                    className='w-8 h-8 text-gray-300 mx-auto mb-2'
                                    aria-hidden='true'
                                  />
                                  <p className='text-sm text-gray-500'>
                                    No payment records for {summary.year}.
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

        {/* 1099-NEC Forms Download Section */}
        <div className='bg-white rounded-xl border border-gray-200'>
          <div className='px-6 py-4 border-b border-gray-200 flex items-center gap-3'>
            <FileText className='w-5 h-5 text-teal-600' aria-hidden='true' />
            <h2 className='text-xl font-semibold text-gray-900'>
              1099-NEC Forms
            </h2>
          </div>

          {summaries.some(
            (s) =>
              s.form1099Status === 'generated' || s.form1099Status === 'filed'
          ) ? (
            <div className='p-6 space-y-3'>
              {summaries
                .filter(
                  (s) =>
                    s.form1099Status === 'generated' ||
                    s.form1099Status === 'filed'
                )
                .map((summary) => (
                  <div
                    key={summary.year}
                    className='flex items-center justify-between bg-gray-50 rounded-lg border border-gray-200 px-4 py-3'
                  >
                    <div className='flex items-center gap-3'>
                      <FileText
                        className='w-5 h-5 text-teal-600'
                        aria-hidden='true'
                      />
                      <div>
                        <p className='text-sm font-semibold text-gray-900'>
                          1099-NEC - Tax Year {summary.year}
                        </p>
                        <p className='text-xs text-gray-500'>
                          {summary.form1099GeneratedAt
                            ? `Generated on ${new Date(
                                summary.form1099GeneratedAt
                              ).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}`
                            : 'Available for download'}
                        </p>
                      </div>
                    </div>
                    <div className='flex items-center gap-3'>
                      {get1099StatusBadge(summary.form1099Status)}
                      <button
                        onClick={() => handleDownload1099(summary.year)}
                        className='px-3 py-1.5 text-sm font-medium text-teal-700 bg-teal-50 rounded-lg hover:bg-teal-100 transition-colors flex items-center gap-1.5'
                        aria-label={`Download 1099-NEC form for tax year ${summary.year}`}
                      >
                        <Download className='w-4 h-4' aria-hidden='true' />
                        Download
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className='text-center py-12 px-6'>
              <FileText
                className='w-12 h-12 text-gray-300 mx-auto mb-4'
                aria-hidden='true'
              />
              <h3 className='text-lg font-medium text-gray-900 mb-1'>
                No 1099-NEC Forms Available
              </h3>
              <p className='text-sm text-gray-500'>
                Earnings summaries will be available at the end of each tax year
                to help with your Self Assessment tax return.
              </p>
            </div>
          )}
        </div>

        {/* HMRC Tax Notice */}
        <div className='bg-blue-50 border border-blue-200 rounded-xl p-5'>
          <div className='flex items-start gap-3'>
            <AlertTriangle
              className='w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0'
              aria-hidden='true'
            />
            <div className='text-sm text-blue-800'>
              <p className='font-semibold mb-1'>Tax Reporting Information</p>
              <p>
                As a self-employed contractor in the UK, you are responsible for
                reporting your earnings to HMRC via Self Assessment. Mintenance
                provides earnings summaries to help with your tax return.
                Consult an accountant for advice on your specific situation.
              </p>
            </div>
          </div>
        </div>
      </div>
    </ContractorPageWrapper>
  );
}
