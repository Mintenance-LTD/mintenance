'use client';

import React, { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  FileText,
  AlertTriangle,
  Download,
  ReceiptPoundSterling,
} from 'lucide-react';
import { ContractorPageWrapper } from '@/app/contractor/components/ContractorPageWrapper';

import { fetchTaxProfile, fetchTaxSummaries } from './tax-helpers';
import { get1099StatusBadge } from './tax-helpers';
import { TaxInfoCard } from './TaxInfoCard';
import { EarningsSummaryTable } from './EarningsSummaryTable';

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
              <ReceiptPoundSterling className='w-7 h-7 text-teal-600' />
            </div>
            <div>
              <h1 className='text-3xl font-bold text-gray-900'>
                Tax Dashboard
              </h1>
              <p className='text-gray-600 mt-1'>
                View your tax information and end-of-year earnings summaries for
                your HMRC Self Assessment
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className='max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6'>
        <TaxInfoCard profile={profile} />

        <EarningsSummaryTable
          summaries={summaries}
          payments={payments}
          expandedYear={expandedYear}
          onToggleYear={toggleYear}
        />

        {/* End-of-Year Earnings Summary Download Section */}
        <div className='bg-white rounded-xl border border-gray-200'>
          <div className='px-6 py-4 border-b border-gray-200 flex items-center gap-3'>
            <FileText className='w-5 h-5 text-teal-600' aria-hidden='true' />
            <h2 className='text-xl font-semibold text-gray-900'>
              End-of-Year Earnings Summaries
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
                          Earnings summary — Tax Year {summary.year}
                        </p>
                        <p className='text-xs text-gray-500'>
                          {summary.form1099GeneratedAt
                            ? `Generated on ${new Date(
                                summary.form1099GeneratedAt
                              ).toLocaleDateString('en-GB', {
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
                        aria-label={`Download earnings summary for tax year ${summary.year}`}
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
                No earnings summaries available yet
              </h3>
              <p className='text-sm text-gray-500'>
                End-of-year earnings summaries will be available here to help
                you complete your HMRC Self Assessment tax return.
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
